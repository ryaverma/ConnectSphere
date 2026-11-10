import mongoose from 'mongoose';

const contactRelationshipSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  contact_a_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  contact_b_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  relationship_type: {
    type: String,
    enum: ['colleague', 'mentor', 'friend', 'business_partner'],
    required: true,
  },
  strength: { type: Number, default: 0.5, min: 0, max: 1 },
  detected_from: {
    type: String,
    enum: ['mutual_connections', 'same_company', 'email_thread', 'manual', 'agent'],
    default: 'agent',
  },
  reasoning: { type: String, default: '' }, // Written by ConnectGraph Builder Agent
}, { timestamps: true });

// Enforce contact_a_id < contact_b_id at app layer for deduplication
contactRelationshipSchema.index({ user_id: 1, contact_a_id: 1, contact_b_id: 1 }, { unique: true });

export default mongoose.model('ContactRelationship', contactRelationshipSchema);
