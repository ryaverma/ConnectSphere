import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  type: {
    type: String,
    enum: ['stale_relationship', 'followup_due', 'congratulate', 'check_in'],
    required: true,
  },
  message: { type: String, default: '' },       // Human-readable reminder text
  hook: { type: String, default: '' },           // LLM-generated 1-sentence outreach hook
  content_suggestion: { type: String, default: '' }, // Suggested article or value-add idea
  priority: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  due_date: { type: Date, required: true, index: 1 },
  status: {
    type: String,
    enum: ['pending', 'dismissed', 'acted'],
    default: 'pending',
  },
  acted_at: { type: Date, default: null },
  dismissed_at: { type: Date, default: null },
  created_by_agent: { type: String, default: 'follow_up_lifecycle_agent' },
}, { timestamps: true });

export default mongoose.model('Reminder', reminderSchema);
