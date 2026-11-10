import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, ExternalLink, Github, Linkedin, MapPin, MessageSquare, UserPlus, Calendar, FileText, Network, BarChart2, Clock, Briefcase, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { useApp } from '../../contexts/AppContext';
import { contactsApi } from '../../api';
import { cn } from '../../components/ui/utils';
import MessageEditorModal from '../../components/common/MessageEditorModal';
import { EmptyState } from '../../components/common/EmptyState';
import type { Contact } from '../../types';

type Tab = 'overview' | 'history' | 'campaigns' | 'notes' | 'network';
type InteractionRecord = {
  _id?: string;
  id?: string;
  type?: string;
  title?: string;
  description?: string;
  interaction_date?: string;
};
type NoteRecord = {
  _id?: string;
  id?: string;
  content?: string;
};

function SkillPill({ skill }: { skill: string }) {
  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm px-3 py-1.5 rounded-full"
    >
      {skill}
    </motion.span>
  );
}

function TimelineItem({ item }: { item: { type: string; label: string; note: string; date: string; status?: string | null } }) {
  return (
    <motion.div whileHover={{ x: 3 }} className="flex gap-4">
      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
        {item.type === 'outreach_sent' ? '✉️' : item.type === 'response_received' ? '💬' : '📝'}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.label}</span>
          {item.status ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
              {item.status}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-400">{item.note}</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{item.date}</p>
      </div>
    </motion.div>
  );
}

export default function ContactProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contacts, campaigns, refreshContacts } = useApp();
  const [tab, setTab] = useState<Tab>('overview');
  const [showMessage, setShowMessage] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<InteractionRecord[]>([]);
  const [savedNotes, setSavedNotes] = useState<NoteRecord[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [contactData, interactionData, noteData] = await Promise.all([
          contactsApi.get(id),
          contactsApi.getInteractions(id).catch(() => []),
          contactsApi.getNotes(id).catch(() => []),
        ]);
        if (cancelled) return;
        setContact(contactData);
        setInteractions((interactionData as InteractionRecord[]) || []);
        const notesList = (noteData as NoteRecord[]) || [];
        setSavedNotes(notesList);
        setNotes(notesList[0]?.content || '');
      } catch {
        if (!cancelled) {
          setContact(contacts.find((item) => item.id === id) || null);
          setInteractions([]);
          setSavedNotes([]);
          setNotes('');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contacts, id]);

  const historyItems = useMemo(() => interactions.map((item) => ({
    type: item.type || 'note',
    label: item.type === 'response_received' ? 'Reply Received' : item.type === 'outreach_sent' ? 'Message Sent' : item.title || 'Interaction',
    note: item.description || item.title || 'Interaction logged',
    date: item.interaction_date ? new Date(item.interaction_date).toLocaleString() : 'Unknown',
    status: item.type === 'response_received' ? 'replied' : item.type === 'outreach_sent' ? 'sent' : null,
  })), [interactions]);

  if (!loading && !contact) {
    return (
      <div className="p-8 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Contact not found</h2>
        <Link to="/contacts" className="text-indigo-600 dark:text-indigo-400 hover:underline">← Back to contacts</Link>
      </div>
    );
  }

  if (loading || !contact) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="h-10 w-56 bg-gray-200 dark:bg-[#3c4043] rounded animate-pulse mb-6" />
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5 animate-pulse h-72" />
          <div className="lg:col-span-3 bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5 animate-pulse h-72" />
        </div>
      </div>
    );
  }

  const contactCampaigns = campaigns.filter((campaign) => (campaign.contactIds || []).includes(contact.id));
  const mutuals = contacts.filter((item) => item.id !== contact.id && item.mutualConnections > 0).slice(0, 3);
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Briefcase },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'campaigns', label: 'Campaigns', icon: BarChart2 },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'network', label: 'Network', icon: Network },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link to="/contacts" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-[#9aa0a6] hover:text-[#0a66c2] dark:hover:text-[#8ab4f8] mb-6 w-fit transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contacts
      </Link>

      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5 text-center">
            <div className={cn('w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3', contact.avatarColor)}>
              {contact.initials}
            </div>
            <h2 className="font-bold text-gray-900 dark:text-slate-100 text-lg">{contact.name}</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400">{contact.title}</p>
            <p className="text-sm text-gray-500 dark:text-slate-500">{contact.company}</p>
            {contact.location ? (
              <div className="flex items-center justify-center gap-1 mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                <MapPin className="w-3 h-3" /> {contact.location}
              </div>
            ) : null}

            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
                <span>Connection Strength</span>
                <span className="font-medium text-gray-900 dark:text-slate-100">{contact.strengthScore}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${contact.strengthScore}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={cn('h-full rounded-full', contact.strengthScore >= 80 ? 'bg-green-500' : contact.strengthScore >= 60 ? 'bg-yellow-500' : 'bg-gray-400')}
                />
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-[#71767a] mt-3">Last contacted: {contact.lastInteraction}</p>

            <div className="flex justify-center gap-2 mt-3">
              {contact.linkedinUrl ? (
                <motion.a whileHover={{ scale: 1.1 }} href={contact.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Linkedin className="w-4 h-4" />
                </motion.a>
              ) : null}
              {contact.githubUrl ? (
                <motion.a whileHover={{ scale: 1.1 }} href={contact.githubUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg">
                  <Github className="w-4 h-4" />
                </motion.a>
              ) : null}
              {contact.email ? (
                <motion.a whileHover={{ scale: 1.1 }} href={`mailto:${contact.email}`} className="p-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg">
                  <ExternalLink className="w-4 h-4" />
                </motion.a>
              ) : null}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-4 space-y-2">
            <button onClick={() => setShowMessage(true)} className="w-full flex items-center justify-center gap-2 bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <MessageSquare className="w-4 h-4" /> Send Message
            </button>
            <button onClick={() => navigate('/campaigns', { state: { addContactId: contact.id } })} className="w-full flex items-center justify-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#e8eaed] px-4 py-2 rounded-lg text-sm transition-colors">
              <UserPlus className="w-4 h-4" /> Add to Campaign
            </button>
            <button onClick={() => toast.info('Calendar sync coming soon!')} className="w-full flex items-center justify-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#e8eaed] px-4 py-2 rounded-lg text-sm transition-colors">
              <Calendar className="w-4 h-4" /> Schedule Meeting
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14 }} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#0a66c2] dark:text-[#8ab4f8]" />
              <h3 className="text-sm font-semibold text-[#0a66c2] dark:text-[#8ab4f8]">AI Insights</h3>
            </div>
            <div className="space-y-2 text-xs text-blue-800 dark:text-blue-300">
              <div>💬 <strong>Response likelihood:</strong> {contact.strengthScore > 75 ? 'High' : contact.strengthScore > 55 ? 'Medium' : 'Low'}</div>
              <div>🧠 <strong>Known skills:</strong> {contact.skills.length ? contact.skills.slice(0, 2).join(', ') : 'Still being enriched'}</div>
              <div>📌 <strong>Last interaction:</strong> {contact.lastInteraction}</div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-3">
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

          <AnimatePresence mode="wait">
            {tab === 'overview' ? (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                {contact.bio ? (
                  <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-2">About</h3>
                    <p className="text-sm text-gray-600 dark:text-[#9aa0a6] leading-relaxed">{contact.bio}</p>
                  </div>
                ) : null}

                <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-3">Skills & Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {contact.skills.length ? contact.skills.map((skill) => <SkillPill key={skill} skill={skill} />) : (
                      <p className="text-sm text-gray-500 dark:text-[#9aa0a6]">No skills have been extracted for this contact yet.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-3">Mutual Connections ({contact.mutualConnections})</h3>
                  {mutuals.length ? (
                    <div className="space-y-3">
                      {mutuals.map((mutual) => (
                        <div key={mutual.id} className="flex items-center gap-3">
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium', mutual.avatarColor)}>
                            {mutual.initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{mutual.name}</p>
                            <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{mutual.title} at {mutual.company}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-[#9aa0a6]">No mutual connections recorded.</p>
                  )}
                </div>
              </motion.div>
            ) : null}

            {tab === 'history' ? (
              <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Interaction History</h3>
                  <button
                    onClick={async () => {
                      if (!id) return;
                      await contactsApi.createInteraction(id, {
                        type: 'note',
                        title: 'Manual interaction',
                        description: 'Interaction logged from contact profile',
                        interaction_date: new Date().toISOString(),
                      });
                      const [nextContact, nextInteractions] = await Promise.all([
                        contactsApi.get(id),
                        contactsApi.getInteractions(id),
                      ]);
                      setContact(nextContact);
                      setInteractions((nextInteractions as InteractionRecord[]) || []);
                      refreshContacts().catch(() => {});
                      toast.success('Interaction logged');
                    }}
                    className="text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline"
                  >
                    + Log Interaction
                  </button>
                </div>
                <div className="space-y-4">
                  {historyItems.length ? historyItems.map((item) => (
                    <TimelineItem key={`${item.type}-${item.date}`} item={item} />
                  )) : <p className="text-sm text-gray-500 dark:text-[#9aa0a6]">No interaction history yet.</p>}
                </div>
              </motion.div>
            ) : null}

            {tab === 'campaigns' ? (
              <motion.div key="campaigns" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-5">Campaigns</h3>
                {contactCampaigns.length === 0 ? (
                  <EmptyState
                    emoji="📋"
                    title="Not in any campaigns yet"
                    description="Add this contact to an active campaign to start tracking outreach."
                    ctaLabel="Add to Campaign"
                    onCtaClick={() => navigate('/campaigns')}
                    className="py-10"
                  />
                ) : (
                  <div className="space-y-3">
                    {contactCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{campaign.name}</p>
                          <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{campaign.stats.replied}/{campaign.stats.sent} replies</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                          {campaign.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : null}

            {tab === 'notes' ? (
              <motion.div key="notes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
                <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">Notes</h3>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={8}
                  placeholder="Add personal notes about this contact..."
                  className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] resize-none bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed]"
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-400 dark:text-[#71767a]">{notes.length} characters</span>
                  <button
                    onClick={async () => {
                      if (!id) return;
                      if (savedNotes[0]?._id || savedNotes[0]?.id) {
                        await contactsApi.updateNote(id, String(savedNotes[0]._id || savedNotes[0].id), { content: notes });
                      } else {
                        const created = await contactsApi.createNote(id, { content: notes });
                        setSavedNotes([created as NoteRecord]);
                      }
                      toast.success('Notes saved');
                    }}
                    className="text-sm bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Save Notes
                  </button>
                </div>
              </motion.div>
            ) : null}

            {tab === 'network' ? (
              <motion.div key="network" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-2">Network Position</h3>
                <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mb-4">See {contact.name}'s position in your network graph</p>
                <div className="bg-gray-50 dark:bg-[#3c4043] rounded-lg p-8 mb-4">
                  <div className="text-4xl mb-2">🕸️</div>
                  <p className="text-gray-500 dark:text-[#9aa0a6] text-sm">Connected to {contact.mutualConnections} of your contacts</p>
                </div>
                <Link to="/network-graph" className="inline-flex items-center gap-2 text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">
                  View in Full Network Graph <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>

      {showMessage ? (
        <MessageEditorModal
          contact={contact}
          onClose={() => setShowMessage(false)}
          onSend={async () => {
            toast.success(`Message sent to ${contact.name}!`);
            setShowMessage(false);
            if (!id) return;
            const [nextContact, nextInteractions] = await Promise.all([
              contactsApi.get(id),
              contactsApi.getInteractions(id),
            ]);
            setContact(nextContact);
            setInteractions((nextInteractions as InteractionRecord[]) || []);
            refreshContacts().catch(() => {});
          }}
        />
      ) : null}
    </div>
  );
}
