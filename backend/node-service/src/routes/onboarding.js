import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();
router.use(authenticate);

// POST /api/onboarding/complete-step
router.post('/complete-step', async (req, res) => {
  const { step, data } = req.body;
  if (!step) return res.status(400).json({ error: 'step required' });

  const allowedFields = {
    1: ['goal', 'role', 'industry', 'target_companies'],
    2: ['skills', 'interests', 'bio'],
    3: [], // Integration step — OAuth tokens handled per-provider
    4: [], // Review step
  };

  const update = { onboarding_step: Math.max(req.user.onboarding_step || 1, step) };
  const fields = allowedFields[step] || [];
  fields.forEach((f) => {
    if (data && data[f] !== undefined) update[f] = data[f];
  });

  const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true })
    .select('-password_hash');
  res.json(user);
});

// POST /api/onboarding/complete
router.post('/complete', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { onboarding_completed: true, onboarding_step: 5 } },
    { new: true },
  ).select('-password_hash');
  res.json(user);
});

// POST /api/onboarding/skip
router.post('/skip', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { onboarding_completed: true } },
    { new: true },
  ).select('-password_hash');
  res.json(user);
});

export default router;
