import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Contact, Campaign, Notification, User } from '../types';
import { mockContacts, mockCampaigns, mockNotifications } from '../data/mockData';
import { authApi, getToken, clearTokens } from '../api';
import { notificationsApi } from '../api/notifications';
import { contactsApi, mapBackendContact } from '../api/contacts';
import { campaignsApi } from '../api/campaigns';
import { toast } from 'sonner';

// When VITE_USE_REAL_API=true the context loads data from the real backend.
// Set to false (default) to keep running off mock data during development.
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API !== 'false';
const LS_CONTACTS_KEY = 'cs-contacts';

type Theme = 'light' | 'dark' | 'system';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthLoading: boolean;
  logout: () => Promise<void>;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  refreshContacts: () => Promise<void>;
  addContact: (contact: Contact) => void;
  importContacts: (newContacts: Contact[]) => void;
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
  notifications: Notification[];
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaignStatus: (id: string, status: Campaign['status']) => void;
  deleteCampaign: (id: string) => Promise<void>;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const AppContext = createContext<AppContextType | null>(null);

const defaultUser: User = {
  id: 'u1',
  name: 'Jordan Lee',
  email: 'jordan@example.com',
  title: 'ML Engineer',
  company: 'TechCorp',
  location: 'San Francisco, CA',
  initials: 'JL',
  avatarColor: 'bg-indigo-600',
  skills: ['Machine Learning', 'Python', 'React', 'Product Strategy'],
  interests: ['AI Research', 'Startups', 'Open Source'],
  goal: 'Find internships and job opportunities',
};

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function loadMockContacts(): Contact[] {
  if (USE_REAL_API) return [];
  try {
    const stored = localStorage.getItem(LS_CONTACTS_KEY);
    return stored ? (JSON.parse(stored) as Contact[]) : mockContacts;
  } catch {
    return mockContacts;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(USE_REAL_API ? null : defaultUser);
  const [isAuthLoading, setIsAuthLoading] = useState(USE_REAL_API);
  const [contacts, setContacts] = useState<Contact[]>(loadMockContacts);
  const [campaigns, setCampaigns] = useState<Campaign[]>(USE_REAL_API ? [] : mockCampaigns);
  const [notifications, setNotifications] = useState<Notification[]>(USE_REAL_API ? [] : mockNotifications);

  // ── Boot: load authenticated user from API ────────────────────────────────
  useEffect(() => {
    if (!USE_REAL_API) return;
    const token = getToken();
    if (!token) { setIsAuthLoading(false); return; }

    authApi.me()
      .then((u) => setUser(u))
      .catch((err: unknown) => {
        const apiErr = err as { status?: number };
        if (apiErr?.status !== 401) {
          toast.error('Failed to load account');
        }
        clearTokens();
      })
      .finally(() => setIsAuthLoading(false));
  }, []);

  // ── Load contacts from API when user is authenticated ─────────────────────
  const refreshContacts = useCallback(async () => {
    if (!USE_REAL_API || !user) return;
    const res = await contactsApi.list({ limit: 100, sort_by: 'createdAt', sort_order: 'desc' });
    setContacts(res.contacts);
  }, [user]);

  useEffect(() => {
    if (!USE_REAL_API || !user) return;
    refreshContacts().catch(() => toast.error('Failed to load contacts'));
  }, [refreshContacts, user]);

  // ── Load campaigns from API when user is set ─────────────────────────────
  useEffect(() => {
    if (!USE_REAL_API || !user) return;
    campaignsApi.list({ limit: 50 })
      .then((res) => setCampaigns(res.campaigns))
      .catch(() => toast.error('Failed to load campaigns'));
  }, [user]);

  // ── Load notifications from API when user is set ──────────────────────────
  useEffect(() => {
    if (!USE_REAL_API || !user) return;
    notificationsApi.list({ limit: 30 })
      .then((res) => setNotifications(res.notifications))
      .catch(() => toast.error('Failed to load notifications'));
  }, [user]);

  // ── Add a single contact ──────────────────────────────────────────────────
  const addContact = useCallback((contact: Contact) => {
    setContacts(prev => {
      const next = [contact, ...prev];
      if (!USE_REAL_API) {
        try { localStorage.setItem(LS_CONTACTS_KEY, JSON.stringify(next)); } catch { /* noop */ }
      }
      return next;
    });
  }, []);

  // ── Bulk import contacts ──────────────────────────────────────────────────
  const importContacts = useCallback((newContacts: Contact[]) => {
    setContacts(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const fresh = newContacts.filter(c => !existingIds.has(c.id));
      const next = [...fresh, ...prev];
      if (!USE_REAL_API) {
        try { localStorage.setItem(LS_CONTACTS_KEY, JSON.stringify(next)); } catch { /* noop */ }
      }
      return next;
    });
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setContacts(USE_REAL_API ? [] : mockContacts);
    setCampaigns(USE_REAL_API ? [] : mockCampaigns);
    setNotifications(USE_REAL_API ? [] : mockNotifications);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('cs-theme') as Theme) || 'system';
    } catch {
      return 'system';
    }
  });

  const resolvedTheme: 'light' | 'dark' = theme === 'system'
    ? (getSystemDark() ? 'dark' : 'light')
    : theme;

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem('cs-theme', t); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && getSystemDark());
      root.classList.toggle('dark', isDark);
    };

    applyTheme();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [theme]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (USE_REAL_API) notificationsApi.markRead(id).catch(() => toast.error('Failed to mark notification as read'));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (USE_REAL_API) notificationsApi.markAllRead().catch(() => toast.error('Failed to mark all notifications as read'));
  }, []);

  const addCampaign = useCallback((campaign: Campaign) => {
    setCampaigns(prev => [campaign, ...prev]);
  }, []);

  const updateCampaignStatus = useCallback((id: string, status: Campaign['status']) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (USE_REAL_API) {
      await campaignsApi.delete(id).catch(() => toast.error('Failed to delete campaign'));
    }
  }, []);

  return (
    <AppContext.Provider value={{
      user, setUser, isAuthLoading, logout,
      contacts, setContacts, refreshContacts, addContact, importContacts,
      campaigns, setCampaigns,
      notifications, setNotifications, markNotificationRead, markAllNotificationsRead, unreadCount,
      sidebarOpen, setSidebarOpen,
      addCampaign, updateCampaignStatus, deleteCampaign,
      theme, setTheme, resolvedTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// Re-export for convenience
export { mapBackendContact };
