import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Users, Megaphone, Send, Calendar, Target, Mail, Bell, ExternalLink, TrendingUp, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { mockAnalyticsData } from '../../data/mockData';
import { eventsApi } from '../../api/events';
import { messagesApi } from '../../api/messages';
import { remindersApi, type Reminder } from '../../api/reminders';
import MessageEditorModal from '../../components/common/MessageEditorModal';
import { EmptyState } from '../../components/common/EmptyState';
import type { Contact, Event, Message } from '../../types';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';

function MetricCard({ icon: Icon, label, value, trend, color, link }: {
  icon: any; label: string; value: string | number; trend?: string; color: string; link?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-white dark:bg-[#303134] rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] transition-all cursor-default"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className="flex items-center gap-1 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
            <TrendingUp className="w-3 h-3" />{trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed] mb-0.5">{value}</div>
      <div className="text-sm text-gray-500 dark:text-[#9aa0a6]">{label}</div>
      {link && (
        <Link to={link} className="text-xs text-[#0a66c2] dark:text-[#8ab4f8] hover:underline mt-1 block">
          View all →
        </Link>
      )}
    </motion.div>
  );
}

function StrengthBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      : score >= 60
      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{score}%</span>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] shadow-lg px-3 py-2">
        <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

const metricCards = [
  { icon: Users,     label: 'Total Contacts',   trend: '+12%', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',     link: '/contacts'  },
  { icon: Megaphone, label: 'Active Campaigns',  trend: undefined, color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',     link: '/campaigns' },
  { icon: Send,      label: 'Pending Outreach',  trend: undefined, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400', link: '/contacts'  },
  { icon: Calendar,  label: 'Upcoming Events',   trend: undefined, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400', link: '/events'    },
];

const NOTIF_ICON: Record<string, string> = {
  opportunity: '🎯',
  draft: '✉️',
  followup: '🔔',
  response: '💬',
  event: '📅',
  campaign: '📋',
  system: '⚙️',
};

export default function Dashboard() {
  const { user, contacts, campaigns, notifications } = useApp();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [existingMessage, setExistingMessage] = useState<{ subject: string; body: string } | undefined>(undefined);
  const [clickedReachOut, setClickedReachOut] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pendingDrafts, setPendingDrafts] = useState<Message[]>([]);
  const [followups, setFollowups] = useState<Reminder[]>([]);

  function formatReminderDate(value?: string | null) {
    if (!value) return 'No outreach recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No outreach recorded';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  useEffect(() => {
    eventsApi.list({ upcoming: true, limit: 3 })
      .then(res => setUpcomingEvents(res.events || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesApi.list({ status: 'draft', limit: 3 })
      .then(res => setPendingDrafts(res.messages || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    remindersApi.list({ status: 'pending', limit: 3 })
      .then(res => setFollowups((res || []).filter(reminder => reminder.type === 'followup_due' || reminder.type === 'stale_relationship')))
      .catch(() => {});
  }, []);

  const hasData = contacts.length > 0;
  const topOpportunities = contacts.filter(c => c.strengthScore >= 75).slice(0, 4);
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const pendingOutreach = contacts.filter(c => c.status === 'pending').length;

  const recentActivity = notifications.slice(0, 5).map(n => ({
    icon: NOTIF_ICON[n.type] ?? '🔔',
    text: n.message,
    time: n.timestamp,
  }));

  const handleReachOut = (contact: Contact) => {
    setClickedReachOut(contact.id);
    setTimeout(() => setClickedReachOut(null), 600);
    setSelectedContact(contact);
    setExistingMessage(undefined);
    setShowMessageModal(true);
  };

  const metricValues = [contacts.length, activeCampaigns.length, pendingOutreach, upcomingEvents.length];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 dark:text-[#9aa0a6] mt-1">Here's your networking overview for today</p>
        </div>
        <Link
          to="/campaigns/new"
          className="hidden sm:flex items-center gap-2 bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:shadow-sm active:scale-95"
        >
          <Sparkles className="w-4 h-4" /> New Campaign
        </Link>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, i) => (
          <motion.div key={card.label} custom={i} variants={fadeUp} initial="hidden" animate="visible">
            <MetricCard {...card} value={metricValues[i]} />
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Top Opportunities */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.3 }}
            className="bg-white dark:bg-[#303134] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]"
          >
            <div className="p-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#0a66c2] dark:text-[#8ab4f8]" />
                <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Top Opportunities This Week</h2>
              </div>
              <Link to="/contacts" className="text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">View all</Link>
            </div>
            {topOpportunities.length === 0 ? (
              <EmptyState
                emoji="🕒"
                title="No opportunities this week"
                description="Create a campaign to start finding and tracking your top networking opportunities."
                ctaLabel="New Campaign"
                ctaHref="/campaigns/new"
                className="py-10"
              />
            ) : (
              <div className="divide-y divide-[#f0f0f0] dark:divide-[#3c4043]">
                {topOpportunities.map((contact, i) => (
                  <motion.div
                    key={contact.id}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 cursor-default hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 transition-transform hover:scale-110', contact.avatarColor)}>
                        {contact.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-[#e8eaed] text-sm">{contact.name}</span>
                          <StrengthBadge score={contact.strengthScore} />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{contact.title} at {contact.company}</p>
                        <p className="text-xs text-[#0a66c2] dark:text-[#8ab4f8] mt-0.5">
                          {contact.mutualConnections} mutual connections · {contact.skills.slice(0, 2).join(', ')}
                        </p>
                      </div>
                      <motion.button
                        onClick={() => handleReachOut(contact)}
                        whileTap={{ scale: 0.9 }}
                        animate={clickedReachOut === contact.id ? { scale: [1, 0.88, 1.05, 1] } : {}}
                        transition={{ duration: 0.35 }}
                        className="flex-shrink-0 text-xs bg-[#0a66c2] hover:bg-[#004182] text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Reach Out
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Pending Drafts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.3 }}
            className="bg-white dark:bg-[#303134] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]"
          >
            <div className="p-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Drafts Awaiting Review</h2>
              </div>
              <Link to="/campaigns" className="text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">View all</Link>
            </div>
            {pendingDrafts.length === 0 ? (
              <div className="px-5 pb-5 text-center text-sm text-gray-500 dark:text-[#9aa0a6] py-8">
                No drafts pending. Start a campaign to generate messages!
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f0] dark:divide-[#3c4043]">
                {pendingDrafts.map((msg: Message) => (
                  <motion.div
                    key={msg.id}
                    whileHover={{ x: 1 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{msg.contactName}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            msg.status === 'draft'
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                          }`}>
                            {msg.status === 'draft' ? 'Draft Ready' : 'Scheduled'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mt-0.5 truncate">{msg.subject}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const contact = contacts.find(c => c.id === msg.contactId);
                            if (contact) {
                              setSelectedContact(contact);
                              setExistingMessage({ subject: msg.subject, body: msg.body });
                              setShowMessageModal(true);
                            }
                          }}
                          className="text-xs border border-[#e6e6e6] dark:border-[#3c4043] text-[#0a66c2] dark:text-[#8ab4f8] hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] hover:border-[#0a66c2] dark:hover:border-[#8ab4f8] px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Review
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Network Growth Chart */}
          {hasData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.3 }}
              className="bg-white dark:bg-[#303134] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Network Growth</h2>
                <Link to="/analytics" className="text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline flex items-center gap-1">
                  View Analytics <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={mockAnalyticsData.networkGrowth}>
                  <defs>
                    <linearGradient id="contactsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a66c2" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0a66c2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="contacts"
                    stroke="#0a66c2"
                    strokeWidth={1.5}
                    fill="url(#contactsGradient)"
                    dot={{ r: 2.5, fill: '#0a66c2' }}
                    activeDot={{ r: 4, fill: '#0a66c2', stroke: 'white', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Follow-up Reminders */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="bg-white dark:bg-[#303134] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]"
          >
            <div className="p-5 pb-3 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Follow-up Reminders</h2>
            </div>
            {followups.length === 0 ? (
              <div className="px-5 pb-5 pt-2 text-center text-sm text-gray-500 dark:text-[#9aa0a6] py-8">
                No follow-ups needed. Your network is up to date!
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f0] dark:divide-[#3c4043]">
                {followups.map(reminder => {
                  const reminderContactId = typeof reminder.contact_id === 'string' ? reminder.contact_id : reminder.contact_id?._id;
                  const contact = contacts.find(c => c.id === reminderContactId);
                  const contactName = typeof reminder.contact_id === 'string' ? contact?.name || 'Contact' : reminder.contact_id?.name || contact?.name || 'Contact';
                  const avatarColor = contact?.avatarColor || 'bg-indigo-600';
                  const initials = contact?.initials || (typeof reminder.contact_id === 'string' ? '??' : reminder.contact_id?.initials) || contactName.slice(0, 2).toUpperCase();
                  return (
                  <motion.div
                    key={reminder._id}
                    whileHover={{ x: 1 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0', avatarColor)}>
                        {initials}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{contactName}</span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-[#71767a]">Last contacted: {formatReminderDate(reminder.last_contacted_at)}</p>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mt-1 mb-2">
                      {reminder.latest_reply ? `Latest reply: ${formatReminderDate(reminder.latest_reply.received_at)}` : 'No reply yet'}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        if (contact) {
                          setSelectedContact(contact);
                          setExistingMessage(undefined);
                          setShowMessageModal(true);
                        } else {
                          toast.error('Contact details not loaded yet');
                        }
                      }}
                      className="w-full text-xs border border-[#e6e6e6] dark:border-[#3c4043] text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Generate Follow-up
                    </motion.button>
                  </motion.div>
                )})}
              </div>
            )}
          </motion.div>

          {/* Recommended Events */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24, duration: 0.3 }}
            className="bg-white dark:bg-[#303134] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]"
          >
            <div className="p-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Recommended Events</h2>
              </div>
              <Link to="/events" className="text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">All</Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="px-5 pb-5 pt-2 text-center text-sm text-gray-500 dark:text-[#9aa0a6] py-8">
                No events yet. <Link to="/events" className="text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">Browse events →</Link>
              </div>
            ) : (
              <div className="divide-y divide-[#f0f0f0] dark:divide-[#3c4043]">
                {upcomingEvents.map((event: Event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ x: 1 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-1.5">
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
                        event.relevanceScore >= 85
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                      }`}>
                        {event.relevanceScore}%
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] leading-tight">{event.name}</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{event.date} · {event.location}</p>
                    <p className="text-xs text-[#0a66c2] dark:text-[#8ab4f8] mt-1">{event.networkContacts} network contacts attending</p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.28, duration: 0.3 }}
            className="bg-white dark:bg-[#303134] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]"
          >
            <div className="p-5 pb-3">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Recent Activity</h2>
            </div>
            {recentActivity.length === 0 ? (
              <div className="px-5 pb-5 text-center text-sm text-gray-500 dark:text-[#9aa0a6] py-6">
                No activity yet. Start networking to see updates here.
              </div>
            ) : (
              <div className="px-5 pb-5 space-y-3">
                {recentActivity.map(({ icon, text, time }, i) => (
                  <motion.div
                    key={i}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="flex items-start gap-2"
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                    <div>
                      <p className="text-xs text-gray-700 dark:text-[#9aa0a6]">{text}</p>
                      <p className="text-xs text-gray-400 dark:text-[#71767a]">{time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && selectedContact && (
        <MessageEditorModal
          contact={selectedContact}
          existingMessage={existingMessage}
          onClose={() => { setShowMessageModal(false); setSelectedContact(null); setExistingMessage(undefined); }}
          onSend={() => {
            toast.success(`Message sent to ${selectedContact.name}!`);
            setShowMessageModal(false);
            setSelectedContact(null);
            setExistingMessage(undefined);
            // Refresh drafts so sent messages no longer appear as pending
            messagesApi.list({ status: 'draft', limit: 3 })
              .then(res => setPendingDrafts(res.messages || []))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
