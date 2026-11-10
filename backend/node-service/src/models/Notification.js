import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['opportunity', 'draft', 'followup', 'response', 'event', 'campaign', 'system'],
    required: true,
  },
  message: { type: String, required: true },
  action: {
    href: { type: String, default: '' },
    label: { type: String, default: '' },
  },
  read: { type: Boolean, default: false, index: true },
  created_at: { type: Date, default: Date.now, index: -1 },
  // Agent-generated fields
  agent_job_id: { type: String, default: null },
  related_id: { type: mongoose.Schema.Types.ObjectId, default: null }, // contact / campaign / event
  related_type: { type: String, default: null },
});

export default mongoose.model('Notification', notificationSchema);
