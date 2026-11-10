import { api } from './client';
import type { Event } from '../types';

function normalizeEventType(
  value: unknown,
  name?: unknown,
  description?: unknown,
  tags?: unknown,
  category?: unknown,
): Event['type'] {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'conference' || raw === 'meetup' || raw === 'workshop' || raw === 'webinar' || raw === 'networking' || raw === 'social') {
    return raw;
  }

  const haystack = [name, description, category, ...(Array.isArray(tags) ? tags : [])].join(' ').toLowerCase();
  if (/(webinar|livestream|live stream|virtual session|online seminar)/.test(haystack)) return 'webinar';
  if (/(workshop|bootcamp|training|class|course|tutorial|masterclass|hands-on)/.test(haystack)) return 'workshop';
  if (/(conference|summit|expo|convention|symposium|congress|forum|trade show)/.test(haystack)) return 'conference';
  if (/(network|networking|mixer|roundtable|coffee chat|founder|startup|entrepreneur|business|career)/.test(haystack)) return 'networking';
  if (/(social|happy hour|party|festival|reception|gala|concert|music|arts|theatre|film|community|dinner|brunch|nightlife)/.test(haystack)) return 'social';
  return 'meetup';
}

export function mapBackendEvent(event: any): Event {
  const eventDate = event?.event_date ? new Date(event.event_date) : null;
  const isVirtual = event?.location_type === 'virtual';
  return {
    id: event?._id || event?.id,
    name: event?.name || 'Untitled Event',
    host: event?.host || '',
    date: eventDate ? eventDate.toLocaleDateString() : '',
    time: event?.event_time || '',
    location: isVirtual ? 'Virtual' : (event?.location || 'TBA'),
    locationType: isVirtual ? 'virtual' : 'in-person',
    type: normalizeEventType(event?.type, event?.name, event?.description, event?.tags, event?.category),
    relevanceScore: event?.relevance_score || 0,
    attendees: event?.attendee_count || 0,
    description: event?.description || '',
    image: event?.image_url || 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    tags: event?.tags || [],
    networkContacts: event?.network_contacts_count || 0,
    rsvped: event?.rsvp_status === 'going',
    ticketUrl: event?.ticket_url || event?.external_url || '',
    externalUrl: event?.external_url || '',
  };
}

export const eventsApi = {
  list: (params?: {
    type?: string; source?: string; rsvp_status?: string; upcoming?: boolean;
    page?: number; limit?: number;
  }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString() : '';
    return api.get<{ events: any[]; total: number }>(`/events${qs}`)
      .then((res) => ({
        ...res,
        events: (res.events || []).map(mapBackendEvent),
      }));
  },

  get:    (id: string) => api.get<any>(`/events/${id}`).then(mapBackendEvent),
  create: (data: Partial<Event>) => api.post<any>('/events', data).then(mapBackendEvent),
  update: (id: string, data: Partial<Event>) => api.patch<any>(`/events/${id}`, data).then(mapBackendEvent),
  delete: (id: string) => api.delete(`/events/${id}`),

  rsvp:    (id: string, status: string) => api.post(`/events/${id}/rsvp`, { status }),
  attend:  (id: string, contact_id: string, rsvp_status = 'going') =>
    api.post(`/events/${id}/add-contact`, { contact_id, rsvp_status }),

  getAttendees: (id: string) => api.get<unknown[]>(`/events/${id}/attendees`),
  syncTicketmaster: () => api.post<{ status: string; job_id: string }>('/events/sync-ticketmaster'),

  // Agent-backed routes
  recommend:   () => api.post<{ events?: any[]; status?: string; job_id?: string }>('/events/recommend')
    .then((res) => ({
      ...res,
      events: res.events?.map(mapBackendEvent),
    })),
  import:      (events: Partial<Event>[]) =>
    api.post<{ job_id: string; count: number }>('/events/import', { events }),
  preOutreach: (id: string) => api.get<{ job_id: string }>(`/events/${id}/pre-outreach`),
};
