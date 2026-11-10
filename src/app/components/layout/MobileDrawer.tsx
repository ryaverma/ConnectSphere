/**
 * ConnectSphere Mobile Sidebar Drawer
 * Slide-in drawer with full sidebar content for mobile.
 */

import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, Users, Megaphone, Calendar, BarChart3, Network,
  Settings, HelpCircle, X, Zap, Search, Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../ui/utils';

const navItems = [
  { path: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { path: '/contacts',      label: 'Contacts',      icon: Users },
  { path: '/campaigns',     label: 'Campaigns',     icon: Megaphone },
  { path: '/events',        label: 'Events',        icon: Calendar },
  { path: '/analytics',     label: 'Analytics',     icon: BarChart3 },
  { path: '/network-graph', label: 'Network Graph', icon: Network },
  { path: '/search',        label: 'Search',        icon: Search },
  { path: '/notifications', label: 'Notifications', icon: Bell },
];

const bottomItems = [
  { path: '/settings', label: 'Settings',     icon: Settings },
  { path: '/help',     label: 'Help & Support', icon: HelpCircle },
];

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const location = useLocation();
  const { user, unreadCount } = useApp();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 38 }}
            className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-white dark:bg-[#202124] border-r border-[#e6e6e6] dark:border-[#3c4043] flex flex-col lg:hidden shadow-[4px_0_24px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-[#e6e6e6] dark:border-[#3c4043] flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0a66c2] flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 dark:text-[#e8eaed]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  ConnectSphere
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 dark:text-[#71767a] hover:bg-gray-100 dark:hover:bg-[#3c4043] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Strip */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e6e6e6] dark:border-[#3c4043]">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0',
                user?.avatarColor || 'bg-[#0a66c2]'
              )}>
                {user?.initials || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed] truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-[#9aa0a6] truncate">{user?.email}</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
              {navItems.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                const showBadge = path === '/notifications' && unreadCount > 0;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                      active
                        ? 'bg-[#0a66c2]/8 dark:bg-[#8ab4f8]/10 text-[#0a66c2] dark:text-[#8ab4f8]'
                        : 'text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-100 dark:hover:bg-[#3c4043] hover:text-gray-900 dark:hover:text-[#e8eaed]'
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#0a66c2] dark:bg-[#8ab4f8]" />
                    )}
                    <Icon className={cn('w-5 h-5 flex-shrink-0', active ? 'text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-400 dark:text-[#71767a]')} />
                    <span className="flex-1 truncate">{label}</span>
                    {showBadge && (
                      <span className="w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0a66c2] dark:bg-[#8ab4f8]" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom */}
            <div className="py-3 px-2 border-t border-[#e6e6e6] dark:border-[#3c4043] space-y-0.5">
              {bottomItems.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                      active
                        ? 'bg-[#0a66c2]/8 dark:bg-[#8ab4f8]/10 text-[#0a66c2] dark:text-[#8ab4f8]'
                        : 'text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-100 dark:hover:bg-[#3c4043]'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 text-gray-400 dark:text-[#71767a]" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
