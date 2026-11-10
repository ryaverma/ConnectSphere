import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Search, Users, Megaphone, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../contexts/AppContext';
import { cn } from '../components/ui/utils';
import { api } from '../api/client';
import type { Event } from '../types';

type Tab = 'all' | 'contacts' | 'campaigns' | 'events';

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 rounded px-0.5">{part}</mark>
        ) : part
      )}
    </>
  );
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { contacts, campaigns } = useApp();
  const [tab, setTab] = useState<Tab>('all');
  const [localQuery, setLocalQuery] = useState(query);
  const [matchedEvents, setMatchedEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const q = localQuery.toLowerCase();

  const matchedContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) ||
    c.skills.some(s => s.toLowerCase().includes(q))
  );

  const matchedCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(q) || c.goal.toLowerCase().includes(q)
  );

  useEffect(() => {
    const normalized = localQuery.trim();
    if (!normalized) {
      setMatchedEvents([]);
      setEventsLoading(false);
      return;
    }

    let cancelled = false;
    setEventsLoading(true);

    api.get<{ results: Array<{ type: string; data: any }> }>(`/search?q=${encodeURIComponent(normalized)}&type=events&limit=20`)
      .then((res) => {
        if (cancelled) return;
        setMatchedEvents(
          (res.results || [])
            .filter((result) => result.type === 'event')
            .map(({ data }) => ({
              id: data._id || data.id,
              name: data.name || 'Untitled Event',
              host: data.host || '',
              date: data.event_date ? new Date(data.event_date).toLocaleDateString() : '',
              time: data.event_time || '',
              location: data.location || '',
              type: data.type || 'meetup',
              relevanceScore: data.relevance_score || 0,
              attendees: data.attendee_count || 0,
              description: data.description || '',
              image: data.image_url || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
              tags: data.tags || [],
              networkContacts: data.network_contacts_count || 0,
              rsvped: data.rsvp_status === 'going',
            }))
        );
      })
      .catch(() => {
        if (!cancelled) setMatchedEvents([]);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [localQuery]);

  const total = matchedContacts.length + matchedCampaigns.length + matchedEvents.length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0a66c2] transition-colors" />
          <input
            type="text"
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#0a66c2] shadow-sm transition-all bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a]"
            placeholder="Search contacts, campaigns, events..."
            autoFocus
          />
        </div>
        {localQuery && (
          <p className="text-sm text-gray-500 dark:text-[#9aa0a6] mt-2">
            {total} results for "<span className="font-medium text-gray-800 dark:text-[#e8eaed]">{localQuery}</span>"
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e6e6e6] dark:border-[#3c4043] mb-5">
        {([
          { id: 'all', label: 'All', count: total },
          { id: 'contacts', label: 'Contacts', count: matchedContacts.length, icon: Users },
          { id: 'campaigns', label: 'Campaigns', count: matchedCampaigns.length, icon: Megaphone },
          { id: 'events', label: 'Events', count: matchedEvents.length, icon: Calendar },
        ] as { id: Tab; label: string; count: number; icon?: any }[]).map(({ id, label, count, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', tab === id ? 'border-[#0a66c2] text-[#0a66c2] dark:border-[#8ab4f8] dark:text-[#8ab4f8]' : 'border-transparent text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed]')}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full', tab === id ? 'bg-blue-100 dark:bg-blue-900/50 text-[#0a66c2] dark:text-[#8ab4f8]' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6]')}>{count}</span>
          </button>
        ))}
      </div>

      {!localQuery ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center py-20"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Search className="w-12 h-12 text-gray-300 dark:text-[#3c4043] mx-auto mb-4" />
          </motion.div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-[#e8eaed] mb-2">Search ConnectSphere</h3>
          <p className="text-gray-500 dark:text-[#9aa0a6] mb-6">Type to search across contacts, campaigns, and events</p>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-[#9aa0a6]">
            {['Machine Learning', 'Google', 'AI Safety', 'Product Manager'].map((s, i) => (
              <motion.button
                key={s}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => setLocalQuery(s)}
                className="bg-gray-100 dark:bg-[#3c4043] hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-[#0a66c2] dark:hover:text-[#8ab4f8] px-3 py-1.5 rounded-full transition-colors"
              >
                {s}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : !eventsLoading && total === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center py-20"
        >
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-[#e8eaed] mb-2">No results found for "{localQuery}"</h3>
          <p className="text-gray-500 dark:text-[#9aa0a6] mb-5">Try different keywords or check spelling</p>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            {['Machine Learning', 'Google', 'Sarah Chen', 'Campaign'].map((s, i) => (
              <motion.button
                key={s}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => setLocalQuery(s)}
                className="bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8] hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-full transition-colors"
              >
                Try: {s}
              </motion.button>
            ))}
          </div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => setLocalQuery('')}
            className="mt-4 text-sm text-gray-400 dark:text-[#71767a] hover:text-gray-600 dark:hover:text-[#9aa0a6] transition-colors block mx-auto"
          >
            ← Clear search
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Contacts */}
          {(tab === 'all' || tab === 'contacts') && matchedContacts.length > 0 && (
            <section>
              {tab === 'all' && <h2 className="text-sm font-semibold text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Contacts ({matchedContacts.length})</h2>}
              <div className="space-y-2">
                {matchedContacts.slice(0, tab === 'all' ? 4 : 20).map((contact, i) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: 3 }}
                  >
                    <Link to={`/contacts/${contact.id}`} className="flex items-center gap-3 p-3 bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] hover:shadow-sm transition-all duration-200">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0', contact.avatarColor)}>
                        {contact.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{highlight(contact.name, localQuery)}</p>
                        <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{highlight(contact.title, localQuery)} at {highlight(contact.company, localQuery)}</p>
                        <div className="flex gap-1.5 mt-1">
                          {contact.skills.filter(s => s.toLowerCase().includes(q)).slice(0, 3).map(s => (
                            <span key={s} className="text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded">{highlight(s, localQuery)}</span>
                          ))}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${contact.strengthScore >= 80 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6]'}`}>{contact.strengthScore}%</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
              {tab === 'all' && matchedContacts.length > 4 && (
                <button onClick={() => setTab('contacts')} className="mt-2 text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">View all {matchedContacts.length} contacts →</button>
              )}
            </section>
          )}

          {/* Campaigns */}
          {(tab === 'all' || tab === 'campaigns') && matchedCampaigns.length > 0 && (
            <section>
              {tab === 'all' && <h2 className="text-sm font-semibold text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide mb-3 flex items-center gap-2"><Megaphone className="w-4 h-4" /> Campaigns ({matchedCampaigns.length})</h2>}
              <div className="space-y-2">
                {matchedCampaigns.map((campaign, i) => (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: 3 }}
                  >
                    <Link to={`/campaigns/${campaign.id}`} className="flex items-center gap-3 p-3 bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] hover:shadow-sm transition-all duration-200">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-5 h-5 text-[#0a66c2] dark:text-[#8ab4f8]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{highlight(campaign.name, localQuery)}</p>
                        <p className="text-xs text-gray-500 dark:text-[#9aa0a6] line-clamp-1">{highlight(campaign.goal, localQuery)}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${campaign.status === 'active' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6]'}`}>{campaign.status}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Events */}
          {(tab === 'all' || tab === 'events') && (eventsLoading || matchedEvents.length > 0) && (
            <section>
              {tab === 'all' && <h2 className="text-sm font-semibold text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Events ({matchedEvents.length})</h2>}
              {eventsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: tab === 'all' ? 3 : 6 }).map((_, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] animate-pulse">
                      <div className="h-4 w-40 bg-gray-200 dark:bg-[#3c4043] rounded mb-2" />
                      <div className="h-3 w-56 bg-gray-100 dark:bg-[#252538] rounded" />
                    </div>
                  ))}
                </div>
              ) : (
              <div className="space-y-2">
                {matchedEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: 3 }}
                  >
                    <Link to="/events" className="flex items-center gap-3 p-3 bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] hover:shadow-sm transition-all duration-200">
                      <img src={event.image} alt={event.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{highlight(event.name, localQuery)}</p>
                        <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{event.date} · {event.location}</p>
                      </div>
                      <span className="text-xs text-[#0a66c2] dark:text-[#8ab4f8] flex-shrink-0">{event.relevanceScore}% match</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
              )}
            </section>
          )}
        </motion.div>
      )}
    </div>
  );
}
