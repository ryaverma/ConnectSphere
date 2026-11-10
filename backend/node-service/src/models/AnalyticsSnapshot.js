import mongoose from 'mongoose';

const analyticsSnapshotSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  computed_at: { type: Date, default: Date.now, index: -1 },
  date_range: {
    start: { type: Date },
    end: { type: Date },
  },
  outreach: {
    sent: { type: Number, default: 0 },
    replied: { type: Number, default: 0 },
    response_rate: { type: Number, default: 0 },
    avg_response_time: { type: Number, default: 0 },
    by_campaign: { type: mongoose.Schema.Types.Mixed, default: [] },
    by_strength: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  network_health: {
    total: { type: Number, default: 0 },
    strong_ties: { type: Number, default: 0 },
    weak_ties: { type: Number, default: 0 },
    density: { type: Number, default: 0 },
    avg_clustering_coefficient: { type: Number, default: 0 },
    diversity_index: { type: Number, default: 0 },
    reachability_score: { type: Number, default: 0 },
    community_count: { type: Number, default: 0 },
    bridge_nodes: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  events: {
    attended: { type: Number, default: 0 },
    roi_by_event: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  funnel: {
    by_campaign: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  insights: [{ type: String }], // LLM-generated insights, refreshed weekly
}, { timestamps: true, collection: 'analytics_snapshots' });

// TTL: auto-expire after 7 days (Analytics Agent replenishes every hour)
analyticsSnapshotSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
