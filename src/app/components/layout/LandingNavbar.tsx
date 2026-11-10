import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Zap, Menu, X } from 'lucide-react';
import { cn } from '../ui/utils';

const navLinks = [
  { label: 'Features', to: '/#features', isAnchor: true },
  { label: 'How It Works', to: '/how-it-works', isAnchor: false },
  { label: 'Pricing', to: '/pricing', isAnchor: false },
  { label: 'About', to: '/about', isAnchor: false },
];

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#202124]/95 backdrop-blur-sm border-b border-[#e6e6e6] dark:border-[#3c4043]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0a66c2] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 dark:text-[#e8eaed]" style={{ fontFamily: 'Poppins, sans-serif' }}>ConnectSphere</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, to, isAnchor }) =>
            isAnchor ? (
              <a key={label} href={to} className="text-sm text-gray-600 dark:text-[#9aa0a6] hover:text-gray-900 dark:hover:text-[#e8eaed] transition-colors">{label}</a>
            ) : (
              <Link
                key={label}
                to={to}
                className={cn(
                  'text-sm transition-colors',
                  location.pathname === to ? 'text-[#0a66c2] dark:text-[#8ab4f8] font-medium' : 'text-gray-600 dark:text-[#9aa0a6] hover:text-gray-900 dark:hover:text-[#e8eaed]'
                )}
              >
                {label}
              </Link>
            )
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/signin" className="text-sm text-gray-700 dark:text-[#9aa0a6] hover:text-gray-900 dark:hover:text-[#e8eaed] px-4 py-2 transition-colors">Sign In</Link>
          <Link to="/signup" className="text-sm bg-[#0a66c2] hover:bg-[#004182] text-white px-5 py-2 rounded-lg transition-colors duration-200">Get Started Free</Link>
        </div>

        <button className="md:hidden p-2 text-gray-600 dark:text-[#9aa0a6]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#202124] border-t border-[#e6e6e6] dark:border-[#3c4043] px-4 py-4 space-y-1">
          {navLinks.map(({ label, to, isAnchor }) =>
            isAnchor ? (
              <a key={label} href={to} className="block text-sm text-gray-700 dark:text-[#9aa0a6] py-2.5 border-b border-[#e6e6e6] dark:border-[#3c4043]" onClick={() => setMobileMenuOpen(false)}>{label}</a>
            ) : (
              <Link key={label} to={to} className="block text-sm text-gray-700 dark:text-[#9aa0a6] py-2.5 border-b border-[#e6e6e6] dark:border-[#3c4043]" onClick={() => setMobileMenuOpen(false)}>{label}</Link>
            )
          )}
          <div className="pt-3 space-y-2">
            <Link to="/signin" className="block text-sm text-gray-700 dark:text-[#9aa0a6] py-2 text-center border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg dark:hover:bg-[#292a2d] transition-colors">Sign In</Link>
            <Link to="/signup" className="block text-sm bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2 rounded-lg text-center transition-colors duration-200">Get Started Free</Link>
          </div>
        </div>
      )}
    </nav>
  );
}