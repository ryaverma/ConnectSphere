import { useState } from 'react';
import { Link } from 'react-router';
import { Check, X, Zap, ArrowRight, Star, HelpCircle } from 'lucide-react';
import LandingNavbar from '../components/layout/LandingNavbar';
import { toast } from 'sonner';

const plans = [
  {
    name: 'Free',
    tagline: 'Perfect for getting started',
    monthly: 0,
    annual: 0,
    color: 'border-gray-200',
    badge: null,
    cta: 'Get Started Free',
    ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    features: [
      { label: 'Up to 500 contacts', included: true },
      { label: '5 active campaigns', included: true },
      { label: '10 AI messages / month', included: true },
      { label: 'Basic network analytics', included: true },
      { label: 'LinkedIn import', included: true },
      { label: 'CSV import', included: true },
      { label: 'Network graph visualization', included: true },
      { label: 'Advanced analytics', included: false },
      { label: 'Unlimited AI messages', included: false },
      { label: 'Automated follow-up sequences', included: false },
      { label: 'GitHub & Gmail sync', included: false },
      { label: 'Priority support', included: false },
    ],
  },
  {
    name: 'Pro',
    tagline: 'For serious networkers',
    monthly: 29,
    annual: 19,
    color: 'border-indigo-500',
    badge: 'Most Popular',
    cta: 'Start Pro Trial',
    ctaStyle: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-lg hover:scale-[1.02]',
    features: [
      { label: 'Unlimited contacts', included: true },
      { label: 'Unlimited campaigns', included: true },
      { label: 'Unlimited AI messages', included: true },
      { label: 'Advanced analytics & insights', included: true },
      { label: 'LinkedIn, GitHub & Gmail import', included: true },
      { label: 'CSV import', included: true },
      { label: 'Network graph visualization', included: true },
      { label: 'Automated follow-up sequences', included: true },
      { label: 'GitHub & Gmail sync', included: true },
      { label: 'Priority email support', included: true },
      { label: 'Custom message tone settings', included: true },
      { label: 'Export contacts & reports', included: true },
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'For teams & organizations',
    monthly: null,
    annual: null,
    color: 'border-gray-200',
    badge: null,
    cta: 'Contact Sales',
    ctaStyle: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Team accounts & collaboration', included: true },
      { label: 'SSO / SAML authentication', included: true },
      { label: 'Custom integrations & API', included: true },
      { label: 'Dedicated account manager', included: true },
      { label: 'Custom AI model fine-tuning', included: true },
      { label: 'SLA & uptime guarantee', included: true },
      { label: 'Advanced security controls', included: true },
      { label: 'Audit logs & compliance', included: true },
      { label: 'Custom reporting', included: true },
      { label: 'On-premise deployment option', included: true },
      { label: '24/7 dedicated support', included: true },
    ],
  },
];

const comparisons = [
  { feature: 'Contacts', free: '500', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Campaigns', free: '5', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'AI messages / month', free: '10', pro: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Network graph', free: true, pro: true, enterprise: true },
  { feature: 'Basic analytics', free: true, pro: true, enterprise: true },
  { feature: 'Advanced analytics', free: false, pro: true, enterprise: true },
  { feature: 'Automated follow-ups', free: false, pro: true, enterprise: true },
  { feature: 'GitHub & Gmail sync', free: false, pro: true, enterprise: true },
  { feature: 'Team collaboration', free: false, pro: false, enterprise: true },
  { feature: 'SSO / SAML', free: false, pro: false, enterprise: true },
  { feature: 'Dedicated support', free: false, pro: false, enterprise: true },
  { feature: 'Custom API', free: false, pro: false, enterprise: true },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'ML Engineer → Google', text: 'Pro paid for itself in the first week. I booked 3 coffee chats with Googlers I\'d never have found on my own.', rating: 5 },
  { name: 'Marcus Johnson', role: 'Product Manager, Meta', text: 'The unlimited AI messages on Pro are worth it alone. I\'d been manually writing every outreach—now I send 10× more.', rating: 5 },
  { name: 'Elena Rodriguez', role: 'Founder, TechVentures', text: 'We got Enterprise for our recruiting team. The ROI is insane compared to LinkedIn Recruiter.', rating: 5 },
];

const faqs = [
  { q: 'Can I switch plans anytime?', a: 'Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades take effect at the end of your billing period.' },
  { q: 'Is there a free trial for Pro?', a: 'Yes—Pro comes with a 14-day free trial. No credit card required. You\'ll be prompted to add payment details only when the trial ends.' },
  { q: 'What happens to my data if I downgrade?', a: 'Your contacts and history are always yours. If you exceed Free tier limits after downgrading, your oldest contacts are archived (not deleted) until you\'re within limits.' },
  { q: 'Do you offer discounts for students or nonprofits?', a: 'Yes! Students with a valid .edu email get Pro for $9/month. Nonprofits get 50% off any plan. Contact us to verify eligibility.' },
  { q: 'How does annual billing work?', a: 'Annual billing is charged once per year at the reduced rate shown. You save ~34% compared to monthly billing.' },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'boolean') {
    return value ? (
      <div className="flex justify-center"><Check className="w-5 h-5 text-green-500" /></div>
    ) : (
      <div className="flex justify-center"><X className="w-4 h-4 text-gray-300 dark:text-slate-600" /></div>
    );
  }
  return <div className="text-center text-sm font-medium text-gray-900 dark:text-slate-100">{value}</div>;
}

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f0f23]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <LandingNavbar />

      {/* Hero */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-300 text-sm px-4 py-2 rounded-full mb-6">
            <Zap className="w-4 h-4" />
            Free forever plan available
          </div>
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-slate-300 mb-8">
            Start free. Upgrade when you're ready. No hidden fees, no surprises.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${!annual ? 'bg-white text-gray-900' : 'text-slate-300 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-white text-gray-900' : 'text-slate-300 hover:text-white'}`}
            >
              Annual
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Save 34%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 bg-gray-50 dark:bg-[#1e1e2e]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white dark:bg-[#303134] rounded-lg border-2 ${plan.color} p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] ${plan.badge ? 'shadow-lg ring-1 ring-[#0a66c2]/30 dark:ring-[#8ab4f8]/30' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-5">{plan.tagline}</p>
                  {plan.monthly !== null ? (
                    <div>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-slate-100">
                          ${annual ? plan.annual : plan.monthly}
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 text-sm mb-1.5">/mo</span>
                      </div>
                      {annual && plan.monthly! > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">Billed annually · ${plan.annual! * 12}/yr</p>
                      )}
                      {!annual && plan.monthly === 0 && (
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Free forever</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold text-gray-900 dark:text-slate-100">Custom</span>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Volume pricing available</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (plan.name === 'Enterprise') {
                      toast.success('Sales team notified! We\'ll reach out within 24h.');
                    } else if (plan.name === 'Free') {
                      window.location.href = '/signup';
                    } else {
                      toast.success('Starting your 14-day Pro trial...');
                    }
                  }}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all mb-6 ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </button>

                <ul className="space-y-3">
                  {plan.features.map(({ label, included }, i) => (
                    <li key={i} className={`flex items-start gap-2.5 text-sm ${included ? 'text-gray-700 dark:text-slate-300' : 'text-gray-400 dark:text-slate-500'}`}>
                      {included ? (
                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 dark:text-slate-600 shrink-0 mt-0.5" />
                      )}
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 bg-white dark:bg-[#0f0f23]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>Full Feature Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#3c4043] border-b border-[#e6e6e6] dark:border-[#3c4043]">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 dark:text-slate-100 w-1/2">Feature</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-gray-900 dark:text-slate-100">Free</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20">Pro</th>
                  <th className="text-center px-4 py-4 text-sm font-semibold text-gray-900 dark:text-slate-100">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map(({ feature, free, pro, enterprise }, i) => (
                  <tr key={feature} className={`border-b border-[#e6e6e6] dark:border-[#3c4043] ${i % 2 === 0 ? 'bg-white dark:bg-[#303134]' : 'bg-gray-50/50 dark:bg-[#3c4043]'}`}>
                    <td className="px-6 py-3.5 text-sm text-gray-700 dark:text-slate-300">{feature}</td>
                    <td className="px-4 py-3.5"><FeatureCell value={free} /></td>
                    <td className="px-4 py-3.5 bg-indigo-50/50 dark:bg-indigo-900/10"><FeatureCell value={pro} /></td>
                    <td className="px-4 py-3.5"><FeatureCell value={enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16 bg-gray-50 dark:bg-[#1e1e2e]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>What customers say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, text, rating }) => (
              <div key={name} className="bg-white dark:bg-[#303134] rounded-lg p-6 border border-[#e6e6e6] dark:border-[#3c4043] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed mb-4">"{text}"</p>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white dark:bg-[#0f0f23]">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <HelpCircle className="w-6 h-6 inline mr-2 text-indigo-500" />
              Pricing FAQs
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="bg-gray-50 dark:bg-[#303134] rounded-lg p-6 border border-[#e6e6e6] dark:border-[#3c4043]">
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{q}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Special offers */}
      <section className="py-12 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: '🎓', title: 'Student Discount', desc: 'Get Pro for $9/month with a valid .edu email address.', cta: 'Claim Student Deal' },
              { emoji: '❤️', title: 'Nonprofit Rate', desc: '50% off any plan for registered non-profit organizations.', cta: 'Apply for Discount' },
              { emoji: '👥', title: 'Team Plans', desc: 'Pricing for teams of 5+ starts at $19/seat/month.', cta: 'View Team Pricing' },
            ].map(({ emoji, title, desc, cta }) => (
              <div key={title} className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-6 text-center hover:shadow-md transition-shadow">
                <span className="text-4xl mb-3 block">{emoji}</span>
                <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{desc}</p>
                <button
                  onClick={() => toast.info(`${cta} - contact us!`)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                  {cta} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-blue-700 text-white text-center">
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <h2 className="text-4xl font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>Start free. Upgrade anytime.</h2>
          <p className="text-indigo-200 text-lg">No credit card required. Cancel anytime. 14-day Pro trial included.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="inline-flex items-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all">
              Get Started Free <ArrowRight className="w-4 h-4" />
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
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <Link to="/signin" className="hover:text-white transition-colors">Sign In</Link>
          </div>
          <p className="text-sm">© 2025 ConnectSphere. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}