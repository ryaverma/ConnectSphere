import mongoose from 'mongoose';

const contactNoteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  content: { type: String, required: true, trim: true },
  is_pinned: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('ContactNote', contactNoteSchema);
