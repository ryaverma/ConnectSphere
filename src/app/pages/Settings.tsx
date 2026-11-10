import { Bell, Check, CreditCard, HelpCircle, Lock, Monitor, Moon, Shield, Sliders, Sun, Upload, User, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, getToken } from '../api/client';
import { cn } from '../components/ui/utils';
import { useApp } from '../contexts/AppContext';

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API !== 'false';

type Section = 'profile' | 'account' | 'integrations' | 'notifications' | 'privacy' | 'preferences' | 'billing' | 'support';

const navItems: { id: Section; label: string; icon: any }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Lock },
  { id: 'integrations', label: 'Integrations', icon: Zap },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'support', label: 'Support', icon: HelpCircle },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className={cn('relative inline-flex w-11 h-6 rounded-full transition-colors flex-shrink-0', checked ? 'bg-[#0a66c2]' : 'bg-gray-300 dark:bg-[#5f6368]')}>
      <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
    </button>
  );
}

function IntegrationCard({
  name,
  icon,
  connected,
  lastSync,
  onConnect,
  onDisconnect,
  extraActions,
  primaryActionLabel,
  onPrimaryAction,
  primaryLoading,
}: {
  name: string;
  icon: string;
  connected: boolean;
  lastSync?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  extraActions?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryLoading?: boolean;
}) {
  const [isConnected, setIsConnected] = useState(connected);

  useEffect(() => {
    setIsConnected(connected);
  }, [connected]);

  return (
    <div className="flex flex-col gap-3 p-4 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg bg-white dark:bg-[#303134]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{name}</p>
            <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{isConnected ? (lastSync ? `Last sync: ${lastSync}` : 'Connected') : 'Not connected'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">Connected</span>}
          <button
            onClick={isConnected ? onDisconnect : onConnect}
            className={cn('text-sm px-4 py-1.5 rounded-lg border transition-colors', isConnected ? 'border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-[#0a66c2] dark:border-[#8ab4f8] text-[#0a66c2] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-900/20')}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>
      {extraActions && (
        <div className="flex flex-wrap gap-2 items-center">{extraActions}</div>
      )}
      {primaryActionLabel && onPrimaryAction && (
        <button
          onClick={onPrimaryAction}
          disabled={!connected || primaryLoading}
          className={cn('text-sm px-4 py-1.5 rounded-lg border border-[#0a66c2] dark:border-[#8ab4f8] text-[#0a66c2] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors', (!connected || primaryLoading) ? 'opacity-50 cursor-not-allowed' : '')}
        >
          {primaryLoading ? 'Working...' : primaryActionLabel}
        </button>
      )}
    </div>
  );
}

// Mini preview card showing theme in a 48x48 swatch
function ThemePreviewCard({ mode }: { mode: 'light' | 'dark' | 'system' }) {
  const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const bg = isDark ? '#1a1a2a' : '#ffffff';
  const bar = isDark ? '#2a2a40' : '#f1f5f9';
  const accent = isDark ? '#8b5cf6' : '#6366f1';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#64748b' : '#94a3b8';
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 shadow-sm flex-shrink-0" style={{ background: bg }}>
      <div className="h-2" style={{ background: bar }} />
      <div className="p-1 space-y-0.5">
        <div className="h-1.5 rounded" style={{ background: accent, width: '70%' }} />
        <div className="h-1 rounded" style={{ background: textMuted, width: '90%' }} />
        <div className="h-1 rounded" style={{ background: textMuted, width: '60%' }} />
        <div className="h-1.5 mt-0.5 rounded" style={{ background: text, width: '40%', opacity: 0.3 }} />
      </div>
    </div>
  );
}

const themeOptions: { value: 'light' | 'dark' | 'system'; label: string; desc: string; icon: any }[] = [
  { value: 'light', label: 'Light Mode', desc: 'Clean white interface', icon: Sun },
  { value: 'dark', label: 'Dark Mode', desc: 'Easy on the eyes at night', icon: Moon },
  { value: 'system', label: 'System Default', desc: 'Follows your OS preference', icon: Monitor },
];

export default function Settings() {
  const { user, setUser, theme, setTheme } = useApp();
  const [section, setSection] = useState<Section>('profile');

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [title, setTitle] = useState(user?.title || '');
  const [company, setCompany] = useState(user?.company || '');

  // Notifications state
  const [notifSettings, setNotifSettings] = useState({
    emailOpps: true, weeklyReport: true, followups: true, eventRecs: false,
    pushNotifs: true, dailyDigest: false,
  });

  // Privacy state
  const [privacy, setPrivacy] = useState({ networkVisible: false, anonymousData: true, dataExport: false });

  // Preferences state
  const [prefs, setPrefs] = useState({ msgTone: 'professional', autoFollowup: true, reviewBefore: true });

  const toggleNotif = (key: keyof typeof notifSettings) => setNotifSettings(s => ({ ...s, [key]: !s[key] }));
  const togglePrivacy = (key: keyof typeof privacy) => setPrivacy(s => ({ ...s, [key]: !s[key] }));

  const [integrationStates, setIntegrationStates] = useState<Record<string, {
    connected: boolean;
    lastSync?: string;
    loading?: boolean;
    error?: string;
  }>>({
    linkedin: { connected: false },
    github: { connected: false },
  });
  const [csvUploadLoading, setCsvUploadLoading] = useState(false);
  const [csvUploadMessage, setCsvUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  useEffect(() => {
    if (!USE_REAL_API || !user) return;

    async function loadIntegrations() {
      try {
        const data = await api.get<Array<{ provider: string; is_active: boolean; last_sync_at?: string }>>('/integrations');
        const nextState = { linkedin: { connected: false }, github: { connected: false } };
        data.forEach((integration) => {
          const provider = integration.provider as string;
          nextState[provider] = {
            connected: integration.is_active,
            lastSync: integration.last_sync_at ? new Date(integration.last_sync_at).toLocaleString() : undefined,
          };
        });
        setIntegrationStates(nextState);
      } catch (err) {
        setIntegrationStates({ linkedin: { connected: false }, github: { connected: false } });
      }
    }

    loadIntegrations();
  }, [user]);

  const redirectToOAuth = (provider: string) => {
    if (USE_REAL_API) {
      window.location.href = `${apiBase}/api/auth/oauth/${provider}/authorize`;
    } else {
      toast.success(`${provider} connected!`);
      setIntegrationStates((prev) => ({
        ...prev,
        [provider]: { ...prev[provider], connected: true, lastSync: 'Just now' },
      }));
    }
  };

  const disconnectIntegration = async (provider: string) => {
    if (!USE_REAL_API) {
      setIntegrationStates((prev) => ({ ...prev, [provider]: { ...prev[provider], connected: false } }));
      toast.success(`${provider} disconnected`);
      return;
    }

    try {
      await api.delete(`/integrations/${provider}/disconnect`);
      setIntegrationStates((prev) => ({ ...prev, [provider]: { ...prev[provider], connected: false, lastSync: undefined } }));
      toast.success(`${provider} disconnected`);
    } catch {
      toast.error(`Failed to disconnect ${provider}`);
    }
  };

  const syncGithubContacts = async () => {
    setIntegrationStates((prev) => ({
      ...prev,
      github: { ...prev.github, loading: true },
    }));

    try {
      const result = await api.post<{ job_id: string; status: string; imported: number }>('/integrations/github/sync');
      setIntegrationStates((prev) => ({
        ...prev,
        github: { ...prev.github, loading: false, lastSync: 'Just now' },
      }));
      toast.success(`GitHub sync started, imported ${result.imported} contacts`);
    } catch (err) {
      setIntegrationStates((prev) => ({
        ...prev,
        github: { ...prev.github, loading: false, error: 'GitHub sync failed' },
      }));
      toast.error('GitHub sync failed');
    }
  };

  const handleLinkedInCsvUpload = async (file: File) => {
    setCsvUploadLoading(true);
    setCsvUploadMessage(null);

    try {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${apiBase}/api/integrations/linkedin/import-csv`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error((errorPayload as any)?.error || response.statusText);
      }

      const data = await response.json();
      setCsvUploadMessage(`Imported ${data.imported || 0} LinkedIn contacts`);
      toast.success('LinkedIn CSV uploaded successfully');
      setIntegrationStates((prev) => ({
        ...prev,
        linkedin: { ...prev.linkedin, connected: true, lastSync: 'Just now' },
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setCsvUploadMessage(message);
      toast.error(`LinkedIn CSV upload failed: ${message}`);
    } finally {
      setCsvUploadLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleLinkedInCsvUpload(file);
    if (event.target) event.target.value = '';
  };

  const saveProfile = async () => {
    if (user) setUser({ ...user, name, title, company });

    if (USE_REAL_API) {
      try {
        await api.patch('/users/me', { name, title, company });
        toast.success('Profile saved');
      } catch {
        toast.error('Failed to save profile');
      }
    } else {
      toast.success('Profile saved!');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed] mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Left Nav */}
        <aside className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={cn('flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-colors', section === id ? 'bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-100 dark:hover:bg-[#3c4043]')}
              >
                <Icon className={cn('w-4 h-4', section === id ? 'text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-400 dark:text-[#71767a]')} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Profile */}
          {section === 'profile' && (
            <div className="space-y-5">
              {/* Profile Info Card */}
              <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-5">
                <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Profile Settings</h2>
                <div className="flex items-center gap-4">
                  <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold', user?.avatarColor || 'bg-[#0a66c2]')}>
                    {user?.initials}
                  </div>
                  <button className="flex items-center gap-2 text-sm border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#e8eaed] px-4 py-2 rounded-lg transition-colors">
                    <Upload className="w-4 h-4" /> Change Photo
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', val: name, setter: setName },
                    { label: 'Current Title', val: title, setter: setTitle },
                    { label: 'Company', val: company, setter: setCompany },
                  ].map(({ label, val, setter }) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">{label}</label>
                      <input value={val} onChange={e => setter(e.target.value)} className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a]" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Email</label>
                    <input value={user?.email || ''} readOnly className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm bg-gray-50 dark:bg-[#3c4043] text-gray-500 dark:text-[#9aa0a6]" />
                  </div>
                </div>
                <button onClick={saveProfile} className="bg-[#0a66c2] hover:bg-[#004182] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">Save Changes</button>
              </div>

              {/* Theme Preferences Card */}
              <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Theme Preferences</h2>
                  <p className="text-sm text-gray-500 dark:text-[#9aa0a6] mt-0.5">Choose how ConnectSphere looks for you</p>
                </div>

                <div className="space-y-3">
                  {themeOptions.map(({ value, label, desc, icon: Icon }) => {
                    const isSelected = theme === value;
                    return (
                      <motion.button
                        key={value}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setTheme(value);
                          toast.success(`Theme set to ${label}`);
                        }}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all duration-200',
                          isSelected
                            ? 'border-[#0a66c2] dark:border-[#8ab4f8] bg-blue-50 dark:bg-blue-900/20'
                            : 'border-[#e6e6e6] dark:border-[#3c4043] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] hover:bg-gray-50 dark:hover:bg-[#3c4043]'
                        )}
                      >
                        {/* Preview swatch */}
                        <ThemePreviewCard mode={value} />

                        {/* Icon + text */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                            isSelected ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-[#3c4043]'
                          )}>
                            <Icon className={cn('w-4 h-4', isSelected ? 'text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-500 dark:text-[#9aa0a6]')} />
                          </div>
                          <div>
                            <p className={cn('text-sm font-medium', isSelected ? 'text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-900 dark:text-[#e8eaed]')}>{label}</p>
                            <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{desc}</p>
                          </div>
                        </div>

                        {/* Selected indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-[#0a66c2] dark:bg-[#8ab4f8] flex items-center justify-center flex-shrink-0"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#0a66c2] mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-[#0a66c2] dark:text-[#8ab4f8]">
                    {theme === 'system'
                      ? 'ConnectSphere will automatically switch between Light and Dark based on your OS setting.'
                      : theme === 'dark'
                      ? 'Dark mode is active. Your eyes will thank you during late-night networking sessions.'
                      : 'Light mode is active. Perfect for bright environments.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Account */}
          {section === 'account' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Account Settings</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{user?.email}</p>
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Verified</span>
                  </div>
                  <button className="text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">Change email</button>
                </div>
                <hr className="border-[#e6e6e6] dark:border-[#3c4043]" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">Password</p>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">Last changed 30 days ago</p>
                  </div>
                  <button onClick={() => toast.success('Password reset email sent!')} className="text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">Change password</button>
                </div>
                <hr className="border-[#e6e6e6] dark:border-[#3c4043]" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">Not enabled</p>
                  </div>
                  <button onClick={() => toast.info('2FA setup coming soon!')} className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg transition-colors">Enable 2FA</button>
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-5">
                <h3 className="font-semibold text-red-800 dark:text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">Permanently delete your account and all your data. This action cannot be undone.</p>
                <button onClick={() => toast.error('Account deletion requires email confirmation')} className="text-sm bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">Delete Account</button>
              </div>
            </div>
          )}

          {/* Integrations */}
          {section === 'integrations' && (
            <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Integrations</h2>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
              <IntegrationCard
                name="LinkedIn"
                icon="💼"
                connected={integrationStates.linkedin.connected}
                lastSync={integrationStates.linkedin.lastSync}
                onConnect={() => redirectToOAuth('linkedin')}
                onDisconnect={() => disconnectIntegration('linkedin')}
                extraActions={(
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={csvUploadLoading}
                    className="text-sm px-4 py-1.5 rounded-lg border border-[#0a66c2] dark:border-[#8ab4f8] text-[#0a66c2] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    {csvUploadLoading ? 'Uploading...' : 'Upload LinkedIn CSV'}
                  </button>
                )}
              />
              {csvUploadMessage && (
                <div className="text-sm text-gray-600 dark:text-[#cbd5e1]">{csvUploadMessage}</div>
              )}
              <IntegrationCard
                name="GitHub"
                icon="🐙"
                connected={integrationStates.github.connected}
                lastSync={integrationStates.github.lastSync}
                onConnect={() => redirectToOAuth('github')}
                onDisconnect={() => disconnectIntegration('github')}
                primaryActionLabel="Sync GitHub contacts"
                onPrimaryAction={syncGithubContacts}
                primaryLoading={integrationStates.github.loading}
              />
              <IntegrationCard name="Gmail" icon="📧" connected={false} lastSync={undefined} onConnect={() => toast.info('Gmail integration coming soon')} onDisconnect={() => {}} />
              <IntegrationCard name="Google Calendar" icon="📅" connected={false} lastSync={undefined} onConnect={() => toast.info('Calendar integration coming soon')} onDisconnect={() => {}} />
              <IntegrationCard name="Slack" icon="💬" connected={false} lastSync={undefined} onConnect={() => toast.info('Slack integration coming soon')} onDisconnect={() => {}} />
              <IntegrationCard name="Notion" icon="📓" connected={false} lastSync={undefined} onConnect={() => toast.info('Notion integration coming soon')} onDisconnect={() => {}} />
            </div>
          )}

          {/* Notifications */}
          {section === 'notifications' && (
            <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Notification Settings</h2>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-[#9aa0a6] uppercase tracking-wide">Email Notifications</h3>
                {[
                  { key: 'emailOpps' as const, label: 'New opportunities detected', desc: 'When AI finds high-match contacts' },
                  { key: 'weeklyReport' as const, label: 'Weekly network summary', desc: 'Every Monday morning' },
                  { key: 'followups' as const, label: 'Follow-up reminders', desc: 'When contacts go cold' },
                  { key: 'eventRecs' as const, label: 'Event recommendations', desc: 'New events matching your interests' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{label}</p>
                      <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{desc}</p>
                    </div>
                    <Toggle checked={notifSettings[key]} onChange={() => toggleNotif(key)} />
                  </div>
                ))}
              </div>
              <hr className="border-[#e6e6e6] dark:border-[#3c4043]" />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-[#9aa0a6] uppercase tracking-wide">Push Notifications</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 dark:text-[#9aa0a6]">Enable push notifications</p>
                  <Toggle checked={notifSettings.pushNotifs} onChange={() => toggleNotif('pushNotifs')} />
                </div>
              </div>
              <button
                onClick={async () => {
                  if (USE_REAL_API) {
                    try {
                      await api.patch('/users/me/settings', { notifications: notifSettings });
                      toast.success('Notification preferences saved!');
                    } catch {
                      toast.error('Failed to save notification preferences');
                    }
                  } else {
                    toast.success('Notification preferences saved!');
                  }
                }}
                className="bg-[#0a66c2] hover:bg-[#004182] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >Save Preferences</button>
            </div>
          )}

          {/* Privacy */}
          {section === 'privacy' && (
            <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Privacy & Data</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">Make network visible to connections</p>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">Allow connections to see your shared network</p>
                  </div>
                  <Toggle checked={privacy.networkVisible} onChange={() => togglePrivacy('networkVisible')} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">Anonymous usage data</p>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">Help improve ConnectSphere</p>
                  </div>
                  <Toggle checked={privacy.anonymousData} onChange={() => togglePrivacy('anonymousData')} />
                </div>
              </div>
              <hr className="border-[#e6e6e6] dark:border-[#3c4043]" />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-[#9aa0a6]">Your Data</h3>
                <div className="flex gap-3">
                  <button onClick={() => toast.success('Data export started! You\'ll receive an email shortly.')} className="flex items-center gap-2 text-sm border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#9aa0a6] px-4 py-2 rounded-lg transition-colors">
                    Export All Data (JSON)
                  </button>
                  <button onClick={() => toast.success('Data export started!')} className="flex items-center gap-2 text-sm border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#9aa0a6] px-4 py-2 rounded-lg transition-colors">
                    Export as CSV
                  </button>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-300">Your contact data is end-to-end encrypted and never shared with third parties. ConnectSphere is GDPR and CCPA compliant.</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (USE_REAL_API) {
                    try {
                      await api.patch('/users/me/settings', { privacy });
                      toast.success('Privacy settings saved!');
                    } catch {
                      toast.error('Failed to save privacy settings');
                    }
                  } else {
                    toast.success('Privacy settings saved!');
                  }
                }}
                className="bg-[#0a66c2] hover:bg-[#004182] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >Save Settings</button>
            </div>
          )}

          {/* Preferences */}
          {section === 'preferences' && (
            <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Preferences</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-2">Default message tone</label>
                <select value={prefs.msgTone} onChange={e => setPrefs(p => ({ ...p, msgTone: e.target.value }))} className="px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed]">
                  <option value="professional">Professional & Formal</option>
                  <option value="friendly">Friendly & Casual</option>
                  <option value="direct">Direct & Concise</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700 dark:text-[#9aa0a6]">Auto-schedule follow-ups</p>
                <Toggle checked={prefs.autoFollowup} onChange={() => setPrefs(p => ({ ...p, autoFollowup: !p.autoFollowup }))} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700 dark:text-[#9aa0a6]">Review messages before sending</p>
                <Toggle checked={prefs.reviewBefore} onChange={() => setPrefs(p => ({ ...p, reviewBefore: !p.reviewBefore }))} />
              </div>
              <button
                onClick={async () => {
                  if (USE_REAL_API) {
                    try {
                      await api.patch('/users/me/settings', { preferences: prefs });
                      toast.success('Preferences saved!');
                    } catch {
                      toast.error('Failed to save preferences');
                    }
                  } else {
                    toast.success('Preferences saved!');
                  }
                }}
                className="bg-[#0a66c2] hover:bg-[#004182] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >Save Preferences</button>
            </div>
          )}

          {/* Billing */}
          {section === 'billing' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6">
                <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">Current Plan</h2>
                <div className="bg-[#0a66c2] rounded-lg p-5 text-white mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-200">Current Plan</p>
                      <p className="text-2xl font-bold">Free Tier</p>
                      <p className="text-blue-200 text-sm mt-1">215/500 contacts · 5/10 campaigns</p>
                    </div>
                    <button onClick={() => toast.success('Upgrade flow coming soon!')} className="bg-white text-[#0a66c2] px-5 py-2.5 rounded-lg text-sm font-semibold hover:shadow-md transition-all">Upgrade to Pro</button>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    { feature: 'Unlimited contacts', pro: true, free: false },
                    { feature: 'Unlimited campaigns', pro: true, free: false },
                    { feature: 'AI message generation', pro: true, free: '10/month' },
                    { feature: 'Advanced analytics', pro: true, free: false },
                    { feature: 'Priority support', pro: true, free: false },
                  ].map(({ feature, pro, free }) => (
                    <div key={feature} className="flex justify-between">
                      <span className="text-gray-700 dark:text-[#9aa0a6]">{feature}</span>
                      <div className="flex gap-8">
                        <span className="text-gray-400 dark:text-[#71767a]">{free === false ? '✗' : free === true ? '✓' : free}</span>
                        <span className="text-green-600 dark:text-green-400">{pro ? '✓' : '✗'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Support */}
          {section === 'support' && (
            <div className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Help & Support</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { icon: '📚', title: 'Help Center', desc: 'Browse articles and guides', action: 'View Help Center' },
                  { icon: '💬', title: 'Contact Support', desc: 'Get help from our team', action: 'Start Chat' },
                  { icon: '🐛', title: 'Report a Bug', desc: 'Help us improve ConnectSphere', action: 'Submit Report' },
                  { icon: '✨', title: 'Feature Requests', desc: 'Suggest new features', action: 'Submit Request' },
                ].map(({ icon, title, desc, action }) => (
                  <button key={title} onClick={() => toast.info(`${action} - coming soon!`)} className="text-left p-4 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg hover:border-[#c6c6c6] dark:hover:border-[#5f6368] hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-all duration-200 group">
                    <span className="text-2xl mb-2 block">{icon}</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] group-hover:text-[#0a66c2] dark:group-hover:text-[#8ab4f8]">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{desc}</p>
                  </button>
                ))}
              </div>
              <div className="bg-gray-50 dark:bg-[#3c4043] rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] mb-2">Keyboard Shortcuts</h3>
                <div className="grid sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: '⌘K', action: 'Global search' },
                    { key: 'C', action: 'Create campaign' },
                    { key: 'N', action: 'Add contact' },
                    { key: '?', action: 'Show shortcuts' },
                    { key: 'Esc', action: 'Close modal' },
                    { key: '⌘/', action: 'Command palette' },
                  ].map(({ key, action }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-[#9aa0a6]">{action}</span>
                      <kbd className="bg-gray-200 dark:bg-[#3c4043] text-gray-700 dark:text-[#e8eaed] px-2 py-0.5 rounded text-xs font-mono">{key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
