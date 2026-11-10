/**
 * ConnectSphere TanStack Query Hooks
 * Simulates async data fetching with realistic delays, loading states,
 * error handling, and intelligent caching via @tanstack/react-query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Contact, Campaign, Event, Notification, Message, AnalyticsData } from '../types';
import {
  mockContacts, mockCampaigns, mockEvents,
  mockNotifications, mockAnalyticsData, mockMessages,
} from '../data/mockData';

// ─── Utility ────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const queryKeys = {
  contacts:      () => ['contacts'] as const,
  contact:       (id: string) => ['contacts', id] as const,
  campaigns:     () => ['campaigns'] as const,
  campaign:      (id: string) => ['campaigns', id] as const,
  events:        () => ['events'] as const,
  notifications: () => ['notifications'] as const,
  analytics:     () => ['analytics'] as const,
  messages:      () => ['messages'] as const,
  search:        (q: string) => ['search', q] as const,
};

// ─── Simulated API layer ─────────────────────────────────────────────────────

const api = {
  fetchContacts:      async (): Promise<Contact[]>          => { await delay(750); return [...mockContacts]; },
  fetchContact:       async (id: string): Promise<Contact>  => { await delay(400); const c = mockContacts.find(c => c.id === id); if (!c) throw new Error('Contact not found'); return c; },
  fetchCampaigns:     async (): Promise<Campaign[]>         => { await delay(680); return [...mockCampaigns]; },
  fetchCampaign:      async (id: string): Promise<Campaign> => { await delay(350); const c = mockCampaigns.find(c => c.id === id); if (!c) throw new Error('Campaign not found'); return c; },
  fetchEvents:        async (): Promise<Event[]>            => { await delay(600); return [...mockEvents]; },
  fetchNotifications: async (): Promise<Notification[]>    => { await delay(350); return [...mockNotifications]; },
  fetchAnalytics:     async (): Promise<AnalyticsData>      => { await delay(900); return { ...mockAnalyticsData }; },
  fetchMessages:      async (): Promise<Message[]>          => { await delay(500); return [...mockMessages]; },
  search:             async (q: string): Promise<{ contacts: Contact[]; campaigns: Campaign[]; events: Event[] }> => {
    await delay(450);
    const lq = q.toLowerCase();
    return {
      contacts:  mockContacts.filter(c => c.name.toLowerCase().includes(lq) || c.company.toLowerCase().includes(lq) || c.skills.some(s => s.toLowerCase().includes(lq))),
      campaigns: mockCampaigns.filter(c => c.name.toLowerCase().includes(lq) || c.goal.toLowerCase().includes(lq)),
      events:    mockEvents.filter(e => e.name.toLowerCase().includes(lq) || e.tags.some(t => t.toLowerCase().includes(lq))),
    };
  },
};

// ─── Query Hooks ─────────────────────────────────────────────────────────────

/** All contacts — cached 5 min */
export function useContactsQuery() {
  return useQuery({
    queryKey: queryKeys.contacts(),
    queryFn: api.fetchContacts,
    staleTime: 5 * 60 * 1000,
  });
}

/** Single contact by id */
export function useContactQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.contact(id),
    queryFn: () => api.fetchContact(id),
    staleTime: 3 * 60 * 1000,
    enabled: !!id,
  });
}

/** All campaigns — cached 5 min */
export function useCampaignsQuery() {
  return useQuery({
    queryKey: queryKeys.campaigns(),
    queryFn: api.fetchCampaigns,
    staleTime: 5 * 60 * 1000,
  });
}

/** Single campaign by id */
export function useCampaignQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.campaign(id),
    queryFn: () => api.fetchCampaign(id),
    staleTime: 3 * 60 * 1000,
    enabled: !!id,
  });
}

/** All events — cached 10 min */
export function useEventsQuery() {
  return useQuery({
    queryKey: queryKeys.events(),
    queryFn: api.fetchEvents,
    staleTime: 10 * 60 * 1000,
  });
}

/** Notifications — cached 2 min */
export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: api.fetchNotifications,
    staleTime: 2 * 60 * 1000,
  });
}

/** Analytics data — cached 15 min */
export function useAnalyticsQuery() {
  return useQuery({
    queryKey: queryKeys.analytics(),
    queryFn: api.fetchAnalytics,
    staleTime: 15 * 60 * 1000,
  });
}

/** All messages — cached 3 min */
export function useMessagesQuery() {
  return useQuery({
    queryKey: queryKeys.messages(),
    queryFn: api.fetchMessages,
    staleTime: 3 * 60 * 1000,
  });
}

/** Global search */
export function useSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => api.search(query),
    staleTime: 60 * 1000,
    enabled: query.trim().length >= 2,
    placeholderData: { contacts: [], campaigns: [], events: [] },
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

/** Update campaign status with optimistic UI */
export function useUpdateCampaignStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Campaign['status'] }) => {
      await delay(300);
      return { id, status };
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: queryKeys.campaigns() });
      const prev = qc.getQueryData<Campaign[]>(queryKeys.campaigns());
      qc.setQueryData<Campaign[]>(queryKeys.campaigns(), old =>
        old?.map(c => c.id === id ? { ...c, status } : c) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.campaigns(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.campaigns() });
    },
  });
}

/** Mark notification as read */
export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await delay(150); return id; },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: queryKeys.notifications() });
      const prev = qc.getQueryData<Notification[]>(queryKeys.notifications());
      qc.setQueryData<Notification[]>(queryKeys.notifications(), old =>
        old?.map(n => n.id === id ? { ...n, read: true } : n) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.notifications(), ctx.prev);
    },
  });
}

/** Toggle event RSVP */
export function useToggleRsvpMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rsvped }: { id: string; rsvped: boolean }) => {
      await delay(400);
      return { id, rsvped };
    },
    onMutate: async ({ id, rsvped }) => {
      await qc.cancelQueries({ queryKey: queryKeys.events() });
      const prev = qc.getQueryData<Event[]>(queryKeys.events());
      qc.setQueryData<Event[]>(queryKeys.events(), old =>
        old?.map(e => e.id === id ? { ...e, rsvped } : e) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.events(), ctx.prev);
    },
  });
}
