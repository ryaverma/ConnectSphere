import { Outlet, useLocation, Link } from 'react-router';
import { Zap, Check } from 'lucide-react';

const steps = [
  { n: 1, label: 'Set Goals', path: '/onboarding/step-1' },
  { n: 2, label: 'Import Contacts', path: '/onboarding/step-2' },
  { n: 3, label: 'Your Profile', path: '/onboarding/step-3' },
  { n: 4, label: 'Preferences', path: '/onboarding/step-4' },
];

export default function OnboardingLayout() {
  const location = useLocation();
  const currentStep = Math.max(1, steps.findIndex(s => s.path === location.pathname) + 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#202124]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header className="bg-white dark:bg-[#303134] border-b border-[#e6e6e6] dark:border-[#3c4043] px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0a66c2] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-[#e8eaed]">ConnectSphere</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Progress Steps */}
          <div className="hidden sm:flex items-center gap-2">
            {steps.map((step, i) => {
              const done = step.n < currentStep;
              const active = step.n === currentStep;
              return (
                <div key={step.n} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    done ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : active ? 'bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8]' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-400 dark:text-[#71767a]'
                  }`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                      done ? 'bg-green-600 text-white' : active ? 'bg-[#0a66c2] text-white' : 'bg-gray-300 dark:bg-[#5f6368] text-white'
                    }`}>
                      {done ? <Check className="w-2.5 h-2.5" /> : step.n}
                    </div>
                    <span className="hidden md:block">{step.label}</span>
                  </div>
                  {i < steps.length - 1 && <div className="w-6 h-px bg-[#e6e6e6] dark:bg-[#3c4043]" />}
                </div>
              );
            })}
          </div>
          <span className="sm:hidden text-sm text-gray-500 dark:text-[#9aa0a6]">Step {currentStep} of {steps.length}</span>
        </div>

        <Link to="/dashboard" className="text-sm text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed] transition-colors">Skip setup</Link>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-[#e6e6e6] dark:bg-[#3c4043]">
        <div
          className="h-full bg-[#0a66c2] transition-all duration-500"
          style={{ width: `${(currentStep / steps.length) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <Outlet />
      </div>
    </div>
  );
}