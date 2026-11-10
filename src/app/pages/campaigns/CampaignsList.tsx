import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Play, Pause, Archive, TrendingUp, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import { EmptyState } from '../../components/common/EmptyState';
import type { Campaign } from '../../types';

const statusTooltips: Record<Campaign['status'], string> = {
  active: 'Active: Sending messages now',
  paused: 'Paused: Outreach on hold',
  completed: 'Completed: All contacts reached',
};

function ProgressTooltip({ progress, sent, total }: { progress: number; sent: number; total: number }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative mb-4">
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
        <span>{sent} / {total} contacts reached</span>
        <span>{progress}%</span>
      </div>
      <div
        className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden cursor-help relative"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500"
        />
      </div>
      {showTip && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg"
        >
          {progress}% complete — {sent} of {total} sent
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </motion.div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
  const [showTip, setShowTip] = useState(false);
  const colors: Record<Campaign['status'], string> = {
    active: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    paused: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
    completed: 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300',
  };

  return (
    <div className="relative inline-block">
      <span
        className={`flex-shrink-0 text-xs px-2.5 py-0.5 rounded-full cursor-help ${colors[status]}`}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {status}
      </span>
      {showTip && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap z-20 shadow-lg pointer-events-none"
        >
          {statusTooltips[status]}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </motion.div>
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { updateCampaignStatus, deleteCampaign } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const responseRate = campaign.stats.sent > 0 ? Math.round((campaign.stats.replied / campaign.stats.sent) * 100) : 0;
  const progress = campaign.stats.total > 0 ? Math.round((campaign.stats.sent / campaign.stats.total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-[#303134] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043] hover:shadow-[0_2px_8px_rgba(0,0,0,0.10)] dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:border-[#c6c6c6] dark:hover:border-[#5f6368] transition-all duration-200 p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{campaign.name}</h3>
            <StatusBadge status={campaign.status} />
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2">{campaign.goal}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {campaign.status === 'active' ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { updateCampaignStatus(campaign.id, 'paused'); toast.success('Campaign paused'); }}
              className="p-1.5 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 rounded transition-colors"
              title="Pause"
            >
              <Pause className="w-4 h-4" />
            </motion.button>
          ) : campaign.status === 'paused' ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { updateCampaignStatus(campaign.id, 'active'); toast.success('Campaign resumed!'); }}
              className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
              title="Resume"
            >
              <Play className="w-4 h-4" />
            </motion.button>
          ) : null}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => { updateCampaignStatus(campaign.id, 'completed'); toast.success('Campaign archived'); }}
            className="p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-700 rounded transition-colors"
            title="Archive"
          >
            <Archive className="w-4 h-4" />
          </motion.button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={async () => { await deleteCampaign(campaign.id); toast.success('Campaign deleted'); }}
                className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-2 py-1 border border-gray-200 dark:border-slate-600 text-gray-500 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Progress with tooltip */}
      <ProgressTooltip progress={progress} sent={campaign.stats.sent} total={campaign.stats.total} />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Contacts', value: campaign.stats.total },
          { label: 'Sent', value: campaign.stats.sent },
          { label: 'Responses', value: `${campaign.stats.replied} (${responseRate}%)` },
          { label: 'Meetings', value: campaign.stats.meetings },
        ].map(({ label, value }) => (
          <motion.div
            key={label}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.15 }}
            className="text-center p-2 bg-gray-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg cursor-default transition-colors"
          >
            <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{value}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
          <TrendingUp className="w-3.5 h-3.5" />
          Created {campaign.createdAt}
        </div>
        <Link
          to={`/campaigns/${campaign.id}`}
          className="text-sm text-[#0a66c2] dark:text-[#8ab4f8] hover:text-[#004182] dark:hover:text-blue-300 font-medium hover:underline"
        >
          View Details →
        </Link>
      </div>
    </motion.div>
  );
}

export default function CampaignsList() {
  const { campaigns } = useApp();

  if (campaigns.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">My Campaigns</h1>
        </div>
        <EmptyState
          variant="first-time"
          emoji="🚀"
          title="Launch Your First Campaign"
          description="Create a targeted outreach campaign to achieve your networking goals."
          ctaLabel="Create Campaign"
          ctaHref="/campaigns/new"
          steps={[
            { number: 1, label: 'Define your goal', description: 'Job search, partnerships, mentorship, or networking' },
            { number: 2, label: 'AI selects contacts', description: 'Automatically picks the best contacts for your goal' },
            { number: 3, label: 'Send personalized messages', description: 'AI writes tailored outreach for each contact' },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">My Campaigns</h1>
          <p className="text-gray-500 dark:text-[#9aa0a6] text-sm mt-0.5">{campaigns.length} total campaigns</p>
        </div>
        <Link
          to="/campaigns/new"
          className="flex items-center gap-2 bg-[#0a66c2] hover:bg-[#004182] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Create New Campaign
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Active', value: campaigns.filter(c => c.status === 'active').length, color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' },
          { label: 'Paused', value: campaigns.filter(c => c.status === 'paused').length, color: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, color: 'bg-gray-50 dark:bg-[#3c4043] text-gray-700 dark:text-[#e8eaed] border-[#e6e6e6] dark:border-[#3c4043]' },
          { label: 'Total Sent', value: campaigns.reduce((sum, c) => sum + c.stats.sent, 0), color: 'bg-blue-50 dark:bg-blue-900/20 text-[#0a66c2] dark:text-[#8ab4f8] border-blue-200 dark:border-blue-800' },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.25 }}
            whileHover={{ scale: 1.04 }}
            className={`rounded-lg p-4 border text-center cursor-default ${color}`}
          >
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Campaigns Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {campaigns.map((campaign, i) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.07, 0.35), duration: 0.28 }}
          >
            <CampaignCard campaign={campaign} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}