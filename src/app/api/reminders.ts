import { api } from './client';

export interface Reminder {
  _id: string;
  user_id: string;
  contact_id: unknown; // populated Contact
  type: 'stale_relationship' | 'followup_due' | 'congratulate' | 'check_in';
  message: string;
  hook: string;
  content_suggestion: string;
  priority: 'high' | 'medium' | 'low';
  due_date: string;
  status: 'pending' | 'dismissed' | 'acted';
}

export const remindersApi = {
  list:    (params?: { status?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString() : '';
    return api.get<Reminder[]>(`/reminders${qs}`);
  },
  dismiss: (id: string) => api.patch<Reminder>(`/reminders/${id}/dismiss`),
  acted:   (id: string, interaction?: unknown) =>
    api.patch<Reminder>(`/reminders/${id}/acted`, interaction ? { interaction } : undefined),
  delete:  (id: string) => api.delete(`/reminders/${id}`),
};
