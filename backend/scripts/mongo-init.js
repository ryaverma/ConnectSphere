// MongoDB initialization script — creates connectsphere DB and app user
db = db.getSiblingDB('connectsphere');

// Password is passed in from docker-compose (MONGO_APP_PASSWORD in backend/.env).
const appPassword = process.env.MONGO_APP_PASSWORD;
if (!appPassword) {
  throw new Error('MONGO_APP_PASSWORD is not set');
}

db.createUser({
  user: 'connectsphere_app',
  pwd: appPassword,
  roles: [{ role: 'readWrite', db: 'connectsphere' }],
});

// Create indexes for all collections
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ deleted_at: 1 });

db.contacts.createIndex({ user_id: 1 });
db.contacts.createIndex({ status: 1 });
db.contacts.createIndex({ source: 1 });
db.contacts.createIndex({ strength_score: 1 });
db.contacts.createIndex({ last_interaction_at: 1 });
db.contacts.createIndex({ deleted_at: 1 });
db.contacts.createIndex({ user_id: 1, email: 1 }, { unique: true, sparse: true });

db.campaigns.createIndex({ user_id: 1 });
db.campaigns.createIndex({ status: 1 });
db.campaigns.createIndex({ deleted_at: 1 });

db.campaign_contacts.createIndex({ campaign_id: 1 });
db.campaign_contacts.createIndex({ contact_id: 1 });
db.campaign_contacts.createIndex({ campaign_id: 1, contact_id: 1 }, { unique: true });

db.messages.createIndex({ user_id: 1 });
db.messages.createIndex({ contact_id: 1 });
db.messages.createIndex({ campaign_id: 1 });
db.messages.createIndex({ status: 1 });
db.messages.createIndex({ scheduled_for: 1 });
db.messages.createIndex({ deleted_at: 1 });
// Idempotency guard for outreach_task redelivery — see Message.js for the full explanation.
db.messages.createIndex(
  { contact_id: 1, campaign_id: 1, variant: 1 },
  { unique: true, partialFilterExpression: { variant: { $type: 'string' } } },
);

db.dead_letters.createIndex({ task_name: 1 });
db.dead_letters.createIndex({ created_at: -1 });
db.dead_letters.createIndex({ replayed_at: 1 });

db.events.createIndex({ user_id: 1 });
db.events.createIndex({ event_date: 1 });
db.events.createIndex({ type: 1 });
db.events.createIndex({ deleted_at: 1 });

db.event_attendees.createIndex({ event_id: 1 });
db.event_attendees.createIndex({ contact_id: 1 });
db.event_attendees.createIndex({ event_id: 1, contact_id: 1 }, { unique: true });

db.interactions.createIndex({ user_id: 1 });
db.interactions.createIndex({ contact_id: 1 });
db.interactions.createIndex({ interaction_date: -1 });

db.contact_notes.createIndex({ user_id: 1 });
db.contact_notes.createIndex({ contact_id: 1 });

db.reminders.createIndex({ user_id: 1 });
db.reminders.createIndex({ contact_id: 1 });
db.reminders.createIndex({ due_date: 1 });

db.agent_jobs.createIndex({ job_id: 1 }, { unique: true });
db.agent_jobs.createIndex({ user_id: 1 });
db.agent_jobs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

db.analytics_snapshots.createIndex({ user_id: 1 });
db.analytics_snapshots.createIndex({ computed_at: -1 });
db.analytics_snapshots.createIndex({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // 7 days TTL

db.analytics_events.createIndex({ user_id: 1 });
db.analytics_events.createIndex({ event_type: 1 });
db.analytics_events.createIndex({ created_at: -1 });

db.ai_usage_logs.createIndex({ user_id: 1 });
db.ai_usage_logs.createIndex({ created_at: -1 });
db.ai_usage_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

db.notifications.createIndex({ user_id: 1 });
db.notifications.createIndex({ read: 1 });
db.notifications.createIndex({ created_at: -1 });

db.user_integrations.createIndex({ user_id: 1, provider: 1 }, { unique: true });

print('MongoDB initialization complete — connectsphere DB and indexes created.');
