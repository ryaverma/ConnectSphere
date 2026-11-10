"""
Redis Streams bridge — bridges Node.js events to Celery tasks.
Run as a standalone process: python -m app.redis_stream_consumer

Replaces app/redis_subscriber_legacy.py (plain pub/sub). Two problems that had
with the old design, and how this fixes them:

1. THROUGHPUT (was issue #3): the old bridge called `pubsub.listen()` and
   handled one message at a time, synchronously, on a single thread, across
   every user in the system — the Mongo upsert + celery_app.send_task() calls
   for user A's import blocked user B's from even being picked up. This
   version dispatches each claimed stream entry to a bounded thread pool, so
   up to CONCURRENCY entries are being upserted/dispatched at once.

2. DURABILITY (was issue #5): Redis pub/sub delivers at-most-once with zero
   persistence — if this process is down (or briefly slow) when Node
   publishes, the event is gone forever, no retry, no trace. Streams persist
   every entry; a consumer group tracks exactly which entries are
   acknowledged. If this process crashes mid-handling, the entry sits in the
   group's pending-entries list (PEL) and _sweep_pending() reclaims and
   retries it — at-least-once delivery. That's why the actual event handler
   (_handle_event) MUST be idempotent — see the (contact_id, campaign_id,
   variant) upsert in outreach.py for the piece that makes redelivery safe.

Node's publishEvent() (services/redis.js) now does XADD instead of PUBLISH;
no call sites in the route files changed.

ws:push:{userId} (WebSocket delivery to a connected browser tab) deliberately
stays on plain pub/sub — it's a live UI nicety, not a business-critical
pipeline stage, and durability there would mean replaying stale UI events to
a client that already reconnected. Only the Node→Python agent-trigger bridge
needed to move.
"""
import json
import time
import uuid
import logging
import traceback
from concurrent.futures import ThreadPoolExecutor
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

GROUP_NAME = "connectsphere-workers"
STREAMS = list(EVENT_TO_AGENT.keys())
CONCURRENCY = 8              # thread pool size — was 1 (strictly sequential) before
CLAIM_IDLE_MS = 30_000       # reclaim entries a dead/stuck consumer held > 30s
MAX_DELIVERIES = 5           # after this many delivery attempts, dead-letter it
HEARTBEAT_KEY = "bridge:heartbeat"
HEARTBEAT_TTL_SEC = 20


def _ensure_groups(r):
    for stream in STREAMS:
        try:
            r.xgroup_create(stream, GROUP_NAME, id="0", mkstream=True)
        except Exception as e:
            if "BUSYGROUP" not in str(e):
                raise


def _deadletter_bridge_message(db, stream: str, payload: dict, error: str):
    try:
        db.dead_letters.insert_one({
            "task_name": f"bridge:{stream}",
            "job_id": payload.get("job_id"),
            "user_id": to_object_id(payload.get("user_id")),
            "payload": payload,
            "exception": error,
            "traceback": "",
            "attempts": MAX_DELIVERIES,
            "created_at": __import__("datetime").datetime.utcnow(),
            "replayed_at": None,
            "replay_job_id": None,
        })
    except Exception as e:
        logger.error(f"[StreamBridge] failed to write dead letter for {stream}: {e}")


def _handle_event(db, celery_app, stream: str, payload: dict):
    """
    Same dispatch logic as the old pub/sub bridge — upsert agent_jobs, fan out
    batch outreach, send_task. Must be safe to run more than once for the same
    payload (at-least-once delivery): agent_jobs upsert is already idempotent
    on job_id, and outreach_task's own draft writes are idempotent (see #1).
    """
    agent_name = EVENT_TO_AGENT.get(stream)
    task_name = TASK_MAP.get(agent_name)
    if not task_name:
        return

    user_id = payload.get("user_id")
    if not user_id:
        return
    user_oid = to_object_id(user_id)

    job_id = payload.get("job_id") or str(uuid.uuid4())
    payload["job_id"] = job_id
    payload["trigger_event"] = stream

    db.agent_jobs.update_one(
        {"job_id": job_id},
        {
            "$set": {"agent_name": agent_name, "trigger_event": stream},
            "$setOnInsert": {
                "job_id": job_id, "user_id": user_oid,
                "status": "queued", "input": payload,
            },
        },
        upsert=True,
    )

    if stream == "outreach_batch_requested":
        contact_ids = payload.get("contact_ids", [])
        contact_jobs = payload.get("contact_jobs", [])
        for i, cid in enumerate(contact_ids):
            individual_job_id = (
                contact_jobs[i]["job_id"] if i < len(contact_jobs) else str(uuid.uuid4())
            )
            celery_app.send_task("outreach_task", args=[{
                **payload, "job_id": individual_job_id, "contact_id": cid,
            }])
    else:
        celery_app.send_task(task_name, args=[payload])

    logger.info(f"[StreamBridge] {stream} → {task_name} (job_id={job_id})")


def _process_entry(r, db, celery_app, stream: str, entry_id: str, fields: dict):
    try:
        raw = fields.get("payload") or fields.get(b"payload")
        payload = json.loads(raw)
        _handle_event(db, celery_app, stream, payload)
        r.xack(stream, GROUP_NAME, entry_id)
    except Exception as e:
        logger.error(f"[StreamBridge] error processing {stream}:{entry_id}: {e}\n{traceback.format_exc()}")
        # Deliberately NOT acking — entry stays in the pending-entries list and
        # _sweep_pending() will reclaim + retry it (or dead-letter it once
        # MAX_DELIVERIES is exceeded).


def _sweep_pending(r, db, celery_app, executor):
    """
    Reclaim entries any consumer has held longer than CLAIM_IDLE_MS without
    acking — covers both a crashed consumer (this process died mid-handle)
    and a handler that raised (see _process_entry). Entries that have already
    been delivered MAX_DELIVERIES times are given up on and dead-lettered
    instead of retried forever.
    """
    for stream in STREAMS:
        try:
            pending = r.xpending_range(stream, GROUP_NAME, min="-", max="+", count=50)
        except Exception:
            continue

        for p in pending:
            entry_id = p["message_id"]
            times_delivered = p["times_delivered"]
            idle_ms = p["time_since_delivered"]
            if idle_ms < CLAIM_IDLE_MS:
                continue

            if times_delivered >= MAX_DELIVERIES:
                try:
                    claimed = r.xclaim(stream, GROUP_NAME, "bridge-sweeper", CLAIM_IDLE_MS, [entry_id])
                    for cid, fields in claimed:
                        raw = fields.get("payload") or fields.get(b"payload")
                        payload = json.loads(raw) if raw else {}
                        _deadletter_bridge_message(db, stream, payload,
                                                    f"exceeded {MAX_DELIVERIES} delivery attempts")
                    r.xack(stream, GROUP_NAME, entry_id)
                except Exception as e:
                    logger.error(f"[StreamBridge] failed to dead-letter {stream}:{entry_id}: {e}")
                continue

            try:
                claimed = r.xclaim(stream, GROUP_NAME, "bridge-sweeper", CLAIM_IDLE_MS, [entry_id])
                for cid, fields in claimed:
                    executor.submit(_process_entry, r, db, celery_app, stream, cid, fields)
            except Exception as e:
                logger.error(f"[StreamBridge] failed to reclaim {stream}:{entry_id}: {e}")


def run():
    import redis
    r = redis.from_url(settings.redis_url, decode_responses=True)
    _ensure_groups(r)

    db = MongoClient(settings.mongodb_uri).connectsphere
    consumer_name = f"bridge-{uuid.uuid4().hex[:8]}"
    logger.info(f"[StreamBridge] Listening on {len(STREAMS)} streams as {consumer_name}, concurrency={CONCURRENCY}")

    from .celery_app import celery_app

    executor = ThreadPoolExecutor(max_workers=CONCURRENCY)
    last_sweep = 0.0

    try:
        while True:
            r.set(HEARTBEAT_KEY, str(time.time()), ex=HEARTBEAT_TTL_SEC)

            try:
                results = r.xreadgroup(
                    GROUP_NAME, consumer_name,
                    {stream: ">" for stream in STREAMS},
                    count=10, block=2000,
                )
            except Exception as e:
                logger.error(f"[StreamBridge] xreadgroup error: {e}")
                time.sleep(1)
                continue

            for stream, entries in (results or []):
                for entry_id, fields in entries:
                    executor.submit(_process_entry, r, db, celery_app, stream, entry_id, fields)

            if time.time() - last_sweep > (CLAIM_IDLE_MS / 1000 / 2):
                _sweep_pending(r, db, celery_app, executor)
                last_sweep = time.time()
    finally:
        executor.shutdown(wait=True)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run()
