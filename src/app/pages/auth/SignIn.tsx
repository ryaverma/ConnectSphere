import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import { mockContacts } from '../../data/mockData';
import { authApi, ApiError } from '../../api';

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API !== 'false';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function SignIn() {
  const navigate = useNavigate();
  const { setUser } = useApp();
  const [form, setForm] = useState({
    email: USE_REAL_API ? 'demo@connectsphere.dev' : 'jordan@example.com',
    password: USE_REAL_API ? 'Password123!' : 'password123',
    remember: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const startOAuth = (provider: 'google' | 'github') => {
    window.location.href = `${API_BASE}/auth/oauth/${provider}/authorize`;
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      const res = await authApi.demo();
      setUser(res.user);
      toast.success('Welcome, Jordan! (Demo account)');
      navigate('/dashboard');
    } catch {
      toast.error('Demo login failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required';
    if (!form.password) errs.password = 'Password is required';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      if (USE_REAL_API) {
        const res = await authApi.login({ email: form.email, password: form.password });
        setUser(res.user);
        toast.success(`Welcome back, ${res.user.name.split(' ')[0]}!`);
      } else {
        await new Promise(r => setTimeout(r, 1000));
        setUser({ id: 'u1', name: 'Jordan Lee', email: form.email, title: 'ML Engineer', company: 'TechCorp', location: 'San Francisco, CA', initials: 'JL', avatarColor: 'bg-indigo-600', skills: ['Machine Learning', 'Python', 'React'], interests: ['AI Research', 'Startups'], goal: 'Find internships and job opportunities' });
        toast.success('Welcome back, Jordan!');
      }
      navigate('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
      return;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white/5" style={{ width: `${(i+1)*150}px`, height: `${(i+1)*150}px`, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', animation: `spin ${10 + i*5}s linear infinite` }} />
          ))}
          {mockContacts.slice(0, 6).map((c, i) => (
            <div key={c.id} className={`absolute w-10 h-10 rounded-full ${c.avatarColor} flex items-center justify-center text-white text-xs font-medium border-2 border-white/30`} style={{ left: `${20 + (i % 3) * 30}%`, top: `${20 + Math.floor(i / 3) * 40}%`, animation: `bounce ${3 + i * 0.5}s ease-in-out infinite alternate` }}>
              {c.initials}
            </div>
          ))}
        </div>

        <Link to="/" className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>ConnectSphere</span>
        </Link>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Welcome back! Your network is waiting.</h2>
          <div className="space-y-3">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-sm font-medium mb-1">🎯 3 new opportunities detected</div>
              <div className="text-xs text-indigo-300">Sarah Chen, Priya Patel, and Aisha Thompson match your goals</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-sm font-medium mb-1">✉️ 2 drafts ready for review</div>
              <div className="text-xs text-indigo-300">Personalized messages are waiting for your approval</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-sm font-medium mb-1">📅 AI & ML Summit in 3 weeks</div>
              <div className="text-xs text-indigo-300">12 contacts in your network are attending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-[#202124]">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[#0a66c2] flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg dark:text-[#e8eaed]">ConnectSphere</span>
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">Welcome Back to ConnectSphere</h1>
            <p className="text-gray-600 dark:text-[#9aa0a6] mt-1">Sign in to continue building your network</p>
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => startOAuth('google')} className="flex items-center justify-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-[#e8eaed] hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button onClick={() => startOAuth('github')} className="flex items-center justify-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-[#e8eaed] hover:bg-gray-50 dark:hover:bg-[#3c4043] transition-colors">
              <svg className="w-4 h-4 dark:fill-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.01-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 013.01-.4c1.02.005 2.05.14 3.01.4 2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.69.82.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z"/></svg>
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-400 dark:text-[#71767a]">
            <div className="flex-1 h-px bg-[#e6e6e6] dark:bg-[#3c4043]" />
            <span>OR</span>
            <div className="flex-1 h-px bg-[#e6e6e6] dark:bg-[#3c4043]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6] mb-1">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })); }}
                className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed] ${errors.email ? 'border-red-400' : 'border-[#e6e6e6] dark:border-[#3c4043]'}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#9aa0a6]">Password</label>
                <a href="#" className="text-xs text-[#0a66c2] dark:text-[#8ab4f8] hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: '' })); }}
                  className={`w-full px-3 py-2.5 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2] bg-white dark:bg-[#303134] text-gray-900 dark:text-[#e8eaed] ${errors.password ? 'border-red-400' : 'border-[#e6e6e6] dark:border-[#3c4043]'}`}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#71767a] hover:text-gray-600 dark:hover:text-[#9aa0a6]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.remember} onChange={e => setForm(f => ({ ...f, remember: e.target.checked }))} className="w-4 h-4 rounded border-[#e6e6e6] dark:border-[#3c4043] text-[#0a66c2]" />
              <span className="text-sm text-gray-600 dark:text-[#9aa0a6]">Remember me for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0a66c2] hover:bg-[#004182] text-white py-3 rounded-lg font-medium hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In to ConnectSphere'}
            </button>

            {USE_REAL_API && (
              <button
                type="button"
                onClick={handleDemo}
                disabled={loading}
                className="w-full border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 py-3 rounded-lg font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : 'Continue as Demo'}
              </button>
            )}
          </form>

          <p className="text-center text-sm text-gray-600 dark:text-[#9aa0a6]">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#0a66c2] dark:text-[#8ab4f8] hover:underline font-medium">Get Started Free</Link>
          </p>

          <div className="text-center">
            <p className="text-xs text-gray-400 dark:text-[#71767a]">
              {USE_REAL_API ? 'Demo: demo@connectsphere.dev / Password123!' : 'Demo: pre-filled credentials ready. Just click Sign In!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
