import mongoose from 'mongoose';

const userIntegrationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: {
    type: String,
    enum: ['linkedin', 'github', 'google', 'outlook', 'slack'],
    required: true,
  },
  provider_user_id: { type: String, default: null },
  access_token: { type: String, default: null },   // AES-256 encrypted at rest
  refresh_token: { type: String, default: null },  // AES-256 encrypted at rest
  token_expires_at: { type: Date, default: null },
  scopes: [{ type: String }],
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  is_active: { type: Boolean, default: true },
  last_sync_at: { type: Date, default: null },
  sync_error: { type: String, default: null },
  connected_at: { type: Date, default: Date.now },
  disconnected_at: { type: Date, default: null },
}, { timestamps: true, collection: 'user_integrations' });

userIntegrationSchema.index({ user_id: 1, provider: 1 }, { unique: true });

export default mongoose.model('UserIntegration', userIntegrationSchema);
