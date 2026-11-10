"""Base utilities shared across all agent tasks."""
import time
import asyncio
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from ..config import settings
import redis as sync_redis


def get_sync_db():
    """Synchronous MongoDB client for use inside Celery tasks."""
    from pymongo import MongoClient
    client = MongoClient(settings.mongodb_uri)
    return client.connectsphere


def get_redis():
    return sync_redis.from_url(settings.redis_url, decode_responses=True)


def to_object_id(value):
    """Convert an ObjectId-like value into a real ObjectId when possible."""
    if value is None or isinstance(value, ObjectId):
        return value
    try:
        text = str(value)
        return ObjectId(text) if ObjectId.is_valid(text) else value
    except Exception:
        return value


def to_string_id(value):
    return str(value) if value is not None else None


def update_job_status(db, job_id: str, status: str, output=None, errors=None,
                      explanation="", evidence=None, confidence=None, duration_ms=None):
    """Update agent_jobs document and push lightweight status to Redis."""
    update = {
        "status": status,
        "explanation": explanation,
    }
    if output is not None:
        update["output"] = output
    if errors is not None:
        update["errors"] = errors
    if evidence is not None:
        update["evidence"] = evidence
    if confidence is not None:
        update["confidence"] = confidence
    if duration_ms is not None:
        update["duration_ms"] = duration_ms
    if status == "running":
        update["started_at"] = datetime.utcnow()
    elif status in ("success", "partial", "failed"):
        update["completed_at"] = datetime.utcnow()

    db.agent_jobs.update_one({"job_id": job_id}, {"$set": update})

    # Lightweight status in Redis for fast polling
    r = get_redis()
    r.set(f"job:status:{job_id}", status, ex=172800)  # 48h TTL


def publish_ws_event(user_id: str, event: dict):
    """Publish WebSocket push event via Redis so Node.js delivers it to the client."""
    import json
    r = get_redis()
    r.publish(f"ws:push:{user_id}", json.dumps(event))


# ─── AI usage / cost logging ──────────────────────────────────────────────────
#
# Approximate Anthropic list pricing, $ per token (i.e. per-million-token price / 1e6).
# These are point-in-time approximations, not fetched from a pricing API — verify
# against https://www.anthropic.com/pricing before treating derived costs as exact.
_CLAUDE_PRICING_PER_TOKEN = {
    "claude-haiku-4-5-20251001":  {"input": 1.00e-6, "output": 5.00e-6},
    "claude-3-5-haiku-20241022":  {"input": 0.80e-6, "output": 4.00e-6},
    "claude-sonnet-4-6":          {"input": 3.00e-6, "output": 15.00e-6},
    "claude-3-5-sonnet-20241022": {"input": 3.00e-6, "output": 15.00e-6},
}
_DEFAULT_PRICING = {"input": 1.00e-6, "output": 5.00e-6}  # fallback for unlisted models


def log_ai_usage(db, user_id, feature: str, model: str, response, start_time: float,
                  success: bool = True, error_message: str = None, request_data: dict = None):
    """
    Record one LLM call to ai_usage_logs — token counts, derived cost, and
    measured latency. Call this around every real API attempt (not the
    no-API-key template/keyword fallback, which never makes a request).

    `response` is the langchain response object (or None on failure);
    `start_time` is time.time() captured immediately before llm.invoke().
    """
    latency_ms = int((time.time() - start_time) * 1000)
    prompt_tokens = completion_tokens = 0
    estimated = False

    usage = getattr(response, "usage_metadata", None) if response is not None else None
    if usage:
        prompt_tokens = usage.get("input_tokens", 0)
        completion_tokens = usage.get("output_tokens", 0)
    elif response is not None:
        # langchain/provider didn't attach usage metadata — fall back to a
        # rough chars/4 estimate so we still have *a* number, flagged as such.
        estimated = True
        content = getattr(response, "content", "") or ""
        completion_tokens = max(1, len(str(content)) // 4)
        prompt_tokens = max(1, len(str(request_data.get("prompt", ""))) // 4) if request_data else 0

    total_tokens = prompt_tokens + completion_tokens
    pricing = _CLAUDE_PRICING_PER_TOKEN.get(model, _DEFAULT_PRICING)
    cost = round(prompt_tokens * pricing["input"] + completion_tokens * pricing["output"], 6)

    try:
        now = datetime.utcnow()
        db.ai_usage_logs.insert_one({
            "user_id": to_object_id(user_id),
            "feature": feature,
            "model": model or "",
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost": cost,
            "request_data": {**(request_data or {}), "estimated_tokens": estimated},
            "response_data": {"content_preview": str(getattr(response, "content", ""))[:200]} if response else {},
            "latency_ms": latency_ms,
            "success": success,
            "error_message": error_message,
            "created_at": now, "createdAt": now, "updatedAt": now,
        })
    except Exception as e:
        # Logging must never break the actual task.
        print(f"[log_ai_usage] failed to write usage log (non-fatal): {e}")

    return {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens,
            "cost": cost, "latency_ms": latency_ms}


# ─── Dead-letter queue ────────────────────────────────────────────────────────

def retry_or_deadletter(task_self, db, task_name: str, payload: dict, exc: Exception):
    """
    Call from a task's `except` block instead of `raise self.retry(...)` directly.

    Celery's own retry bookkeeping (task_max_retries=3, exponential backoff) is
    unchanged — this just adds a landing spot for what happens after retries are
    exhausted. Previously that case just re-raised and the task vanished: it's
    marked "failed" in agent_jobs, but nothing queues it anywhere for a human to
    inspect or resubmit. This writes the full payload + exception + traceback to
    `dead_letters` on the terminal attempt, then re-raises so Celery still marks
    the task failed (agent_jobs / job:status stay consistent) — this does not
    replace update_job_status, callers still call that themselves.

    Returns by raising: either `self.retry(...)` (attempts remain) or the
    original exception (exhausted — already logged to the DLQ).
    """
    import json as _json
    import traceback

    if task_self.request.retries < task_self.max_retries:
        raise task_self.retry(exc=exc, countdown=2 ** task_self.request.retries)

    try:
        db.dead_letters.insert_one({
            "task_name": task_name,
            "job_id": payload.get("job_id"),
            "user_id": to_object_id(payload.get("user_id")),
            "payload": _json.loads(_json.dumps(payload, default=str)),  # strip non-JSON types
            "exception": str(exc),
            "traceback": traceback.format_exc(),
            "attempts": task_self.request.retries + 1,
            "created_at": datetime.utcnow(),
            "replayed_at": None,
            "replay_job_id": None,
        })
    except Exception as log_exc:
        print(f"[retry_or_deadletter] failed to write dead letter (non-fatal): {log_exc}")

    raise exc


def cosine_similarity(vec_a: list, vec_b: list) -> float:
    """Compute cosine similarity between two vectors."""
    import math
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)
