import { Link } from 'react-router';
import {
  Upload, Target, MessageSquare, BarChart3, ArrowRight, Check,
  Linkedin, Github, Mail, FileText, Zap, Brain, Network, Shield,
  ChevronRight, Play
} from 'lucide-react';
import LandingNavbar from '../components/layout/LandingNavbar';

const steps = [
  {
    n: '01',
    title: 'Import Your Network',
    subtitle: 'Connect your existing network in minutes',
    icon: Upload,
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    desc: 'Start by bringing in your existing contacts. ConnectSphere integrates with LinkedIn, GitHub, and Gmail to pull in your connections automatically—or you can upload a CSV file. Our AI instantly analyzes each contact, extracting skills, interests, education, and professional context.',
    details: [
      'LinkedIn connections & profile data',
      'GitHub followers & contributors',
      'Gmail contacts & interaction history',
      'CSV upload for any other source',
    ],
    sources: [
      { icon: Linkedin, label: 'LinkedIn', color: 'bg-blue-100 text-blue-700' },
      { icon: Github, label: 'GitHub', color: 'bg-gray-100 text-gray-700' },
      { icon: Mail, label: 'Gmail', color: 'bg-red-100 text-red-700' },
      { icon: FileText, label: 'CSV File', color: 'bg-green-100 text-green-700' },
    ],
  },
  {
    n: '02',
    title: 'Define Your Goals',
    subtitle: 'Tell the AI what you\'re trying to achieve',
    icon: Target,
    color: 'from-orange-500 to-pink-600',
    bg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    desc: 'Every networking strategy is different. Tell ConnectSphere what you\'re looking for—whether that\'s a new job, mentors, investors, collaborators, or clients. Our AI uses your goals to assign match scores to every contact and surfaces the ones most likely to help you succeed.',
    details: [
      'Job search & career transitions',
      'Finding mentors & advisors',
      'Fundraising & investor outreach',
      'Business development & sales',
    ],
    goals: [
      { emoji: '🎯', label: 'Job opportunities' },
      { emoji: '🧑‍🏫', label: 'Find mentors' },
      { emoji: '💰', label: 'Raise funding' },
      { emoji: '🤝', label: 'Build partnerships' },
      { emoji: '🔬', label: 'Research collaborations' },
      { emoji: '👥', label: 'Grow your team' },
    ],
  },
  {
    n: '03',
    title: 'Review AI Opportunities',
    subtitle: 'Get ranked matches with personalized insights',
    icon: Brain,
    color: 'from-purple-500 to-indigo-600',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    desc: 'ConnectSphere analyzes every contact against your goals and generates a ranked opportunity list. Each card shows a match score, mutual connections, shared interests, and an AI-crafted conversation starter. You can filter by company, skill, location, or strength score.',
    details: [
      'AI-generated match scores (0–100%)',
      'Mutual connection analysis',
      'Conversation starter suggestions',
      'Best time to reach out insights',
    ],
    scoreColors: [
      { range: '90–100%', label: 'Perfect match', color: 'bg-green-500' },
      { range: '70–89%', label: 'Great match', color: 'bg-teal-500' },
      { range: '50–69%', label: 'Good match', color: 'bg-yellow-500' },
      { range: '<50%', label: 'Worth exploring', color: 'bg-gray-400' },
    ],
  },
  {
    n: '04',
    title: 'Send & Track Outreach',
    subtitle: 'Launch campaigns and monitor results',
    icon: MessageSquare,
    color: 'from-teal-500 to-green-600',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    desc: 'Create campaigns targeting your top contacts. ConnectSphere generates fully personalized messages for each person—referencing their work, shared connections, and interests. Review, edit, and send directly from the platform. Track opens, replies, and meetings in real time.',
    details: [
      'AI-generated personalized messages',
      'Multi-tone options (professional, friendly, direct)',
      'Automated follow-up sequences',
      'Real-time open & reply tracking',
    ],
    metrics: [
      { label: 'Avg response rate', value: '47%', color: 'text-green-600' },
      { label: 'Avg time to reply', value: '2.3 days', color: 'text-blue-600' },
      { label: 'Meeting conversion', value: '14%', color: 'text-purple-600' },
      { label: 'Better than cold email', value: '3.2×', color: 'text-orange-600' },
    ],
  },
];

const faqs = [
  {
    q: 'How long does onboarding take?',
    a: 'Most users are up and running in under 10 minutes. The LinkedIn import takes about 2 minutes, and AI analysis of your network is complete within another few minutes.',
  },
  {
    q: 'Does ConnectSphere send messages automatically?',
    a: 'Not without your approval. By default, "Review before sending" is enabled. You see every message before it goes out, can edit it, or regenerate a different version. Automation is always opt-in.',
  },
  {
    q: 'How does the AI know what to write?',
    a: 'The AI uses context from both your profile and the contact\'s profile—their work history, skills, mutual connections, interests, and your stated goals. It generates unique messages for each person, not templates.',
  },
  {
    q: 'Is my contact data private?',
    a: 'Yes. Your data is encrypted at rest and in transit. We never share your contacts with third parties, and you can export or delete everything at any time. ConnectSphere is GDPR and CCPA compliant.',
  },
  {
    q: 'Can I use ConnectSphere for sales outreach?',
    a: 'ConnectSphere is designed for professional relationship building, which includes business development. However, we recommend using it for genuine relationship-first outreach rather than mass cold prospecting.',
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f23]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LandingNavbar />

      {/* Hero */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            Simple, powerful, and fast
          </div>
          <h1 className="text-5xl font-bold mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>
            How ConnectSphere Works
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed">
            Go from scattered connections to a strategic, AI-powered networking engine in four simple steps.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white px-8 py-3.5 rounded-xl font-medium transition-all shadow-lg hover:scale-105">
              Start for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-white/20 transition-all">
              <Play className="w-4 h-4" /> See Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Overview */}
      <section className="py-12 bg-gradient-to-r from-indigo-600 to-blue-600">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
            {['Import Network', 'Set Goals', 'Review Matches', 'Send & Track'].map((label, i) => (
              <div key={label} className="flex items-center gap-3 justify-center">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <span className="text-sm font-medium">{label}</span>
                {i < 3 && <ChevronRight className="w-4 h-4 text-indigo-300 hidden md:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Steps */}
      <section className="py-20 bg-white dark:bg-[#0f0f23]">
        <div className="max-w-5xl mx-auto px-4 space-y-24">
          {steps.map(({ n, title, subtitle, icon: Icon, color, bg, iconColor, desc, details, sources, goals, scoreColors, metrics }, idx) => (
            <div key={n} className={`grid lg:grid-cols-2 gap-12 items-center ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              {/* Text */}
              <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                <div className={`inline-flex items-center gap-2 ${bg} ${iconColor} text-sm px-3 py-1.5 rounded-full mb-4`}>
                  <Icon className="w-4 h-4" />
                  Step {n}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>{title}</h2>
                <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-4">{subtitle}</p>
                <p className="text-gray-600 dark:text-slate-400 leading-relaxed mb-6">{desc}</p>
                <ul className="space-y-2">
                  {details.map(d => (
                    <li key={d} className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-slate-300">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual card */}
              <div className={`${idx % 2 === 1 ? 'lg:order-1' : ''} bg-gray-50 dark:bg-[#303134] rounded-lg p-8 border border-[#e6e6e6] dark:border-[#3c4043] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]`}>
                {/* Step 1: Sources */}
                {sources && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Import from</p>
                    <div className="grid grid-cols-2 gap-3">
                      {sources.map(({ icon: SIcon, label, color: c }) => (
                        <div key={label} className={`flex items-center gap-3 ${c} rounded-xl p-4`}>
                          <SIcon className="w-5 h-5 shrink-0" />
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 bg-white dark:bg-[#1a1a2a] rounded-xl p-4 border border-gray-200 dark:border-[#3c4043]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Import Progress</span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Complete</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-r from-indigo-500 to-teal-500 rounded-full" />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">215 contacts imported and analyzed</p>
                    </div>
                  </div>
                )}

                {/* Step 2: Goals */}
                {goals && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Select your goal</p>
                    <div className="grid grid-cols-2 gap-2">
                      {goals.map(({ emoji, label }) => (
                        <div key={label} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm cursor-pointer transition-all ${label === 'Find mentors' ? 'border-[#0a66c2] bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-[#e6e6e6] dark:border-[#3c4043] bg-white dark:bg-[#202124] text-gray-700 dark:text-[#9aa0a6]'}`}>
                          <span>{emoji}</span>
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Score colors */}
                {scoreColors && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Match score legend</p>
                    <div className="space-y-3">
                      {scoreColors.map(({ range, label, color: c }) => (
                        <div key={range} className="flex items-center gap-3">
                          <div className={`w-10 h-3 rounded-full ${c} shrink-0`} />
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 w-20">{range}</span>
                          <span className="text-sm text-gray-500 dark:text-slate-400">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 bg-white dark:bg-[#202124] rounded-lg p-4 border border-[#e6e6e6] dark:border-[#3c4043] space-y-3">
                      {[{ name: 'Sarah Chen', score: 94, company: 'Google' }, { name: 'Marcus J.', score: 87, company: 'Meta' }, { name: 'Priya Patel', score: 79, company: 'OpenAI' }].map(({ name, score, company }) => (
                        <div key={name} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">{name}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{company}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${score >= 90 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : score >= 80 ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'}`}>{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Metrics */}
                {metrics && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">ConnectSphere results</p>
                    <div className="grid grid-cols-2 gap-3">
                      {metrics.map(({ label, value, color: c }) => (
                        <div key={label} className="bg-white dark:bg-[#1a1a2a] rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
                          <p className={`text-2xl font-bold ${c}`}>{value}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 bg-gradient-to-r from-indigo-50 to-teal-50 dark:from-indigo-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800 text-sm text-indigo-800 dark:text-indigo-300">
                      <strong>Campaign: Google ML Outreach</strong><br />
                      <span className="text-xs text-indigo-600 dark:text-indigo-400">8 contacts · 47% response rate · 2 meetings booked</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-16 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>The Technology Behind ConnectSphere</h2>
          <p className="text-slate-400 mb-10">Enterprise-grade AI built for everyday professionals</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'GPT-4 Powered Writing', desc: 'Large language models generate unique, contextual messages for each contact—not fill-in-the-blank templates.' },
              { icon: Network, title: 'Graph Neural Networks', desc: 'We model your entire network as a graph to calculate relationship strengths, cluster patterns, and hidden connections.' },
              { icon: Shield, title: 'Zero Data Selling', desc: 'Your contacts are your data. We never sell, share, or train on your personal network. SOC 2 Type II certified.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/10 border border-white/10 rounded-2xl p-6 text-left">
                <Icon className="w-8 h-8 text-indigo-400 mb-4" />
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-gray-50 dark:bg-[#1e1e2e]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Common Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map(({ q, a }) => (
              <div key={q} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-6">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{q}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <h2 className="text-4xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Ready to get started?</h2>
          <p className="text-indigo-200 text-lg">Join 10,000+ professionals building smarter networks today.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-white/20 transition-all">
              View Pricing
            </Link>
          </div>
          <p className="text-indigo-300 text-sm">No credit card required · Free forever plan available</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>ConnectSphere</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <Link to="/signin" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p className="text-sm">© 2025 ConnectSphere. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}