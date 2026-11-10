import { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { contactsApi } from '../../api/contacts';
import type { Contact } from '../../types';

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API !== 'false';

const AVATAR_COLORS = [
  'bg-indigo-600', 'bg-blue-700', 'bg-violet-600', 'bg-cyan-600',
  'bg-emerald-600', 'bg-amber-600', 'bg-red-600', 'bg-pink-600',
];

function makeInitials(name: string): string {
  return name.trim().split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

interface Props {
  onClose: () => void;
}

export default function AddContactModal({ onClose }: Props) {
  const { addContact } = useApp();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', title: '', company: '', location: '',
    source: 'manual' as Contact['source'],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      if (USE_REAL_API) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          title: form.title.trim() || undefined,
          company: form.company.trim() || undefined,
          location: form.location.trim() || undefined,
          source: form.source,
          initials: makeInitials(form.name),
          avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        };
        const res = await contactsApi.create(payload);
        addContact(res.contact);
      } else {
        const contact: Contact = {
          id: crypto.randomUUID(),
          name: form.name.trim(),
          email: form.email.trim(),
          title: form.title.trim(),
          company: form.company.trim(),
          location: form.location.trim(),
          source: form.source,
          initials: makeInitials(form.name),
          avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          strengthScore: 30,
          skills: [],
          lastInteraction: 'Just now',
          status: 'pending',
          mutualConnections: 0,
          interests: [],
        };
        addContact(contact);
      }
      toast.success(`${form.name} added to contacts`);
      onClose();
    } catch {
      toast.error('Failed to add contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#303134] rounded-xl shadow-2xl border border-[#e6e6e6] dark:border-[#3c4043] w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6e6e6] dark:border-[#3c4043]">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#0a66c2]" />
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Add Contact</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-[#71767a] dark:hover:text-[#e8eaed] rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Jane Smith"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#3c4043] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a] ${errors.name ? 'border-red-400' : 'border-[#e6e6e6] dark:border-[#5f6368]'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="jane@company.com"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#3c4043] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a] ${errors.email ? 'border-red-400' : 'border-[#e6e6e6] dark:border-[#5f6368]'}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Title + Company */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Software Engineer"
                  className="w-full px-3 py-2 border border-[#e6e6e6] dark:border-[#5f6368] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#3c4043] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => set('company', e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-3 py-2 border border-[#e6e6e6] dark:border-[#5f6368] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#3c4043] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a]"
                />
              </div>
            </div>

            {/* Location + Source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => set('location', e.target.value)}
                  placeholder="San Francisco, CA"
                  className="w-full px-3 py-2 border border-[#e6e6e6] dark:border-[#5f6368] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#3c4043] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Source</label>
                <select
                  value={form.source}
                  onChange={e => set('source', e.target.value)}
                  className="w-full px-3 py-2 border border-[#e6e6e6] dark:border-[#5f6368] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#3c4043] text-gray-900 dark:text-[#e8eaed]"
                >
                  <option value="manual">Manual</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="github">GitHub</option>
                  <option value="email">Email</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-[#e6e6e6] dark:border-[#5f6368] rounded-lg text-sm text-gray-700 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add Contact
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
