import { Link, useLocation } from 'react-router';
import {
  LayoutDashboard, Users, Megaphone, Calendar, BarChart3, Network,
  Settings, HelpCircle, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../ui/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/contacts', label: 'Contacts', icon: Users },
  { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/events', label: 'Events', icon: Calendar },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/network-graph', label: 'Network Graph', icon: Network },
];

const bottomItems = [
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/help', label: 'Help & Support', icon: HelpCircle },
];

function NavLink({ path, label, icon: Icon, active, collapsed }: {
  path: string; label: string; icon: any; active: boolean; collapsed: boolean;
}) {
  const link = (
    <Link
      to={path}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group overflow-hidden',
        active
          ? 'bg-[#0a66c2]/8 dark:bg-[#8ab4f8]/10 text-[#0a66c2] dark:text-[#8ab4f8]'
          : 'text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-100 dark:hover:bg-[#3c4043] hover:text-gray-900 dark:hover:text-[#e8eaed]'
      )}
    >
      {/* Active left bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#0a66c2] dark:bg-[#8ab4f8]" />
      )}
      <Icon
        className={cn(
          'w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
          active ? 'text-[#0a66c2] dark:text-[#8ab4f8]' : 'text-gray-400 dark:text-[#71767a] group-hover:text-gray-700 dark:group-hover:text-[#e8eaed]'
        )}
      />
      {!collapsed && (
        <span className="truncate transition-opacity duration-200">{label}</span>
      )}
      {active && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0a66c2] dark:bg-[#8ab4f8]" />
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipPrimitive.Provider delayDuration={100}>
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger asChild>{link}</TooltipPrimitive.Trigger>
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Content
              side="right"
              sideOffset={8}
              className="z-50 bg-gray-800 dark:bg-[#3c4043] text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg select-none animate-in fade-in-0 zoom-in-95"
            >
              {label}
              <TooltipPrimitive.Arrow className="fill-gray-800 dark:fill-[#3c4043]" />
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
    );
  }

  return link;
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const location = useLocation();

  return (
    <aside
      className={cn(
        'flex flex-col bg-white dark:bg-[#202124] border-r border-[#e6e6e6] dark:border-[#3c4043] transition-all duration-300 h-full flex-shrink-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-[#e6e6e6] dark:border-[#3c4043] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0a66c2] flex items-center justify-center flex-shrink-0 hover:bg-[#004182] transition-colors duration-200">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold text-gray-900 dark:text-[#e8eaed] truncate" style={{ fontFamily: 'Poppins, sans-serif' }}>
              ConnectSphere
            </span>
          )}
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon }) => {
          const active = location.pathname === path || location.pathname.startsWith(path + '/');
          return (
            <NavLink
              key={path}
              path={path}
              label={label}
              icon={icon}
              active={active}
              collapsed={!sidebarOpen}
            />
          );
        })}
      </nav>

      {/* Bottom Nav */}
      <div className="py-4 px-2 border-t border-[#e6e6e6] dark:border-[#3c4043] space-y-0.5">
        {bottomItems.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <NavLink
              key={path}
              path={path}
              label={label}
              icon={icon}
              active={active}
              collapsed={!sidebarOpen}
            />
          );
        })}

        {/* Toggle */}
        <TooltipPrimitive.Provider delayDuration={100}>
          <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 dark:text-[#71767a] hover:bg-gray-100 dark:hover:bg-[#3c4043] hover:text-gray-700 dark:hover:text-[#e8eaed] transition-all duration-200 w-full group"
              >
                {sidebarOpen ? (
                  <>
                    <ChevronLeft className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <ChevronRight className="w-5 h-5 flex-shrink-0 mx-auto group-hover:scale-110 transition-transform duration-200" />
                )}
              </button>
            </TooltipPrimitive.Trigger>
            {!sidebarOpen && (
              <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                  side="right"
                  sideOffset={8}
                  className="z-50 bg-gray-800 dark:bg-[#3c4043] text-white text-xs px-2.5 py-1.5 rounded-lg shadow-lg"
                >
                  Expand sidebar
                  <TooltipPrimitive.Arrow className="fill-gray-800 dark:fill-[#3c4043]" />
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Portal>
            )}
          </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
      </div>
    </aside>
  );
}