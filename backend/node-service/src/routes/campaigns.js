import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { publishEvent, EVENTS, getCache, keys } from '../services/redis.js';
import Campaign from '../models/Campaign.js';
import CampaignContact from '../models/CampaignContact.js';
import Contact from '../models/Contact.js';
import AgentJob from '../models/AgentJob.js';
import Message from '../models/Message.js';

const router = Router();
router.use(authenticate);

// GET /api/campaigns
router.get('/', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { user_id: req.user._id, deleted_at: null };
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [campaigns, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Campaign.countDocuments(filter),
  ]);
  res.json({ campaigns, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// GET /api/campaigns/:id
router.get('/:id', async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null }).lean();
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const contacts = await CampaignContact.find({ campaign_id: campaign._id })
    .populate('contact_id', 'name email title company avatar_color initials strength_score')
    .sort({ sequence_position: 1 }).lean();

  res.json({ ...campaign, contacts });
});

// POST /api/campaigns
router.post('/', async (req, res) => {
  const campaign = await Campaign.create({ ...req.body, user_id: req.user._id });
  const job_id = uuidv4();
  await AgentJob.create({
    job_id, user_id: req.user._id, agent_name: 'opportunity_detection',
    trigger_event: EVENTS.CAMPAIGN_CREATED, status: 'queued',
    input: { campaign_id: campaign._id, goal_text: campaign.goal },
  });
  await publishEvent(EVENTS.CAMPAIGN_CREATED, {
    job_id, user_id: req.user._id, campaign_id: campaign._id, goal_text: campaign.goal,
  });
  res.status(201).json({ campaign, job_id });
});

// PATCH /api/campaigns/:id
router.patch('/:id', async (req, res) => {
  delete req.body.user_id;
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id, deleted_at: null },
    { $set: req.body }, { new: true },
  );
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  // Re-trigger opportunity detection if goal changed
  if (req.body.goal) {
    const job_id = uuidv4();
    await AgentJob.create({
      job_id, user_id: req.user._id, agent_name: 'opportunity_detection',
      trigger_event: EVENTS.CAMPAIGN_GOAL_UPDATED, status: 'queued',
      input: { campaign_id: campaign._id, goal_text: campaign.goal },
    });
    await publishEvent(EVENTS.CAMPAIGN_GOAL_UPDATED, {
      job_id, user_id: req.user._id, campaign_id: campaign._id, goal_text: campaign.goal,
    });
    return res.json({ campaign, job_id });
  }
  res.json(campaign);
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res) => {
  const campaign = await Campaign.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id, deleted_at: null },
    { deleted_at: new Date() }, { new: true },
  );
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json({ message: 'Campaign deleted' });
});

// GET /api/campaigns/:id/opportunities — reads from Redis or DB
router.get('/:id/opportunities', async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null }).lean();
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const cached = await getCache(keys.opportunities(campaign._id));
  if (cached) return res.json({ opportunities: cached, source: 'cache' });

  const contacts = await CampaignContact.find({ campaign_id: campaign._id })
    .populate('contact_id', 'name email title company avatar_color initials strength_score skills mutual_connections')
    .sort({ relevance_score: -1 }).lean();

  res.json({ opportunities: contacts, source: 'db' });
});

// POST /api/campaigns/:id/select — generate outreach batch
router.post('/:id/select', async (req, res) => {
  const { contact_ids = [] } = req.body;
  if (!contact_ids.length) return res.status(400).json({ error: 'contact_ids required' });

  const campaign = await Campaign.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null }).lean();
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const batch_job_id = uuidv4();
  const contact_jobs = contact_ids.map((contact_id) => ({ contact_id, job_id: uuidv4() }));

  // Finalize the campaign audience to only the contacts the user explicitly selected.
  await CampaignContact.deleteMany({
    campaign_id: campaign._id,
    contact_id: { $nin: contact_ids },
  });
  await Promise.all(contact_ids.map((contact_id, index) =>
    CampaignContact.findOneAndUpdate(
      { campaign_id: campaign._id, contact_id },
      {
        $set: {
          sequence_position: index + 1,
          status: 'pending',
        },
      },
      { upsert: true, new: true },
    )
  ));
  await Campaign.findByIdAndUpdate(campaign._id, {
    $set: { 'stats.total_contacts': contact_ids.length },
  });
  await Message.updateMany(
    {
      campaign_id: campaign._id,
      deleted_at: null,
      status: { $in: ['draft', 'pending_approval', 'scheduled'] },
    },
    { $set: { deleted_at: new Date() } },
  );

  // Create individual AgentJob records
  await AgentJob.insertMany(contact_jobs.map(({ contact_id, job_id }) => ({
    job_id, user_id: req.user._id, agent_name: 'outreach',
    trigger_event: EVENTS.OUTREACH_BATCH_REQUESTED, status: 'queued',
    input: { campaign_id: campaign._id, contact_id, goal_text: campaign.goal, tone: campaign.tone },
  })));

  await publishEvent(EVENTS.OUTREACH_BATCH_REQUESTED, {
    user_id: req.user._id, campaign_id: campaign._id,
    contact_ids, goal_text: campaign.goal, tone: campaign.tone, batch_job_id, contact_jobs,
  });

  res.json({ batch_job_id, contact_jobs });
});

// POST /api/campaigns/:id/contacts — add contacts
router.post('/:id/contacts', async (req, res) => {
  const { contact_ids = [], sequence_position } = req.body;
  const docs = contact_ids.map((contact_id, i) => ({
    campaign_id: req.params.id, contact_id, sequence_position: sequence_position || i + 1,
  }));
  await CampaignContact.insertMany(docs, { ordered: false }).catch(() => {});
  res.status(201).json({ added: docs.length });
});

// DELETE /api/campaigns/:id/contacts/:contact_id
router.delete('/:id/contacts/:contact_id', async (req, res) => {
  await CampaignContact.deleteOne({ campaign_id: req.params.id, contact_id: req.params.contact_id });
  res.json({ message: 'Contact removed from campaign' });
});

// Status transitions
const statusTransitions = { start: 'active', pause: 'paused', complete: 'completed' };
for (const [action, status] of Object.entries(statusTransitions)) {
  router.post(`/:id/${action}`, async (req, res) => {
    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user._id, deleted_at: null },
      { status, ...(status === 'active' ? { started_at: new Date() } : {}),
        ...(status === 'completed' ? { completed_at: new Date() } : {}) },
      { new: true },
    );
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  });
}

// GET /api/campaigns/:id/analytics
router.get('/:id/analytics', async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null })
    .select('stats').lean();
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign.stats);
});

export default router;
