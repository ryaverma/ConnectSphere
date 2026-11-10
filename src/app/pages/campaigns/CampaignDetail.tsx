import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Pause, Play, Edit3, BarChart2, Mail, Users, MessageSquare, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../../components/ui/utils';
import MessageEditorModal from '../../components/common/MessageEditorModal';
import { toast } from 'sonner';
import type { Contact } from '../../types';
import { api, campaignsApi, messagesApi } from '../../api';

type Tab = 'contacts' | 'drafts' | 'responses' | 'analytics';

type CampaignDetailResponse = {
  _id?: string;
  id?: string;
  name: string;
  goal: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  tone?: string;
  contacts?: Array<{
    contact_id?: any;
    relevance_score?: number;
    sequence_position?: number;
  }>;
  stats?: {
    total_contacts?: number;
    sent?: number;
    opened?: number;
    replied?: number;
    meetings?: number;
    bounced?: number;
  };
};

type CampaignMessage = Awaited<ReturnType<typeof messagesApi.get>>;

const statusMap = {
  draft: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
  active: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  paused: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  completed: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
  archived: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
} as const;

const msgStatusMap: Record<string, string> = {
  draft: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
  pending_approval: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
  scheduled: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  sent: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
  opened: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
  replied: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
  bounced: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  failed: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  blocked: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  cancelled: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
};

function toContact(raw: any): Contact {
  const contact = raw?.contact_id || raw;
  return {
    id: String(contact?._id || contact?.id || ''),
    name: contact?.name || '',
    email: contact?.email || '',
    title: contact?.title || '',
    company: contact?.company || '',
    location: contact?.location || '',
    initials: contact?.initials || '',
    avatarColor: contact?.avatar_color || contact?.avatarColor || 'bg-indigo-600',
    strengthScore: contact?.strength_score || contact?.strengthScore || 0,
    skills: contact?.skills || [],
    lastInteraction: contact?.last_interaction_at || 'Unknown',
    status: (contact?.status || 'pending') as Contact['status'],
    source: (contact?.source === 'imported' ? 'manual' : (contact?.source || 'manual')) as Contact['source'],
    mutualConnections: contact?.mutual_connections || 0,
  };
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('contacts');
  const [campaign, setCampaign] = useState<CampaignDetailResponse | null>(null);
  const [campaignContacts, setCampaignContacts] = useState<Contact[]>([]);
  const [campaignMessages, setCampaignMessages] = useState<CampaignMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<CampaignMessage | null>(null);
  const [showMessage, setShowMessage] = useState(false);

  const loadCampaign = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [campaignRes, messagesRes] = await Promise.all([
        api.get<CampaignDetailResponse>(`/campaigns/${id}`),
        messagesApi.list({ campaign_id: id, limit: 100 }),
      ]);

      setCampaign(campaignRes);
      setCampaignContacts((campaignRes.contacts || []).map(toContact).filter((contact) => contact.id));
      setCampaignMessages(messagesRes.messages || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load campaign';
      toast.error(message);
      setCampaign(null);
      setCampaignContacts([]);
      setCampaignMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const stats = campaign?.stats || {};
  const totalContacts = stats.total_contacts || campaignContacts.length;
  const sent = stats.sent || 0;
  const opened = stats.opened || 0;
  const replied = stats.replied || 0;
  const meetings = stats.meetings || 0;
  const responseRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
  const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;

  const messageByContact = useMemo(() => {
    const lookup = new Map<string, CampaignMessage>();
    for (const msg of campaignMessages) {
      const contactId = String(msg.contact_id || msg.contactId || '');
      if (!contactId) continue;
      if (!lookup.has(contactId)) lookup.set(contactId, msg);
    }
    return lookup;
  }, [campaignMessages]);

  const repliedMessages = campaignMessages.filter((msg) => msg.status === 'replied');
  const analyticsBars = [
    { name: 'Sent', value: sent, color: '#6366f1' },
    { name: 'Opened', value: opened, color: '#14b8a6' },
    { name: 'Replied', value: replied, color: '#10b981' },
    { name: 'Meetings', value: meetings, color: '#f59e0b' },
  ];

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'contacts', label: 'Contacts & Messages', icon: Users },
    { id: 'drafts', label: 'Outreach Drafts', icon: Mail },
    { id: 'responses', label: 'Responses', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ];

  if (!loading && !campaign) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Campaign not found</h2>
        <Link to="/campaigns" className="text-indigo-600 dark:text-indigo-400 hover:underline">Back to campaigns</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Link to="/campaigns" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed] mb-5 w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      {loading ? (
        <div className="space-y-4">
          <div className="h-10 w-64 bg-gray-200 dark:bg-[#3c4043] rounded animate-pulse" />
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#303134] rounded-lg p-3 border border-[#e6e6e6] dark:border-[#3c4043] animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-[#3c4043] rounded mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-[#252538] rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">{campaign?.name}</h1>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusMap[campaign?.status || 'draft']}`}>{campaign?.status}</span>
              </div>
              <p className="text-gray-600 dark:text-[#9aa0a6] text-sm">{campaign?.goal}</p>
            </div>
            <div className="flex gap-2">
              {campaign?.status === 'active' ? (
                <button
                  onClick={async () => {
                    await campaignsApi.pause(id!);
                    toast.success('Campaign paused');
                    loadCampaign(true);
                  }}
                  className="flex items-center gap-2 border border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Pause className="w-4 h-4" /> Pause
                </button>
              ) : campaign?.status === 'paused' || campaign?.status === 'draft' ? (
                <button
                  onClick={async () => {
                    await campaignsApi.start(id!);
                    toast.success('Campaign started');
                    loadCampaign(true);
                  }}
                  className="flex items-center gap-2 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  <Play className="w-4 h-4" /> Start
                </button>
              ) : null}
              <button
                onClick={() => loadCampaign(true)}
                className="flex items-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] text-gray-700 dark:text-[#e8eaed] hover:bg-gray-50 dark:hover:bg-[#3c4043] px-4 py-2 rounded-lg text-sm transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button className="flex items-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] text-gray-700 dark:text-[#e8eaed] hover:bg-gray-50 dark:hover:bg-[#3c4043] px-4 py-2 rounded-lg text-sm transition-colors">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Total', value: totalContacts, color: 'text-gray-900 dark:text-[#e8eaed]' },
              { label: 'Sent', value: sent, color: 'text-[#0a66c2] dark:text-[#8ab4f8]' },
              { label: 'Opened', value: `${opened} (${openRate}%)`, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Replied', value: `${replied} (${responseRate}%)`, color: 'text-green-600 dark:text-green-400' },
              { label: 'Meetings', value: meetings, color: 'text-teal-600 dark:text-teal-400' },
              { label: 'Drafts', value: campaignMessages.filter((msg) => msg.status === 'draft' || msg.status === 'pending_approval').length, color: 'text-orange-600 dark:text-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-[#303134] rounded-lg p-3 border border-[#e6e6e6] dark:border-[#3c4043] text-center">
                <div className={`text-lg font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 dark:text-[#9aa0a6]">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-[#303134] rounded-lg p-4 border border-[#e6e6e6] dark:border-[#3c4043] mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-[#9aa0a6] mb-2">
              <span>Campaign Progress</span>
              <span>{sent} / {Math.max(totalContacts, 1)} contacts reached</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-[#3c4043] rounded-full overflow-hidden">
              <div className="h-full bg-[#0a66c2] rounded-full" style={{ width: `${totalContacts > 0 ? (sent / totalContacts) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="flex gap-1 bg-gray-100 dark:bg-[#3c4043] p-1 rounded-lg mb-5 overflow-x-auto">
            {tabs.map(({ id: tabId, label, icon: Icon }) => (
              <button
                key={tabId}
                onClick={() => setTab(tabId)}
                className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap', tab === tabId ? 'bg-white dark:bg-[#303134] text-[#0a66c2] dark:text-[#8ab4f8] shadow-sm' : 'text-gray-600 dark:text-[#9aa0a6] hover:text-gray-800 dark:hover:text-[#e8eaed]')}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {tab === 'contacts' && (
            <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e6e6e6] dark:border-[#3c4043]">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase">Contact</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase hidden md:table-cell">Strength</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase">Message Status</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e6e6] dark:divide-[#3c4043]">
                  {campaignContacts.map((contact) => {
                    const message = messageByContact.get(contact.id);
                    const messageStatus = message?.status || 'not_generated';
                    return (
                      <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0', contact.avatarColor)}>
                              {contact.initials}
                            </div>
                            <div>
                              <Link to={`/contacts/${contact.id}`} className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] hover:text-[#0a66c2] dark:hover:text-[#8ab4f8]">{contact.name}</Link>
                              <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{contact.company}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${contact.strengthScore >= 80 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'}`}>
                            {contact.strengthScore}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${msgStatusMap[messageStatus] || 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            {messageStatus === 'not_generated' ? 'not generated' : messageStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setSelectedMessage(message || null);
                              setShowMessage(true);
                            }}
                            className="text-xs border border-[#0a66c2] dark:border-[#8ab4f8] text-[#0a66c2] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            {message ? 'Review' : 'Generate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'drafts' && (
            <div className="space-y-3">
              {campaignMessages.filter((msg) => ['draft', 'pending_approval', 'scheduled'].includes(msg.status)).length === 0 ? (
                <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-12 text-center">
                  <div className="text-4xl mb-3">✉️</div>
                  <p className="text-gray-600 dark:text-[#9aa0a6]">No live drafts exist for this campaign yet.</p>
                </div>
              ) : campaignMessages.filter((msg) => ['draft', 'pending_approval', 'scheduled'].includes(msg.status)).map((msg) => {
                const contact = campaignContacts.find((c) => c.id === String(msg.contact_id || msg.contactId || ''));
                return (
                  <div key={msg._id || msg.id} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-[#e8eaed] text-sm">{contact?.name || msg.contactName || 'Unknown contact'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${msgStatusMap[msg.status]}`}>{msg.status}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-[#9aa0a6] mb-1">{msg.subject}</p>
                        <p className="text-sm text-gray-500 dark:text-[#71767a] line-clamp-2">{msg.body}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400 dark:text-[#71767a]">AI Confidence: {msg.ai_confidence || msg.aiConfidence || 0}%</span>
                          <span className="text-xs text-gray-400 dark:text-[#71767a]">Tone: {msg.tone}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (!contact) return toast.error('Contact not found for this draft');
                            setSelectedContact(contact);
                            setSelectedMessage(msg);
                            setShowMessage(true);
                          }}
                          className="text-xs bg-[#0a66c2] hover:bg-[#004182] text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Review & Send
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'responses' && (
            <div className="space-y-4">
              {repliedMessages.length === 0 ? (
                <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-12 text-center">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-gray-600 dark:text-[#9aa0a6]">No replies have been tracked for this campaign yet.</p>
                </div>
              ) : repliedMessages.map((msg) => {
                const contact = campaignContacts.find((c) => c.id === String(msg.contact_id || msg.contactId || ''));
                return (
                  <div key={msg._id || msg.id} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0', contact?.avatarColor || 'bg-indigo-600')}>
                        {contact?.initials || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900 dark:text-[#e8eaed]">{contact?.name || msg.contactName || 'Unknown contact'}</p>
                        <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{contact?.company || ''}</p>
                      </div>
                      <span className="ml-auto text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Replied</span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300 mb-3">
                      Latest tracked message: {msg.subject || '(no subject)'}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.info('Reply suggestions are not wired yet')}
                        className="text-xs bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Suggest Reply
                      </button>
                      <button
                        onClick={() => toast.info('Meeting scheduling is not wired yet')}
                        className="text-xs border border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Schedule Meeting
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'analytics' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">Live Campaign Summary</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analyticsBars}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {analyticsBars.map((bar) => (
                        <Cell key={bar.name} fill={bar.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">Performance Ratios</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-[#9aa0a6]">Open rate</span><span className="font-medium text-gray-900 dark:text-[#e8eaed]">{openRate}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-[#9aa0a6]">Response rate</span><span className="font-medium text-green-600 dark:text-green-400">{responseRate}%</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-[#9aa0a6]">Meetings booked</span><span className="font-medium text-teal-600 dark:text-teal-400">{meetings}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-[#9aa0a6]">Bounced</span><span className="font-medium text-red-600 dark:text-red-400">{stats.bounced || 0}</span></div>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">Campaign Notes</h3>
                  <p className="text-sm text-gray-600 dark:text-[#9aa0a6]">
                    This view now uses live campaign stats and real message records. Time-series analytics are not exposed by the current backend yet, so this tab summarizes the current campaign state instead of showing fake historical charts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showMessage && selectedContact && (
            <MessageEditorModal
              contact={selectedContact}
              existingMessage={selectedMessage ? {
                id: selectedMessage._id || selectedMessage.id,
                subject: selectedMessage.subject,
                body: selectedMessage.body,
                tone: selectedMessage.tone as any,
                variant: selectedMessage.variant || null,
              } : undefined}
              onClose={() => {
                setShowMessage(false);
                setSelectedContact(null);
                setSelectedMessage(null);
              }}
              onSend={() => {
                toast.success(`Message sent to ${selectedContact.name}`);
                setShowMessage(false);
                setSelectedContact(null);
                setSelectedMessage(null);
                loadCampaign(true);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
