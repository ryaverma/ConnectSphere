export interface Contact {
  id: string;
  name: string;
  email: string;
  title: string;
  company: string;
  location: string;
  initials: string;
  avatarColor: string;
  strengthScore: number;
  skills: string[];
  lastInteraction: string;
  status: 'active' | 'pending' | 'responded' | 'dormant' | 'in-campaign';
  source: 'linkedin' | 'github' | 'email' | 'manual';
  linkedinUrl?: string;
  githubUrl?: string;
  mutualConnections: number;
  bio?: string;
  education?: string;
  interests?: string[];
  x?: number;
  y?: number;
}

export interface Campaign {
  id: string;
  name: string;
  goal: string;
  status: 'active' | 'paused' | 'completed';
  contactIds: string[];
  stats: {
    total: number;
    sent: number;
    opened: number;
    replied: number;
    meetings: number;
  };
  createdAt: string;
  duration: string;
  tone: 'professional' | 'friendly' | 'direct';
}

export interface Message {
  id: string;
  _id?: string;
  contactId: string;
  contactName: string;
  campaignId?: string;
  campaign_id?: string | null;
  contact_id?: string;
  user_id?: string;
  subject: string;
  body: string;
  preview?: string;
  status: 'draft' | 'pending_approval' | 'scheduled' | 'sent' | 'opened' | 'replied' | 'bounced' | 'failed' | 'blocked' | 'cancelled';
  scheduledFor?: string;
  sentAt?: string;
  variant?: 'short' | 'long' | 'followup_1' | 'followup_2' | null;
  tone: 'professional' | 'friendly' | 'direct' | 'creative';
  aiConfidence: number;
  ai_confidence?: number;
}

export interface Event {
  id: string;
  name: string;
  host: string;
  date: string;
  time: string;
  location: string;
  locationType: 'virtual' | 'in-person';
  type: 'conference' | 'meetup' | 'workshop' | 'webinar' | 'networking' | 'social';
  relevanceScore: number;
  attendees: number;
  description: string;
  image: string;
  tags: string[];
  networkContacts: number;
  rsvped?: boolean;
  ticketUrl?: string;
  externalUrl?: string;
}

export interface Notification {
  id: string;
  type: 'opportunity' | 'draft' | 'followup' | 'response' | 'event' | 'campaign' | 'system';
  message: string;
  timestamp: string;
  read: boolean;
  action?: { href: string; label: string };
}

export interface User {
  id: string;
  name: string;
  email: string;
  title: string;
  company: string;
  location: string;
  initials: string;
  avatarColor: string;
  skills: string[];
  interests: string[];
  goal?: string;
}

export interface AnalyticsData {
  networkGrowth: Array<{ month: string; contacts: number; }>;
  sourceBreakdown: Array<{ name: string; value: number; color: string; }>;
  outreachPerformance: Array<{ month: string; sent: number; responses: number; meetings: number; }>;
  strengthDistribution: Array<{ name: string; value: number; color: string; }>;
}
