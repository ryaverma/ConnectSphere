import { motion } from 'motion/react';
import { Link } from 'react-router';
import { cn } from '../ui/utils';

// Type A — No Data (Dashboard, Contacts, Campaigns)
// Type B — No Results (Search, Filters)
// Type C — First Time (Onboarding hand-off)

type EmptyStateVariant = 'no-data' | 'no-results' | 'first-time';

interface Step {
  number: number;
  label: string;
  description: string;
}

interface Suggestion {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  emoji: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondaryClick?: () => void;
  steps?: Step[];
  query?: string;
  suggestions?: Suggestion[];
  className?: string;
}

export function EmptyState({
  variant = 'no-data',
  emoji,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaClick,
  secondaryLabel,
  secondaryHref,
  onSecondaryClick,
  steps,
  query,
  suggestions,
  className,
}: EmptyStateProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: 'easeOut', staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const CtaButton = ({ label, href, onClick, primary }: { label: string; href?: string; onClick?: () => void; primary?: boolean }) => {
    const cls = cn(
      'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
      primary
        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95'
        : 'border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-gray-400 hover:scale-105 active:scale-95'
    );
    if (href) return <Link to={href} className={cls}>{label}</Link>;
    return <button onClick={onClick} className={cls}>{label}</button>;
  };

  // Type B: No Results
  if (variant === 'no-results') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn('flex flex-col items-center text-center py-16 px-4', className)}
      >
        <motion.div variants={itemVariants} className="text-5xl mb-4">{emoji}</motion.div>
        <motion.h3 variants={itemVariants} className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
          {query ? `No results for "${query}"` : title}
        </motion.h3>
        {description && (
          <motion.p variants={itemVariants} className="text-sm text-gray-500 dark:text-slate-400 max-w-sm mb-5">{description}</motion.p>
        )}
        {suggestions && suggestions.length > 0 && (
          <motion.div variants={itemVariants} className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={s.onClick}
                className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors hover:scale-105 active:scale-95"
              >
                {s.label}
              </button>
            ))}
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Type C: First Time
  if (variant === 'first-time') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={cn('py-12 px-4', className)}
      >
        <motion.div
          variants={itemVariants}
          className="max-w-lg mx-auto bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-indigo-950/40 dark:via-[#1a1a2a] dark:to-blue-950/40 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-8 text-center shadow-sm"
        >
          <motion.div
            variants={itemVariants}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="text-5xl mb-4"
          >
            {emoji}
          </motion.div>
          <motion.h2 variants={itemVariants} className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{title}</motion.h2>
          {description && (
            <motion.p variants={itemVariants} className="text-sm text-gray-600 dark:text-slate-400 mb-6">{description}</motion.p>
          )}

          {steps && steps.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3 mb-7 text-left">
              {steps.map((step) => (
                <div key={step.number} className="flex items-start gap-3 bg-white dark:bg-slate-800/50 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                    {step.number}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{step.label}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {ctaLabel && (
            <CtaButton label={ctaLabel} href={ctaHref} onClick={onCtaClick} primary />
          )}
        </motion.div>
      </motion.div>
    );
  }

  // Type A: No Data (default)
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('flex flex-col items-center text-center py-20 px-4', className)}
    >
      <motion.div
        variants={itemVariants}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        className="text-6xl mb-5"
      >
        {emoji}
      </motion.div>
      <motion.h2 variants={itemVariants} className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">{title}</motion.h2>
      {description && (
        <motion.p variants={itemVariants} className="text-sm text-gray-500 dark:text-slate-400 max-w-md mb-7 leading-relaxed">{description}</motion.p>
      )}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-3 justify-center">
        {ctaLabel && (
          <CtaButton label={ctaLabel} href={ctaHref} onClick={onCtaClick} primary />
        )}
        {secondaryLabel && (
          <CtaButton label={secondaryLabel} href={secondaryHref} onClick={onSecondaryClick} />
        )}
      </motion.div>
    </motion.div>
  );
}