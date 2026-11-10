import mongoose from 'mongoose';

const userSubscriptionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing'],
    default: 'active',
  },
  billing_period: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  current_period_start: { type: Date, default: null },
  current_period_end: { type: Date, default: null },
  cancel_at_period_end: { type: Boolean, default: false },
  canceled_at: { type: Date, default: null },
  stripe_customer_id: { type: String, default: null },
  stripe_subscription_id: { type: String, default: null },
  payment_method_id: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('UserSubscription', userSubscriptionSchema);
