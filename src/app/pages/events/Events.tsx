import { useEffect, useState } from 'react';
import { Filter, Plus, Calendar, MapPin, Users, Star, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { EmptyState } from '../../components/common/EmptyState';
import type { Event } from '../../types';
import { eventsApi, pollJob } from '../../api';

function EventTypeChip({ type }: { type: Event['type'] }) {
  const colors: Record<Event['type'], string> = {
    conference: 'bg-purple-100 text-purple-700',
    meetup: 'bg-blue-100 text-blue-700',
    workshop: 'bg-teal-100 text-teal-700',
    webinar: 'bg-indigo-100 text-indigo-700',
    networking: 'bg-orange-100 text-orange-700',
    social: 'bg-pink-100 text-pink-700',
  };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${colors[type]}`}>{type}</span>;
}

function RelevanceBadge({ score, networkContacts, tags }: { score: number; networkContacts: number; tags: string[] }) {
  const [showTip, setShowTip] = useState(false);
  const color = score >= 85 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white';

  return (
    <div className="relative">
      <span
        className={`text-xs px-2.5 py-0.5 rounded-full font-medium cursor-help ${color}`}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {score}% match
      </span>
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-52 bg-gray-900 text-white text-xs rounded-xl p-3 z-30 shadow-xl pointer-events-none"
          >
            <p className="font-medium mb-1.5">Why recommended:</p>
            <ul className="space-y-1">
              <li>🎯 {networkContacts} contacts attending</li>
              <li>📌 Matches: {tags.slice(0, 2).join(', ')}</li>
              <li>📈 3x higher opportunity rate</li>
            </ul>
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const [rsvped, setRsvped] = useState(event.rsvped || false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] overflow-hidden transition-all duration-200"
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <motion.img
          src={event.image}
          alt={event.name}
          animate={{ scale: isHovered ? 1.07 : 1 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full object-cover"
          style={{ filter: isHovered ? 'brightness(1.1)' : 'brightness(1)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3 flex gap-2">
          <EventTypeChip type={event.type} />
          <RelevanceBadge score={event.relevanceScore} networkContacts={event.networkContacts} tags={event.tags} />
        </div>
        {rsvped && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-medium"
          >
            ✓ RSVP'd
          </motion.div>
        )}
        {/* RSVP button slides in on hover */}
        <AnimatePresence>
          {isHovered && !rsvped && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              onClick={async () => {
                setRsvped(true);
                try {
                  await eventsApi.rsvp(event.id, 'going');
                  toast.success('RSVP confirmed!');
                } catch {
                  setRsvped(false);
                  toast.error('Failed to RSVP');
                }
              }}
              className="absolute top-3 right-3 bg-[#0a66c2] text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-md hover:bg-[#004182]"
            >
              Quick RSVP
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">{event.name}</h3>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{event.host}</p>

        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            {event.date} · {event.time}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            {event.location}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
            <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            {event.attendees.toLocaleString()} registered
          </div>
        </div>

        {/* Why it matters */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-2.5 mb-3 space-y-1">
          <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Why this matters:</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">🎯 {event.networkContacts} contacts in your network attending</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400">📌 {event.tags.slice(0, 2).join(', ')} - matches your interests</p>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {event.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6] px-2 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-default">{tag}</span>
          ))}
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={async () => {
              const next = !rsvped;
              setRsvped(next);
              try {
                await eventsApi.rsvp(event.id, next ? 'going' : 'not-going');
                toast.success(next ? 'RSVP confirmed!' : 'RSVP cancelled');
              } catch {
                setRsvped(!next);
                toast.error('Failed to update RSVP');
              }
            }}
            className={cn('flex-1 text-sm py-2 rounded-lg font-medium transition-colors', rsvped ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-[#0a66c2] hover:bg-[#004182] text-white')}
          >
            {rsvped ? "✓ RSVP'd" : 'RSVP'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onClick}
            className="text-sm border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#9aa0a6] px-3 py-2 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function EventDetailModal({ event, onClose }: { event: Event; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative bg-white dark:bg-[#303134] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="relative h-48">
            <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-4">
              <EventTypeChip type={event.type} />
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-[#e8eaed] mb-1">{event.name}</h2>
              <p className="text-gray-600 dark:text-[#9aa0a6] text-sm">{event.host}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-[#9aa0a6]"><Calendar className="w-4 h-4 text-indigo-500" />{event.date}</div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-[#9aa0a6]"><MapPin className="w-4 h-4 text-indigo-500" />{event.location}</div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-[#9aa0a6]"><Users className="w-4 h-4 text-indigo-500" />{event.attendees.toLocaleString()} attending</div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-[#9aa0a6]"><Star className="w-4 h-4 text-yellow-500" />{event.relevanceScore}% relevance</div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-2">About</h3>
              <p className="text-sm text-gray-600 dark:text-[#9aa0a6] leading-relaxed">{event.description}</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-4">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-3">🎯 Strategic Insights</h3>
              <div className="space-y-2 text-sm text-indigo-800 dark:text-indigo-300">
                <p>• <strong>{event.networkContacts} contacts</strong> from your target network are attending</p>
                <p>• This event aligns with your interests: {event.tags.slice(0, 2).join(', ')}</p>
                <p>• Attendees from similar events found <strong>3x more opportunities</strong></p>
                <p>• Consider reaching out to attendees <strong>2 weeks before</strong> the event</p>
              </div>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  try {
                    await eventsApi.rsvp(event.id, 'going');
                    if (event.ticketUrl) window.open(event.ticketUrl, '_blank', 'noopener,noreferrer');
                    toast.success('RSVP confirmed!');
                    onClose();
                  } catch {
                    toast.error('Failed to RSVP');
                  }
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {event.ticketUrl ? 'RSVP & Get Tickets' : 'RSVP'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={async () => {
                  try {
                    await eventsApi.preOutreach(event.id);
                    toast.success('Generating pre-event outreach — check back shortly.');
                    onClose();
                  } catch {
                    toast.error('Failed to start outreach generation');
                  }
                }}
                className="flex-1 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                Generate Pre-Event Outreach
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Events() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function loadEvents() {
    const res = await eventsApi.list({ upcoming: true, limit: 50 });
    setEvents(res.events || []);
  }

  async function syncTicketmaster(showSuccessToast = true) {
    if (syncing) return;
    setSyncing(true);
    try {
      const { job_id } = await eventsApi.syncTicketmaster();
      const job = await pollJob(job_id, { timeout: 120000 });
      if (job.status === 'failed') {
        throw new Error(job.errors?.[0] || 'Ticketmaster sync failed');
      }
      await loadEvents();
      if (showSuccessToast) {
        toast.success('Ticketmaster events synced');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync Ticketmaster events';
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await eventsApi.list({ upcoming: true, limit: 50 });
        if (!cancelled) setEvents(res.events || []);
        if (!cancelled) {
          void syncTicketmaster(false);
        }
      } catch {
        if (!cancelled) {
          setEvents([]);
          toast.error('Failed to load events');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = events.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterLocation === 'virtual' && e.locationType !== 'virtual') return false;
    if (filterLocation === 'in-person' && e.locationType !== 'in-person') return false;
    return true;
  });

  const hasActiveFilters = filterType !== 'all' || filterLocation !== 'all';

  function clearFilters() {
    setFilterType('all');
    setFilterLocation('all');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">Events & Opportunities</h1>
          <p className="text-gray-500 dark:text-[#9aa0a6] text-sm mt-0.5">AI-curated events based on your network and goals</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowFilters(!showFilters)}
            className={cn('flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors', showFilters ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-700 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043]')}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#0a66c2]" />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={syncing}
            onClick={() => void syncTicketmaster(true)}
            className="flex items-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#9aa0a6] px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> {syncing ? 'Syncing...' : 'Sync Ticketmaster'}
          </motion.button>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-4 mb-5 flex flex-wrap gap-6 items-end">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-[#9aa0a6] uppercase tracking-wide mb-2">Event Type</p>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'conference', 'meetup', 'workshop', 'webinar', 'networking', 'social'].map(type => (
                    <motion.button
                      key={type}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFilterType(type)}
                      className={cn('text-xs px-3 py-1.5 rounded-lg border transition-all capitalize', filterType === type ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:border-gray-300 dark:hover:border-[#5f6368]')}
                    >
                      {type === 'all' ? 'All Types' : type}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-[#9aa0a6] uppercase tracking-wide mb-2">Format</p>
                <div className="flex gap-2">
                  {[{ id: 'all', label: 'All' }, { id: 'virtual', label: 'Virtual' }, { id: 'in-person', label: 'In-Person' }].map(({ id, label }) => (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFilterLocation(id)}
                      className={cn('text-xs px-3 py-1.5 rounded-lg border transition-all', filterLocation === id ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:border-gray-300 dark:hover:border-[#5f6368]')}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
              </div>
              {hasActiveFilters && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearFilters}
                  className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear filters
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-200 dark:bg-[#3c4043]" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-[#3c4043] rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-[#252538] rounded w-1/2" />
                <div className="h-20 bg-gray-100 dark:bg-[#252538] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <motion.div
          layout
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filtered.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.06, 0.35), duration: 0.28 }}
            >
              <EventCard event={event} onClick={() => setSelectedEvent(event)} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState
          variant="no-results"
          emoji="🎯"
          title="No events match your interests"
          description="Try different filters or refine your profile interests to see more relevant events."
          suggestions={[
            { label: 'Clear all filters', onClick: () => { setFilterType('all'); setFilterLocation('all'); } },
            { label: 'Show all events', onClick: () => { setFilterType('all'); setFilterLocation('all'); setShowFilters(false); } },
          ]}
        />
      )}

      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
