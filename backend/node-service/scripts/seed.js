/**
 * Seed script — creates 50 dummy users with realistic data for all collections.
 * Run: node scripts/seed.js
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import User from '../src/models/User.js';
import Contact from '../src/models/Contact.js';
import Campaign from '../src/models/Campaign.js';
import CampaignContact from '../src/models/CampaignContact.js';
import Message from '../src/models/Message.js';
import Event from '../src/models/Event.js';
import Notification from '../src/models/Notification.js';
import Reminder from '../src/models/Reminder.js';
import Interaction from '../src/models/Interaction.js';
import SubscriptionPlan from '../src/models/SubscriptionPlan.js';

// ─── Static data pools ────────────────────────────────────────────────────────

const FIRST_NAMES = ['Alex', 'Jordan', 'Morgan', 'Taylor', 'Casey', 'Riley', 'Quinn', 'Avery',
  'Blake', 'Cameron', 'Dakota', 'Drew', 'Emerson', 'Finley', 'Harper', 'Hayden',
  'Jamie', 'Jesse', 'Kendall', 'Kyle', 'Lane', 'Logan', 'Mason', 'Micah',
  'Noel', 'Parker', 'Peyton', 'Reese', 'Robin', 'Rowan', 'Ryan', 'Sage',
  'Sam', 'Sawyer', 'Scout', 'Shea', 'Sidney', 'Skylar', 'Spencer', 'Sterling',
  'Tatum', 'Terry', 'Toby', 'Tyler', 'Val', 'Wren', 'Zara', 'Zion', 'Ari', 'Eden'];

const LAST_NAMES = ['Chen', 'Kim', 'Patel', 'Rodriguez', 'Johnson', 'Williams', 'Brown', 'Davis',
  'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris',
  'Martin', 'Thompson', 'Garcia', 'Lee', 'Walker', 'Hall', 'Allen', 'Young',
  'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams',
  'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips',
  'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris'];

const COMPANIES = ['Google', 'Meta', 'Apple', 'Amazon', 'Microsoft', 'Stripe', 'Airbnb', 'Uber',
  'Netflix', 'Spotify', 'Figma', 'Notion', 'Vercel', 'Linear', 'Loom',
  'OpenAI', 'Anthropic', 'Hugging Face', 'Replicate', 'Cohere',
  'Sequoia Capital', 'a16z', 'Y Combinator', 'Techstars', 'First Round',
  'Salesforce', 'Twilio', 'Datadog', 'Snowflake', 'Databricks'];

const TITLES = ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Principal Engineer',
  'Engineering Manager', 'Director of Engineering', 'VP Engineering', 'CTO',
  'Product Manager', 'Senior PM', 'Director of Product', 'VP Product',
  'Data Scientist', 'ML Engineer', 'Research Engineer', 'AI Researcher',
  'UX Designer', 'Product Designer', 'Design Lead',
  'Founder & CEO', 'Co-Founder', 'Head of Growth', 'Head of Marketing',
  'Venture Associate', 'Investment Analyst', 'Technical Recruiter'];

const SKILLS = ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Go', 'Rust', 'Java',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'LLMs', 'RAG',
  'System Design', 'Distributed Systems', 'Kubernetes', 'AWS', 'GCP', 'Azure',
  'Product Strategy', 'User Research', 'A/B Testing', 'Growth Hacking', 'GTM',
  'Venture Capital', 'Angel Investing', 'Fundraising', 'Pitch Deck', 'Due Diligence',
  'GraphQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'Spark'];

const GOALS = [
  'Find senior ML engineering roles at top AI companies',
  'Build mentorship relationships with experienced founders',
  'Expand network in the venture capital and startup ecosystem',
  'Find research collaborators for my NLP thesis',
  'Grow my startup network and find potential co-founders',
  'Transition from software engineering to product management',
  'Connect with engineering leaders for a Series A raise',
  'Explore opportunities in AI/ML at FAANG companies',
];

const INDUSTRIES = ['Machine Learning', 'Product Management', 'Venture Capital', 'FinTech',
  'Developer Tools', 'AI Infrastructure', 'B2B SaaS', 'Consumer Tech'];

const SOURCES = ['linkedin', 'github', 'manual', 'imported'];
const STATUSES = ['active', 'pending', 'responded', 'dormant'];
const AVATAR_COLORS = ['#4f46e5', '#0a66c2', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777'];
const LOCATIONS = ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Boston, MA',
  'Los Angeles, CA', 'Chicago, IL', 'Denver, CO', 'Remote', 'London, UK'];

const EVENT_TYPES = ['conference', 'meetup', 'workshop', 'webinar', 'networking'];
const EVENT_NAMES = [
  'NeurIPS 2025', 'AI Summit San Francisco', 'YC Demo Day Spring 2026',
  'SaaStr Annual', 'React Summit', 'MLOps World', 'PyCon US 2026',
  'Founders & Funders Mixer', 'Web3 BuildSpace Hackathon', 'Stripe Sessions 2026',
  'a16z AI Workshop', 'DeepMind Research Talks', 'OpenAI Developer Day',
  'Product Hunt Meetup SF', 'AWS re:Invent', 'Google I/O', 'Apple WWDC',
  'GraphQL Conf', 'KubeCon North America', 'DataEngConf',
];

const CAMPAIGN_GOALS = [
  'Land a senior ML engineering role at an AI startup',
  'Find a technical mentor with experience scaling engineering teams',
  'Identify potential angel investors for our seed round',
  'Build relationships with PM leaders at B2B SaaS companies',
  'Connect with researchers working on LLM alignment',
];

const CAMPAIGN_NAMES = [
  'ML Job Search Q1 2026', 'Mentorship Outreach — Engineers', 'Seed Fundraising Campaign',
  'PM Network Expansion', 'Research Collab Outreach',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randN = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(3));
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const initials = (name) => name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);

async function seedSubscriptionPlans() {
  await SubscriptionPlan.deleteMany({});
  return SubscriptionPlan.insertMany([
    {
      name: 'free', display_name: 'Free', description: 'Get started with basic networking',
      price_monthly: 0, price_yearly: 0, currency: 'usd', is_active: true, sort_order: 0,
      features: { contacts_limit: 50, campaigns_limit: 2, ai_credits: 100 },
      limits: { messages_per_day: 5, bulk_import: 50 },
    },
    {
      name: 'pro', display_name: 'Pro', description: 'Unlimited networking with AI agents',
      price_monthly: 29, price_yearly: 290, currency: 'usd', is_active: true, sort_order: 1,
      features: { contacts_limit: 2000, campaigns_limit: 20, ai_credits: 2000 },
      limits: { messages_per_day: 50, bulk_import: 2000 },
    },
    {
      name: 'enterprise', display_name: 'Enterprise', description: 'For teams and power users',
      price_monthly: 99, price_yearly: 990, currency: 'usd', is_active: true, sort_order: 2,
      features: { contacts_limit: -1, campaigns_limit: -1, ai_credits: -1 },
      limits: { messages_per_day: -1, bulk_import: -1 },
    },
  ]);
}

async function createUser(i) {
  const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
  const lastName = rand(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@connectsphere.dev`;
  const password_hash = await bcrypt.hash('Password123!', 10);

  return User.create({
    email, password_hash, name,
    title: rand(TITLES),
    company: rand(COMPANIES),
    location: rand(LOCATIONS),
    initials: initials(name),
    avatar_color: rand(AVATAR_COLORS),
    bio: `Passionate professional focused on ${rand(INDUSTRIES)} with ${randInt(2, 12)} years of experience.`,
    skills: randN(SKILLS, randInt(4, 8)),
    interests: randN(SKILLS, randInt(3, 6)),
    goal: rand(GOALS),
    onboarding_completed: true,
    onboarding_step: 4,
    email_verified: true,
    subscription_tier: Math.random() > 0.6 ? 'pro' : 'free',
    subscription_status: 'active',
    last_login_at: daysAgo(randInt(0, 30)),
    settings: {
      max_messages_per_day: randInt(5, 20),
      min_days_between_messages: randInt(5, 14),
      preferred_tone: rand(['professional', 'friendly', 'direct']),
      notify_new_opportunities: true,
      notify_message_replies: true,
      notify_campaign_updates: true,
      notify_event_reminders: true,
      email_notifications: true,
      push_notifications: Math.random() > 0.5,
      ai_message_generation: true,
      ai_contact_scoring: true,
      theme: rand(['light', 'dark', 'system']),
      timezone: rand(['America/Los_Angeles', 'America/New_York', 'America/Chicago', 'Europe/London']),
    },
  });
}

async function createContacts(userId, count = 20) {
  const contacts = [];
  for (let i = 0; i < count; i++) {
    const firstName = rand(FIRST_NAMES);
    const lastName = rand(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const strengthScore = randInt(20, 95);
    const lastInteraction = daysAgo(randInt(1, 200));

    contacts.push({
      user_id: userId,
      name,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${rand(['gmail.com', 'company.io', 'work.com'])}`,
      title: rand(TITLES),
      company: rand(COMPANIES),
      location: rand(LOCATIONS),
      initials: initials(name),
      avatar_color: rand(AVATAR_COLORS),
      skills: randN(SKILLS, randInt(3, 7)),
      interests: randN(SKILLS, randInt(2, 5)),
      tags: randN(['key-contact', 'mentor', 'investor', 'recruiter', 'technical', 'follow-up'], randInt(0, 3)),
      strength_score: strengthScore,
      status: rand(STATUSES),
      source: rand(SOURCES),
      mutual_connections: randInt(0, 25),
      last_interaction_at: lastInteraction,
      response_rate: randFloat(0.1, 0.9),
      avg_response_time_hours: randInt(4, 72),
      graph_x: randFloat(50, 750),
      graph_y: randFloat(50, 550),
      notes_json: {
        pagerank_score: randFloat(0, 1),
        degree_centrality: randFloat(0, 1),
        community_id: randInt(1, 5),
        graph_distance: randInt(1, 3),
        last_enriched: daysAgo(randInt(1, 30)).getTime() / 1000,
        score_factors: {
          recency: randInt(40, 100),
          interaction_count: randInt(0, 50),
          mutual_connections: randInt(0, 25),
          source_quality: randFloat(0.5, 1.0),
        },
      },
    });
  }
  return Contact.insertMany(contacts);
}

async function createCampaign(userId, contacts) {
  const goalIdx = randInt(0, CAMPAIGN_GOALS.length - 1);
  const campaign = await Campaign.create({
    user_id: userId,
    name: CAMPAIGN_NAMES[goalIdx % CAMPAIGN_NAMES.length],
    goal: CAMPAIGN_GOALS[goalIdx],
    description: `Strategic outreach campaign to ${CAMPAIGN_GOALS[goalIdx].toLowerCase()}`,
    status: rand(['active', 'active', 'paused', 'completed']),
    tone: rand(['professional', 'friendly', 'direct']),
    duration: '30 days',
    duration_days: 30,
    auto_followup: true,
    followup_delay_days: 7,
    max_followups: 2,
    goal_decomposition: {
      target_role: rand(TITLES),
      target_companies: randN(COMPANIES, 3),
      target_skills: randN(SKILLS, 4),
      goal_type: rand(['job', 'mentor', 'collab', 'event']),
    },
    stats: {
      total_contacts: contacts.length,
      sent: randInt(5, contacts.length),
      opened: randInt(2, 10),
      replied: randInt(1, 5),
      meetings: randInt(0, 3),
      bounced: randInt(0, 2),
      unsubscribed: 0,
    },
    started_at: daysAgo(randInt(5, 30)),
  });

  // Add contacts to campaign
  const ccDocs = contacts.slice(0, Math.min(8, contacts.length)).map((c, i) => ({
    campaign_id: campaign._id,
    contact_id: c._id,
    sequence_position: i + 1,
    status: rand(['pending', 'sent', 'replied', 'opened']),
    relevance_score: randFloat(0.4, 0.99),
    confidence: rand(['high', 'medium', 'low']),
    explanation: `This person is highly relevant to your goal based on their profile and network position.`,
    score_breakdown: {
      semantic: randFloat(0.2, 0.4),
      strength: randFloat(0.1, 0.25),
      graph_proximity: randFloat(0.1, 0.2),
      pagerank: randFloat(0.05, 0.12),
      recency: randFloat(0.03, 0.08),
    },
  }));
  await CampaignContact.insertMany(ccDocs);
  return campaign;
}

async function createMessages(userId, contacts, campaign) {
  const messages = [];
  const selectedContacts = contacts.slice(0, Math.min(5, contacts.length));
  for (const contact of selectedContacts) {
    const body = `Hi ${contact.name.split(' ')[0]},\n\nI came across your profile and was impressed by your work at ${contact.company}. I'm reaching out because ${campaign.goal.toLowerCase()} and I think connecting with you could be incredibly valuable.\n\nWould you be open to a quick 15-minute chat?\n\nBest regards`;
    messages.push({
      user_id: userId,
      contact_id: contact._id,
      campaign_id: campaign._id,
      subject: `Quick introduction — ${campaign.goal.slice(0, 40)}...`,
      body,
      preview: body.slice(0, 150),
      status: rand(['sent', 'opened', 'replied', 'draft', 'scheduled']),
      tone: campaign.tone,
      variant: rand(['short', 'long']),
      ai_generated: true,
      ai_confidence: randInt(65, 95),
      evidence: [
        'Connected via mutual professional network',
        `Both interested in ${rand(SKILLS)}`,
      ],
      quality_scores: { specificity: randFloat(0.6, 0.95), clear_ask: true, confidence: randFloat(0.65, 0.95) },
      compliance_check: { approved: true, spam_score: 0, checks: {}, block_reason: null, suggestions: [] },
      sent_at: daysAgo(randInt(1, 20)),
      open_count: randInt(0, 3),
      click_count: randInt(0, 1),
      deleted_at: null,
    });
  }
  return Message.insertMany(messages);
}

async function createEvents(userId) {
  const events = [];
  for (let i = 0; i < 5; i++) {
    const futureDate = new Date(Date.now() + randInt(7, 120) * 86400000);
    events.push({
      user_id: i % 3 === 0 ? userId : null, // mix of user and system events
      name: rand(EVENT_NAMES),
      description: `A premier event for ${rand(INDUSTRIES)} professionals to connect, learn, and grow.`,
      host: rand(COMPANIES),
      event_date: futureDate,
      event_time: rand(['9:00 AM', '10:00 AM', '2:00 PM', '6:00 PM']),
      timezone: 'America/Los_Angeles',
      location: rand(LOCATIONS),
      location_type: rand(['in-person', 'virtual', 'hybrid']),
      type: rand(EVENT_TYPES),
      category: rand(INDUSTRIES),
      tags: randN(SKILLS, 3),
      price_range: rand(['Free', '$25', '$50', '$150', '$500+']),
      attendee_count: randInt(50, 5000),
      capacity: randInt(5000, 10000),
      relevance_score: randInt(40, 95),
      source: rand(['manual', 'eventbrite', 'meetup']),
      rsvp_status: rand([null, 'interested', 'going', 'maybe']),
    });
  }
  return Event.insertMany(events);
}

async function createNotifications(userId) {
  const types = ['opportunity', 'draft', 'followup', 'response', 'event', 'campaign', 'system'];
  const notifs = [];
  for (let i = 0; i < 6; i++) {
    const type = types[i % types.length];
    notifs.push({
      user_id: userId,
      type,
      message: {
        opportunity: 'New high-value contact identified for your campaign',
        draft: 'Your AI-generated draft is ready for review',
        followup: 'Time to follow up with a key contact',
        response: 'A contact has replied to your message',
        event: 'An event you might like is coming up this week',
        campaign: 'Your campaign has been updated with new contacts',
        system: 'Your profile enrichment is complete',
      }[type],
      action: { href: '/dashboard', label: 'View' },
      read: Math.random() > 0.5,
      created_at: daysAgo(randInt(0, 14)),
    });
  }
  return Notification.insertMany(notifs);
}

async function createReminders(userId, contacts) {
  const reminders = [];
  for (const contact of contacts.slice(0, 3)) {
    reminders.push({
      user_id: userId,
      contact_id: contact._id,
      type: rand(['stale_relationship', 'followup_due', 'check_in']),
      message: `You haven't connected with ${contact.name} in a while`,
      hook: `Reach out to ${contact.name} — share a relevant article about ${rand(SKILLS)}`,
      content_suggestion: `Article: "The future of ${rand(INDUSTRIES)} in 2026"`,
      priority: rand(['high', 'medium', 'low']),
      due_date: new Date(Date.now() + randInt(0, 7) * 86400000),
      status: 'pending',
      created_by_agent: 'follow_up_lifecycle_agent',
    });
  }
  return Reminder.insertMany(reminders);
}

async function createInteractions(userId, contacts) {
  const interactions = [];
  const interactionTypes = ['email', 'meeting', 'call', 'linkedin_message', 'outreach_sent'];
  for (const contact of contacts.slice(0, randInt(3, 8))) {
    interactions.push({
      user_id: userId,
      contact_id: contact._id,
      type: rand(interactionTypes),
      direction: rand(['inbound', 'outbound']),
      title: `${rand(['Coffee chat', 'Intro call', 'Follow-up', 'Check-in', 'Meeting'])} with ${contact.name.split(' ')[0]}`,
      outcome: rand(['positive', 'neutral', 'follow-up-needed']),
      interaction_date: daysAgo(randInt(1, 90)),
      duration_minutes: rand([null, 15, 30, 45, 60]),
    });
  }
  return Interaction.insertMany(interactions);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(config.mongodb.uri);
  console.log('[Seed] Connected to MongoDB');

  // Clear existing seed data (dev only)
  if (process.env.CLEAR_DB === 'true') {
    console.log('[Seed] Clearing existing data...');
    await Promise.all([
      User.deleteMany({}), Contact.deleteMany({}), Campaign.deleteMany({}),
      CampaignContact.deleteMany({}), Message.deleteMany({}), Event.deleteMany({}),
      Notification.deleteMany({}), Reminder.deleteMany({}), Interaction.deleteMany({}),
      SubscriptionPlan.deleteMany({}),
    ]);
  }

  console.log('[Seed] Creating subscription plans...');
  await seedSubscriptionPlans();

  console.log('[Seed] Creating 50 users with full data...');
  for (let i = 0; i < 50; i++) {
    const user = await createUser(i);
    const contacts = await createContacts(user._id, randInt(15, 30));
    const campaign = await createCampaign(user._id, contacts);
    await Promise.all([
      createMessages(user._id, contacts, campaign),
      createEvents(user._id),
      createNotifications(user._id),
      createReminders(user._id, contacts),
      createInteractions(user._id, contacts),
    ]);
    if ((i + 1) % 10 === 0) console.log(`[Seed] ${i + 1}/50 users seeded`);
  }

  // ── Deterministic demo/test user ─────────────────────────────────────────
  console.log('[Seed] Creating deterministic demo user...');
  const demoHash = await bcrypt.hash('Password123!', 10);
  const demoUser = await User.create({
    email: 'demo@connectsphere.dev',
    password_hash: demoHash,
    name: 'Alex Rivera',
    title: 'Senior Software Engineer',
    company: 'Anthropic',
    location: 'San Francisco, CA',
    initials: 'AR',
    avatar_color: '#4f46e5',
    bio: 'Building AI-powered networking tools. Passionate about LLMs and developer experience.',
    skills: ['JavaScript', 'Python', 'Machine Learning', 'React', 'Node.js', 'TypeScript'],
    interests: ['AI Research', 'Startups', 'Open Source'],
    goal: 'Find senior ML engineering roles at top AI companies',
    onboarding_completed: true,
    onboarding_step: 4,
    email_verified: true,
    subscription_tier: 'pro',
    subscription_status: 'active',
    settings: {
      max_messages_per_day: 15,
      preferred_tone: 'professional',
      notify_new_opportunities: true,
      notify_message_replies: true,
      notify_campaign_updates: true,
      ai_message_generation: true,
      ai_contact_scoring: true,
      theme: 'system',
    },
  });
  const demoContacts = await createContacts(demoUser._id, 20);
  const demoCampaign = await createCampaign(demoUser._id, demoContacts);
  await Promise.all([
    createMessages(demoUser._id, demoContacts, demoCampaign),
    createEvents(demoUser._id),
    createNotifications(demoUser._id),
    createReminders(demoUser._id, demoContacts),
    createInteractions(demoUser._id, demoContacts),
  ]);
  console.log('[Seed] Demo user: demo@connectsphere.dev / Password123!');

  console.log('[Seed] Done! 50 users + 1 demo user seeded.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
