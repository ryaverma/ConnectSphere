import { api } from './client';
import type { Message } from '../types';

export const messagesApi = {
  list: (params?: {
    status?: string; campaign_id?: string; contact_id?: string;
    variant?: string; page?: number; limit?: number;
  }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString() : '';
    return api.get<{ messages: Message[]; total: number }>(`/messages${qs}`);
  },

  get:    (id: string) => api.get<Message>(`/messages/${id}`),
  create: (data: Partial<Message>) => api.post<Message>('/messages', data),
  update: (id: string, data: Partial<Message>) => api.patch<Message>(`/messages/${id}`, data),
  delete: (id: string) => api.delete(`/messages/${id}`),

  // Async generation — returns job_id
  generate: (data: { campaign_id?: string; contact_id: string; tone?: string }) =>
    api.post<{ job_id: string }>('/messages/generate', data),

  // Regenerate a specific variant
  regenerate: (id: string, data: { tone?: string; variant?: string }) =>
    api.post<{ job_id: string }>(`/messages/${id}/regenerate`, data),

  // Send — runs compliance check synchronously
  send: (id: string) =>
    api.post<{ status: string; sent_at: string; compliance_check: unknown }>(`/messages/${id}/send`),

  // Schedule
  schedule: (id: string, scheduled_for: string) =>
    api.post<Message>(`/messages/${id}/schedule`, { scheduled_for }),
};
