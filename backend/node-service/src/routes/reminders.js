import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import Reminder from '../models/Reminder.js';
import Interaction from '../models/Interaction.js';

const router = Router();
router.use(authenticate);

// GET /api/reminders
router.get('/', async (req, res) => {
  const { status = 'pending', limit = 20 } = req.query;
  const reminders = await Reminder.find({ user_id: req.user._id, status })
    .sort({ due_date: 1 })
    .limit(Number(limit))
    .populate('contact_id', 'name email title company avatar_color initials')
    .lean();

  const enriched = await Promise.all(reminders.map(async (reminder) => {
    const contactId = reminder.contact_id?._id || reminder.contact_id;
    const [lastOutbound, lastReply] = await Promise.all([
      Interaction.findOne({
        user_id: req.user._id,
        contact_id: contactId,
        type: { $in: ['outreach_sent', 'email', 'linkedin_message'] },
      }).sort({ interaction_date: -1 }).lean(),
      Interaction.findOne({
        user_id: req.user._id,
        contact_id: contactId,
        type: 'response_received',
      }).sort({ interaction_date: -1 }).lean(),
    ]);

    return {
      ...reminder,
      last_contacted_at: lastOutbound?.interaction_date || null,
      latest_reply: lastReply ? {
        title: lastReply.title || 'Reply received',
        received_at: lastReply.interaction_date,
      } : null,
    };
  }));

  res.json(enriched);
});

// PATCH /api/reminders/:id/dismiss
router.patch('/:id/dismiss', async (req, res) => {
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id },
    { status: 'dismissed', dismissed_at: new Date() }, { new: true },
  );
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
  res.json(reminder);
});

// PATCH /api/reminders/:id/acted
router.patch('/:id/acted', async (req, res) => {
  const reminder = await Reminder.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id },
    { status: 'acted', acted_at: new Date() }, { new: true },
  );
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

  // Optionally log interaction simultaneously
  if (req.body.interaction) {
    await Interaction.create({
      ...req.body.interaction, user_id: req.user._id, contact_id: reminder.contact_id,
      interaction_date: new Date(),
    });
  }
  res.json(reminder);
});

// DELETE /api/reminders/:id
router.delete('/:id', async (req, res) => {
  await Reminder.deleteOne({ _id: req.params.id, user_id: req.user._id });
  res.json({ message: 'Reminder deleted' });
});

export default router;
