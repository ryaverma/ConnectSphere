import { api } from './client';

export interface AgentJob {
  job_id: string;
  status: 'queued' | 'running' | 'success' | 'partial' | 'failed';
  agent_name: string;
  output?: unknown;
  explanation?: string;
  confidence?: number;
  errors?: string[];
  duration_ms?: number;
  completed_at?: string;
}

export const jobsApi = {
  get:    (job_id: string) => api.get<AgentJob>(`/jobs/${job_id}`),
  list:   (params?: { agent?: string; status?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    ).toString() : '';
    return api.get<AgentJob[]>(`/jobs${qs}`);
  },
  cancel: (job_id: string) => api.delete(`/jobs/${job_id}`),
};

/**
 * Poll a job until it completes (success/partial/failed).
 * Calls `onProgress` on each poll if provided.
 */
export async function pollJob(
  job_id: string,
  options: {
    interval?: number;
    timeout?: number;
    onProgress?: (job: AgentJob) => void;
  } = {},
): Promise<AgentJob> {
  const { interval = 1500, timeout = 120_000 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const job = await jobsApi.get(job_id);
    options.onProgress?.(job);
    if (job.status !== 'queued' && job.status !== 'running') return job;
    await new Promise((r) => setTimeout(r, interval));
  }

  throw new Error(`Job ${job_id} timed out after ${timeout}ms`);
}
