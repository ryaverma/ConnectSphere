import { api } from './client';
import type { AnalyticsData } from '../types';

export const analyticsApi = {
  dashboard:           () => api.get<AnalyticsData | { status: string; job_id: string }>('/analytics/dashboard'),
  networkGrowth:       () => api.get('/analytics/network-growth'),
  networkHealth:       () => api.get('/analytics/network-health'),
  outreachPerformance: () => api.get('/analytics/outreach-performance'),
  sourceBreakdown:     () => api.get('/analytics/source-breakdown'),
  strengthDistribution:() => api.get('/analytics/strength-distribution'),
  engagementTrends:    () => api.get('/analytics/engagement-trends'),
  topContacts:         (limit = 10) => api.get(`/analytics/top-contacts?limit=${limit}`),
  agentInsights:       () => api.get<{ insights: string[]; generated_at: string }>('/analytics/agent-insights'),
  export:              () => api.post('/analytics/export'),
};
