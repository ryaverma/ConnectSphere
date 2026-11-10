import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. free, pro, enterprise
  display_name: { type: String, required: true },
  description: { type: String, default: '' },
  price_monthly: { type: Number, default: 0 },
  price_yearly: { type: Number, default: 0 },
  currency: { type: String, default: 'usd' },
  features: {
    contacts_limit: { type: Number, default: 50 },
    campaigns_limit: { type: Number, default: 2 },
    ai_credits: { type: Number, default: 100 },
  },
  limits: { type: mongoose.Schema.Types.Mixed, default: {} },
  is_active: { type: Boolean, default: true },
  sort_order: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
