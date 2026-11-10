import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Contact from '../models/Contact.js';
import Campaign from '../models/Campaign.js';
import Event from '../models/Event.js';

const router = Router();
router.use(authenticate);

// GET /api/search?q=&type=&limit=
router.get('/', async (req, res) => {
  const { q = '', type, limit = 10 } = req.query;
  if (!q.trim()) return res.json({ results: [] });

  const regex = { $regex: q, $options: 'i' };
  const lim = Math.min(Number(limit), 50);
  const userId = req.user._id;

  const results = [];

  if (!type || type === 'contacts') {
    const contacts = await Contact.find({
      user_id: userId, deleted_at: null,
      $or: [{ name: regex }, { email: regex }, { company: regex }, { title: regex }],
    }).limit(lim).select('name email title company avatar_color initials strength_score').lean();
    contacts.forEach((c) => results.push({ type: 'contact', data: c }));
  }

  if (!type || type === 'campaigns') {
    const campaigns = await Campaign.find({
      user_id: userId, deleted_at: null,
      $or: [{ name: regex }, { goal: regex }],
    }).limit(lim).select('name goal status').lean();
    campaigns.forEach((c) => results.push({ type: 'campaign', data: c }));
  }

  if (!type || type === 'events') {
    const events = await Event.find({
      deleted_at: null,
      $or: [{ name: regex }, { description: regex }, { location: regex }],
    }).limit(lim).select('name event_date location type').lean();
    events.forEach((e) => results.push({ type: 'event', data: e }));
  }

  res.json({ results, query: q });
});

// POST /api/search/ai-query — stub (requires Python service)
router.post('/ai-query', async (req, res) => {
  res.status(503).json({ message: 'AI query requires Python agent service to be running' });
});

export default router;
