import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  goal: { type: String, default: '' },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft',
  },
  tone: {
    type: String,
    enum: ['professional', 'friendly', 'direct', 'creative'],
    default: 'professional',
  },
  duration: { type: String, default: '1 month' },
  duration_days: { type: Number, default: 30 },
  auto_followup: { type: Boolean, default: true },
  followup_delay_days: { type: Number, default: 7 },
  max_followups: { type: Number, default: 2 },
  send_schedule: {
    days: [{ type: String }],
    time: { type: String, default: '09:00' },
    timezone: { type: String, default: 'America/Los_Angeles' },
  },
  goal_decomposition: {
    target_role: { type: String, default: '' },
    target_companies: [{ type: String }],
    target_skills: [{ type: String }],
    goal_type: {
      type: String,
      enum: ['job', 'mentor', 'collab', 'event', ''],
      default: '',
    },
  },
  stats: {
    total_contacts: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    replied: { type: Number, default: 0 },
    meetings: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    unsubscribed: { type: Number, default: 0 },
  },
  started_at: { type: Date, default: null },
  completed_at: { type: Date, default: null },
  deleted_at: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Campaign', campaignSchema);
