import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, Filter, Upload, UserPlus, Grid3X3, List, Network, ChevronDown, ExternalLink, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../components/ui/utils';
import MessageEditorModal from '../../components/common/MessageEditorModal';
import { EmptyState } from '../../components/common/EmptyState';
import AddContactModal from '../../components/contacts/AddContactModal';
import ImportContactsModal from '../../components/contacts/ImportContactsModal';
import type { Contact } from '../../types';

function StrengthBadge({ score }: { score: number }) {
  const color = score >= 80
    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
    : score >= 60
    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
    : 'bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6]';
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{score}%</span>;
}

function StatusBadge({ status }: { status: Contact['status'] }) {
  const map = {
    'active': 'bg-green-100 text-green-700',
    'responded': 'bg-blue-100 text-blue-700',
    'in-campaign': 'bg-indigo-100 text-indigo-700',
    'pending': 'bg-yellow-100 text-yellow-700',
    'dormant': 'bg-gray-100 text-gray-600',
  };
  const labels = { 'active': 'Active', 'responded': 'Responded', 'in-campaign': 'In Campaign', 'pending': 'Pending', 'dormant': 'Dormant' };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${map[status]}`}>{labels[status]}</span>;
}

export default function ContactsList() {
  const { contacts, refreshContacts } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'graph'>('list');
  const [filterSource, setFilterSource] = useState<string[]>([]);
  const [filterStrength, setFilterStrength] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('name');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filtered = contacts
    .filter(c => {
      const q = search.toLowerCase();
      return !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.skills.some(s => s.toLowerCase().includes(q));
    })
    .filter(c => filterSource.length === 0 || filterSource.includes(c.source))
    .filter(c => {
      if (filterStrength.length === 0) return true;
      if (filterStrength.includes('strong') && c.strengthScore >= 80) return true;
      if (filterStrength.includes('medium') && c.strengthScore >= 60 && c.strengthScore < 80) return true;
      if (filterStrength.includes('weak') && c.strengthScore < 60) return true;
      return false;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'strength') return b.strengthScore - a.strengthScore;
      return 0;
    });

  const toggleFilter = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const hasFilters = (filterSource.length + filterStrength.length) > 0;

  useEffect(() => {
    refreshContacts().catch(() => {});
  }, [refreshContacts]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">My Contacts</h1>
          <p className="text-gray-500 dark:text-[#9aa0a6] text-sm mt-0.5">{contacts.length} total contacts</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 text-sm border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#e8eaed] px-4 py-2 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddContact(true)}
            className="flex items-center gap-2 text-sm bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2 rounded-lg transition-colors hover:shadow-md"
          >
            <UserPlus className="w-4 h-4" /> Add Contact
          </motion.button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#71767a] group-focus-within:text-[#0a66c2] transition-colors" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company, or skill..."
            className="w-full pl-10 pr-4 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] transition-all bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a]"
          />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed]"
          >
            <option value="name">Sort: Name</option>
            <option value="strength">Sort: Strength</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-[#71767a] pointer-events-none" />
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowFilters(!showFilters)}
          className={cn('flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-all', showFilters ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-700 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043]')}
        >
          <Filter className="w-4 h-4" /> Filters
          {hasFilters && (
            <span className="bg-[#0a66c2] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {filterSource.length + filterStrength.length}
            </span>
          )}
        </motion.button>

        {/* View Toggle */}
        <div className="flex border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg overflow-hidden">
          {[
            { mode: 'list' as const, icon: List },
            { mode: 'grid' as const, icon: Grid3X3 },
            { mode: 'graph' as const, icon: Network },
          ].map(({ mode, icon: Icon }) => (
            <motion.button
              key={mode}
              whileTap={{ scale: 0.9 }}
              onClick={() => mode === 'graph' ? navigate('/network-graph') : setViewMode(mode)}
              title={mode === 'graph' ? 'Open Network Graph' : undefined}
              className={cn('p-2.5 transition-colors', viewMode === mode ? 'bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-500 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043]')}
            >
              <Icon className="w-4 h-4" />
            </motion.button>
          ))}
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
            <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-4 mb-5 flex flex-wrap gap-6">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-[#9aa0a6] uppercase tracking-wide mb-2">Source</p>
                <div className="flex gap-2 flex-wrap">
                  {['linkedin', 'github', 'email', 'manual'].map(src => (
                    <motion.button
                      key={src}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleFilter(filterSource, src, setFilterSource)}
                      className={cn('text-xs px-3 py-1.5 rounded-lg border transition-all capitalize', filterSource.includes(src) ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:border-gray-300 dark:hover:border-[#5f6368]')}
                    >
                      {src}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-[#9aa0a6] uppercase tracking-wide mb-2">Strength</p>
                <div className="flex gap-2 flex-wrap">
                  {[{ id: 'strong', label: 'Strong (80+)' }, { id: 'medium', label: 'Medium (60-79)' }, { id: 'weak', label: 'Weak (<60)' }].map(({ id, label }) => (
                    <motion.button
                      key={id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleFilter(filterStrength, id, setFilterStrength)}
                      className={cn('text-xs px-3 py-1.5 rounded-lg border transition-all', filterStrength.includes(id) ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-[#e6e6e6] dark:border-[#3c4043] text-gray-600 dark:text-[#9aa0a6] hover:border-gray-300 dark:hover:border-[#5f6368]')}
                    >
                      {label}
                    </motion.button>
                  ))}
                </div>
              </div>
              {hasFilters && (
                <button onClick={() => { setFilterSource([]); setFilterStrength([]); }} className="text-xs text-red-600 hover:underline self-end pb-1">
                  Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <p className="text-sm text-gray-500 dark:text-[#9aa0a6] mb-4">Showing {filtered.length} contacts</p>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] overflow-hidden">
          {filtered.length === 0 ? (
            search || hasFilters ? (
              <EmptyState
                variant="no-results"
                emoji="🔍"
                title="No contacts match"
                description={search ? `No contacts found for "${search}"` : undefined}
                suggestions={[
                  { label: 'Clear search', onClick: () => setSearch('') },
                  { label: 'Clear all filters', onClick: () => { setFilterSource([]); setFilterStrength([]); } },
                ]}
              />
            ) : (
              <EmptyState
                variant="first-time"
                emoji="📭"
                title="No contacts yet"
                description="Import your network to get started with AI-powered relationship intelligence."
                ctaLabel="Import Contacts"
                onCtaClick={() => setShowImport(true)}
                steps={[
                  { number: 1, label: 'Connect LinkedIn', description: 'Import your existing network in one click' },
                  { number: 2, label: 'AI Analyzes Connections', description: 'Scores and ranks your contacts automatically' },
                  { number: 3, label: 'Start Outreach', description: 'Send AI-personalized messages to your top contacts' },
                ]}
              />
            )
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e6e6e6] dark:border-[#3c4043]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide hidden md:table-cell">Company</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide">Strength</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide hidden lg:table-cell">Skills</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide hidden md:table-cell">Last Interaction</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e6e6] dark:divide-[#3c4043]">
                {filtered.map((contact, i) => (
                  <motion.tr
                    key={contact.id}
                    custom={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                    className="hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors group cursor-default"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 transition-transform group-hover:scale-105', contact.avatarColor)}>
                          {contact.initials}
                        </div>
                        <div>
                          <Link to={`/contacts/${contact.id}`} className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] hover:text-[#0a66c2] dark:hover:text-[#8ab4f8] transition-colors">
                            {contact.name}
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-[#9aa0a6] hidden sm:block">{contact.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-[#9aa0a6] hidden md:table-cell">{contact.company}</td>
                    <td className="px-5 py-3.5"><StrengthBadge score={contact.strengthScore} /></td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {contact.skills.slice(0, 2).map(skill => (
                          <span key={skill} className="text-xs bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6] px-2 py-0.5 rounded">{skill}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-[#9aa0a6] hidden md:table-cell">{contact.lastInteraction}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={contact.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/contacts/${contact.id}`} className="p-1.5 text-gray-400 dark:text-[#71767a] hover:text-[#0a66c2] dark:hover:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="View profile"><ExternalLink className="w-4 h-4" /></Link>
                        <button onClick={() => { setSelectedContact(contact); setShowMessage(true); }} className="p-1.5 text-gray-400 dark:text-[#71767a] hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded transition-colors" title="Send message"><MessageSquare className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
          {filtered.length === 0 ? (
            <EmptyState
              variant="no-results"
              emoji="🔍"
              title="No contacts match your filters"
              description="Try adjusting your search or filters to find contacts."
              suggestions={[
                { label: 'Clear search', onClick: () => setSearch('') },
                { label: 'Clear filters', onClick: () => { setFilterSource([]); setFilterStrength([]); } },
              ]}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((contact, i) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.25 }}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] transition-all duration-200 p-4 group overflow-hidden"
                >
                  <Link to={`/contacts/${contact.id}`}>
                    <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-medium mx-auto mb-3 transition-transform duration-300 group-hover:scale-110', contact.avatarColor)}>
                      {contact.initials}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] group-hover:text-[#0a66c2] dark:group-hover:text-[#8ab4f8] truncate">{contact.name}</p>
                      <p className="text-xs text-gray-500 dark:text-[#9aa0a6] truncate mt-0.5">{contact.title}</p>
                      <p className="text-xs text-gray-400 dark:text-[#71767a] truncate">{contact.company}</p>
                      <div className="mt-2 flex justify-center"><StrengthBadge score={contact.strengthScore} /></div>
                    </div>
                  </Link>
                  <button onClick={() => { setSelectedContact(contact); setShowMessage(true); }} className="w-full mt-3 text-xs bg-[#0a66c2] hover:bg-[#004182] text-white py-1.5 rounded-lg transition-colors">Message</button>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}


      {showMessage && selectedContact && (
        <MessageEditorModal
          contact={selectedContact}
          onClose={() => { setShowMessage(false); setSelectedContact(null); }}
          onSend={() => {
            refreshContacts().catch(() => {});
            setShowMessage(false);
            setSelectedContact(null);
          }}
        />
      )}

      {showAddContact && <AddContactModal onClose={() => setShowAddContact(false)} />}
      {showImport && <ImportContactsModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
