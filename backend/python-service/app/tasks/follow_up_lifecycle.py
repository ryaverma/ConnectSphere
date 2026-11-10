"""
Agent 6 — Follow-up Lifecycle Agent
Subscribes to: message_sent, daily_reminder_trigger, contact_stale_check, interaction_received
"""
import time
from datetime import datetime, timedelta
from .base import get_sync_db, update_job_status, publish_ws_event, to_object_id, retry_or_deadletter
from ..celery_app import celery_app


@celery_app.task(name="followup_lifecycle_task", bind=True, max_retries=3)
def followup_lifecycle_task(self, payload: dict):
    job_id = payload.get("job_id")
    user_id = payload.get("user_id")
    user_oid = to_object_id(user_id)
    trigger = payload.get("trigger_event", "")

    db = get_sync_db()
    start = time.time()

    try:
        update_job_status(db, job_id, "running")
        publish_ws_event(user_id, {"type": "agent:job_started", "job_id": job_id, "agent_name": "follow_up_lifecycle"})

        reminder_count = 0

        if trigger == "message_sent":
            # Activate cadence for the sent message
            message_id = payload.get("message_id")
            contact_id = payload.get("contact_id")
            # Log interaction
            db.interactions.insert_one({
                "user_id": user_oid,
                "contact_id": to_object_id(contact_id),
                "type": "outreach_sent",
                "direction": "outbound",
                "title": "Outreach sent",
                "interaction_date": datetime.utcnow(),
                "message_id": to_object_id(message_id),
            })

            reminder_due = datetime.utcnow() + timedelta(days=7)
            existing = db.reminders.find_one({
                "user_id": user_oid,
                "contact_id": to_object_id(contact_id),
                "type": "followup_due",
                "status": "pending",
            })
            if not existing:
                contact = db.contacts.find_one({"_id": to_object_id(contact_id)}, {"name": 1})
                contact_name = (contact or {}).get("name", "this contact")
                db.reminders.insert_one({
                    "user_id": user_oid,
                    "contact_id": to_object_id(contact_id),
                    "type": "followup_due",
                    "message": f"Follow up with {contact_name} if you have not heard back",
                    "hook": f"Reconnect with {contact_name} while the conversation is still fresh",
                    "content_suggestion": "Share a brief check-in or a helpful update related to your last outreach",
                    "priority": "medium",
                    "due_date": reminder_due,
                    "status": "pending",
                    "created_by_agent": "follow_up_lifecycle_agent",
                })
                reminder_count += 1

        elif trigger in ("daily_reminder_trigger", "contact_stale_check"):
            # Stale relationship scan
            cutoff = datetime.utcnow() - timedelta(days=90)
            stale = list(db.contacts.find({
                "user_id": user_oid,
                "deleted_at": None,
                "last_interaction_at": {"$lt": cutoff},
                "strength_score": {"$gt": 40},
            }).limit(20))

            for contact in stale:
                # Create reminder
                db.reminders.insert_one({
                    "user_id": user_oid,
                    "contact_id": contact["_id"],
                    "type": "stale_relationship",
                    "message": f"You haven't connected with {contact.get('name')} in over 90 days",
                    "hook": f"Check in with {contact.get('name')} — your relationship is at risk of going cold",
                    "content_suggestion": "Share a relevant article or industry insight",
                    "priority": "high" if contact.get("strength_score", 0) > 70 else "medium",
                    "due_date": datetime.utcnow(),
                    "status": "pending",
                    "created_by_agent": "follow_up_lifecycle_agent",
                })
                reminder_count += 1

        elif trigger == "interaction_received":
            # Cancel pending follow-ups for this contact-campaign
            contact_id = payload.get("contact_id")
            message_id = payload.get("message_id")
            db.messages.update_many(
                {"user_id": user_oid, "contact_id": to_object_id(contact_id),
                 "status": "scheduled", "variant": {"$in": ["followup_1", "followup_2"]}},
                {"$set": {"status": "cancelled"}},
            )
            db.reminders.update_many(
                {
                    "user_id": user_oid,
                    "contact_id": to_object_id(contact_id),
                    "type": "followup_due",
                    "status": "pending",
                },
                {"$set": {"status": "acted", "acted_at": datetime.utcnow()}},
            )
            db.messages.update_many(
                {"user_id": user_oid, "contact_id": to_object_id(contact_id), "_id": to_object_id(message_id)},
                {"$set": {"status": "replied", "replied_at": datetime.utcnow()}},
            )
            db.interactions.insert_one({
                "user_id": user_oid,
                "contact_id": to_object_id(contact_id),
                "type": "response_received",
                "direction": "inbound",
                "title": "Reply received",
                "interaction_date": datetime.utcnow(),
                "message_id": to_object_id(message_id),
            })

        duration_ms = int((time.time() - start) * 1000)
        output = {"reminder_count": reminder_count}
        update_job_status(db, job_id, "success", output=output,
                          explanation=f"Processed {trigger}: {reminder_count} reminders created",
                          duration_ms=duration_ms)

        if reminder_count > 0:
            publish_ws_event(user_id, {
                "type": "agent:reminders_created",
                "user_id": user_id, "reminder_count": reminder_count,
            })

        publish_ws_event(user_id, {
            "type": "agent:job_complete", "job_id": job_id,
            "agent_name": "follow_up_lifecycle", "status": "success",
            "output_summary": f"{reminder_count} reminders created",
        })

    except Exception as exc:
        duration_ms = int((time.time() - start) * 1000)
        update_job_status(db, job_id, "failed", errors=[str(exc)], duration_ms=duration_ms)
        retry_or_deadletter(self, db, "followup_lifecycle_task", payload, exc)
