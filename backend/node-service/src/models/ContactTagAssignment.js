import mongoose from 'mongoose';

const contactTagAssignmentSchema = new mongoose.Schema({
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  tag_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ContactTag', required: true },
  assigned_at: { type: Date, default: Date.now },
});

contactTagAssignmentSchema.index({ contact_id: 1, tag_id: 1 }, { unique: true });
contactTagAssignmentSchema.index({ contact_id: 1 });
contactTagAssignmentSchema.index({ tag_id: 1 });

export default mongoose.model('ContactTagAssignment', contactTagAssignmentSchema);
