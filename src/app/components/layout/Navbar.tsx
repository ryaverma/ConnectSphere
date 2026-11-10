import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Bell, Search, ChevronDown, LogOut, User, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../ui/utils';

export default function Navbar() {
  const { user, unreadCount, setUser, theme, setTheme } = useApp();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [bellHovered, setBellHovered] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const ThemeIcon = themeIcon;
  const nextTheme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';

  return (
    <header className="h-16 bg-white dark:bg-[#202124] border-b border-[#e6e6e6] dark:border-[#3c4043] flex items-center justify-between px-6 flex-shrink-0">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200',
              searchFocused ? 'text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-400 dark:text-[#71767a]'
            )}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search contacts, campaigns, events... (⌘K)"
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#f7f9fa] dark:bg-[#292a2d] border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a66c2] dark:focus:ring-[#8ab4f8] focus:border-transparent focus:bg-white dark:focus:bg-[#303134] text-gray-900 dark:text-[#e8eaed] placeholder-gray-400 dark:placeholder-[#71767a] transition-all duration-200"
          />
        </div>
      </form>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Quick Theme Toggle */}
        <button
          onClick={() => setTheme(nextTheme)}
          title={`Theme: ${theme}. Click to switch`}
          className="p-2 text-gray-400 dark:text-[#71767a] hover:text-[#0a66c2] dark:hover:text-[#8ab4f8] hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] rounded-lg transition-colors duration-200"
        >
          <ThemeIcon className="w-4 h-4" />
        </button>

        {/* Notifications Bell */}
        <Link
          to="/notifications"
          onMouseEnter={() => setBellHovered(true)}
          onMouseLeave={() => setBellHovered(false)}
          className="relative p-2 text-gray-400 dark:text-[#71767a] hover:text-[#0a66c2] dark:hover:text-[#8ab4f8] hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] rounded-lg transition-colors duration-200"
        >
          <Bell
            className={cn(
              'w-5 h-5 transition-transform duration-200',
              bellHovered && 'scale-110'
            )}
          />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: bellHovered ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
          {unreadCount > 0 && bellHovered && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-400 animate-ping opacity-50 pointer-events-none" />
          )}
        </Link>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] transition-colors duration-200 group"
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium transition-transform duration-200 group-hover:scale-105',
              user?.avatarColor || 'bg-[#0a66c2]'
            )}>
              {user?.initials || 'U'}
            </div>
            <span className="text-sm text-gray-700 dark:text-[#e8eaed] max-w-[120px] truncate hidden sm:block">{user?.name}</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 dark:text-[#71767a] transition-transform duration-200',
                profileOpen && 'rotate-180'
              )}
            />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#303134] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)] border border-[#e6e6e6] dark:border-[#3c4043] py-1 z-20 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-[#e6e6e6] dark:border-[#3c4043]">
                    <p className="text-sm font-medium text-gray-900 dark:text-[#e8eaed]">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6]">{user?.email}</p>
                  </div>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-[#e8eaed] hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] hover:text-[#0a66c2] dark:hover:text-[#8ab4f8] transition-colors duration-150"
                  >
                    <User className="w-4 h-4" /> Profile Settings
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-[#e8eaed] hover:bg-[#f7f9fa] dark:hover:bg-[#3c4043] hover:text-[#0a66c2] dark:hover:text-[#8ab4f8] transition-colors duration-150"
                  >
                    <Settings className="w-4 h-4" /> Preferences
                  </Link>
                  <hr className="my-1 border-[#e6e6e6] dark:border-[#3c4043]" />
                  <button
                    onClick={() => { setUser(null); navigate('/'); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors duration-150"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}