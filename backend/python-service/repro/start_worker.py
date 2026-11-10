"""
Start a Celery worker with a short broker visibility_timeout so redelivery
after a hard kill (SIGKILL) happens in seconds instead of the Redis-transport
default of 1 hour. Only affects this process's view of the config — the
checked-in celery_app.py is untouched.
"""
import sys
sys.path.insert(0, ".")
from app.celery_app import celery_app

celery_app.conf.broker_transport_options = {"visibility_timeout": 5}

if __name__ == "__main__":
    worker_name = sys.argv[1] if len(sys.argv) > 1 else "reproworker"
    celery_app.worker_main([
        "worker",
        "--pool=solo",
        "--concurrency=1",
        f"--hostname={worker_name}@%h",
        "--loglevel=INFO",
        "-Q", "celery",
    ])
