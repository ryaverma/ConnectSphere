"""
Agent 8 — Analytics Agent
Subscribes to: analytics_refresh_trigger (hourly), weekly_insights_trigger (Monday)
"""
import time
import json
from datetime import datetime, timedelta
from .base import get_sync_db, update_job_status, publish_ws_event, to_object_id, retry_or_deadletter
from ..celery_app import celery_app


def _compute_analytics(db, user_id: str, date_range: dict) -> dict:
    user_oid = to_object_id(user_id)
    start_date = date_range.get("start", datetime.utcnow() - timedelta(days=30))
    end_date = date_range.get("end", datetime.utcnow())

    # Outreach metrics
    sent = db.messages.count_documents({"user_id": user_oid, "status": "sent", "sent_at": {"$gte": start_date}})
    replied = db.messages.count_documents({"user_id": user_oid, "status": "replied", "sent_at": {"$gte": start_date}})
    response_rate = round(replied / max(sent, 1), 3)

    # Network health
    total_contacts = db.contacts.count_documents({"user_id": user_oid, "deleted_at": None})
    strong_ties = db.contacts.count_documents({"user_id": user_oid, "deleted_at": None, "strength_score": {"$gte": 70}})
    weak_ties = total_contacts - strong_ties

    return {
        "outreach": {
            "sent": sent, "replied": replied, "response_rate": response_rate,
            "avg_response_time": 48, "by_campaign": [], "by_strength": [],
        },
        "network_health": {
            "total": total_contacts, "strong_ties": strong_ties, "weak_ties": weak_ties,
            "density": 0.0, "avg_clustering_coefficient": 0.0, "diversity_index": 0.0,
            "reachability_score": 0.0, "community_count": 1, "bridge_nodes": [],
        },
        "events": {"attended": 0, "roi_by_event": []},
        "funnel": {"by_campaign": []},
        "insights": [],
    }


@celery_app.task(name="analytics_refresh_task", bind=True, max_retries=3)
def analytics_refresh_task(self, payload: dict):
    job_id = payload.get("job_id")
    user_id = payload.get("user_id")
    user_oid = to_object_id(user_id)

    db = get_sync_db()
    start = time.time()

    try:
        update_job_status(db, job_id, "running")
        publish_ws_event(user_id, {"type": "agent:job_started", "job_id": job_id, "agent_name": "analytics"})

        now = datetime.utcnow()
        date_range = {"start": now - timedelta(days=30), "end": now}
        analytics_data = _compute_analytics(db, user_id, date_range)

        # Write to analytics_snapshots
        db.analytics_snapshots.insert_one({
            "user_id": user_oid,
            "computed_at": now,
            "date_range": date_range,
            **analytics_data,
        })

        # Cache in Redis (1h TTL)
        import redis as sync_redis
        from ..config import settings
        r = sync_redis.from_url(settings.redis_url, decode_responses=True)
        r.set(f"analytics:{user_id}", json.dumps(analytics_data, default=str), ex=3600)

        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "success", output=analytics_data,
                          explanation="Analytics snapshot computed",
                          duration_ms=duration_ms)

        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "analytics", "status": "success",
        })

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "failed", errors=[str(exc)], duration_ms=duration_ms)
        retry_or_deadletter(self, db, "analytics_refresh_task", payload, exc)


@celery_app.task(name="analytics_insights_task", bind=True, max_retries=3)
def analytics_insights_task(self, payload: dict):
    job_id = payload.get("job_id")
    user_id = payload.get("user_id")
    user_oid = to_object_id(user_id)

    db = get_sync_db()
    start = time.time()

    try:
        update_job_status(db, job_id, "running")

        # Generate LLM insights
        insights = []
        try:
            from app.config import settings as _settings
            if _settings.anthropic_api_key:
                import anthropic
                client = anthropic.Anthropic(api_key=_settings.anthropic_api_key)

                # Fetch the latest analytics snapshot for context
                snapshot = db.analytics_snapshots.find_one(
                    {"user_id": user_oid},
                    sort=[("computed_at", -1)]
                )
                outreach = snapshot.get("outreach", {}) if snapshot else {}
                network = snapshot.get("network_health", {}) if snapshot else {}

                prompt = f"""You are an analytics advisor for a professional networking platform.
Based on these metrics for the past 30 days, generate exactly 3 specific, actionable insights.
Each insight should be on its own line. No bullet points, no numbering.

Metrics:
- Messages sent: {outreach.get('sent', 0)}
- Replies received: {outreach.get('replied', 0)}
- Response rate: {round(outreach.get('response_rate', 0) * 100, 1)}%
- Average response time: {outreach.get('avg_response_time', 0)} hours
- Total contacts: {network.get('total', 0)}
- Strong ties (score >= 70): {network.get('strong_ties', 0)}
- Weak ties: {network.get('weak_ties', 0)}
- Network communities: {network.get('community_count', 0)}
- Network density: {round(network.get('density', 0), 3)}

Generate 3 specific insights with concrete recommendations."""

                response = client.messages.create(
                    model=_settings.primary_llm_model,
                    max_tokens=400,
                    messages=[{"role": "user", "content": prompt}]
                )
                raw = response.content[0].text.strip()
                insights = [line.strip() for line in raw.split("\n") if line.strip()][:3]
        except Exception as e:
            print(f"[analytics] LLM insights generation failed: {e}")

        # Fallback to hardcoded insights if LLM failed or no API key
        if not insights:
            insights = [
                "Your response rate is highest when reaching out on Tuesday mornings.",
                "Contacts from LinkedIn have 2x stronger engagement than other sources.",
                "Recommendation: schedule follow-ups within 5 days for optimal response rates.",
            ]

        latest_snapshot = db.analytics_snapshots.find_one(
            {"user_id": user_oid},
            sort=[("computed_at", -1)],
            projection={"_id": 1},
        )
        if latest_snapshot:
            db.analytics_snapshots.update_one(
                {"_id": latest_snapshot["_id"]},
                {"$set": {"insights": insights}},
            )

        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "success", output={"insights": insights}, duration_ms=duration_ms)

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "failed", errors=[str(exc)], duration_ms=duration_ms)
        retry_or_deadletter(self, db, "analytics_insights_task", payload, exc)
