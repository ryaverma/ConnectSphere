import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UserSubscription from '../models/UserSubscription.js';

const router = Router();
router.use(authenticate);

// GET /api/billing/plans
router.get('/plans', async (req, res) => {
  const plans = await SubscriptionPlan.find({ is_active: true }).sort({ sort_order: 1 }).lean();
  res.json(plans);
});

// GET /api/billing/subscription
router.get('/subscription', async (req, res) => {
  const sub = await UserSubscription.findOne({ user_id: req.user._id })
    .populate('plan_id').lean();
  res.json(sub);
});

// POST /api/billing/checkout — Stripe stub
router.post('/checkout', async (req, res) => {
  res.status(501).json({ message: 'Stripe checkout requires STRIPE_SECRET_KEY in .env' });
});

// POST /api/billing/portal
router.post('/portal', async (req, res) => {
  res.status(501).json({ message: 'Stripe portal requires STRIPE_SECRET_KEY in .env' });
});

// POST /api/billing/subscription/cancel
router.post('/subscription/cancel', async (req, res) => {
  await UserSubscription.findOneAndUpdate(
    { user_id: req.user._id },
    { cancel_at_period_end: true, canceled_at: new Date() },
  );
  res.json({ message: 'Subscription cancelled at period end' });
});

// GET /api/billing/usage
router.get('/usage', async (req, res) => {
  const sub = await UserSubscription.findOne({ user_id: req.user._id }).populate('plan_id').lean();
  res.json({ subscription: sub, usage: {} });
});

// GET /api/billing/invoices
router.get('/invoices', async (req, res) => {
  res.json({ invoices: [] });
});

export default router;
