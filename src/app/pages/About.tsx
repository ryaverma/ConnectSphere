import { Link } from 'react-router';
import { Zap, ArrowRight, Linkedin, Github, Twitter, Heart } from 'lucide-react';
import LandingNavbar from '../components/layout/LandingNavbar';

const team = [
  { name: 'Aisha Thompson', role: 'Co-Founder & CEO', initials: 'AT', color: 'bg-indigo-500', bio: 'Former Head of Growth at LinkedIn. Built 0→1 user growth systems reaching 50M+ users. Stanford MBA.', linkedin: '#', twitter: '#' },
  { name: 'Marcus Chen', role: 'Co-Founder & CTO', initials: 'MC', color: 'bg-blue-500', bio: 'Ex-Google Research, built graph ML systems at scale. PhD in Computer Science from MIT. Open source contributor.', linkedin: '#', github: '#' },
  { name: 'Priya Nair', role: 'Head of AI/ML', initials: 'PN', color: 'bg-purple-500', bio: 'Previously at Anthropic and OpenAI. Specializes in LLMs and personalization at scale. Published 12 papers.', linkedin: '#', twitter: '#' },
  { name: 'James Wright', role: 'Head of Product', initials: 'JW', color: 'bg-teal-500', bio: 'Former PM at Notion and Figma. Passionate about tools that amplify human potential. Y Combinator alumni.', linkedin: '#', twitter: '#' },
  { name: 'Elena Park', role: 'Head of Design', initials: 'EP', color: 'bg-pink-500', bio: 'Previously design lead at Stripe and Linear. Loves building interfaces that feel inevitable once you see them.', linkedin: '#', twitter: '#' },
  { name: 'Zara Hassan', role: 'Head of Growth', initials: 'ZH', color: 'bg-orange-500', bio: 'Built growth at Calendly and HubSpot. Expert in PLG and community-led growth for B2B SaaS products.', linkedin: '#', twitter: '#' },
];

const values = [
  { emoji: '🎯', title: 'Authentic Relationships First', desc: 'We believe meaningful professional relationships can\'t be gamed. Every feature we build prioritizes genuine connection over mass outreach.' },
  { emoji: '🔬', title: 'AI that Amplifies Humans', desc: 'Our AI is a copilot, not an autopilot. We generate drafts, surface insights, and remove friction—but humans stay in control of every send.' },
  { emoji: '🔒', title: 'Privacy by Design', desc: 'Your network is one of your most valuable personal assets. We treat your data with the same respect we\'d want for our own.' },
  { emoji: '🌍', title: 'Equal Access to Networks', desc: 'Your career shouldn\'t be determined by who you already know. We\'re building tools that help everyone—not just the already-connected—unlock opportunity.' },
  { emoji: '📐', title: 'Radical Transparency', desc: 'No black-box algorithms. We explain why we recommend each contact, what factors influenced your score, and how we process your data.' },
  { emoji: '🚀', title: 'Move Fast, Iterate Often', desc: 'We ship weekly, listen relentlessly, and aren\'t afraid to change our minds. The best product is the one users actually love using.' },
];

const milestones = [
  { year: '2022', event: 'Founded in San Francisco. Raised $2.5M pre-seed from angels and YC.' },
  { year: '2023 Q1', event: 'Launched private beta with 500 users. 47% average response rate achieved.' },
  { year: '2023 Q3', event: 'Series A: $12M led by Sequoia. Crossed 5,000 active users.' },
  { year: '2024 Q1', event: 'Launched Enterprise tier. First 50 companies onboarded.' },
  { year: '2024 Q4', event: 'Crossed 10,000 active professionals. 2.4M connections analyzed.' },
  { year: '2025', event: 'Global expansion: EU data center launched. GDPR certification complete.' },
];

const stats = [
  { value: '10K+', label: 'Active users', desc: 'Professionals building smarter networks' },
  { value: '2.4M', label: 'Connections analyzed', desc: 'Relationships mapped and scored' },
  { value: '47%', label: 'Avg response rate', desc: 'vs. 8% industry average' },
  { value: '$12M', label: 'Series A raised', desc: 'Backed by Sequoia & angels' },
];

const investors = [
  { name: 'Sequoia Capital', initials: 'SC', color: 'bg-red-100 text-red-700' },
  { name: 'Y Combinator', initials: 'YC', color: 'bg-orange-100 text-orange-700' },
  { name: 'First Round', initials: 'FR', color: 'bg-blue-100 text-blue-700' },
  { name: 'Andreessen Horowitz', initials: 'a16z', color: 'bg-purple-100 text-purple-700' },
];

const press = [
  { outlet: 'TechCrunch', quote: '"The most thoughtful AI networking tool we\'ve seen."' },
  { outlet: 'Forbes', quote: '"ConnectSphere is redefining what a professional network means."' },
  { outlet: 'Product Hunt', quote: '"#1 Product of the Day — deeply impressive execution."' },
  { outlet: 'Fast Company', quote: '"Finally an AI tool that helps you build real relationships."' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f23]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LandingNavbar />

      {/* Hero */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm px-4 py-2 rounded-full mb-6">
            <Heart className="w-4 h-4 fill-current" />
            Built with purpose
          </div>
          <h1 className="text-5xl font-bold mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>
            We're on a mission to make<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400">
              opportunity accessible to all
            </span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            ConnectSphere was born from a simple belief: your career shouldn't be limited by who you happened to grow up next to. We're building AI tools that help every professional unlock the full potential of their network—regardless of their starting point.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-gradient-to-r from-indigo-600 to-blue-600">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-white text-center">
          {stats.map(({ value, label, desc }) => (
            <div key={label}>
              <div className="text-4xl font-bold mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</div>
              <div className="text-sm font-medium mb-0.5">{label}</div>
              <div className="text-xs text-indigo-200">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-white dark:bg-[#0f0f23]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-5" style={{ fontFamily: 'Poppins, sans-serif' }}>Our Story</h2>
              <div className="space-y-4 text-gray-600 dark:text-slate-400 leading-relaxed text-sm">
                <p>
                  ConnectSphere started in 2022 when our co-founders Aisha and Marcus were both job hunting at the same time. Aisha had thousands of LinkedIn connections but no idea which ones could actually help. Marcus was brilliant but introverted and hated cold outreach.
                </p>
                <p>
                  They realized the problem wasn't a lack of connections—it was a lack of intelligence about those connections. Who should you reach out to? What should you say? When is the right moment? These questions paralyzed most people into inaction.
                </p>
                <p>
                  With Marcus's background in graph ML from Google Research and Aisha's experience building growth systems at LinkedIn, they had exactly the right tools to solve it. ConnectSphere was accepted into Y Combinator S22, raised a pre-seed from angels, and launched to 500 beta users.
                </p>
                <p>
                  Today, we're a team of 18 passionate people helping 10,000+ professionals build the networks of their dreams—not just the networks of their circumstance.
                </p>
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 border border-blue-100 dark:border-blue-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-5">Company Timeline</h3>
              <div className="space-y-5">
                {milestones.map(({ year, event }) => (
                  <div key={year} className="flex gap-4">
                    <div className="w-20 shrink-0">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 rounded-full whitespace-nowrap">{year}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-gray-50 dark:bg-[#1e1e2e]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>What We Believe</h2>
            <p className="text-gray-600 dark:text-slate-400">The principles that guide every decision we make</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(({ emoji, title, desc }) => (
              <div key={title} className="bg-white dark:bg-[#303134] rounded-lg p-6 border border-[#e6e6e6] dark:border-[#3c4043] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.35)] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-all duration-200">
                <span className="text-3xl mb-3 block">{emoji}</span>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white dark:bg-[#0f0f23]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Meet the Team</h2>
            <p className="text-gray-600 dark:text-slate-400">18 people passionate about the future of professional networking</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map(({ name, role, initials, color, bio, linkedin, github, twitter }) => (
              <div key={name} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-6 hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] transition-all duration-200 group">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-full ${color} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">{name}</h3>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400">{role}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-4">{bio}</p>
                <div className="flex gap-2">
                  {linkedin && (
                    <a href={linkedin} className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  )}
                  {github && (
                    <a href={github} className="p-1.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                  {twitter && (
                    <a href={twitter} className="p-1.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 border border-blue-100 dark:border-blue-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-2">We're Hiring!</h3>
            <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mb-4">We're looking for engineers, designers, and growth practitioners who want to reshape professional networking.</p>
            <button className="inline-flex items-center gap-2 bg-[#0a66c2] hover:bg-[#004182] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              View Open Roles <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Investors */}
      <section className="py-16 bg-gray-50 dark:bg-[#1e1e2e]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Backed by the Best</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm">Trusted by world-class investors who believe in our mission</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {investors.map(({ name, initials, color }) => (
              <div key={name} className="flex items-center gap-3 bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] px-6 py-4 hover:shadow-sm transition-shadow">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center font-bold text-sm`}>{initials}</div>
                <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press */}
      <section className="py-16 bg-white dark:bg-[#0f0f23]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>In the Press</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {press.map(({ outlet, quote }) => (
              <div key={outlet} className="bg-gray-50 dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5 hover:border-[#c6c6c6] dark:hover:border-[#5f6368] transition-colors">
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-2">{outlet}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400 italic leading-relaxed">{quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-[#1e1e2e] dark:to-[#1a1a2a]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>Get in Touch</h2>
          <p className="text-gray-600 dark:text-slate-400 mb-8">Whether you're a user, journalist, investor, or potential team member—we'd love to hear from you.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: '💌', title: 'General Inquiries', contact: 'hello@connectsphere.ai' },
              { icon: '📰', title: 'Press & Media', contact: 'press@connectsphere.ai' },
              { icon: '💼', title: 'Partnerships', contact: 'partners@connectsphere.ai' },
            ].map(({ icon, title, contact }) => (
              <div key={title} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-6 text-center hover:shadow-sm transition-shadow">
                <span className="text-3xl mb-3 block">{icon}</span>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm mb-1">{title}</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">{contact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <h2 className="text-4xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Join our community</h2>
          <p className="text-indigo-200 text-lg">10,000+ professionals are already building smarter networks. Start yours today.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white px-8 py-3.5 rounded-xl font-medium hover:bg-white/20 transition-all">
              View Pricing
            </Link>
          </div>
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
            <Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link to="/signin" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p className="text-sm">© 2025 ConnectSphere. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}