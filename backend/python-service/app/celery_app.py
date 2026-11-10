from celery import Celery
from .config import settings

celery_app = Celery(
    "connectsphere",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.profile_parsing",
        "app.tasks.connectgraph_builder",
        "app.tasks.opportunity_detection",
        "app.tasks.outreach",
        "app.tasks.event_recommender",
        "app.tasks.follow_up_lifecycle",
        "app.tasks.analytics",
        "app.tasks.scheduled",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    worker_concurrency=4,
    worker_pool="threads",          # Python 3.13 + Windows billiard fix
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_max_retries=3,
    task_default_retry_delay=2,  # exponential: 2^n applied in tasks
)

# ─── Celery Beat Schedule ─────────────────────────────────────────────────────
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "daily-recommendation-trigger": {
        "task": "app.tasks.scheduled.daily_recommendation_trigger",
        "schedule": 6 * 3600,  # every 6 hours
    },
    "daily-events-trigger": {
        "task": "app.tasks.scheduled.daily_events_trigger",
        "schedule": 24 * 3600,
    },
    "analytics-refresh-trigger": {
        "task": "app.tasks.scheduled.analytics_refresh_trigger",
        "schedule": 3600,  # every hour
    },
    "weekly-insights-trigger": {
        "task": "app.tasks.scheduled.weekly_insights_trigger",
        "schedule": crontab(hour=6, minute=0, day_of_week=1),  # Monday 6am UTC
    },
    "daily-reminder-trigger": {
        "task": "app.tasks.scheduled.daily_reminder_trigger",
        "schedule": 24 * 3600,
    },
    "integration-sync": {
        "task": "app.tasks.scheduled.integration_sync",
        "schedule": 6 * 3600,
    },
    "send-scheduled-messages": {
        "task": "app.tasks.scheduled.send_scheduled_messages",
        "schedule": 5 * 60,  # every 5 minutes
    },
    "cleanup-stale-data": {
        "task": "app.tasks.scheduled.cleanup_stale_data",
        "schedule": crontab(hour=2, minute=0, day_of_week=0),  # Sunday 2am UTC
    },
}
