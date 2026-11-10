import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { Upload, X } from 'lucide-react';

const suggestedSkills = ['Python', 'Machine Learning', 'React', 'TypeScript', 'Product Management', 'Data Science', 'Go', 'Rust', 'Design Systems', 'UX Research', 'SQL', 'AWS', 'MLOps', 'Leadership', 'Growth'];
const suggestedInterests = ['AI Research', 'Startups', 'Open Source', 'Product Strategy', 'Web3', 'Climate Tech', 'EdTech', 'FinTech', 'Cybersecurity', 'DevRel'];

export default function Step3() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [title, setTitle] = useState(user?.title || '');
  const [company, setCompany] = useState(user?.company || '');
  const [location, setLocation] = useState(user?.location || '');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [availability, setAvailability] = useState('3-5 hours/week');
  const [commMethods, setCommMethods] = useState<string[]>(['Email', 'LinkedIn']);

  const addChip = (value: string, list: string[], setter: (v: string[]) => void, inputSetter: (v: string) => void) => {
    if (value.trim() && !list.includes(value.trim())) {
      setter([...list, value.trim()]);
      inputSetter('');
    }
  };

  const removeChip = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.filter(v => v !== value));
  };

  const toggleComm = (method: string) => {
    setCommMethods(m => m.includes(method) ? m.filter(x => x !== method) : [...m, method]);
  };

  const handleContinue = () => {
    if (user) setUser({ ...user, title, company, location, skills, interests });
    navigate('/onboarding/step-4');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: 'Poppins, sans-serif' }}>Complete Your Profile</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">Help us understand your background so we can find the best matches.</p>
      </div>

      {/* Basic Info */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Basic Information</h2>

        {/* Avatar Upload */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full ${user?.avatarColor || 'bg-[#0a66c2]'} flex items-center justify-center text-white text-xl font-bold`}>
            {user?.initials || '?'}
          </div>
          <button className="flex items-center gap-2 text-sm border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg transition-colors">
            <Upload className="w-4 h-4" /> Upload Photo
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Current Position / Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., ML Engineer" className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Company / University</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g., Stanford University" className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State/Country" className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">LinkedIn URL <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span></label>
            <input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/..." className="w-full px-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500" />
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Skills & Expertise</h2>
        <div className="flex flex-wrap gap-2">
          {skills.map(s => (
            <span key={s} className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs px-3 py-1 rounded-full">
              {s} <button onClick={() => removeChip(s, skills, setSkills)} className="hover:text-indigo-900 dark:hover:text-indigo-200"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <input
          value={skillInput}
          onChange={e => setSkillInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addChip(skillInput, skills, setSkills, setSkillInput)}
          placeholder="Type a skill and press Enter..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {suggestedSkills.filter(s => !skills.includes(s)).slice(0, 8).map(s => (
            <button key={s} onClick={() => setSkills(sk => [...sk, s])} className="text-xs border border-gray-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 text-gray-600 dark:text-slate-400 px-2.5 py-1 rounded-full transition-colors">
              + {s}
            </button>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Interests</h2>
        <div className="flex flex-wrap gap-2">
          {interests.map(i => (
            <span key={i} className="inline-flex items-center gap-1 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 text-xs px-3 py-1 rounded-full">
              {i} <button onClick={() => removeChip(i, interests, setInterests)} className="hover:text-teal-900 dark:hover:text-teal-200"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <input
          value={interestInput}
          onChange={e => setInterestInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addChip(interestInput, interests, setInterests, setInterestInput)}
          placeholder="Type an interest and press Enter..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
        />
        <div className="flex flex-wrap gap-1.5">
          {suggestedInterests.filter(i => !interests.includes(i)).slice(0, 6).map(i => (
            <button key={i} onClick={() => setInterests(in_ => [...in_, i])} className="text-xs border border-gray-300 dark:border-slate-600 hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400 text-gray-600 dark:text-slate-400 px-2.5 py-1 rounded-full transition-colors">
              + {i}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="bg-white dark:bg-[#303134] rounded-lg p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Availability & Communication</h2>
        <div>
          <p className="text-sm text-gray-700 dark:text-slate-300 mb-2">How much time can you dedicate to networking?</p>
          <div className="flex gap-3 flex-wrap">
            {['1-2 hours/week', '3-5 hours/week', '5+ hours/week'].map(opt => (
              <label key={opt} className={`flex items-center gap-2 cursor-pointer px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${availability === opt ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                <input type="radio" name="avail" value={opt} checked={availability === opt} onChange={() => setAvailability(opt)} className="hidden" />
                {opt}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-700 dark:text-slate-300 mb-2">Preferred communication methods</p>
          <div className="flex flex-wrap gap-2">
            {['Email', 'LinkedIn', 'Coffee Chats', 'Virtual Meetings'].map(method => (
              <label key={method} className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm transition-all ${commMethods.includes(method) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-500'}`}>
                <input type="checkbox" checked={commMethods.includes(method)} onChange={() => toggleComm(method)} className="hidden" />
                {method}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={() => navigate('/onboarding/step-2')} className="text-sm text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed] px-4 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors">← Back</button>
        <button onClick={handleContinue} className="bg-[#0a66c2] hover:bg-[#004182] text-white px-8 py-2.5 rounded-lg font-medium transition-colors">Continue →</button>
      </div>
    </div>
  );
}