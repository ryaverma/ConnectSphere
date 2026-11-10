import { useState, useEffect, useRef } from 'react';
import { jobsApi } from '../api/jobs';
import type { AgentJob } from '../api/jobs';

type JobStatus = AgentJob['status'] | 'idle';

/**
 * Polls a job by ID until it completes.
 * Returns `{ job, status, isLoading, error }`.
 */
export function useJobPoller(job_id: string | null, interval = 1500) {
  const [job, setJob] = useState<AgentJob | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!job_id) { setStatus('idle'); return; }

    setStatus('queued');
    setError(null);

    const tick = async () => {
      try {
        const j = await jobsApi.get(job_id);
        setJob(j);
        setStatus(j.status);
        if (j.status !== 'queued' && j.status !== 'running') {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    tick();
    timerRef.current = setInterval(tick, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [job_id, interval]);

  return { job, status, isLoading: status === 'queued' || status === 'running', error };
}
