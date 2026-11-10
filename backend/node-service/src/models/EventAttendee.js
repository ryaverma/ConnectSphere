import mongoose from 'mongoose';

const eventAttendeeSchema = new mongoose.Schema({
  event_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  rsvp_status: {
    type: String,
    enum: ['interested', 'going', 'not-going', 'maybe'],
    default: 'interested',
  },
  added_at: { type: Date, default: Date.now },
});

eventAttendeeSchema.index({ event_id: 1, contact_id: 1 }, { unique: true });

export default mongoose.model('EventAttendee', eventAttendeeSchema);
