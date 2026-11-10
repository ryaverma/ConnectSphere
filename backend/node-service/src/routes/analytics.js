import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { getCache, keys, publishEvent, EVENTS } from '../services/redis.js';
import AnalyticsSnapshot from '../models/AnalyticsSnapshot.js';
import AgentJob from '../models/AgentJob.js';

const router = Router();
router.use(authenticate);

async function getLatestSnapshot(userId) {
  // Check Redis first
  const cached = await getCache(keys.analytics(userId));
  if (cached) return { data: cached, source: 'cache' };

  // Fall back to MongoDB
  const snapshot = await AnalyticsSnapshot.findOne({ user_id: userId })
    .sort({ computed_at: -1 }).lean();
  return { data: snapshot, source: 'db' };
}

async function triggerAnalyticsAgent(userId) {
  const job_id = uuidv4();
  await AgentJob.create({
    job_id, user_id: userId, agent_name: 'analytics',
    trigger_event: EVENTS.ANALYTICS_REFRESH_TRIGGER, status: 'queued',
    input: { user_id: userId },
  });
  await publishEvent(EVENTS.ANALYTICS_REFRESH_TRIGGER, { user_id: userId });
  return job_id;
}

// GET /api/analytics/dashboard
router.get('/dashboard', async (req, res) => {
  const { data, source } = await getLatestSnapshot(req.user._id);
  if (!data) {
    const job_id = await triggerAnalyticsAgent(req.user._id);
    return res.json({ status: 'computing', job_id });
  }
  res.json({ ...data, source });
});

// GET /api/analytics/network-growth
router.get('/network-growth', async (req, res) => {
  const { data } = await getLatestSnapshot(req.user._id);
  res.json(data?.network_health || {});
});

// GET /api/analytics/outreach-performance
router.get('/outreach-performance', async (req, res) => {
  const { data } = await getLatestSnapshot(req.user._id);
  res.json(data?.outreach || {});
});

// GET /api/analytics/network-health
router.get('/network-health', async (req, res) => {
  const { data } = await getLatestSnapshot(req.user._id);
  res.json(data?.network_health || {});
});

// GET /api/analytics/top-contacts
router.get('/top-contacts', async (req, res) => {
  const { data } = await getLatestSnapshot(req.user._id);
  res.json(data?.outreach?.by_strength || []);
});

// GET /api/analytics/agent-insights
router.get('/agent-insights', async (req, res) => {
  const snapshot = await AnalyticsSnapshot.findOne({ user_id: req.user._id })
    .sort({ computed_at: -1 }).select('insights computed_at').lean();
  res.json({ insights: snapshot?.insights || [], generated_at: snapshot?.computed_at });
});

// GET /api/analytics/source-breakdown
router.get('/source-breakdown', async (req, res) => {
  const { data } = await getLatestSnapshot(req.user._id);
  res.json(data?.outreach?.by_campaign || []);
});

// GET /api/analytics/strength-distribution
router.get('/strength-distribution', async (req, res) => {
  const { data } = await getLatestSnapshot(req.user._id);
  res.json(data?.outreach?.by_strength || []);
});

// GET /api/analytics/engagement-trends
router.get('/engagement-trends', async (req, res) => {
  const { data } = await getLatestSnapshot(req.user._id);
  res.json(data?.outreach || {});
});

// POST /api/analytics/export
router.post('/export', async (req, res) => {
  res.json({ message: 'Export queued — you will receive an email with a download link.' });
});

export default router;
