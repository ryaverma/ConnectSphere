import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res) => {
  const { type, read, page = 1, limit = 20 } = req.query;
  const filter = { user_id: req.user._id };
  if (type) filter.type = type;
  if (read !== undefined) filter.read = read === 'true';
  const skip = (Number(page) - 1) * Number(limit);
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    Notification.countDocuments(filter),
  ]);
  res.json({ notifications, total });
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
  const count = await Notification.countDocuments({ user_id: req.user._id, read: false });
  res.json({ count });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const n = await Notification.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id },
    { read: true }, { new: true },
  );
  if (!n) return res.status(404).json({ error: 'Notification not found' });
  res.json(n);
});

// POST /api/notifications/mark-all-read
router.post('/mark-all-read', async (req, res) => {
  await Notification.updateMany({ user_id: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read' });
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, user_id: req.user._id });
  res.json({ message: 'Notification deleted' });
});

export default router;
