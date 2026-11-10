import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null, index: true },
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  preview: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'scheduled', 'sent', 'opened', 'replied', 'bounced', 'failed', 'blocked', 'cancelled'],
    default: 'draft',
  },
  tone: {
    type: String,
    enum: ['professional', 'friendly', 'direct', 'creative'],
    default: 'professional',
  },
  variant: {
    type: String,
    enum: ['short', 'long', 'followup_1', 'followup_2', null],
    default: null,
  },
  ai_generated: { type: Boolean, default: false },
  ai_confidence: { type: Number, default: 0, min: 0, max: 100 },
  ai_model: { type: String, default: null },
  generation_prompt: { type: String, default: null },
  alternative_versions: [{ type: mongoose.Schema.Types.Mixed }],
  evidence: [{ type: String }],
  quality_scores: { type: mongoose.Schema.Types.Mixed, default: {} },
  compliance_check: {
    approved: { type: Boolean, default: null },
    spam_score: { type: Number, default: null },
    checks: { type: mongoose.Schema.Types.Mixed, default: {} },
    block_reason: { type: String, default: null },
    suggestions: [{ type: String }],
  },
  scheduled_for: { type: Date, default: null },
  sent_at: { type: Date, default: null },
  opened_at: { type: Date, default: null },
  replied_at: { type: Date, default: null },
  bounced_at: { type: Date, default: null },
  open_count: { type: Number, default: 0 },
  click_count: { type: Number, default: 0 },
  tracking_pixel_url: { type: String, default: null },
  deleted_at: { type: Date, default: null },
}, { timestamps: true });

// Idempotency guard: an AI-generated draft is uniquely identified by
// (contact_id, campaign_id, variant). Without this, a Celery worker crash
// mid-outreach_task — acks_late + reject_on_worker_lost means the task gets
// redelivered and re-runs from the top — used to insert a second, identical
// draft on every redelivery. Scoped to AI-generated drafts only (variant is
// only ever set by outreach_task) via partialFilterExpression, so manually
// created messages (POST /api/messages, variant defaults to null) are
// untouched by this constraint.
messageSchema.index(
  { contact_id: 1, campaign_id: 1, variant: 1 },
  { unique: true, partialFilterExpression: { variant: { $type: 'string' } } },
);

export default mongoose.model('Message', messageSchema);
