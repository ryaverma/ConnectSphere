import { api, setTokens, clearTokens } from './client';
import type { User } from '../types';

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post<AuthResponse>('/auth/register', data, { noAuth: true });
    setTokens(res.token, res.refreshToken);
    return res;
  },

  login: async (data: { email: string; password: string }) => {
    const res = await api.post<AuthResponse>('/auth/login', data, { noAuth: true });
    setTokens(res.token, res.refreshToken);
    return res;
  },

  demo: async () => {
    const res = await api.post<AuthResponse>('/auth/demo', {}, { noAuth: true });
    setTokens(res.token, res.refreshToken);
    return res;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearTokens();
  },

  me: () => api.get<User>('/users/me'),

  updateProfile: (data: Partial<User>) => api.patch<User>('/users/me', data),

  updateSettings: (settings: Record<string, unknown>) =>
    api.patch<Record<string, unknown>>('/users/me/settings', settings),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }, { noAuth: true }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }, { noAuth: true }),
};
