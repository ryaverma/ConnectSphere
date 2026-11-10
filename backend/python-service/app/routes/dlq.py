"""
Dead-letter queue — list and replay tasks that exhausted their retries.

Previously a task that failed 3 times just vanished: agent_jobs.status was
marked "failed" with the exception string, but nothing queued it anywhere for
a human to inspect or resubmit. retry_or_deadletter() (app/tasks/base.py) now
writes the full payload + exception + traceback to `dead_letters` on the
terminal attempt; this router lists those and lets you resubmit one.
"""
from fastapi import APIRouter, Depends, Header, HTTPException
from datetime import datetime
from bson import ObjectId
from ..config import settings
from ..database import get_db

router = APIRouter()


def _check_internal_secret(x_internal_secret: str = Header(None)):
    if x_internal_secret != settings.internal_service_secret:
        raise HTTPException(status_code=403, detail="Forbidden")


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    if doc.get("user_id") is not None:
        doc["user_id"] = str(doc["user_id"])
    return doc


@router.get("/dlq")
async def list_dead_letters(
    task_name: str = None,
    include_replayed: bool = False,
    limit: int = 50,
    _: None = Depends(_check_internal_secret),
):
    db = get_db()
    query = {}
    if task_name:
        query["task_name"] = task_name
    if not include_replayed:
        query["replayed_at"] = None

    cursor = db.dead_letters.find(query).sort("created_at", -1).limit(min(limit, 200))
    docs = [_serialize(d) async for d in cursor]
    return {"count": len(docs), "dead_letters": docs}


@router.post("/dlq/{dead_letter_id}/replay")
async def replay_dead_letter(dead_letter_id: str, _: None = Depends(_check_internal_secret)):
    from ..celery_app import celery_app

    db = get_db()
    if not ObjectId.is_valid(dead_letter_id):
        raise HTTPException(status_code=400, detail="Invalid dead_letter_id")

    entry = await db.dead_letters.find_one({"_id": ObjectId(dead_letter_id)})
    if not entry:
        raise HTTPException(status_code=404, detail="Dead letter not found")
    if entry.get("replayed_at"):
        raise HTTPException(status_code=409, detail=f"Already replayed at {entry['replayed_at']}")

    # Fresh job_id — this is a new attempt, not a resumption of the dead one,
    # so it gets its own agent_jobs record and doesn't collide with the old
    # (failed) job_id if a client is still polling it.
    import uuid
    new_payload = {**entry["payload"], "job_id": str(uuid.uuid4())}

    celery_app.send_task(entry["task_name"], args=[new_payload])

    await db.dead_letters.update_one(
        {"_id": entry["_id"]},
        {"$set": {"replayed_at": datetime.utcnow(), "replay_job_id": new_payload["job_id"]}},
    )

    return {"replayed": True, "new_job_id": new_payload["job_id"], "task_name": entry["task_name"]}
