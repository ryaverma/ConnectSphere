import { Outlet, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

// Isolated child so useLocation is always called inside a fully-mounted
// router context, not at the AppLayout level (guards against HMR edge cases).
function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="h-full"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-[#f7f9fa] dark:bg-[#202124] overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}