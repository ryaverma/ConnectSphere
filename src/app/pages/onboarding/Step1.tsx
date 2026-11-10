import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';

const goals = [
  { id: 'jobs', emoji: '🎯', label: 'Find internships and job opportunities' },
  { id: 'mentor', emoji: '🤝', label: 'Build mentorship relationships' },
  { id: 'research', emoji: '🔬', label: 'Find research collaborators' },
  { id: 'industry', emoji: '💼', label: 'Expand industry connections' },
  { id: 'startup', emoji: '🚀', label: 'Grow my startup network' },
  { id: 'other', emoji: '📝', label: 'Other' },
];

const roles = ['Student', 'Early Career (0-2 yrs)', 'Mid-Level (3-6 yrs)', 'Senior (7+ yrs)', 'Researcher', 'Founder / Entrepreneur'];

export default function Step1() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [selectedGoal, setSelectedGoal] = useState('jobs');
  const [otherGoal, setOtherGoal] = useState('');
  const [role, setRole] = useState('Student');
  const [industry, setIndustry] = useState('');
  const [targets, setTargets] = useState<string[]>([]);
  const [targetInput, setTargetInput] = useState('');

  const addTarget = (e: React.KeyboardEvent) => {
    const val = targetInput.trim();
    if (e.key === 'Enter' && val && !targets.includes(val)) {
      setTargets(t => [...t, val]);
      setTargetInput('');
    }
  };

  const handleContinue = () => {
    if (user) {
      setUser({ ...user, goal: selectedGoal === 'other' ? otherGoal : goals.find(g => g.id === selectedGoal)?.label || '' });
    }
    navigate('/onboarding/step-2');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-[#e8eaed]">
          Welcome, {user?.name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-[#9aa0a6] mt-2">Let's personalize your ConnectSphere experience. This takes about 5 minutes.</p>
      </div>

      {/* Goals */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">What's your primary networking goal?</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {goals.map(({ id, emoji, label }) => (
            <button
              key={id}
              onClick={() => setSelectedGoal(id)}
              className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                selectedGoal === id ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20' : 'border-[#e6e6e6] dark:border-[#3c4043] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] hover:bg-gray-50 dark:hover:bg-[#3c4043]'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className={`text-sm font-medium ${selectedGoal === id ? 'text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-700 dark:text-[#9aa0a6]'}`}>{label}</span>
            </button>
          ))}
        </div>
        {selectedGoal === 'other' && (
          <input
            type="text"
            value={otherGoal}
            onChange={e => setOtherGoal(e.target.value)}
            placeholder="Describe your goal..."
            className="mt-3 w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a]"
          />
        )}
      </div>

      {/* Role & Industry */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-2">Current Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed]"
          >
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-2">Primary Industry / Field</label>
          <input
            type="text"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="e.g., Machine Learning, Product Management, Finance..."
            className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-2">Target Companies or Organizations <span className="text-gray-400 dark:text-[#71767a] font-normal">(optional)</span></label>
          <div className="flex flex-wrap gap-2 mb-2">
            {targets.map(t => (
              <span key={t} className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-[#0a66c2] dark:text-[#8ab4f8] text-xs px-3 py-1 rounded-full">
                {t}
                <button onClick={() => setTargets(ts => ts.filter(x => x !== t))} className="hover:text-blue-900 dark:hover:text-blue-200">×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={targetInput}
            onChange={e => setTargetInput(e.target.value)}
            onKeyDown={addTarget}
            placeholder="Type company name and press Enter..."
            className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#202124] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a]"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button onClick={() => navigate('/onboarding/step-2')} className="text-sm text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed] px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors">
          Skip for now
        </button>
        <button onClick={handleContinue} className="bg-[#0a66c2] hover:bg-[#004182] text-white px-8 py-2.5 rounded-lg font-medium transition-colors">
          Continue →
        </button>
      </div>
    </div>
  );
}