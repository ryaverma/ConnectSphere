import { api } from './client';
import type { Contact } from '../types';

interface ContactsResponse {
  contacts: Contact[];
  total: number;
  page: number;
  pages: number;
}

interface BulkImportResponse {
  job_id: string;
  status: string;
  count: number;
}

// ─── Backend → Frontend field mapper ─────────────────────────────────────────

const HEX_TO_TAILWIND: Record<string, string> = {
  '#4f46e5': 'bg-indigo-600',
  '#0a66c2': 'bg-blue-700',
  '#7c3aed': 'bg-violet-600',
  '#0891b2': 'bg-cyan-600',
  '#059669': 'bg-emerald-600',
  '#d97706': 'bg-amber-600',
  '#dc2626': 'bg-red-600',
  '#db2777': 'bg-pink-600',
};

function formatRelative(date: string | null | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Never';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBackendContact(c: any): Contact {
  const rawColor: string = c.avatar_color || 'bg-indigo-600';
  const avatarColor = HEX_TO_TAILWIND[rawColor] ?? rawColor;
  const rawSource: string = c.source || 'manual';
  const source = (rawSource === 'imported' ? 'manual' : rawSource) as Contact['source'];
  const rawStatus: string = c.status || 'pending';
  const status = (rawStatus === 'imported' ? 'pending' : rawStatus) as Contact['status'];
  return {
    id: String(c._id ?? c.id ?? ''),
    name: c.name ?? '',
    email: c.email ?? '',
    title: c.title ?? '',
    company: c.company ?? '',
    location: c.location ?? '',
    initials: c.initials ?? '',
    avatarColor,
    strengthScore: c.strength_score ?? 0,
    skills: c.skills ?? [],
    lastInteraction: formatRelative(c.last_interaction_at),
    status,
    source,
    linkedinUrl: c.linkedin_url,
    githubUrl: c.github_url,
    mutualConnections: c.mutual_connections ?? 0,
    bio: c.bio,
    education: c.education,
    interests: c.interests ?? [],
    x: c.graph_x,
    y: c.graph_y,
  };
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const contactsApi = {
  list: (params?: {
    search?: string; source?: string; status?: string;
    strength_min?: number; strength_max?: number;
    sort_by?: string; sort_order?: string;
    page?: number; limit?: number;
  }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString() : '';
    return api.get<ContactsResponse>(`/contacts${qs}`)
      .then(res => ({ ...res, contacts: res.contacts.map(mapBackendContact) }));
  },

  get: (id: string) =>
    api.get<Contact>(`/contacts/${id}`).then(c => mapBackendContact(c)),

  create: (data: Partial<Contact>) =>
    api.post<{ contact: Contact; job_id: string }>('/contacts', data)
      .then(res => ({ ...res, contact: mapBackendContact(res.contact) })),

  update: (id: string, data: Partial<Contact>) =>
    api.patch<Contact>(`/contacts/${id}`, data).then(c => mapBackendContact(c)),

  delete: (id: string) => api.delete(`/contacts/${id}`),

  bulkImport: (contacts: Partial<Contact>[], source = 'imported') =>
    api.post<BulkImportResponse>('/contacts/bulk-import', { contacts, source }),

  recalculateStrength: (id: string) =>
    api.post<{ job_id: string }>(`/contacts/${id}/calculate-strength`),

  // Notes
  getNotes: (id: string) => api.get<unknown[]>(`/contacts/${id}/notes`),
  createNote: (id: string, data: { content: string; is_pinned?: boolean }) =>
    api.post(`/contacts/${id}/notes`, data),
  updateNote: (id: string, noteId: string, data: { content?: string; is_pinned?: boolean }) =>
    api.patch(`/contacts/${id}/notes/${noteId}`, data),
  deleteNote: (id: string, noteId: string) =>
    api.delete(`/contacts/${id}/notes/${noteId}`),

  // Interactions
  getInteractions: (id: string) => api.get<unknown[]>(`/contacts/${id}/interactions`),
  createInteraction: (id: string, data: unknown) =>
    api.post(`/contacts/${id}/interactions`, data),

  // Tags
  getTags: (id: string) => api.get<unknown[]>(`/contacts/${id}/tags`),
  addTag: (id: string, tag_id: string) => api.post(`/contacts/${id}/tags`, { tag_id }),
  removeTag: (id: string, tagId: string) => api.delete(`/contacts/${id}/tags/${tagId}`),

  // Tag management
  listTags: () => api.get<unknown[]>('/contacts/tags/all'),
  createTag: (data: { name: string; color?: string }) =>
    api.post('/contacts/tags/all', data),
  updateTag: (tagId: string, data: { name?: string; color?: string }) =>
    api.patch(`/contacts/tags/${tagId}`, data),
  deleteTag: (tagId: string) => api.delete(`/contacts/tags/${tagId}`),
};
