import { useState, useRef } from 'react';
import { Link } from 'react-router';
import { CheckCheck, Target, Mail, Clock, MessageSquare, Calendar, Megaphone, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../contexts/AppContext';
import { cn } from '../components/ui/utils';
import type { Notification } from '../types';

const typeIcons: Record<Notification['type'], any> = {
  opportunity: Target,
  draft: Mail,
  followup: Clock,
  response: MessageSquare,
  event: Calendar,
  campaign: Megaphone,
  system: Settings,
};

const typeColors: Record<Notification['type'], string> = {
  opportunity: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  draft: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
  followup: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  response: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  event: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  campaign: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  system: 'bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#9aa0a6]',
};

const tabs = ['All', 'Unread', 'Opportunities', 'Messages', 'Events', 'System'];

export default function Notifications() {
  const { notifications, markNotificationRead, markAllNotificationsRead, unreadCount } = useApp();
  const [activeTab, setActiveTab] = useState('All');
  const [markingAll, setMarkingAll] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getFiltered = (tab: string) => {
    switch (tab) {
      case 'Unread': return notifications.filter(n => !n.read);
      case 'Opportunities': return notifications.filter(n => n.type === 'opportunity');
      case 'Messages': return notifications.filter(n => n.type === 'draft' || n.type === 'response');
      case 'Events': return notifications.filter(n => n.type === 'event');
      case 'System': return notifications.filter(n => n.type === 'system');
      default: return notifications;
    }
  };

  const filtered = getFiltered(activeTab);

  const handleMarkAllRead = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMarkingAll(true);
    timerRef.current = setTimeout(() => {
      markAllNotificationsRead();
      setMarkingAll(false);
      timerRef.current = null;
    }, 300);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">Notifications</h1>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="bg-red-500 text-white text-xs rounded-full px-2.5 py-0.5"
              >
                {unreadCount} unread
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {unreadCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:text-[#004182] dark:hover:text-blue-300 transition-colors disabled:opacity-60"
          >
            {markingAll ? (
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Mark all as read
          </motion.button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#e6e6e6] dark:border-[#3c4043] mb-5 overflow-x-auto">
        {tabs.map((tab) => (
          <motion.button
            key={tab}
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab ? 'border-[#0a66c2] dark:border-[#8ab4f8] text-[#0a66c2] dark:text-[#8ab4f8]' : 'border-transparent text-gray-500 dark:text-[#9aa0a6] hover:text-gray-700 dark:hover:text-[#e8eaed]'
            )}
          >
            {tab}
            {tab === 'Unread' && unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-1.5 py-0.5 rounded-full"
              >
                {unreadCount}
              </motion.span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center text-center py-20"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-6xl mb-5"
          >
            {activeTab === 'All' ? '🎉' : '🔔'}
          </motion.div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            {activeTab === 'All' ? 'All caught up!' : `No ${activeTab.toLowerCase()} notifications`}
          </h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm max-w-xs">
            {activeTab === 'All'
              ? 'New notifications will appear here as your network grows.'
              : `${activeTab} notifications will show up here.`}
          </p>
          {activeTab === 'All' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-5 grid grid-cols-3 gap-3 max-w-xs"
            >
              {[
                { icon: '🎯', label: 'Opportunities' },
                { icon: '💬', label: 'Messages' },
                { icon: '📅', label: 'Events' },
              ].map(({ icon, label }) => (
                <div key={label} className="bg-gray-50 dark:bg-[#3c4043] rounded-lg p-3 text-center border border-[#e6e6e6] dark:border-[#3c4043]">
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-xs text-gray-500 dark:text-[#9aa0a6]">{label}</div>
                </div>
              ))}
            </motion.div>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notification, i) => {
            const Icon = typeIcons[notification.type];
            const colorClass = typeColors[notification.type];
            return (
              <motion.div
                key={notification.id}
                custom={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
                onClick={() => markNotificationRead(notification.id)}
                className={cn(
                  'p-4 rounded-lg border transition-all duration-200 cursor-pointer group',
                  notification.read
                    ? 'bg-white dark:bg-[#303134] border-[#e6e6e6] dark:border-[#3c4043] hover:border-[#c6c6c6] dark:hover:border-[#5f6368]'
                    : 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'text-sm leading-snug',
                          notification.read ? 'text-gray-700 dark:text-[#9aa0a6]' : 'text-gray-900 dark:text-[#e8eaed] font-medium'
                        )}
                      >
                        {notification.message}
                      </p>
                      {!notification.read && <span className="w-2 h-2 rounded-full bg-[#0a66c2] flex-shrink-0 mt-1.5" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400 dark:text-[#71767a]">{notification.timestamp}</span>
                      {notification.action && (
                        <Link
                          to={notification.action.href}
                          className="text-xs text-[#0a66c2] dark:text-[#8ab4f8] hover:underline font-medium"
                          onClick={e => e.stopPropagation()}
                        >
                          {notification.action.label} →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}