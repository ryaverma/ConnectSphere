import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import AgentJob from '../models/AgentJob.js';
import Event from '../models/Event.js';
import EventAttendee from '../models/EventAttendee.js';
import { authenticate } from '../middleware/auth.js';
import { EVENTS, getCache, keys, publishEvent } from '../services/redis.js';

const router = Router();

router.use(authenticate);

// GET /api/events
router.get('/', async (req, res) => {
  const { type, rsvp_status, page = 1, limit = 20, upcoming, source } = req.query;
  const filter = { $or: [{ user_id: req.user._id }, { user_id: null }], deleted_at: null };
  if (type) filter.type = type;
  if (source) filter.source = source;
  if (rsvp_status) filter.rsvp_status = rsvp_status;
  if (upcoming === 'true') filter.event_date = { $gte: new Date() };

  const skip = (Number(page) - 1) * Number(limit);
  const [events, total] = await Promise.all([
    Event.find(filter).sort({ relevance_score: -1, event_date: 1 }).skip(skip).limit(Number(limit)).lean(),
    Event.countDocuments(filter),
  ]);

  res.json({ events, total });
});

// POST /api/events/sync-ticketmaster
router.post('/sync-ticketmaster', async (req, res) => {
  const job_id = uuidv4();
  await AgentJob.create({
    job_id,
    user_id: req.user._id,
    agent_name: 'event_recommender',
    trigger_event: EVENTS.DAILY_EVENTS_TRIGGER,
    status: 'queued',
    input: { user_id: req.user._id, sync_ticketmaster: true },
  });

  await publishEvent(EVENTS.DAILY_EVENTS_TRIGGER, {
    job_id,
    user_id: req.user._id,
    sync_ticketmaster: true,
  });

  res.json({ status: 'queued', job_id });
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, deleted_at: null }).lean();
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// POST /api/events
router.post('/', async (req, res) => {
  const event = await Event.create({ ...req.body, user_id: req.user._id, source: 'manual' });
  res.status(201).json(event);
});

// PATCH /api/events/:id
router.patch('/:id', async (req, res) => {
  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id, deleted_at: null },
    { $set: req.body },
    { new: true },
  );
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res) => {
  await Event.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id, deleted_at: null },
    { deleted_at: new Date() },
  );
  res.json({ message: 'Event deleted' });
});

// POST /api/events/:id/rsvp
router.post('/:id/rsvp', async (req, res) => {
  const { status } = req.body;
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { rsvp_status: status, rsvp_at: new Date() },
    { new: true },
  );
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// GET /api/events/:id/attendees
router.get('/:id/attendees', async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, deleted_at: null }).select('predicted_attendees').lean();
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event.predicted_attendees || []);
});

// POST /api/events/:id/add-contact
router.post('/:id/add-contact', async (req, res) => {
  const { contact_id, rsvp_status = 'going' } = req.body;
  const attendee = await EventAttendee.findOneAndUpdate(
    { event_id: req.params.id, contact_id },
    { event_id: req.params.id, contact_id, rsvp_status },
    { upsert: true, new: true },
  );
  res.status(201).json(attendee);
});

// POST /api/events/recommend
router.post('/recommend', async (req, res) => {
  const cached = await getCache(keys.eventsRec(req.user._id));
  if (cached) {
    const scoredById = new Map((cached || []).map((item) => [String(item.event_id), item]));
    const ids = [...scoredById.keys()];
    const events = ids.length
      ? await Event.find({ _id: { $in: ids }, deleted_at: null }).lean()
      : [];
    const hydrated = events
      .map((event) => ({
        ...event,
        relevance_score: scoredById.get(String(event._id))?.relevance_score ?? event.relevance_score ?? 0,
      }))
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
    return res.json({ events: hydrated, source: 'cache' });
  }

  const job_id = uuidv4();
  await AgentJob.create({
    job_id,
    user_id: req.user._id,
    agent_name: 'event_recommender',
    trigger_event: EVENTS.DAILY_EVENTS_TRIGGER,
    status: 'queued',
    input: { user_id: req.user._id, sync_ticketmaster: true },
  });

  await publishEvent(EVENTS.DAILY_EVENTS_TRIGGER, {
    job_id,
    user_id: req.user._id,
    sync_ticketmaster: true,
  });

  res.json({ status: 'computing', job_id });
});

// POST /api/events/import
router.post('/import', async (req, res) => {
  const { events: raw = [] } = req.body;
  if (!raw.length) return res.status(400).json({ error: 'events array required' });
  const docs = raw.map((event) => ({ ...event, user_id: req.user._id, source: 'imported' }));
  const created = await Event.insertMany(docs, { ordered: false }).catch((err) => err.insertedDocs || []);
  const event_ids = created.map((event) => event._id);
  const job_id = uuidv4();

  await AgentJob.create({
    job_id,
    user_id: req.user._id,
    agent_name: 'event_recommender',
    trigger_event: EVENTS.EVENTS_IMPORTED,
    status: 'queued',
    input: { event_ids, user_id: req.user._id, sync_eventbrite: false },
  });

  await publishEvent(EVENTS.EVENTS_IMPORTED, {
    job_id,
    user_id: req.user._id,
    event_ids,
    sync_eventbrite: false,
  });

  res.json({ job_id, count: event_ids.length });
});

// GET /api/events/:id/pre-outreach
router.get('/:id/pre-outreach', async (req, res) => {
  const job_id = uuidv4();
  await AgentJob.create({
    job_id,
    user_id: req.user._id,
    agent_name: 'opportunity_detection',
    trigger_event: EVENTS.PRE_EVENT_OUTREACH_REQUESTED,
    status: 'queued',
    input: { event_id: req.params.id },
  });

  await publishEvent(EVENTS.PRE_EVENT_OUTREACH_REQUESTED, {
    job_id,
    user_id: req.user._id,
    event_id: req.params.id,
  });

  res.json({ job_id });
});

export default router;
