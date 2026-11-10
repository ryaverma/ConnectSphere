import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  event_type: { type: String, required: true, index: true }, // page_view, contact_added, message_sent, etc.
  event_data: { type: mongoose.Schema.Types.Mixed, default: {} },
  session_id: { type: String, default: null },
  ip_address: { type: String, default: null },
  user_agent: { type: String, default: null },
  created_at: { type: Date, default: Date.now, index: -1 },
});

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);
