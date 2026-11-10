import Redis from 'ioredis';
import { config } from '../config.js';

// Primary client for commands & publishing
export const redisClient = new Redis(config.redis.url, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

// Dedicated subscriber client (can't issue regular commands once subscribed)
export const subscriber = new Redis(config.redis.url, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redisClient.on('error', (err) => console.error('[Redis] Client error:', err));
subscriber.on('error', (err) => console.error('[Redis] Subscriber error:', err));

// ─── Key helpers ──────────────────────────────────────────────────────────────

export const keys = {
  opportunities: (campaignId) => `opportunities:${campaignId}`,
  eventsRec:     (userId)     => `events:recommendations:${userId}`,
  analytics:     (userId)     => `analytics:${userId}`,
  graphNodes:    (userId)     => `graph:v2:${userId}:nodes`,
  rateLimit:     (userId)     => `rate_limit:${userId}:daily`,
  session:       (jti)        => `session:${jti}`,
  jobStatus:     (jobId)      => `job:status:${jobId}`,
  wsUser:        (userId)     => `ws:user:${userId}`,
};

// ─── TTLs (seconds) ───────────────────────────────────────────────────────────

export const ttl = {
  opportunities: 6 * 3600,   // 6 hours
  eventsRec:     24 * 3600,  // 24 hours
  analytics:     3600,        // 1 hour
  graphNodes:    30 * 60,     // 30 minutes
  jobStatus:     48 * 3600,   // 48 hours
};

// ─── Pub/Sub event types ──────────────────────────────────────────────────────

export const EVENTS = {
  CONTACT_IMPORTED:              'contact_imported',
  PROFILES_ENRICHED:             'profiles_enriched',
  GRAPH_UPDATED:                 'graph_updated',
  CAMPAIGN_CREATED:              'campaign_created',
  CAMPAIGN_GOAL_UPDATED:         'campaign_goal_updated',
  OUTREACH_REQUESTED:            'outreach_requested',
  OUTREACH_BATCH_REQUESTED:      'outreach_batch_requested',
  REGENERATE_DRAFT:              'regenerate_draft',
  MESSAGE_SENT:                  'message_sent',
  INTERACTION_RECEIVED:          'interaction_received',
  PRE_EVENT_OUTREACH_REQUESTED:  'pre_event_outreach_requested',
  EVENTS_IMPORTED:               'events_imported',
  DAILY_REMINDER_TRIGGER:        'daily_reminder_trigger',
  CONTACT_STALE_CHECK:           'contact_stale_check',
  DAILY_EVENTS_TRIGGER:          'daily_events_trigger',
  DAILY_RECOMMENDATION_TRIGGER:  'daily_recommendation_trigger',
  ANALYTICS_REFRESH_TRIGGER:     'analytics_refresh_trigger',
  WEEKLY_INSIGHTS_TRIGGER:       'weekly_insights_trigger',
};

// ─── Helper: publish event ────────────────────────────────────────────────────
//
// XADD, not PUBLISH: the Node→Python agent-trigger bridge (app/redis_stream_consumer.py)
// now consumes these as a Redis Stream with a consumer group instead of pub/sub, so a
// bridge outage no longer silently drops the event — it stays in the stream until a
// consumer acks it. Call sites are unchanged; only the transport underneath moved.
// ws:push:{userId} (websocket delivery, see wsServer.js) deliberately still uses
// plain PUBLISH below — that one doesn't need durability, see redis_stream_consumer.py
// for why.

export async function publishEvent(channel, payload) {
  await redisClient.xadd(channel, '*', 'payload', JSON.stringify(payload));
}

// ─── Helper: get/set JSON with TTL ───────────────────────────────────────────

export async function getCache(key) {
  const val = await redisClient.get(key);
  return val ? JSON.parse(val) : null;
}

export async function setCache(key, value, ttlSeconds) {
  await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function delCache(key) {
  await redisClient.del(key);
}
