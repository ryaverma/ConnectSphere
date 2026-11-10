import mongoose from 'mongoose';

const aiUsageLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  feature: { type: String, required: true }, // e.g. message_generation, contact_scoring, event_recommendation
  model: { type: String, default: '' },
  prompt_tokens: { type: Number, default: 0 },
  completion_tokens: { type: Number, default: 0 },
  total_tokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 }, // 4 decimal precision
  request_data: { type: mongoose.Schema.Types.Mixed, default: {} },
  response_data: { type: mongoose.Schema.Types.Mixed, default: {} },
  latency_ms: { type: Number, default: 0 },
  success: { type: Boolean, default: true },
  error_message: { type: String, default: null },
  created_at: { type: Date, default: Date.now, index: -1 },
// collection name pinned to match mongo-init.js's index definitions — without
// this, Mongoose's default pluralization ("aiusagelogs") silently diverges
// from the snake_case name ("ai_usage_logs") the init script indexes, so
// those indexes apply to a collection nothing ever writes to.
}, { timestamps: true, collection: 'ai_usage_logs' });

// TTL: auto-expire after 90 days
aiUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.model('AIUsageLog', aiUsageLogSchema);
