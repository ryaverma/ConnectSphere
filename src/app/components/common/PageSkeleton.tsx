/**
 * ConnectSphere Skeleton Loading Components
 * Pixel-accurate shimmer placeholders matching each page's layout.
 */

import { cn } from '../ui/utils';

// ─── Base Shimmer Block ───────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn('skeleton-shimmer rounded', className)} />
  );
}

// ─── Reusable building blocks ─────────────────────────────────────────────────

function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn(
      'bg-white dark:bg-[#303134] rounded-xl border border-[#e6e6e6] dark:border-[#3c4043] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] p-5',
      className
    )}>
      {children}
    </div>
  );
}

// ─── Metric Card Skeleton ─────────────────────────────────────────────────────

export function MetricCardSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-start justify-between mb-4">
        <Shimmer className="w-10 h-10 rounded-lg" />
        <Shimmer className="w-16 h-5 rounded-full" />
      </div>
      <Shimmer className="w-16 h-7 mb-1.5 rounded" />
      <Shimmer className="w-24 h-4 rounded" />
    </SkeletonCard>
  );
}

// ─── Dashboard Skeleton ───────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Shimmer className="w-64 h-7 rounded-lg" />
          <Shimmer className="w-48 h-4 rounded" />
        </div>
        <Shimmer className="w-36 h-9 rounded-lg hidden sm:block" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Top Opportunities Skeleton */}
          <SkeletonCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shimmer className="w-5 h-5 rounded" />
                <Shimmer className="w-48 h-5 rounded" />
              </div>
              <Shimmer className="w-16 h-4 rounded" />
            </div>
            {[0,1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-[#f0f0f0] dark:border-[#3c4043] last:border-0">
                <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Shimmer className="w-36 h-4 rounded" />
                  <Shimmer className="w-48 h-3 rounded" />
                </div>
                <Shimmer className="w-20 h-7 rounded-lg" />
              </div>
            ))}
          </SkeletonCard>

          {/* Drafts Skeleton */}
          <SkeletonCard>
            <div className="flex items-center justify-between mb-4">
              <Shimmer className="w-44 h-5 rounded" />
              <Shimmer className="w-16 h-4 rounded" />
            </div>
            {[0,1].map(i => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-[#f0f0f0] dark:border-[#3c4043] last:border-0">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Shimmer className="w-28 h-4 rounded" />
                    <Shimmer className="w-16 h-4 rounded-full" />
                  </div>
                  <Shimmer className="w-48 h-3 rounded" />
                </div>
                <Shimmer className="w-16 h-7 rounded-lg" />
              </div>
            ))}
          </SkeletonCard>

          {/* Chart Skeleton */}
          <SkeletonCard>
            <div className="flex items-center justify-between mb-4">
              <Shimmer className="w-36 h-5 rounded" />
              <Shimmer className="w-28 h-4 rounded" />
            </div>
            <Shimmer className="w-full h-44 rounded-lg" />
          </SkeletonCard>
        </div>

        <div className="space-y-6">
          {/* Follow-ups Skeleton */}
          <SkeletonCard>
            <div className="flex items-center gap-2 mb-4">
              <Shimmer className="w-5 h-5 rounded" />
              <Shimmer className="w-40 h-5 rounded" />
            </div>
            {[0,1,2].map(i => (
              <div key={i} className="py-3 border-b border-[#f0f0f0] dark:border-[#3c4043] last:border-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shimmer className="w-7 h-7 rounded-full" />
                  <Shimmer className="w-28 h-4 rounded" />
                </div>
                <Shimmer className="w-36 h-3 rounded mb-2" />
                <Shimmer className="w-full h-7 rounded-lg" />
              </div>
            ))}
          </SkeletonCard>

          {/* Events Skeleton */}
          <SkeletonCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shimmer className="w-5 h-5 rounded" />
                <Shimmer className="w-40 h-5 rounded" />
              </div>
              <Shimmer className="w-8 h-4 rounded" />
            </div>
            {[0,1,2].map(i => (
              <div key={i} className="py-3 border-b border-[#f0f0f0] dark:border-[#3c4043] last:border-0 space-y-1.5">
                <Shimmer className="w-full h-4 rounded" />
                <Shimmer className="w-40 h-3 rounded" />
                <Shimmer className="w-36 h-3 rounded" />
              </div>
            ))}
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}

// ─── Contacts List Skeleton ───────────────────────────────────────────────────

export function ContactsListSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <Shimmer className="w-36 h-7 rounded-lg" />
          <Shimmer className="w-28 h-4 rounded" />
        </div>
        <div className="flex gap-2">
          <Shimmer className="w-24 h-9 rounded-lg" />
          <Shimmer className="w-32 h-9 rounded-lg" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <Shimmer className="flex-1 h-10 rounded-lg max-w-sm" />
        <Shimmer className="w-28 h-10 rounded-lg" />
        <Shimmer className="w-24 h-10 rounded-lg" />
        <Shimmer className="w-24 h-10 rounded-lg" />
      </div>

      <Shimmer className="w-32 h-4 rounded mb-4" />

      {/* Table */}
      <div className="bg-white dark:bg-[#303134] rounded-xl border border-[#e6e6e6] dark:border-[#3c4043] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-[#e6e6e6] dark:border-[#3c4043]">
          {[140, 100, 60, 100, 90, 60].map((w, i) => (
            <Shimmer key={i} className={`h-3 rounded`} style={{ width: `${w}px` }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#e6e6e6] dark:border-[#3c4043] last:border-0">
            <div className="flex items-center gap-3 flex-1">
              <Shimmer className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="space-y-1">
                <Shimmer className="w-28 h-4 rounded" />
                <Shimmer className="w-36 h-3 rounded hidden sm:block" />
              </div>
            </div>
            <Shimmer className="w-20 h-4 rounded hidden md:block" />
            <Shimmer className="w-12 h-5 rounded-full" />
            <Shimmer className="w-32 h-4 rounded hidden lg:block" />
            <Shimmer className="w-20 h-4 rounded hidden md:block" />
            <Shimmer className="w-16 h-5 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Campaigns Skeleton ───────────────────────────────────────────────────────

export function CampaignsSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <Shimmer className="w-40 h-7 rounded-lg" />
          <Shimmer className="w-28 h-4 rounded" />
        </div>
        <Shimmer className="w-40 h-9 rounded-lg" />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[0,1,2,3].map(i => (
          <div key={i} className="rounded-lg p-4 border border-[#e6e6e6] dark:border-[#3c4043] bg-white dark:bg-[#303134] text-center">
            <Shimmer className="w-8 h-7 rounded mx-auto mb-1.5" />
            <Shimmer className="w-16 h-4 rounded mx-auto" />
          </div>
        ))}
      </div>

      {/* Campaign cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[0,1,2,3,4,5].map(i => (
          <SkeletonCard key={i}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 mr-3 space-y-1.5">
                <Shimmer className="w-full h-5 rounded" />
                <Shimmer className="w-3/4 h-4 rounded" />
                <Shimmer className="w-4/5 h-3 rounded" />
              </div>
              <Shimmer className="w-16 h-5 rounded-full flex-shrink-0" />
            </div>
            <Shimmer className="w-full h-2 rounded-full mb-4" />
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[0,1,2,3].map(j => (
                <div key={j} className="text-center p-2 bg-gray-50 dark:bg-[#3c4043] rounded-lg">
                  <Shimmer className="w-8 h-4 rounded mx-auto mb-1" />
                  <Shimmer className="w-12 h-3 rounded mx-auto" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Shimmer className="w-24 h-3 rounded" />
              <Shimmer className="w-24 h-4 rounded" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

// ─── Analytics Skeleton ───────────────────────────────────────────────────────

export function AnalyticsSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Shimmer className="w-48 h-7 rounded-lg" />
          <Shimmer className="w-64 h-4 rounded" />
        </div>
        <div className="flex gap-3">
          <Shimmer className="w-64 h-9 rounded-lg hidden sm:block" />
          <Shimmer className="w-24 h-9 rounded-lg" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => <MetricCardSkeleton key={i} />)}
      </div>

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-2 gap-5">
        <SkeletonCard className="h-56">
          <Shimmer className="w-40 h-5 rounded mb-4" />
          <div className="flex items-center gap-6">
            <Shimmer className="w-28 h-28 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              {[0,1,2,3].map(i => <Shimmer key={i} className="w-full h-4 rounded" />)}
            </div>
          </div>
        </SkeletonCard>
        <SkeletonCard>
          <Shimmer className="w-36 h-5 rounded mb-4" />
          <Shimmer className="w-full h-40 rounded-lg" />
        </SkeletonCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-5">
        <SkeletonCard>
          <Shimmer className="w-44 h-5 rounded mb-4" />
          <div className="flex items-center gap-4">
            <Shimmer className="w-32 h-32 rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              {[0,1,2,3].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <Shimmer className="w-24 h-3 rounded" />
                  <Shimmer className="w-8 h-3 rounded" />
                </div>
              ))}
            </div>
          </div>
        </SkeletonCard>
        <SkeletonCard>
          <Shimmer className="w-56 h-5 rounded mb-2" />
          <Shimmer className="w-64 h-3 rounded mb-4" />
          <Shimmer className="w-full h-36 rounded-lg" />
        </SkeletonCard>
      </div>

      {/* Outreach performance */}
      <SkeletonCard>
        <Shimmer className="w-44 h-5 rounded mb-4" />
        <Shimmer className="w-full h-52 rounded-lg" />
      </SkeletonCard>
    </div>
  );
}

// ─── Events Skeleton ──────────────────────────────────────────────────────────

export function EventsSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <Shimmer className="w-36 h-7 rounded-lg" />
          <Shimmer className="w-48 h-4 rounded" />
        </div>
        <div className="flex gap-2">
          <Shimmer className="w-28 h-9 rounded-lg" />
          <Shimmer className="w-24 h-9 rounded-lg" />
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <Shimmer className="flex-1 h-10 rounded-lg max-w-sm" />
        {[80,80,90,70].map((w,i) => <Shimmer key={i} className={`h-10 rounded-lg`} style={{ width: w }} />)}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[0,1,2,3,4,5].map(i => (
          <div key={i} className="bg-white dark:bg-[#303134] rounded-xl border border-[#e6e6e6] dark:border-[#3c4043] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <Shimmer className="w-full h-40" />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Shimmer className="w-20 h-5 rounded-full" />
                <Shimmer className="w-20 h-5 rounded-full" />
              </div>
              <Shimmer className="w-full h-5 rounded" />
              <Shimmer className="w-3/4 h-4 rounded" />
              <div className="flex gap-2">
                <Shimmer className="w-20 h-3 rounded" />
                <Shimmer className="w-16 h-3 rounded" />
              </div>
              <div className="flex gap-1 flex-wrap pt-1">
                {[0,1,2].map(j => <Shimmer key={j} className="w-16 h-5 rounded-full" />)}
              </div>
              <div className="flex gap-2 pt-2">
                <Shimmer className="flex-1 h-8 rounded-lg" />
                <Shimmer className="w-9 h-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Network Graph Skeleton ───────────────────────────────────────────────────

export function NetworkGraphSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e6e6e6] dark:border-[#3c4043] bg-white dark:bg-[#202124]">
        <Shimmer className="w-44 h-9 rounded-lg" />
        <Shimmer className="w-36 h-9 rounded-lg" />
        <Shimmer className="w-24 h-9 rounded-lg" />
      </div>
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#0f0f23]">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <Shimmer className="w-32 h-32 rounded-full" />
          </div>
          <Shimmer className="w-48 h-4 rounded mx-auto mb-2" />
          <Shimmer className="w-32 h-3 rounded mx-auto" />
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Skeleton ───────────────────────────────────────────────────

export function NotificationsSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1.5">
          <Shimmer className="w-36 h-7 rounded-lg" />
          <Shimmer className="w-48 h-4 rounded" />
        </div>
        <Shimmer className="w-32 h-9 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-[#303134] rounded-xl border border-[#e6e6e6] dark:border-[#3c4043] p-4 flex gap-3">
            <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Shimmer className="w-full h-4 rounded" />
              <Shimmer className="w-3/4 h-3 rounded" />
              <Shimmer className="w-20 h-3 rounded" />
            </div>
            <Shimmer className="w-8 h-8 rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Contact Profile Skeleton ─────────────────────────────────────────────────

export function ContactProfileSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <Shimmer className="w-20 h-4 rounded mb-6" />
      <div className="bg-white dark:bg-[#303134] rounded-xl border border-[#e6e6e6] dark:border-[#3c4043] p-6 mb-5">
        <div className="flex items-start gap-4">
          <Shimmer className="w-20 h-20 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="w-44 h-6 rounded-lg" />
            <Shimmer className="w-56 h-4 rounded" />
            <Shimmer className="w-36 h-4 rounded" />
            <div className="flex gap-2 mt-2">
              <Shimmer className="w-20 h-7 rounded-full" />
              <Shimmer className="w-20 h-7 rounded-full" />
              <Shimmer className="w-16 h-7 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Shimmer className="w-24 h-9 rounded-lg" />
            <Shimmer className="w-9 h-9 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard>
            <Shimmer className="w-24 h-5 rounded mb-3" />
            <Shimmer className="w-full h-3 rounded mb-1.5" />
            <Shimmer className="w-5/6 h-3 rounded mb-1.5" />
            <Shimmer className="w-4/5 h-3 rounded" />
          </SkeletonCard>
          <SkeletonCard>
            <Shimmer className="w-28 h-5 rounded mb-3" />
            <div className="flex flex-wrap gap-2">
              {[0,1,2,3].map(i => <Shimmer key={i} className="w-24 h-7 rounded-full" />)}
            </div>
          </SkeletonCard>
        </div>
        <div className="space-y-4">
          <SkeletonCard>
            <Shimmer className="w-36 h-5 rounded mb-3" />
            <div className="space-y-2">
              {[0,1,2,3].map(i => (
                <div key={i} className="flex justify-between">
                  <Shimmer className="w-24 h-3 rounded" />
                  <Shimmer className="w-20 h-3 rounded" />
                </div>
              ))}
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <Shimmer className="w-32 h-5 rounded mb-3" />
            <Shimmer className="w-full h-14 rounded-lg mb-2" />
            <Shimmer className="w-full h-9 rounded-lg" />
          </SkeletonCard>
        </div>
      </div>
    </div>
  );
}

// ─── Generic Page Skeleton ────────────────────────────────────────────────────

export function GenericPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="space-y-2">
        <Shimmer className="w-48 h-7 rounded-lg" />
        <Shimmer className="w-64 h-4 rounded" />
      </div>
      {[0,1,2].map(i => (
        <SkeletonCard key={i}>
          <Shimmer className="w-40 h-5 rounded mb-3" />
          <Shimmer className="w-full h-3 rounded mb-2" />
          <Shimmer className="w-4/5 h-3 rounded mb-2" />
          <Shimmer className="w-3/5 h-3 rounded" />
        </SkeletonCard>
      ))}
    </div>
  );
}
