import mongoose from 'mongoose';

const messageThreadSchema = new mongoose.Schema({
  parent_message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
  reply_message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true, index: true },
  thread_position: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now },
});

messageThreadSchema.index({ parent_message_id: 1, thread_position: 1 });

export default mongoose.model('MessageThread', messageThreadSchema);
