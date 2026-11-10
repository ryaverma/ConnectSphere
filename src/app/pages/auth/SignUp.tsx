import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Check, Zap, ArrowRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import { authApi, ApiError } from '../../api';

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API !== 'false';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function PasswordStrength({ password }: { password: string }) {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  const score = [hasLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? colors[score - 1] : 'bg-gray-200 dark:bg-[#3c4043]'} transition-all`} />
        ))}
      </div>
      <p className={`text-xs ${score <= 1 ? 'text-red-500' : score === 2 ? 'text-orange-500' : score === 3 ? 'text-yellow-600' : 'text-green-500'}`}>
        {score > 0 ? labels[score - 1] : 'Too short'} password
      </p>
    </div>
  );
}

const benefits = [
  { icon: '🎯', text: 'Find the right contacts to reach your goals' },
  { icon: '✍️', text: 'AI-crafted messages with 47% avg response rate' },
  { icon: '📊', text: 'Track your entire networking pipeline' },
  { icon: '🔔', text: 'Never miss a follow-up opportunity' },
];

export default function SignUp() {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', source: '', agree: false });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const startOAuth = (provider: 'google' | 'github') => {
    window.location.href = `${API_BASE}/auth/oauth/${provider}/authorize`;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    if (!form.agree) e.agree = 'You must agree to the terms';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      if (USE_REAL_API) {
        const res = await authApi.register({ name: form.name, email: form.email, password: form.password });
        setUser(res.user);
        toast.success("Account created! Let's set up your ConnectSphere.");
      } else {
        await new Promise(r => setTimeout(r, 1200));
        const nameParts = form.name.trim().split(' ');
        const initials = nameParts.length >= 2 ? nameParts[0][0] + nameParts[nameParts.length - 1][0] : nameParts[0].slice(0, 2);
        setUser({ id: 'u_new', name: form.name, email: form.email, title: '', company: '', location: '', initials: initials.toUpperCase(), avatarColor: 'bg-indigo-600', skills: [], interests: [] });
        toast.success("Account created! Let's set up your ConnectSphere.");
      }
      navigate('/onboarding/step-1');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
      return;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>ConnectSphere</span>
        </Link>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Join 10,000+ professionals growing their networks strategically
            </h2>
            <p className="text-indigo-300">Your AI networking partner is ready to help.</p>
          </div>
          <div className="space-y-4">
            {benefits.map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
                <span className="text-2xl">{icon}</span>
                <span className="text-sm text-indigo-100">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 text-sm text-indigo-400">
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-teal-400" /> Free forever plan</span>
          <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-teal-400" /> No credit card</span>
        </div>
      </div>

      {/* Right Panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-[#202124] overflow-y-auto">
        <div className="w-full max-w-md space-y-5 py-8">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg dark:text-slate-100" style={{ fontFamily: 'Poppins, sans-serif' }}>ConnectSphere</span>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Get Started with ConnectSphere</h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1">Create your free account in seconds</p>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => startOAuth('google')} className="flex items-center justify-center gap-2 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <button onClick={() => startOAuth('github')} className="flex items-center justify-center gap-2 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <svg className="w-4 h-4 dark:fill-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.01-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013.01-.4c1.02.005 2.05.14 3.01.4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.69.82.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/></svg>
              Continue with GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-400 dark:text-slate-500">
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
            <span>OR</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Jordan Lee' },
              { label: 'Email Address', key: 'email', type: 'email', placeholder: 'jordan@example.com' },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form] as string}
                  onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })); }}
                  placeholder={placeholder}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a] ${errors[key] ? 'border-red-400' : 'border-[#e6e6e6] dark:border-[#3c4043]'}`}
                />
                {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: '' })); }}
                  placeholder="Create a strong password"
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a] ${errors.password ? 'border-red-400' : 'border-[#e6e6e6] dark:border-[#3c4043]'}`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#71767a] hover:text-gray-600 dark:hover:text-[#9aa0a6]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Confirm Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setErrors(er => ({ ...er, confirm: '' })); }}
                placeholder="Repeat your password"
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed] placeholder:text-gray-400 dark:placeholder:text-[#71767a] ${errors.confirm ? 'border-red-400' : 'border-[#e6e6e6] dark:border-[#3c4043]'}`}
              />
              {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">How did you hear about us? <span className="text-gray-400 dark:text-[#71767a] font-normal">(optional)</span></label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full px-3 py-2.5 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed]">
                <option value="">Select one...</option>
                <option value="linkedin">LinkedIn</option>
                <option value="friend">Friend / Colleague</option>
                <option value="twitter">Twitter / X</option>
                <option value="search">Search Engine</option>
                <option value="other">Other</option>
              </select>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.agree} onChange={e => { setForm(f => ({ ...f, agree: e.target.checked })); setErrors(er => ({ ...er, agree: '' })); }} className="w-4 h-4 mt-0.5 rounded border-[#e6e6e6] dark:border-[#3c4043] text-[#0a66c2]" />
              <span className="text-sm text-gray-600 dark:text-[#9aa0a6]">
                I agree to the <a href="#" className="text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">Terms of Service</a> and <a href="#" className="text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">Privacy Policy</a>
              </span>
            </label>
            {errors.agree && <p className="text-xs text-red-500">{errors.agree}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0a66c2] hover:bg-[#004182] text-white py-3 rounded-lg font-medium hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Create Free Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-[#9aa0a6]">
            Already have an account?{' '}
            <Link to="/signin" className="text-[#0a66c2] dark:text-[#8ab4f8] hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
