import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#0a66c2]' : 'bg-gray-300 dark:bg-[#5f6368]'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function Step4() {
  const navigate = useNavigate();
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  const [prefs, setPrefs] = useState({
    emailNotifs: true,
    weeklyReport: true,
    followupReminders: true,
    eventRecs: false,
    tone: 'professional',
    autoFollowup: true,
    reviewMessages: true,
    networkVisible: false,
    anonymousData: true,
    calendarSync: false,
    slackNotifs: false,
  });

  const toggle = (key: keyof typeof prefs) => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const handleComplete = async () => {
    setCompleting(true);
    await new Promise(r => setTimeout(r, 1500));
    setDone(true);
    toast.success('ConnectSphere setup complete! 🎉');
    await new Promise(r => setTimeout(r, 2000));
    navigate('/dashboard');
  };

  if (done) {
    return (
      <div className="text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: 'Poppins, sans-serif' }}>Your ConnectSphere is Ready! 🚀</h2>
        <p className="text-gray-600 dark:text-slate-400">Redirecting you to your dashboard...</p>
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: 'Poppins, sans-serif' }}>Customize Your Experience</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">Set your preferences to get the most out of ConnectSphere.</p>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Notification Settings</h2>
        {[
          { key: 'emailNotifs' as const, label: 'Email notifications for new opportunities' },
          { key: 'weeklyReport' as const, label: 'Weekly network health summary' },
          { key: 'followupReminders' as const, label: 'Follow-up reminders' },
          { key: 'eventRecs' as const, label: 'Event recommendations' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
            <Toggle checked={prefs[key] as boolean} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      {/* Outreach Preferences */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Outreach Preferences</h2>
        <div>
          <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">Message tone preference</p>
          <div className="flex flex-wrap gap-3">
            {['professional', 'friendly', 'direct'].map(tone => (
              <label key={tone} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 text-sm transition-all capitalize ${prefs.tone === tone ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                <input type="radio" name="tone" value={tone} checked={prefs.tone === tone} onChange={() => setPrefs(p => ({ ...p, tone }))} className="hidden" />
                {tone === 'professional' ? '💼 Professional & Formal' : tone === 'friendly' ? '😊 Friendly & Casual' : '⚡ Direct & Concise'}
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-slate-300">Auto-schedule follow-ups</span>
          <Toggle checked={prefs.autoFollowup} onChange={() => toggle('autoFollowup')} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-slate-300">Review messages before sending</span>
          <Toggle checked={prefs.reviewMessages} onChange={() => toggle('reviewMessages')} />
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Privacy Settings</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-slate-300">Make my network graph visible to connections</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Your contacts can see shared connections</p>
          </div>
          <Toggle checked={prefs.networkVisible} onChange={() => toggle('networkVisible')} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-slate-300">Allow anonymous usage data for improvements</p>
          </div>
          <Toggle checked={prefs.anonymousData} onChange={() => toggle('anonymousData')} />
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-start gap-2">
          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">Your contact data is always private and encrypted. We never share your information with third parties.</p>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Integration Preferences</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-slate-300">Sync with Google Calendar</span>
          <Toggle checked={prefs.calendarSync} onChange={() => toggle('calendarSync')} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-slate-300">Enable Slack notifications</span>
          <Toggle checked={prefs.slackNotifs} onChange={() => toggle('slackNotifs')} />
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate('/onboarding/step-3')} className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">← Back</button>
        <button
          onClick={handleComplete}
          disabled={completing}
          className="bg-[#0a66c2] hover:bg-[#004182] text-white px-8 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-60 shadow-sm"
        >
          {completing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          Complete Setup & Go to Dashboard
        </button>
      </div>
    </div>
  );
}