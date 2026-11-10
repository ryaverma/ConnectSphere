import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  type: {
    type: String,
    enum: ['email', 'meeting', 'call', 'linkedin_message', 'note', 'event', 'outreach_sent', 'response_received'],
    required: true,
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    default: 'outbound',
  },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  outcome: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'follow-up-needed', null],
    default: null,
  },
  interaction_date: { type: Date, required: true, index: -1 },
  duration_minutes: { type: Number, default: null },
  message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model('Interaction', interactionSchema);
