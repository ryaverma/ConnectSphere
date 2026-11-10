import { api } from './client';
import type { Campaign } from '../types';

export const campaignsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString() : '';
    return api.get<{ campaigns: Campaign[]; total: number }>(`/campaigns${qs}`);
  },

  get:    (id: string) => api.get<Campaign>(`/campaigns/${id}`),
  create: (data: Partial<Campaign>) =>
    api.post<{ campaign: Campaign; job_id: string }>('/campaigns', data),
  update: (id: string, data: Partial<Campaign>) =>
    api.patch<Campaign | { campaign: Campaign; job_id: string }>(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/campaigns/${id}`),

  // Opportunities — ranked contacts from Opportunity Detection Agent
  getOpportunities: (id: string) =>
    api.get<{ opportunities: unknown[]; source: string }>(`/campaigns/${id}/opportunities`),

  // Select contacts to generate outreach batch
  selectContacts: (id: string, contact_ids: string[]) =>
    api.post<{ batch_job_id: string; contact_jobs: unknown[] }>(`/campaigns/${id}/select`, { contact_ids }),

  // Manage contacts in campaign
  addContacts:     (id: string, contact_ids: string[]) =>
    api.post(`/campaigns/${id}/contacts`, { contact_ids }),
  removeContact:   (id: string, contactId: string) =>
    api.delete(`/campaigns/${id}/contacts/${contactId}`),

  // Status transitions
  start:    (id: string) => api.post(`/campaigns/${id}/start`),
  pause:    (id: string) => api.post(`/campaigns/${id}/pause`),
  complete: (id: string) => api.post(`/campaigns/${id}/complete`),

  getAnalytics: (id: string) => api.get(`/campaigns/${id}/analytics`),
};
