import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  host: { type: String, default: '' },
  event_date: { type: Date, required: true, index: true },
  end_date: { type: Date, default: null },
  event_time: { type: String, default: '' },
  end_time: { type: String, default: '' },
  timezone: { type: String, default: 'America/Los_Angeles' },
  location: { type: String, default: '' },
  location_type: {
    type: String,
    enum: ['in-person', 'virtual', 'hybrid'],
    default: 'in-person',
  },
  virtual_url: { type: String, default: '' },
  venue_name: { type: String, default: '' },
  type: {
    type: String,
    enum: ['conference', 'meetup', 'workshop', 'webinar', 'networking', 'social'],
    default: 'meetup',
  },
  category: { type: String, default: '' },
  tags: [{ type: String }],
  image_url: { type: String, default: '' },
  external_url: { type: String, default: '' },
  ticket_url: { type: String, default: '' },
  price_range: { type: String, default: 'Free' },
  attendee_count: { type: Number, default: 0 },
  capacity: { type: Number, default: null },
  relevance_score: { type: Number, default: 0, min: 0, max: 100 },
  network_contacts_count: { type: Number, default: 0 },
  predicted_attendees: [{
    contact_id: mongoose.Schema.Types.ObjectId,
    name: String,
    confidence: Number,
  }],
  rsvp_status: {
    type: String,
    enum: ['interested', 'going', 'not-going', 'maybe', null],
    default: null,
  },
  rsvp_at: { type: Date, default: null },
  embedding_id: { type: String, default: null },
  source: {
    type: String,
    enum: ['manual', 'eventbrite', 'meetup', 'linkedin', 'imported', 'ticketmaster'],
    default: 'manual',
  },
  external_id: { type: String, default: null },
  deleted_at: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
