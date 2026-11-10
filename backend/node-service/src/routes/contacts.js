import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth.js';
import { publishEvent, EVENTS } from '../services/redis.js';
import Contact from '../models/Contact.js';
import ContactNote from '../models/ContactNote.js';
import Interaction from '../models/Interaction.js';
import ContactTag from '../models/ContactTag.js';
import ContactTagAssignment from '../models/ContactTagAssignment.js';
import AgentJob from '../models/AgentJob.js';
import Message from '../models/Message.js';

/**
 * Canonical contact strength-score formula — SHARED SPEC.
 *
 * This is the single source of truth for strength_score. It is intentionally
 * duplicated (not called over HTTP) in profile_parsing.py's compute_strength
 * LangGraph node, because that node needs to run inside a Celery worker with
 * no synchronous dependency on Node being up. If you change the weights here,
 * change them there too — see SOURCE_QUALITY_BASE / the comment block at the
 * top of _node_strength_score in profile_parsing.py.
 *
 * Previously Node and Python computed genuinely different scores for the same
 * contact (flat 30 base vs. source-quality base, cap 100 vs. cap 85, no
 * recency/reply signal in Python vs. no source/title/company signal in Node).
 * Whichever pipeline touched a contact last silently overwrote the other's
 * number. This merges both into one formula, cap 100, used everywhere.
 */
export const SOURCE_QUALITY_BASE = {
  linkedin: 25, github: 20, email: 18, manual: 15, imported: 15,
};

export async function recalculateStrengthScore(contactId) {
  const contact = await Contact.findOne({ _id: contactId, deleted_at: null }).lean();
  if (!contact) return;

  let score = SOURCE_QUALITY_BASE[contact.source] ?? 15; // base — was a flat 30

  if (contact.email)    score += 20;
  if (contact.title)    score += 7;   // was missing from this implementation
  if (contact.company)  score += 7;   // was missing from this implementation
  if (contact.bio)      score += 10;
  if (contact.linkedin_url || contact.github_url) score += 10;
  score += Math.min((contact.skills?.length || 0) * 5, 20);
  score += Math.min((contact.interests?.length || 0) * 2, 6);

  // Recency bonus — last interaction within 30 days
  if (contact.last_interaction_at) {
    const daysSince = (Date.now() - new Date(contact.last_interaction_at).getTime()) / 86_400_000;
    if (daysSince <= 7)  score += 15;
    else if (daysSince <= 30) score += 8;
  }

  // Reply bonus
  const replyCount = await Message.countDocuments({
    contact_id: contactId, status: 'replied', deleted_at: null,
  });
  if (replyCount > 0) score += Math.min(replyCount * 10, 20);

  // Mutual connections proxy
  score += Math.min((contact.mutual_connections || 0), 10);

  score = Math.min(Math.round(score), 100);
  await Contact.findByIdAndUpdate(contactId, { strength_score: score });
  return score;
}

const router = Router();
router.use(authenticate);

// ─── GET /api/contacts ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const {
    search, source, status, strength_min, strength_max,
    tags, sort_by = 'createdAt', sort_order = 'desc',
    page = 1, limit = 20,
  } = req.query;

  const filter = { user_id: req.user._id, deleted_at: null };
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (strength_min || strength_max) {
    filter.strength_score = {};
    if (strength_min) filter.strength_score.$gte = Number(strength_min);
    if (strength_max) filter.strength_score.$lte = Number(strength_max);
  }
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { company: { $regex: search, $options: 'i' } },
    { title: { $regex: search, $options: 'i' } },
  ];

  const sort = { [sort_by]: sort_order === 'asc' ? 1 : -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [contacts, total] = await Promise.all([
    Contact.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
    Contact.countDocuments(filter),
  ]);

  res.json({ contacts, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// ─── GET /api/contacts/:id ────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null }).lean();
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

// ─── POST /api/contacts ───────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const contact = await Contact.create({ ...req.body, user_id: req.user._id });
  const job_id = uuidv4();
  const job = await AgentJob.create({
    job_id, user_id: req.user._id, agent_name: 'profile_parsing',
    trigger_event: EVENTS.CONTACT_IMPORTED, status: 'queued',
    input: { contact_ids: [contact._id], source: contact.source },
  });
  await publishEvent(EVENTS.CONTACT_IMPORTED, {
    user_id: req.user._id, job_id, contact_ids: [contact._id], source: contact.source,
  });
  res.status(201).json({ contact, job_id });
});

// ─── PATCH /api/contacts/:id ──────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  delete req.body.user_id;
  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id, deleted_at: null },
    { $set: req.body }, { new: true },
  );
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

// ─── DELETE /api/contacts/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id, deleted_at: null },
    { deleted_at: new Date() }, { new: true },
  );
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json({ message: 'Contact deleted' });
});

// ─── POST /api/contacts/bulk-import ──────────────────────────────────────────
router.post('/bulk-import', async (req, res) => {
  const { contacts: raw = [], source = 'imported' } = req.body;
  if (!raw.length) return res.status(400).json({ error: 'contacts array is required' });

  const docs = raw.map((c) => ({ ...c, user_id: req.user._id, source }));
  const created = await Contact.insertMany(docs, { ordered: false }).catch((e) => {
    if (e.name === 'BulkWriteError') return e.insertedDocs;
    throw e;
  });
  const contact_ids = created.map((c) => c._id);

  const job_id = uuidv4();
  await AgentJob.create({
    job_id, user_id: req.user._id, agent_name: 'profile_parsing',
    trigger_event: EVENTS.CONTACT_IMPORTED, status: 'queued',
    input: { contact_ids, source },
  });
  await publishEvent(EVENTS.CONTACT_IMPORTED, { user_id: req.user._id, job_id, contact_ids, source });

  res.status(202).json({ job_id, status: 'queued', count: contact_ids.length });
});

// ─── POST /api/contacts/:id/calculate-strength ───────────────────────────────
router.post('/:id/calculate-strength', async (req, res) => {
  const contact = await Contact.findOne({ _id: req.params.id, user_id: req.user._id, deleted_at: null }).lean();
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const job_id = uuidv4();
  await AgentJob.create({
    job_id, user_id: req.user._id, agent_name: 'profile_parsing',
    trigger_event: EVENTS.CONTACT_IMPORTED, status: 'queued',
    input: { contact_ids: [contact._id], source: contact.source },
  });
  await publishEvent(EVENTS.CONTACT_IMPORTED, {
    user_id: req.user._id, job_id, contact_ids: [contact._id], source: contact.source,
  });
  res.json({ job_id });
});

// ─── Notes sub-resource ───────────────────────────────────────────────────────
router.get('/:id/notes', async (req, res) => {
  const notes = await ContactNote.find({ contact_id: req.params.id, user_id: req.user._id, deleted_at: null })
    .sort({ is_pinned: -1, createdAt: -1 }).lean();
  res.json(notes);
});

router.post('/:id/notes', async (req, res) => {
  const note = await ContactNote.create({
    ...req.body, contact_id: req.params.id, user_id: req.user._id,
  });
  res.status(201).json(note);
});

router.patch('/:id/notes/:noteId', async (req, res) => {
  const note = await ContactNote.findOneAndUpdate(
    { _id: req.params.noteId, user_id: req.user._id, deleted_at: null },
    { $set: req.body }, { new: true },
  );
  if (!note) return res.status(404).json({ error: 'Note not found' });
  res.json(note);
});

router.delete('/:id/notes/:noteId', async (req, res) => {
  await ContactNote.findOneAndUpdate(
    { _id: req.params.noteId, user_id: req.user._id },
    { deleted_at: new Date() },
  );
  res.json({ message: 'Note deleted' });
});

// ─── Interactions sub-resource ────────────────────────────────────────────────
router.get('/:id/interactions', async (req, res) => {
  const interactions = await Interaction.find({ contact_id: req.params.id, user_id: req.user._id })
    .sort({ interaction_date: -1 }).limit(50).lean();
  res.json(interactions);
});

router.post('/:id/interactions', async (req, res) => {
  const interaction = await Interaction.create({
    ...req.body, contact_id: req.params.id, user_id: req.user._id,
  });
  // Update contact's last_interaction_at then recalculate score
  await Contact.findByIdAndUpdate(req.params.id, { last_interaction_at: interaction.interaction_date });
  await recalculateStrengthScore(req.params.id);
  res.status(201).json(interaction);
});

// ─── Tags sub-resource ────────────────────────────────────────────────────────
router.get('/:id/tags', async (req, res) => {
  const assignments = await ContactTagAssignment.find({ contact_id: req.params.id })
    .populate('tag_id').lean();
  res.json(assignments.map((a) => a.tag_id));
});

router.post('/:id/tags', async (req, res) => {
  const { tag_id } = req.body;
  const assignment = await ContactTagAssignment.findOneAndUpdate(
    { contact_id: req.params.id, tag_id },
    { contact_id: req.params.id, tag_id },
    { upsert: true, new: true },
  );
  res.status(201).json(assignment);
});

router.delete('/:id/tags/:tagId', async (req, res) => {
  await ContactTagAssignment.deleteOne({ contact_id: req.params.id, tag_id: req.params.tagId });
  res.json({ message: 'Tag removed' });
});

// ─── Contact Tags management ──────────────────────────────────────────────────
router.get('/tags/all', async (req, res) => {
  const tags = await ContactTag.find({ user_id: req.user._id }).sort({ name: 1 }).lean();
  res.json(tags);
});

router.post('/tags/all', async (req, res) => {
  const tag = await ContactTag.create({ ...req.body, user_id: req.user._id });
  res.status(201).json(tag);
});

router.patch('/tags/:tagId', async (req, res) => {
  const tag = await ContactTag.findOneAndUpdate(
    { _id: req.params.tagId, user_id: req.user._id },
    { $set: req.body }, { new: true },
  );
  if (!tag) return res.status(404).json({ error: 'Tag not found' });
  res.json(tag);
});

router.delete('/tags/:tagId', async (req, res) => {
  await ContactTag.deleteOne({ _id: req.params.tagId, user_id: req.user._id });
  await ContactTagAssignment.deleteMany({ tag_id: req.params.tagId });
  res.json({ message: 'Tag deleted' });
});

export default router;
