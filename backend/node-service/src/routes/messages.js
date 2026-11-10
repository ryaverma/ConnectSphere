import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { publishEvent, EVENTS } from '../services/redis.js';
import { emitToUser } from '../websocket/wsServer.js';
import { config } from '../config.js';
import Message from '../models/Message.js';
import Interaction from '../models/Interaction.js';
import Campaign from '../models/Campaign.js';
import AgentJob from '../models/AgentJob.js';
import Contact from '../models/Contact.js';
import { recalculateStrengthScore } from './contacts.js';

/**
 * Recompute a campaign's stats by aggregating the real message statuses.
 * Called whenever a message belonging to a campaign changes status.
 */
async function syncCampaignStats(campaignId) {
  if (!campaignId) return;
  const counts = await Message.aggregate([
    { $match: { campaign_id: campaignId, deleted_at: null } },
    {
      $group: {
        _id: null,
        total:   { $sum: 1 },
        sent:    { $sum: { $cond: [{ $in: ['$status', ['sent', 'opened', 'replied', 'bounced']] }, 1, 0] } },
        opened:  { $sum: { $cond: [{ $eq: ['$status', 'opened'] }, 1, 0] } },
        replied: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
      },
    },
  ]);
  const s = counts[0] || { total: 0, sent: 0, opened: 0, replied: 0, bounced: 0 };
  await Campaign.findByIdAndUpdate(campaignId, {
    'stats.total_contacts': s.total,
    'stats.sent':    s.sent,
    'stats.opened':  s.opened,
    'stats.replied': s.replied,
    'stats.bounced': s.bounced,
  });
}

const router = Router();
router.use(authenticate);

// 30 message creates / 15 minutes per user
const messageCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => String(req.user._id),
  handler: (_req, res) => res.status(429).json({ error: 'Too many messages created. Please wait before trying again.' }),
  standardHeaders: true,
  legacyHeaders: false,
});

// 20 AI generation requests / 15 minutes per user
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.user._id),
  handler: (_req, res) => res.status(429).json({ error: 'AI generation rate limit reached. Please wait before generating more messages.' }),
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /api/messages
router.get('/', async (req, res) => {
  const { status, campaign_id, contact_id, variant, page = 1, limit = 20 } = req.query;
  const filter = { user_id: req.user._id, deleted_at: null };
  if (status) filter.status = status;
  if (campaign_id) filter.campaign_id = campaign_id;
  if (contact_id) filter.contact_id = contact_id;
  if (variant) filter.variant = variant;
  const skip = (Number(page) - 1) * Number(limit);
  const [messages, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Message.countDocuments(filter),
  ]);
  res.json({ messages, total });
});

// GET /api/messages/:id
router.get('/:id', async (req, res) => {
  const msg = await Message.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null }).lean();
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  res.json(msg);
});

// POST /api/messages — create draft
router.post('/', messageCreateLimiter, async (req, res) => {
  const message = await Message.create({ ...req.body, user_id: req.user._id });
  res.status(201).json(message);
});

// PATCH /api/messages/:id
router.patch('/:id', async (req, res) => {
  delete req.body.user_id;
  const msg = await Message.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id, deleted_at: null },
    { $set: req.body }, { new: true },
  );
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  res.json(msg);
});

// DELETE /api/messages/:id
router.delete('/:id', async (req, res) => {
  await Message.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id, deleted_at: null },
    { deleted_at: new Date() },
  );
  res.json({ message: 'Message deleted' });
});

// POST /api/messages/generate — async outreach generation
router.post('/generate', generateLimiter, async (req, res) => {
  const { campaign_id, contact_id, tone } = req.body;
  if (!contact_id) return res.status(400).json({ error: 'contact_id required' });

  const campaign = campaign_id
    ? await Campaign.findOne({ _id: campaign_id, user_id: req.user._id }).lean()
    : null;

  const job_id = uuidv4();
  await AgentJob.create({
    job_id, user_id: req.user._id, agent_name: 'outreach',
    trigger_event: EVENTS.OUTREACH_REQUESTED, status: 'queued',
    input: { campaign_id, contact_id, goal_text: campaign?.goal || '', tone },
  });
  await publishEvent(EVENTS.OUTREACH_REQUESTED, {
    job_id, user_id: req.user._id, campaign_id, contact_id,
    goal_text: campaign?.goal || '', tone: tone || 'professional',
  });
  res.json({ job_id });
});

// POST /api/messages/:id/regenerate
router.post('/:id/regenerate', async (req, res) => {
  const msg = await Message.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null }).lean();
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const job_id = uuidv4();
  await AgentJob.create({
    job_id, user_id: req.user._id, agent_name: 'outreach',
    trigger_event: EVENTS.REGENERATE_DRAFT, status: 'queued',
    input: { message_id: msg._id, contact_id: msg.contact_id, campaign_id: msg.campaign_id,
             tone: req.body.tone || msg.tone, variant: req.body.variant || msg.variant },
  });
  await publishEvent(EVENTS.REGENERATE_DRAFT, {
    job_id, user_id: req.user._id, message_id: String(msg._id),
    contact_id: String(msg.contact_id), campaign_id: String(msg.campaign_id),
    tone: req.body.tone || msg.tone, variant: req.body.variant || msg.variant,
  });
  res.json({ job_id });
});

// POST /api/messages/:id/send
router.post('/:id/send', async (req, res) => {
  const msg = await Message.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null });
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  // Synchronous compliance check (600ms timeout)
  let compliance;
  try {
    const resp = await axios.post(
      `${config.pythonService.url}/internal/compliance/check`,
      { user_id: req.user._id, contact_id: msg.contact_id, message_body: msg.body },
      { headers: { 'x-internal-secret': config.pythonService.internalSecret }, timeout: 600 },
    );
    compliance = resp.data;
  } catch (err) {
    // Fail open with warning
    console.warn('[Compliance] Check failed — failing open:', err.message);
    compliance = { approved: true, spam_score: 0, checks: {}, block_reason: null, suggestions: [] };
  }

  msg.compliance_check = compliance;

  if (!compliance.approved) {
    msg.status = 'blocked';
    await msg.save();
    return res.status(422).json({
      error: 'Message blocked by compliance check',
      block_reason: compliance.block_reason,
      suggestions: compliance.suggestions,
      compliance_check: compliance,
    });
  }

  // Mark sent
  const sentAt = new Date();
  msg.status = 'sent';
  msg.sent_at = sentAt;
  await msg.save();

  // Log interaction
  await Interaction.create({
    user_id: req.user._id, contact_id: msg.contact_id, type: 'outreach_sent',
    direction: 'outbound', title: msg.subject || 'Outreach sent',
    interaction_date: sentAt, message_id: msg._id,
  });

  await Contact.findByIdAndUpdate(msg.contact_id, {
    $set: {
      last_interaction_at: sentAt,
      last_outreach_at: sentAt,
      status: 'active',
    },
  });

  // Keep campaign stats and contact score current
  await syncCampaignStats(msg.campaign_id);
  await recalculateStrengthScore(msg.contact_id);

  // Publish for Follow-up Lifecycle Agent
  await publishEvent(EVENTS.MESSAGE_SENT, {
    user_id: req.user._id, message_id: msg._id, contact_id: msg.contact_id,
    campaign_id: msg.campaign_id, sent_at: sentAt, send_via: 'sendgrid',
  });

  res.json({ status: 'sent', sent_at: sentAt, compliance_check: compliance });
});

// POST /api/messages/:id/schedule
router.post('/:id/schedule', async (req, res) => {
  const { scheduled_for } = req.body;
  if (!scheduled_for) return res.status(400).json({ error: 'scheduled_for required' });

  const msg = await Message.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null });
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  // Pre-schedule compliance check
  let compliance;
  try {
    const resp = await axios.post(
      `${config.pythonService.url}/internal/compliance/check`,
      { user_id: req.user._id, contact_id: msg.contact_id, message_body: msg.body },
      { headers: { 'x-internal-secret': config.pythonService.internalSecret }, timeout: 600 },
    );
    compliance = resp.data;
  } catch {
    compliance = { approved: true, spam_score: 0, checks: {}, block_reason: null, suggestions: [] };
  }

  if (!compliance.approved) {
    msg.status = 'blocked';
    msg.compliance_check = compliance;
    await msg.save();
    return res.status(422).json({ error: 'Message blocked', block_reason: compliance.block_reason });
  }

  msg.status = 'scheduled';
  msg.scheduled_for = new Date(scheduled_for);
  msg.compliance_check = compliance;
  await msg.save();
  await syncCampaignStats(msg.campaign_id);
  res.json(msg);
});

// Tracking
router.post('/:id/track-open', async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, {
    $inc: { open_count: 1 }, $set: { opened_at: new Date() },
  });
  res.json({ ok: true });
});

router.post('/:id/track-click', async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { $inc: { click_count: 1 } });
  res.json({ ok: true });
});

export default router;
