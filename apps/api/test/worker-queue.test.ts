import { describe, it, expect, beforeEach } from 'bun:test';
import { jobQueue } from '../src/worker/job-queue';
import type { QueueJob } from '../src/worker/types';

describe('SaaS Background Job Worker Pipeline', () => {
  beforeEach(async () => {
    // Clear jobs if needed
    await jobQueue.clearPendingJobs();
  });

  it('should enqueue and successfully process a job with registered handler', async () => {
    let handledPayload: any = null;

    jobQueue.registerHandler('TEST_JOB', async (job) => {
      handledPayload = job.payload;
      return { success: true };
    });

    const job = await jobQueue.enqueue('TEST_JOB', { message: 'hello worker' }, { salonId: 'salon-123' });
    expect(job.id).toBeDefined();
    expect(job.status).toBe('PENDING');

    // Run a single worker processing tick
    const processed = await jobQueue.processNextJob();
    expect(processed).toBe(true);
    expect(handledPayload).toEqual({ message: 'hello worker' });

    const status = await jobQueue.getJobById(job.id);
    expect(status?.status).toBe('COMPLETED');
  });

  it('should retry a failed job up to maxAttempts with backoff and mark FAILED when exhausted', async () => {
    let attemptsCount = 0;

    jobQueue.registerHandler('FAILING_JOB', async () => {
      attemptsCount++;
      throw new Error('Simulated network timeout');
    });

    const job = await jobQueue.enqueue(
      'FAILING_JOB',
      { data: 123 },
      { maxAttempts: 2, retryDelayMs: 10 }
    );

    // Attempt 1 -> fails, remains PENDING for retry
    await jobQueue.processNextJob();
    let currentJob = await jobQueue.getJobById(job.id);
    expect(currentJob?.attempts).toBe(1);
    expect(currentJob?.status).toBe('PENDING');
    expect(currentJob?.lastError).toContain('Simulated network timeout');

    // Wait for retryDelayMs
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Attempt 2 -> fails, reaches maxAttempts (2) -> marks FAILED
    await jobQueue.processNextJob();
    currentJob = await jobQueue.getJobById(job.id);
    expect(currentJob?.attempts).toBe(2);
    expect(currentJob?.status).toBe('FAILED');
    expect(attemptsCount).toBe(2);
  });

  it('should report correct worker telemetry stats', async () => {
    await jobQueue.enqueue('DUMMY_1', { a: 1 });
    await jobQueue.enqueue('DUMMY_2', { b: 2 });

    const stats = await jobQueue.getStats();
    expect(stats.totalJobs).toBeGreaterThanOrEqual(2);
    expect(stats.pendingCount).toBeGreaterThanOrEqual(2);
  });
});
