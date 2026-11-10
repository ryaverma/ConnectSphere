import sys, time, uuid
sys.path.insert(0, ".")
from app.celery_app import celery_app
from app.config import settings
import redis

USER_ID, CONTACT_ID, CAMPAIGN_ID = sys.argv[1], sys.argv[2], sys.argv[3]
SLEEP_SEC = int(sys.argv[4]) if len(sys.argv) > 4 else 10

job_id = str(uuid.uuid4())
payload = {
    "job_id": job_id, "user_id": USER_ID, "contact_id": CONTACT_ID,
    "campaign_id": CAMPAIGN_ID, "tone": "professional",
    "trigger_event": "outreach_batch_requested", "_repro_sleep_sec": SLEEP_SEC,
}
celery_app.send_task("outreach_task", args=[payload])
print(f"job_id={job_id}  sent at {time.time()}")

r = redis.from_url(settings.celery_broker_url)
for i in range(6):
    time.sleep(0.5)
    n = r.hlen("unacked")
    print(f"t+{(i+1)*0.5:.1f}s  unacked_len={n}")
