import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const settingsSchema = new mongoose.Schema({
  max_messages_per_day: { type: Number, default: 10 },
  min_days_between_messages: { type: Number, default: 7 },
  preferred_tone: { type: String, default: 'professional' },
  notify_new_opportunities: { type: Boolean, default: true },
  notify_message_replies: { type: Boolean, default: true },
  notify_campaign_updates: { type: Boolean, default: true },
  notify_event_reminders: { type: Boolean, default: true },
  email_notifications: { type: Boolean, default: true },
  push_notifications: { type: Boolean, default: false },
  notification_frequency: { type: String, default: 'immediate' },
  ai_message_generation: { type: Boolean, default: true },
  auto_schedule_messages: { type: Boolean, default: false },
  ai_contact_scoring: { type: Boolean, default: true },
  theme: { type: String, default: 'system' },
  sidebar_collapsed: { type: Boolean, default: false },
  timezone: { type: String, default: 'America/Los_Angeles' },
  locale: { type: String, default: 'en-US' },
  date_format: { type: String, default: 'MM/DD/YYYY' },
  profile_visibility: { type: String, default: 'connections' },
  show_email: { type: Boolean, default: false },
  allow_analytics: { type: Boolean, default: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  password_hash: { type: String, default: null },
  name: { type: String, required: true, trim: true },
  title: { type: String, default: '' },
  company: { type: String, default: '' },
  location: { type: String, default: '' },
  initials: { type: String, default: '' },
  avatar_color: { type: String, default: 'bg-indigo-600' },
  avatar_url: { type: String, default: null },
  bio: { type: String, default: '' },
  education: { type: String, default: '' },
  linkedin_url: { type: String, default: '' },
  github_url: { type: String, default: '' },
  twitter_url: { type: String, default: '' },
  skills: [{ type: String }],
  interests: [{ type: String }],
  goal: { type: String, default: '' },
  onboarding_completed: { type: Boolean, default: false },
  onboarding_step: { type: Number, default: 1 },
  email_verified: { type: Boolean, default: false },
  email_verification_token: { type: String, default: null },
  password_reset_token: { type: String, default: null },
  password_reset_expires: { type: Date, default: null },
  subscription_tier: { type: String, default: 'free' },
  subscription_status: { type: String, default: 'active' },
  trial_ends_at: { type: Date, default: null },
  last_login_at: { type: Date, default: null },
  deleted_at: { type: Date, default: null },
  settings: { type: settingsSchema, default: () => ({}) },
}, { timestamps: true });

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password_hash) return false;
  return bcrypt.compare(candidate, this.password_hash);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash') || !this.password_hash) return next();
  if (this.password_hash.startsWith('$2')) return next(); // already hashed
  this.password_hash = await bcrypt.hash(this.password_hash, 12);
  next();
});

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password_hash;
  delete obj.email_verification_token;
  delete obj.password_reset_token;
  delete obj.password_reset_expires;
  return obj;
};

export default mongoose.model('User', userSchema);
