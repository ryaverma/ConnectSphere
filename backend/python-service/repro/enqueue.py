"""Enqueue one outreach_task with the repro sleep hook armed."""
import sys, uuid
sys.path.insert(0, ".")
from app.celery_app import celery_app

USER_ID = sys.argv[1]
CONTACT_ID = sys.argv[2]
CAMPAIGN_ID = sys.argv[3]
SLEEP_SEC = int(sys.argv[4]) if len(sys.argv) > 4 else 8

job_id = str(uuid.uuid4())
payload = {
    "job_id": job_id,
    "user_id": USER_ID,
    "contact_id": CONTACT_ID,
    "campaign_id": CAMPAIGN_ID,
    "tone": "professional",
    "trigger_event": "outreach_batch_requested",  # single "short" variant only
    "_repro_sleep_sec": SLEEP_SEC,
}
celery_app.send_task("outreach_task", args=[payload])
print(f"job_id={job_id}")
