import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { TrendingUp, Users, MessageSquare, Calendar, Download, Lightbulb, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { EmptyState } from '../../components/common/EmptyState';
import { useApp } from '../../contexts/AppContext';
import { analyticsApi, pollJob } from '../../api';

const ranges = ['Last 7 days', 'Last 30 days', 'Last 3 months', 'All time'];
const PIE_COLORS = ['#6366f1', '#14b8a6', '#f97316', '#ec4899', '#10b981', '#3b82f6'];

type DashboardSnapshot = {
  outreach?: {
    sent?: number;
    replied?: number;
    response_rate?: number;
    avg_response_time?: number;
  };
  network_health?: {
    total?: number;
    strong_ties?: number;
    weak_ties?: number;
    density?: number;
    diversity_index?: number;
    community_count?: number;
  };
  events?: {
    attended?: number;
  };
  insights?: string[];
  source?: string;
  status?: string;
  job_id?: string;
};

function MetricCard({ icon: Icon, label, value, subtitle, color }: { icon: any; label: string; value: string; subtitle: string; color: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-white dark:bg-[#303134] rounded-lg p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] border border-[#e6e6e6] dark:border-[#3c4043]"
    >
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed] mb-0.5">{value}</div>
      <div className="text-sm font-medium text-gray-700 dark:text-[#9aa0a6]">{label}</div>
      <div className="text-xs text-gray-500 dark:text-[#71767a] mt-0.5">{subtitle}</div>
    </motion.div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] shadow-lg px-4 py-3 min-w-[140px]">
      {label ? <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mb-2 font-medium">{label}</p> : null}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600 dark:text-[#9aa0a6]">{p.name}</span>
          </div>
          <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function normalizeBreakdown(items: any[], fallbackLabel: string) {
  return (items || []).map((item, index) => ({
    name: item.name || item.label || item.campaign_name || item._id || `${fallbackLabel} ${index + 1}`,
    value: Number(item.value ?? item.count ?? item.sent ?? item.total ?? 0),
    color: PIE_COLORS[index % PIE_COLORS.length],
  })).filter((item) => item.value > 0);
}

function normalizeStrength(items: any[]) {
  return (items || []).map((item, index) => ({
    name: item.name || item.label || item.bucket || item._id || `Bucket ${index + 1}`,
    value: Number(item.value ?? item.count ?? item.total ?? 0),
    color: PIE_COLORS[index % PIE_COLORS.length],
  })).filter((item) => item.value > 0);
}

export default function Analytics() {
  const [range, setRange] = useState('Last 30 days');
  const { contacts } = useApp();
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [sourceBreakdown, setSourceBreakdown] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [strengthDistribution, setStrengthDistribution] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [agentInsights, setAgentInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let dashboardData = await analyticsApi.dashboard() as DashboardSnapshot;
      if (dashboardData.status === 'computing' && dashboardData.job_id) {
        await pollJob(dashboardData.job_id, { timeout: 120000 });
        dashboardData = await analyticsApi.dashboard() as DashboardSnapshot;
      }

      const [sourceData, strengthData, insightsData] = await Promise.all([
        analyticsApi.sourceBreakdown().catch(() => []),
        analyticsApi.strengthDistribution().catch(() => []),
        analyticsApi.agentInsights().catch(() => ({ insights: [] })),
      ]);

      setDashboard(dashboardData);
      setSourceBreakdown(normalizeBreakdown(sourceData as any[], 'Campaign'));
      setStrengthDistribution(normalizeStrength(strengthData as any[]));
      setAgentInsights((insightsData as { insights?: string[] }).insights || dashboardData.insights || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const network = dashboard?.network_health || {};
  const outreach = dashboard?.outreach || {};
  const healthBreakdown = useMemo(() => ([
    { label: 'Network size', value: `${network.total || contacts.length} contacts` },
    { label: 'Strong ties', value: `${network.strong_ties || 0}` },
    { label: 'Weak ties', value: `${network.weak_ties || 0}` },
    { label: 'Communities', value: `${network.community_count || 0}` },
    { label: 'Density', value: `${((network.density || 0) * 100).toFixed(1)}%` },
    { label: 'Diversity index', value: `${((network.diversity_index || 0) * 100).toFixed(1)}%` },
  ]), [contacts.length, network]);

  const networkScore = Math.max(0, Math.min(100,
    Math.round(
      (((network.strong_ties || 0) / Math.max(network.total || 1, 1)) * 45) +
      ((network.community_count || 0) * 8) +
      ((network.diversity_index || 0) * 30) +
      ((network.density || 0) * 17)
    )
  ));

  if (contacts.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <EmptyState
          variant="first-time"
          emoji="📊"
          title="No analytics data yet"
          description="Add contacts and start outreach campaigns to see insights and performance data."
          ctaLabel="Add Contacts"
          ctaHref="/contacts"
          steps={[
            { number: 1, label: 'Import your contacts', description: 'Upload LinkedIn, GitHub, Gmail, or CSV exports' },
            { number: 2, label: 'Run your first campaign', description: 'Start outreach to generate analytics data' },
            { number: 3, label: 'Review live metrics', description: 'Track response rates and network health from the backend' },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">Network Analytics</h1>
          <p className="text-gray-500 dark:text-[#9aa0a6] text-sm mt-0.5">Live metrics from your latest backend analytics snapshot</p>
        </div>
        <div className="flex gap-3">
          <div className="flex border border-[#e6e6e6] dark:border-[#3c4043] rounded-lg overflow-hidden">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-2 text-xs transition-colors ${range === r ? 'bg-[#0a66c2] text-white' : 'text-gray-600 dark:text-[#9aa0a6] hover:bg-gray-50 dark:hover:bg-[#3c4043]'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#e8eaed] px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={async () => {
              await analyticsApi.export();
              toast.success('Analytics export queued');
            }}
            className="flex items-center gap-2 border border-[#e6e6e6] dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#3c4043] text-gray-700 dark:text-[#e8eaed] px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#303134] rounded-lg p-5 border border-[#e6e6e6] dark:border-[#3c4043] animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-[#3c4043] mb-3" />
              <div className="h-7 w-20 bg-gray-200 dark:bg-[#3c4043] rounded mb-2" />
              <div className="h-4 w-28 bg-gray-100 dark:bg-[#252538] rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={MessageSquare} label="Messages Sent" value={String(outreach.sent || 0)} subtitle={range} color="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" />
            <MetricCard icon={TrendingUp} label="Response Rate" value={`${Math.round((outreach.response_rate || 0) * 100)}%`} subtitle={`${outreach.replied || 0} replies`} color="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400" />
            <MetricCard icon={Calendar} label="Avg Response Time" value={`${outreach.avg_response_time || 0}h`} subtitle="Backend snapshot" color="bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400" />
            <MetricCard icon={Users} label="Network Size" value={String(network.total || contacts.length)} subtitle={`${network.community_count || 0} communities`} color="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400" />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0a66c2] dark:text-[#8ab4f8]" /> Network Health Score
              </h2>
              <div className="flex items-center gap-6">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#334155" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="url(#scoreGrad)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(networkScore / 100) * 251.2} 251.2`}
                    />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0a66c2" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900 dark:text-[#e8eaed]">{networkScore}</span>
                    <span className="text-xs text-gray-500 dark:text-[#9aa0a6]">/100</span>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {healthBreakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-[#9aa0a6]">{item.label}</span>
                      <span className="font-medium text-gray-900 dark:text-[#e8eaed]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">Response Snapshot</h2>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {dashboard?.source || 'live'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { name: 'Sent', value: outreach.sent || 0, color: '#6366f1' },
                    { name: 'Replies', value: outreach.replied || 0, color: '#14b8a6' },
                    { name: 'Strong Ties', value: network.strong_ties || 0, color: '#10b981' },
                    { name: 'Weak Ties', value: network.weak_ties || 0, color: '#f59e0b' },
                  ]}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[0, 1, 2, 3].map((i) => (
                      <Cell key={i} fill={['#6366f1', '#14b8a6', '#10b981', '#f59e0b'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">Campaign Breakdown</h2>
              {sourceBreakdown.length ? (
                <div className="flex items-center gap-4">
                  <PieChart width={160} height={160}>
                    <Pie data={sourceBreakdown} dataKey="value" cx="50%" cy="50%" outerRadius={58} innerRadius={32}>
                      {sourceBreakdown.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                  <div className="flex-1 space-y-2">
                    {sourceBreakdown.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-gray-600 dark:text-[#9aa0a6]">{entry.name}</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-[#e8eaed]">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-[#9aa0a6]">No campaign-level analytics are available yet.</p>
              )}
            </div>

            <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed] mb-4">Strength Distribution</h2>
              {strengthDistribution.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={strengthDistribution}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {strengthDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 dark:text-[#9aa0a6]">The analytics agent has not produced a strength bucket breakdown yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#303134] rounded-lg border border-[#e6e6e6] dark:border-[#3c4043] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="font-semibold text-gray-900 dark:text-[#e8eaed]">AI Insights</h2>
            </div>
            {agentInsights.length ? (
              <div className="space-y-3">
                {agentInsights.map((insight, i) => (
                  <motion.div
                    key={`${insight}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-900 dark:text-amber-200"
                  >
                    {insight}
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-[#9aa0a6]">No AI insights have been generated yet.</p>
            )}
          </div>

          <div className="bg-[#0a66c2] rounded-lg p-6 text-white flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">See Your Network Visually</h3>
              <p className="text-blue-200 text-sm">Explore your live relationship graph with the latest backend data</p>
            </div>
            <Link to="/network-graph" className="bg-white text-[#0a66c2] px-5 py-2.5 rounded-lg text-sm font-medium hover:shadow-md transition-all">
              Open Graph
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
