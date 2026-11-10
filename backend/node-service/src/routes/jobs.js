import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import AgentJob from '../models/AgentJob.js';

const router = Router();
router.use(authenticate);

// GET /api/jobs/:job_id — universal polling endpoint
router.get('/:job_id', async (req, res) => {
  // Query by job_id only — user_id may be stored as string (Python) or ObjectId (Node.js)
  const job = await AgentJob.findOne({ job_id: req.params.job_id }).lean();
  if (!job) return res.status(404).json({ error: 'Job not found' });
  // Verify ownership (compare as strings to handle both ObjectId and string formats)
  if (String(job.user_id) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' });

  if (job.status === 'queued' || job.status === 'running') {
    return res.status(202).json({
      job_id: job.job_id,
      status: job.status,
      agent_name: job.agent_name,
    });
  }

  if (job.status === 'failed') {
    return res.status(500).json({
      job_id: job.job_id,
      status: 'failed',
      agent_name: job.agent_name,
      errors: job.errors,
    });
  }

  // success or partial
  res.json({
    job_id: job.job_id,
    status: job.status,
    agent_name: job.agent_name,
    output: job.output,
    explanation: job.explanation,
    confidence: job.confidence,
    errors: job.errors,
    duration_ms: job.duration_ms,
    completed_at: job.completed_at,
  });
});

// GET /api/jobs — list recent jobs
router.get('/', async (req, res) => {
  const { agent, status, limit = 20 } = req.query;
  const filter = { user_id: req.user._id };
  if (agent) filter.agent_name = agent;
  if (status) filter.status = status;
  const jobs = await AgentJob.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit), 100))
    .lean();
  res.json(jobs);
});

// DELETE /api/jobs/:job_id — cancel queued job
router.delete('/:job_id', async (req, res) => {
  const job = await AgentJob.findOne({ job_id: req.params.job_id, user_id: req.user._id });
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status === 'running') return res.status(409).json({ error: 'Cannot cancel a running job' });
  job.status = 'failed';
  job.errors = ['Cancelled by user'];
  await job.save();
  res.json({ message: 'Job cancelled' });
});

export default router;
