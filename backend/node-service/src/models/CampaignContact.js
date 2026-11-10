import mongoose from 'mongoose';

const campaignContactSchema = new mongoose.Schema({
  campaign_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
  sequence_position: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'sent', 'opened', 'replied', 'bounced', 'unsubscribed'],
    default: 'pending',
  },
  relevance_score: { type: Number, default: 0, min: 0, max: 1 },
  score_breakdown: {
    semantic: { type: Number, default: 0 },
    strength: { type: Number, default: 0 },
    graph_proximity: { type: Number, default: 0 },
    pagerank: { type: Number, default: 0 },
    recency: { type: Number, default: 0 },
  },
  explanation: { type: String, default: '' },
  confidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  },
  added_at: { type: Date, default: Date.now },
}, { timestamps: true, collection: 'campaign_contacts' });

campaignContactSchema.index({ campaign_id: 1, contact_id: 1 }, { unique: true });

export default mongoose.model('CampaignContact', campaignContactSchema);
