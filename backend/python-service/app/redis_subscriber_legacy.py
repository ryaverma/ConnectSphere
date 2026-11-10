"""
LEGACY — kept only so the old pub/sub bridge can still be run standalone for a
before/after throughput comparison against app.redis_stream_consumer (the
Redis Streams + consumer-group replacement). Not imported by main.py anymore.

Original problem this doesn't solve: single-threaded, one message at a time,
across every user; and Redis pub/sub has no persistence, so a subscriber
outage silently drops events forever (at-most-once, no replay). See
app/redis_stream_consumer.py for the fix.

Redis pub/sub subscriber — bridges Node.js events to Celery tasks.
Run as a standalone process: python -m app.redis_subscriber_legacy
"""
import json
import uuid
import logging
from pymongo import MongoClient
from .config import settings
from .tasks.base import to_object_id

logger = logging.getLogger(__name__)

EVENT_TO_AGENT = {
    "contact_imported":             "profile_parsing",
    "profiles_enriched":            "connectgraph_builder",
    "graph_updated":                "opportunity_detection",
    "campaign_created":             "opportunity_detection",
    "campaign_goal_updated":        "opportunity_detection",
    "outreach_requested":           "outreach",
    "outreach_batch_requested":     "outreach",
    "regenerate_draft":             "outreach",
    "message_sent":                 "follow_up_lifecycle",
    "interaction_received":         "follow_up_lifecycle",
    "daily_reminder_trigger":       "follow_up_lifecycle",
    "contact_stale_check":          "follow_up_lifecycle",
    "pre_event_outreach_requested": "opportunity_detection",
    "events_imported":              "event_recommender",
    "daily_events_trigger":         "event_recommender",
    "daily_recommendation_trigger": "opportunity_detection",
    "analytics_refresh_trigger":    "analytics",
    "weekly_insights_trigger":      "analytics",
}

TASK_MAP = {
    "profile_parsing":      "profile_parsing_task",
    "connectgraph_builder": "connectgraph_builder_task",
    "opportunity_detection":"opportunity_detection_task",
    "outreach":             "outreach_task",
    "event_recommender":    "event_recommender_task",
    "follow_up_lifecycle":  "followup_lifecycle_task",
    "analytics":            "analytics_refresh_task",
}


def run():
    import redis
    r = redis.from_url(settings.redis_url, decode_responses=True)
    pubsub = r.pubsub()
    channels = list(EVENT_TO_AGENT.keys())
    pubsub.subscribe(*channels)

    db = MongoClient(settings.mongodb_uri).connectsphere
    logger.info(f"[Subscriber] Listening on {len(channels)} channels")

    from .celery_app import celery_app

    for message in pubsub.listen():
        if message["type"] != "message":
            continue

        channel = message["channel"]
        try:
            payload = json.loads(message["data"])
        except (json.JSONDecodeError, TypeError):
            continue

        agent_name = EVENT_TO_AGENT.get(channel)
        task_name = TASK_MAP.get(agent_name)
        if not task_name:
            continue

        user_id = payload.get("user_id")
        if not user_id:
            continue
        user_oid = to_object_id(user_id)

        # Check if a job_id is already provided (from Node.js)
        job_id = payload.get("job_id") or str(uuid.uuid4())
        payload["job_id"] = job_id
        payload["trigger_event"] = channel

        # Ensure agent_jobs record exists — upsert so Node.js-created docs are found
        # Use $set for agent_name/trigger_event so Python always wins on metadata,
        # but only set status/user_id if inserting new (Node.js may have set them).
        db.agent_jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {"agent_name": agent_name, "trigger_event": channel},
                "$setOnInsert": {
                    "job_id": job_id, "user_id": user_oid,
                    "status": "queued", "input": payload,
                },
            },
            upsert=True,
        )

        # Handle batch outreach: fan out to individual tasks
        if channel == "outreach_batch_requested":
            contact_ids = payload.get("contact_ids", [])
            contact_jobs = payload.get("contact_jobs", [])
            for i, cid in enumerate(contact_ids):
                individual_job_id = (
                    contact_jobs[i]["job_id"] if i < len(contact_jobs) else str(uuid.uuid4())
                )
                celery_app.send_task("outreach_task", args=[{
                    **payload,
                    "job_id": individual_job_id,
                    "contact_id": cid,
                }])
        else:
            celery_app.send_task(task_name, args=[payload])

        logger.info(f"[Subscriber] {channel} → {task_name} (job_id={job_id})")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
