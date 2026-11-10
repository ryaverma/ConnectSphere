import mongoose from 'mongoose';

const contactTagSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  color: { type: String, default: '#6366f1' },
}, { timestamps: true });

contactTagSchema.index({ user_id: 1, name: 1 }, { unique: true });

export default mongoose.model('ContactTag', contactTagSchema);
