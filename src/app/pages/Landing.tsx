import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import {
  Zap, Users, Brain, MessageSquare, Bell, Calendar, BarChart3,
  Upload, ArrowRight, Check, Star, ChevronRight, Network, Target,
  Sparkles, Globe, Shield
} from 'lucide-react';
import LandingNavbar from '../components/layout/LandingNavbar';

// Animated Network Graph
function HeroGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = [
      { x: 350, y: 200, r: 20, color: '#6366f1', label: 'You', pulse: 0 },
      { x: 200, y: 100, r: 12, color: '#14b8a6', label: 'Sarah', pulse: 0.3 },
      { x: 500, y: 80, r: 14, color: '#6366f1', label: 'Marcus', pulse: 0.6 },
      { x: 150, y: 260, r: 10, color: '#f97316', label: 'Priya', pulse: 0.9 },
      { x: 520, y: 260, r: 13, color: '#14b8a6', label: 'James', pulse: 1.2 },
      { x: 270, y: 340, r: 11, color: '#10b981', label: 'Elena', pulse: 0.4 },
      { x: 450, y: 340, r: 9, color: '#6366f1', label: 'Aisha', pulse: 0.8 },
      { x: 100, y: 160, r: 8, color: '#f97316', label: 'Tom', pulse: 1.5 },
      { x: 600, y: 170, r: 8, color: '#10b981', label: 'Nina', pulse: 0.2 },
      { x: 350, y: 390, r: 8, color: '#6366f1', label: 'Zara', pulse: 1.0 },
    ];

    const edges = [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
      [1, 2], [1, 3], [1, 7], [2, 4], [2, 8], [4, 8],
      [3, 5], [5, 9], [6, 9], [6, 4],
    ];

    let animFrame = 0;
    let raf: number;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      animFrame++;

      // Draw edges
      edges.forEach(([from, to]) => {
        const a = nodes[from], b = nodes[to];
        const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(20, 184, 166, 0.3)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      // Animated particles on edges
      edges.forEach(([from, to]) => {
        const a = nodes[from], b = nodes[to];
        const progress = ((animFrame * 0.8 + from * 30 + to * 17) % 100) / 100;
        const px = a.x + (b.x - a.x) * progress;
        const py = a.y + (b.y - a.y) * progress;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((node, i) => {
        const pulse = Math.sin(animFrame * 0.05 + node.pulse) * 0.5 + 0.5;

        // Glow / pulse ring
        if (i === 0 || pulse > 0.7) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.r + 6 + pulse * 4, 0, Math.PI * 2);
          ctx.fillStyle = node.color.replace(')', ', 0.15)').replace('rgb', 'rgba').replace('#', '').slice(0);
          const alpha = i === 0 ? 0.2 : 0.08 * pulse;
          ctx.fillStyle = `${node.color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // White inner dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();

        // Label
        ctx.fillStyle = '#374151';
        ctx.font = `${i === 0 ? 600 : 500} 11px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.r + 14);
      });

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={450}
      className="w-full max-w-[700px] h-auto"
    />
  );
}

const features = [
  { icon: Upload, title: 'Smart Contact Import', desc: 'Import from LinkedIn, GitHub, Gmail, or CSV. We extract skills, interests, and context automatically.', color: 'bg-indigo-100 text-indigo-600' },
  { icon: Network, title: 'Knowledge Graph', desc: 'Visualize your entire network as an interactive graph. Discover hidden connections and clusters.', color: 'bg-teal-100 text-teal-600' },
  { icon: Target, title: 'AI Opportunity Detection', desc: 'Our AI identifies your highest-value contacts based on your goals and match scores.', color: 'bg-orange-100 text-orange-600' },
  { icon: MessageSquare, title: 'Personalized Outreach', desc: 'Generate tailored messages that reference mutual connections, shared interests, and recent activity.', color: 'bg-green-100 text-green-600' },
  { icon: Bell, title: 'Automated Follow-ups', desc: 'Never let a connection go cold. Smart reminders and AI-generated follow-ups keep you top of mind.', color: 'bg-purple-100 text-purple-600' },
  { icon: Calendar, title: 'Event Recommendations', desc: 'Discover events where your target contacts will be. Get pre-event outreach suggestions.', color: 'bg-blue-100 text-blue-600' },
  { icon: BarChart3, title: 'Network Analytics', desc: 'Deep insights into your network health, outreach performance, and opportunity pipeline.', color: 'bg-pink-100 text-pink-600' },
];

const steps = [
  { n: '01', title: 'Import Your Network', desc: 'Connect LinkedIn, GitHub, Gmail or upload a CSV. We import and analyze your contacts in minutes.' },
  { n: '02', title: 'Set Your Goals', desc: 'Tell us what you\'re looking for—internships, mentors, collaborators, or clients. AI does the rest.' },
  { n: '03', title: 'Review Opportunities', desc: 'Get a ranked list of high-value contacts with match scores and personalized conversation starters.' },
  { n: '04', title: 'Send & Track', desc: 'Send AI-crafted outreach, track responses, and manage your entire pipeline from one dashboard.' },
];

const personas = [
  { emoji: '🎓', title: 'Students & Job Seekers', desc: 'Find internship opportunities, reach alumni, and build a mentor network before graduation.' },
  { emoji: '🚀', title: 'Founders & Operators', desc: 'Expand your investor network, find co-founders, and connect with potential customers.' },
  { emoji: '🔬', title: 'Researchers & Academics', desc: 'Find collaborators, connect with industry partners, and expand your research network.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f23]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LandingNavbar />
      {/* Hero */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4" />
                AI-Powered Relationship Intelligence
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Transform Your Network Into{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">
                  Career Opportunities
                </span>
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed">
                AI-powered relationship intelligence that identifies high-value contacts, generates personalized outreach, and helps you build a strategic professional network.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-900/50 hover:shadow-xl hover:scale-105"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-3.5 rounded-xl font-medium transition-all"
                >
                  View Demo Dashboard
                </Link>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-400">
                {['Free forever plan', 'No credit card required', 'GDPR compliant'].map(item => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-teal-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <HeroGraph />
              </div>
              {/* Floating cards */}
              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-[#1a1a2a] rounded-xl shadow-xl p-3 border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900 dark:text-slate-100">Message sent!</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">Sarah Chen replied ✨</div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white dark:bg-[#1a1a2a] rounded-xl shadow-xl p-3 border border-gray-100 dark:border-slate-700">
                <div className="text-xs font-medium text-gray-900 dark:text-slate-100 mb-1">Match Score</div>
                <div className="flex items-center gap-1">
                  <div className="h-2 flex-1 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-[92%] bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">92%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 bg-gray-50 dark:bg-[#1e1e2e]">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Networking Shouldn't Be This Hard</h2>
          <p className="text-lg text-gray-600 dark:text-slate-400 mb-12">Most professionals struggle with the same networking pain points</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '😩', title: 'No idea who to reach out to', desc: 'Thousands of contacts but no clear strategy for who can actually help you.' },
              { icon: '✍️', title: 'Generic, forgettable messages', desc: 'Copy-paste templates that get ignored because they feel impersonal.' },
              { icon: '🕵️', title: 'Losing track of follow-ups', desc: 'Promising conversations die because you forgot to follow up at the right time.' },
              { icon: '📊', title: 'No visibility into what works', desc: 'Shotgun approach with no data on which outreach strategies actually work.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white dark:bg-[#1a1a2a] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 text-left hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white dark:bg-[#0f0f23]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Your AI-Powered Networking Assistant</h2>
            <p className="text-lg text-gray-600 dark:text-slate-400">Everything you need to build a strategic professional network</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="group p-6 rounded-2xl border border-gray-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-lg transition-all cursor-default">
                <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-[#1e1e2e] dark:to-[#1a1a2a]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>How It Works</h2>
            <p className="text-lg text-gray-600 dark:text-slate-400">Go from sign-up to first outreach in under 10 minutes</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map(({ n, title, desc }, i) => (
              <div key={n} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-indigo-200 dark:bg-indigo-800 z-0" />
                )}
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {n}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Users */}
      <section className="py-20 bg-white dark:bg-[#0f0f23]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-slate-100 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Built for Ambitious Professionals</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {personas.map(({ emoji, title, desc }) => (
              <div key={title} className="text-center p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800">
                <div className="text-5xl mb-4">{emoji}</div>
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg mb-3">{title}</h3>
                <p className="text-gray-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Highlights */}
      <section className="py-16 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Powered by Advanced AI</h2>
            <p className="text-slate-400">Enterprise-grade technology built for everyone</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'Large Language Models', desc: 'GPT-4 powered message generation and contact analysis' },
              { icon: Network, title: 'Graph Neural Networks', desc: 'Advanced algorithms for relationship strength scoring' },
              { icon: Shield, title: 'Enterprise Security', desc: 'SOC 2 compliant, end-to-end encrypted, GDPR ready' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/10 border border-white/10 rounded-2xl p-6">
                <Icon className="w-10 h-10 text-indigo-400 mb-4" />
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm px-4 py-2 rounded-full">
            <Globe className="w-4 h-4" />
            Built for students, founders, researchers, and operators
          </div>
          <h2 className="text-5xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Ready to transform your network?</h2>
          <p className="text-indigo-200 text-lg">Start building meaningful professional relationships today. Free forever—no credit card required.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-white/20 transition-all">
              <ChevronRight className="w-4 h-4" />
              View Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>ConnectSphere</span>
              </div>
              <p className="text-sm leading-relaxed">AI-powered relationship intelligence for ambitious professionals.</p>
            </div>
            {[
              { title: 'Product', links: [{ label: 'Features', to: '/#features' }, { label: 'Pricing', to: '/pricing' }, { label: 'Security', to: '/about' }, { label: 'Changelog', to: '#' }] },
              { title: 'Company', links: [{ label: 'About', to: '/about' }, { label: 'Blog', to: '#' }, { label: 'Careers', to: '#' }, { label: 'Press', to: '#' }] },
              { title: 'Support', links: [{ label: 'How It Works', to: '/how-it-works' }, { label: 'Help Center', to: '/help' }, { label: 'Contact', to: '#' }, { label: 'Privacy Policy', to: '#' }] },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="text-white font-medium mb-4">{title}</h4>
                <ul className="space-y-2">
                  {links.map(({ label, to }) => (
                    <li key={label}>
                      {to.startsWith('/') && !to.startsWith('/#') ? (
                        <Link to={to} className="text-sm hover:text-white transition-colors">{label}</Link>
                      ) : (
                        <a href={to} className="text-sm hover:text-white transition-colors">{label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-800 pt-6 text-sm text-center">
            © 2025 ConnectSphere. All rights reserved. Built with ❤️ for professionals everywhere.
          </div>
        </div>
      </footer>
    </div>
  );
}
