/**
 * ConnectSphere Mobile Bottom Navigation
 * Fixed bottom bar for mobile/tablet (hidden on lg+).
 * 4 primary routes + a "More" sheet for secondary routes.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, Users, Megaphone, Calendar,
  MoreHorizontal, BarChart3, Network, Bell, Settings, HelpCircle, Search, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../ui/utils';
import { useApp } from '../../contexts/AppContext';

const primary = [
  { path: '/dashboard',  label: 'Home',      icon: LayoutDashboard },
  { path: '/contacts',   label: 'Contacts',  icon: Users },
  { path: '/campaigns',  label: 'Campaigns', icon: Megaphone },
  { path: '/events',     label: 'Events',    icon: Calendar },
];

const secondary = [
  { path: '/analytics',     label: 'Analytics',    icon: BarChart3 },
  { path: '/network-graph', label: 'Network Graph', icon: Network },
  { path: '/search',        label: 'Search',       icon: Search },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/settings',      label: 'Settings',     icon: Settings },
  { path: '/help',          label: 'Help',         icon: HelpCircle },
];

export default function MobileNav() {
  const location = useLocation();
  const { unreadCount } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      {/* Backdrop for "More" sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* "More" Bottom Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed bottom-16 left-0 right-0 z-50 bg-white dark:bg-[#303134] rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] border-t border-[#e6e6e6] dark:border-[#3c4043] px-4 pt-5 pb-6 lg:hidden"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-[#5f6368] rounded-full mx-auto mb-5" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-900 dark:text-[#e8eaed]">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 dark:text-[#71767a] hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {secondary.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                const showBadge = path === '/notifications' && unreadCount > 0;
                return (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200',
                      active
                        ? 'bg-[#0a66c2]/10 dark:bg-[#8ab4f8]/10 text-[#0a66c2] dark:text-[#8ab4f8]'
                        : 'text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043]'
                    )}
                  >
                    <div className="relative">
                      <Icon className="w-6 h-6" />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium leading-tight text-center">{label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#202124] border-t border-[#e6e6e6] dark:border-[#3c4043] flex items-stretch lg:hidden safe-area-inset-bottom shadow-[0_-1px_6px_rgba(0,0,0,0.06)] dark:shadow-[0_-1px_6px_rgba(0,0,0,0.3)]">
        {primary.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative transition-colors duration-200',
                active
                  ? 'text-[#0a66c2] dark:text-[#8ab4f8]'
                  : 'text-gray-500 dark:text-[#71767a]'
              )}
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#0a66c2] dark:bg-[#8ab4f8]"
                />
              )}
              <Icon className={cn('w-5 h-5 transition-transform duration-200', active && 'scale-110')} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative transition-colors duration-200',
            moreOpen ? 'text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-500 dark:text-[#71767a]'
          )}
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </nav>
    </>
  );
}
