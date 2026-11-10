import time
import threading
import logging
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import get_db, close_db
from .routes import compliance, agents, dlq

logger = logging.getLogger(__name__)

def _run_bridge_forever():
    """
    Previously this thread's death was invisible: /health stayed "ok" because
    it never checked anything but its own process being up, so the entire
    Node→Python event pipeline could be silently dead while health checks
    stayed green. Two fixes: (1) the bridge itself writes a heartbeat key to
    Redis every loop iteration (see redis_stream_consumer.HEARTBEAT_KEY),
    which /health now checks freshness of; (2) this wrapper restarts the
    bridge if it ever exits instead of letting the thread just end.
    """
    from .redis_stream_consumer import run
    while True:
        try:
            run()
            logger.error("[Bridge] run() returned unexpectedly — restarting in 3s")
        except Exception as e:
            logger.error(f"[Bridge] crashed: {e} — restarting in 3s")
        time.sleep(3)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    get_db()
    thread = threading.Thread(target=_run_bridge_forever, daemon=True, name="redis-stream-bridge")
    thread.start()
    logger.info("[Bridge] Redis stream bridge thread started")
    yield
    # Shutdown
    await close_db()


app = FastAPI(title="ConnectSphere Agent Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Internal secret middleware ───────────────────────────────────────────────

def require_internal_secret(x_internal_secret: str = Header(None)):
    if x_internal_secret != settings.internal_service_secret:
        raise HTTPException(status_code=403, detail="Forbidden: invalid internal secret")

# ─── Routes ───────────────────────────────────────────────────────────────────

app.include_router(compliance.router, prefix="/internal", tags=["internal"])
app.include_router(agents.router, prefix="/internal", tags=["agents"])
app.include_router(dlq.router, prefix="/internal", tags=["dlq"])

@app.get("/health")
async def health():
    """
    Was: always {"status": "ok"} regardless of whether the bridge thread that
    actually moves events from Node to Celery was alive. Now checks the
    bridge's heartbeat freshness in Redis — a stale/missing heartbeat means
    the event pipeline is down even though this HTTP server is still up.
    """
    from .redis_stream_consumer import HEARTBEAT_KEY, HEARTBEAT_TTL_SEC
    import redis as sync_redis

    bridge_status = "unknown"
    bridge_age_sec = None
    try:
        r = sync_redis.from_url(settings.redis_url, decode_responses=True)
        ts = r.get(HEARTBEAT_KEY)
        if ts is None:
            bridge_status = "down"
        else:
            bridge_age_sec = round(time.time() - float(ts), 1)
            bridge_status = "ok" if bridge_age_sec <= HEARTBEAT_TTL_SEC else "stale"
    except Exception as e:
        bridge_status = f"error: {e}"

    overall_ok = bridge_status == "ok"
    body = {
        "status": "ok" if overall_ok else "degraded",
        "service": "python-agent",
        "bridge": {"status": bridge_status, "heartbeat_age_sec": bridge_age_sec},
    }
    if not overall_ok:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content=body)
    return body
