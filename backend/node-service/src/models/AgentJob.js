import mongoose from 'mongoose';

const agentJobSchema = new mongoose.Schema({
  job_id: { type: String, required: true, unique: true, index: true }, // UUID string
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  agent_name: {
    type: String,
    enum: [
      'profile_parsing',
      'connectgraph_builder',
      'opportunity_detection',
      'outreach',
      'event_recommender',
      'follow_up_lifecycle',
      'privacy_compliance',
      'analytics',
    ],
    required: true,
  },
  trigger_event: { type: String, default: '' }, // Redis event type that fired this job
  status: {
    type: String,
    enum: ['queued', 'running', 'success', 'partial', 'failed'],
    default: 'queued',
  },
  input: { type: mongoose.Schema.Types.Mixed, default: {} },   // Full agent input payload
  output: { type: mongoose.Schema.Types.Mixed, default: null }, // Full agent output envelope
  explanation: { type: String, default: '' },
  evidence: [{ type: String }],
  confidence: { type: Number, default: null, min: 0, max: 1 },
  errors: [{ type: String }],
  duration_ms: { type: Number, default: null },
  started_at: { type: Date, default: null },
  completed_at: { type: Date, default: null },
}, { timestamps: true, collection: 'agent_jobs' });

// TTL: auto-expire after 30 days
agentJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
agentJobSchema.index({ createdAt: -1 });

export default mongoose.model('AgentJob', agentJobSchema);
