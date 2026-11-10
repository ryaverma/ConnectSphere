"""
Scheduled Celery Beat tasks — triggers for all periodic agent runs.
"""
import uuid
from datetime import datetime
from .base import get_sync_db, to_object_id
from ..celery_app import celery_app


def _decrypt_token(ciphertext: str, key: str) -> str:
    """Decrypt AES-256-CBC token encrypted by Node.js service."""
    if not ciphertext or not key:
        return ""
    try:
        import binascii
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        # Node.js stores: iv_hex + ":" + encrypted_hex
        parts = ciphertext.split(":")
        if len(parts) != 2:
            return ""
        iv = binascii.unhexlify(parts[0])
        encrypted = binascii.unhexlify(parts[1])
        # Key must be 32 bytes; hash/truncate
        import hashlib
        key_bytes = hashlib.sha256(key.encode()).digest()
        cipher = Cipher(algorithms.AES(key_bytes), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded = decryptor.update(encrypted) + decryptor.finalize()
        # Remove PKCS7 padding
        pad_len = padded[-1]
        return padded[:-pad_len].decode("utf-8")
    except Exception as e:
        print(f"[scheduled] Token decryption failed: {e}")
        return ""


def _get_all_user_ids(db):
    return [str(u["_id"]) for u in db.users.find({"deleted_at": None}, {"_id": 1})]


@celery_app.task(name="app.tasks.scheduled.daily_recommendation_trigger")
def daily_recommendation_trigger():
    from .opportunity_detection import opportunity_detection_task
    db = get_sync_db()
    for user_id in _get_all_user_ids(db):
        job_id = str(uuid.uuid4())
        user_oid = to_object_id(user_id)
        db.agent_jobs.insert_one({
            "job_id": job_id, "user_id": user_oid, "agent_name": "opportunity_detection",
            "trigger_event": "daily_recommendation_trigger", "status": "queued",
            "input": {"user_id": user_id},
        })
        opportunity_detection_task.delay({"job_id": job_id, "user_id": user_id, "trigger_event": "daily_recommendation_trigger"})


@celery_app.task(name="app.tasks.scheduled.daily_events_trigger")
def daily_events_trigger():
    from .event_recommender import event_recommender_task
    db = get_sync_db()
    for user_id in _get_all_user_ids(db):
        job_id = str(uuid.uuid4())
        user_oid = to_object_id(user_id)
        db.agent_jobs.insert_one({
            "job_id": job_id, "user_id": user_oid, "agent_name": "event_recommender",
            "trigger_event": "daily_events_trigger", "status": "queued",
            "input": {"user_id": user_id},
        })
        event_recommender_task.delay({"job_id": job_id, "user_id": user_id, "trigger_event": "daily_events_trigger"})


@celery_app.task(name="app.tasks.scheduled.analytics_refresh_trigger")
def analytics_refresh_trigger():
    from .analytics import analytics_refresh_task
    db = get_sync_db()
    for user_id in _get_all_user_ids(db):
        job_id = str(uuid.uuid4())
        user_oid = to_object_id(user_id)
        db.agent_jobs.insert_one({
            "job_id": job_id, "user_id": user_oid, "agent_name": "analytics",
            "trigger_event": "analytics_refresh_trigger", "status": "queued",
            "input": {"user_id": user_id},
        })
        analytics_refresh_task.delay({"job_id": job_id, "user_id": user_id, "trigger_event": "analytics_refresh_trigger"})


@celery_app.task(name="app.tasks.scheduled.weekly_insights_trigger")
def weekly_insights_trigger():
    from .analytics import analytics_insights_task
    db = get_sync_db()
    for user_id in _get_all_user_ids(db):
        job_id = str(uuid.uuid4())
        user_oid = to_object_id(user_id)
        db.agent_jobs.insert_one({
            "job_id": job_id, "user_id": user_oid, "agent_name": "analytics",
            "trigger_event": "weekly_insights_trigger", "status": "queued",
            "input": {"user_id": user_id},
        })
        analytics_insights_task.delay({"job_id": job_id, "user_id": user_id})


@celery_app.task(name="app.tasks.scheduled.daily_reminder_trigger")
def daily_reminder_trigger():
    from .follow_up_lifecycle import followup_lifecycle_task
    db = get_sync_db()
    for user_id in _get_all_user_ids(db):
        job_id = str(uuid.uuid4())
        user_oid = to_object_id(user_id)
        db.agent_jobs.insert_one({
            "job_id": job_id, "user_id": user_oid, "agent_name": "follow_up_lifecycle",
            "trigger_event": "daily_reminder_trigger", "status": "queued",
            "input": {"user_id": user_id},
        })
        followup_lifecycle_task.delay({"job_id": job_id, "user_id": user_id, "trigger_event": "daily_reminder_trigger"})


@celery_app.task(name="app.tasks.scheduled.integration_sync")
def integration_sync():
    from ..config import settings
    db = get_sync_db()
    active = list(db.user_integrations.find({"is_active": True}))
    for integration in active:
        provider = integration.get("provider", "")
        user_id_str = str(integration.get("user_id", ""))
        user_oid = to_object_id(user_id_str)
        access_token_enc = integration.get("access_token", "")

        try:
            # Decrypt the token (AES-256-CBC encrypted by Node.js service)
            access_token = _decrypt_token(access_token_enc, settings.encryption_key) if access_token_enc and settings.encryption_key else ""

            if not access_token:
                db.user_integrations.update_one(
                    {"_id": integration["_id"]},
                    {"$set": {"sync_error": "No access token available"}}
                )
                continue

            import httpx
            synced_contacts = 0

            if provider == "github":
                # Fetch GitHub user profile as health check
                resp = httpx.get(
                    "https://api.github.com/user",
                    headers={"Authorization": f"token {access_token}", "Accept": "application/vnd.github.v3+json"},
                    timeout=10,
                )
                if resp.status_code == 401:
                    db.user_integrations.update_one(
                        {"_id": integration["_id"]},
                        {"$set": {"sync_error": "Token expired", "is_active": False}}
                    )
                    continue

                # Fetch following list as contacts
                following_resp = httpx.get(
                    "https://api.github.com/user/following?per_page=50",
                    headers={"Authorization": f"token {access_token}", "Accept": "application/vnd.github.v3+json"},
                    timeout=10,
                )
                if following_resp.status_code == 200:
                    for gh_user in following_resp.json():
                        existing = db.contacts.find_one({"user_id": user_oid, "source": "github", "notes_json.github_data.login": gh_user.get("login")})
                        if not existing:
                            new_contact = {
                                "user_id": user_oid,
                                "name": gh_user.get("name") or gh_user.get("login", ""),
                                "email": gh_user.get("email") or "",
                                "source": "github",
                                "status": "pending",
                                "strength_score": 0,
                                "notes_json": {"github_data": {"login": gh_user.get("login"), "avatar_url": gh_user.get("avatar_url")}},
                                "created_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow(),
                            }
                            result = db.contacts.insert_one(new_contact)
                            from app.tasks.profile_parsing import profile_parsing_task
                            profile_parsing_task.delay({
                                "user_id": user_id_str,
                                "contact_id": str(result.inserted_id),
                                "source": "github",
                            })
                            synced_contacts += 1

            elif provider == "linkedin":
                db.user_integrations.update_one(
                    {"_id": integration["_id"]},
                    {"$set": {"sync_error": "LinkedIn sync not yet implemented — requires LinkedIn API partner access"}}
                )
                continue

            elif provider == "google":
                db.user_integrations.update_one(
                    {"_id": integration["_id"]},
                    {"$set": {"sync_error": "Google sync not yet implemented"}}
                )
                continue

            else:
                db.user_integrations.update_one(
                    {"_id": integration["_id"]},
                    {"$set": {"sync_error": f"Provider '{provider}' not yet implemented"}}
                )
                continue

            # Success
            db.user_integrations.update_one(
                {"_id": integration["_id"]},
                {"$set": {"last_sync_at": datetime.utcnow(), "sync_error": None}}
            )
            print(f"[scheduled] integration_sync: {provider} synced {synced_contacts} new contacts for user {user_id_str}")

        except Exception as e:
            print(f"[scheduled] integration_sync error for {provider}/{user_id_str}: {e}")
            try:
                db.user_integrations.update_one(
                    {"_id": integration["_id"]},
                    {"$set": {"sync_error": str(e)}}
                )
            except Exception:
                pass


@celery_app.task(name="app.tasks.scheduled.send_scheduled_messages")
def send_scheduled_messages():
    """Send messages where scheduled_for <= now and status == 'scheduled'."""
    now = datetime.utcnow()
    db = get_sync_db()
    due = list(db.messages.find({
        "status": "scheduled",
        "scheduled_for": {"$lte": now},
        "deleted_at": None,
    }))
    import os as _os
    sg_key = _os.environ.get("SENDGRID_API_KEY", "")
    from_email = _os.environ.get("FROM_EMAIL", "noreply@connectsphere.io")

    sent_count = 0
    failed_count = 0

    for msg in due:
        try:
            contact = db.contacts.find_one({"_id": msg.get("contact_id")}, {"name": 1, "email": 1})
            user = db.users.find_one({"_id": msg.get("user_id")}, {"name": 1, "email": 1})

            if not contact or not contact.get("email"):
                db.messages.update_one(
                    {"_id": msg["_id"]},
                    {"$set": {"status": "failed", "errors": ["No contact email"]}}
                )
                failed_count += 1
                continue

            if sg_key:
                try:
                    from sendgrid import SendGridAPIClient
                    from sendgrid.helpers.mail import Mail
                    message = Mail(
                        from_email=from_email,
                        to_emails=contact["email"],
                        subject=msg.get("subject") or f"A message from {user.get('name', 'ConnectSphere')}",
                        html_content=msg.get("body") or msg.get("preview") or "",
                    )
                    sg = SendGridAPIClient(sg_key)
                    response = sg.send(message)
                    if response.status_code in (200, 202):
                        db.messages.update_one(
                            {"_id": msg["_id"]},
                            {"$set": {"status": "sent", "sent_at": datetime.utcnow()}}
                        )
                        sent_count += 1
                    else:
                        db.messages.update_one(
                            {"_id": msg["_id"]},
                            {"$set": {"status": "failed", "errors": [f"SendGrid status: {response.status_code}"]}}
                        )
                        failed_count += 1
                except Exception as sg_err:
                    db.messages.update_one(
                        {"_id": msg["_id"]},
                        {"$set": {"status": "failed", "errors": [str(sg_err)]}}
                    )
                    failed_count += 1
            else:
                # Dev simulation: mark as sent without actual email
                db.messages.update_one(
                    {"_id": msg["_id"]},
                    {"$set": {"status": "sent", "sent_at": datetime.utcnow()}}
                )
                sent_count += 1
                print(f"[scheduled] DEV: simulated send to {contact.get('email')} (no SENDGRID_API_KEY)")

        except Exception as e:
            print(f"[scheduled] send_scheduled_messages error for msg {msg.get('_id')}: {e}")
            failed_count += 1
            continue

    print(f"[scheduled] send_scheduled_messages: {sent_count} sent, {failed_count} failed")


@celery_app.task(name="app.tasks.scheduled.cleanup_stale_data")
def cleanup_stale_data():
    """Weekly cleanup of old notifications (> 30 days) and other housekeeping."""
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=30)
    db = get_sync_db()
    db.notifications.delete_many({"created_at": {"$lt": cutoff}, "read": True})
