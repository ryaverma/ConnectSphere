import { api } from './client';
import type { Notification } from '../types';

export const notificationsApi = {
  list: (params?: { type?: string; read?: boolean; page?: number; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString() : '';
    return api.get<{ notifications: Notification[]; total: number }>(`/notifications${qs}`);
  },

  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead:    (id: string) => api.patch<Notification>(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/mark-all-read'),
  delete:      (id: string) => api.delete(`/notifications/${id}`),
};
