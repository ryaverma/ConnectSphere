import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, default: '' },
  phone: { type: String, default: '' },
  title: { type: String, default: '' },
  company: { type: String, default: '' },
  location: { type: String, default: '' },
  initials: { type: String, default: '' },
  avatar_color: { type: String, default: 'bg-blue-500' },
  avatar_url: { type: String, default: null },
  bio: { type: String, default: '' },
  education: { type: String, default: '' },
  linkedin_url: { type: String, default: '' },
  github_url: { type: String, default: '' },
  twitter_url: { type: String, default: '' },
  website: { type: String, default: '' },
  skills: [{ type: String }],
  interests: [{ type: String }],
  tags: [{ type: String }],
  custom_fields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  strength_score: { type: Number, default: 0, min: 0, max: 100 },
  status: {
    type: String,
    enum: ['active', 'pending', 'responded', 'dormant', 'in-campaign'],
    default: 'pending',
  },
  source: {
    type: String,
    enum: ['linkedin', 'github', 'email', 'manual', 'imported'],
    default: 'manual',
  },
  mutual_connections: { type: Number, default: 0 },
  last_interaction_at: { type: Date, default: null },
  last_outreach_at: { type: Date, default: null },
  response_rate: { type: Number, default: 0, min: 0, max: 1 },
  avg_response_time_hours: { type: Number, default: null },
  graph_x: { type: Number, default: null },
  graph_y: { type: Number, default: null },
  embedding_id: { type: String, default: null },
  notes_json: {
    type: {
      pagerank_score: Number,
      degree_centrality: Number,
      community_id: String,
      graph_distance: Number,
      last_enriched: Date,
      score_factors: mongoose.Schema.Types.Mixed,
      github_data: mongoose.Schema.Types.Mixed,
      linkedin_data: mongoose.Schema.Types.Mixed,
    },
    default: {},
  },
  deleted_at: { type: Date, default: null },
  imported_from: { type: String, default: null },
  imported_at: { type: Date, default: null },
}, { timestamps: true });

contactSchema.index({ user_id: 1, email: 1 }, { unique: true, sparse: true });

export default mongoose.model('Contact', contactSchema);
