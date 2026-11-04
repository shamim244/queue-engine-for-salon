import { getDb, isMySqlConnected } from '../db/mysql';
import type { QueueJob, JobType, JobHandler, EnqueueOptions, WorkerStats } from './types';

class JobQueueService {
  private handlers = new Map<string, JobHandler>();
  private inMemoryJobs = new Map<string, QueueJob>();
  private workerTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  constructor() {
    // Default handlers can be registered later
  }

  registerHandler<T = any>(type: JobType, handler: JobHandler<T>) {
    this.handlers.set(type, handler);
  }

  async enqueue<T = any>(
    type: JobType,
    payload: T,
    options: EnqueueOptions = {}
  ): Promise<QueueJob<T>> {
    const id = 'job-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
    const now = new Date();
    const scheduledForDate = new Date(now.getTime() + (options.delayMs || 0));
    const scheduledFor = scheduledForDate.toISOString();
    const nowIso = now.toISOString();

    const job: QueueJob<T> = {
      id,
      salonId: options.salonId || null,
      type,
      payload,
      status: 'PENDING',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      retryDelayMs: options.retryDelayMs,
      lastError: null,
      scheduledFor,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO queue_jobs (id, salon_id, type, payload, status, attempts, max_attempts, scheduled_for, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            job.id,
            job.salonId,
            job.type,
            JSON.stringify(job.payload),
            job.status,
            job.attempts,
            job.maxAttempts,
            this.toMySqlDatetime(job.scheduledFor),
            this.toMySqlDatetime(job.createdAt),
            this.toMySqlDatetime(job.updatedAt),
          ]
        );
      } catch (err: any) {
        console.warn(`[JobQueue MySQL Warning] Failed to insert job to DB, falling back to memory: ${err.message}`);
        this.inMemoryJobs.set(job.id, job);
      }
    } else {
      this.inMemoryJobs.set(job.id, job);
    }

    return job;
  }

  async getJobById(id: string): Promise<QueueJob | null> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(`SELECT * FROM queue_jobs WHERE id = ?`, [id]);
        if (rows && rows.length > 0) {
          return this.mapRowToJob(rows[0]);
        }
      } catch {}
    }
    return this.inMemoryJobs.get(id) || null;
  }

  async processNextJob(): Promise<boolean> {
    let job: QueueJob | null = null;
    const now = new Date();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const nowSql = this.toMySqlDatetime(now.toISOString());
        // Select next available pending job
        const [rows] = await db.query<any[]>(
          `SELECT * FROM queue_jobs 
           WHERE status = 'PENDING' AND scheduled_for <= ? 
           ORDER BY scheduled_for ASC, created_at ASC 
           LIMIT 1`,
          [nowSql]
        );

        if (rows && rows.length > 0) {
          job = this.mapRowToJob(rows[0]);
          await db.query(`UPDATE queue_jobs SET status = 'PROCESSING', updated_at = ? WHERE id = ?`, [
            nowSql,
            job.id,
          ]);
          job.status = 'PROCESSING';
        }
      } catch (err: any) {
        // Fall back to memory
      }
    }

    if (!job) {
      // Check in-memory queue
      for (const j of this.inMemoryJobs.values()) {
        if (j.status === 'PENDING' && new Date(j.scheduledFor).getTime() <= now.getTime()) {
          job = j;
          job.status = 'PROCESSING';
          break;
        }
      }
    }

    if (!job) return false;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      console.warn(`[JobQueue] No handler registered for job type: ${job.type}`);
      await this.markFailed(job, `No handler registered for type: ${job.type}`);
      return true;
    }

    try {
      await handler(job);
      await this.markCompleted(job);
      return true;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      job.attempts++;
      job.lastError = errorMsg;

      if (job.attempts >= job.maxAttempts) {
        await this.markFailed(job, errorMsg);
      } else {
        // Calculate exponential backoff retry (or custom retryDelayMs)
        const delayMs = job.retryDelayMs !== undefined
          ? job.retryDelayMs
          : Math.min(30000, Math.pow(2, job.attempts) * 1000);
        const nextScheduled = new Date(Date.now() + delayMs).toISOString();
        job.scheduledFor = nextScheduled;
        job.status = 'PENDING';

        if (isMySqlConnected) {
          try {
            const db = getDb();
            await db.query(
              `UPDATE queue_jobs 
               SET status = 'PENDING', attempts = ?, last_error = ?, scheduled_for = ?, updated_at = ? 
               WHERE id = ?`,
              [
                job.attempts,
                job.lastError,
                this.toMySqlDatetime(job.scheduledFor),
                this.toMySqlDatetime(new Date().toISOString()),
                job.id,
              ]
            );
          } catch {}
        }
      }
      return true;
    }
  }

  private async markCompleted(job: QueueJob) {
    job.status = 'COMPLETED';
    job.updatedAt = new Date().toISOString();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE queue_jobs SET status = 'COMPLETED', updated_at = ? WHERE id = ?`,
          [this.toMySqlDatetime(job.updatedAt), job.id]
        );
      } catch {}
    }
  }

  private async markFailed(job: QueueJob, errorMsg: string) {
    job.status = 'FAILED';
    job.lastError = errorMsg;
    job.updatedAt = new Date().toISOString();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE queue_jobs 
           SET status = 'FAILED', attempts = ?, last_error = ?, updated_at = ? 
           WHERE id = ?`,
          [job.attempts, job.lastError, this.toMySqlDatetime(job.updatedAt), job.id]
        );
      } catch {}
    }
  }

  async retryFailedJobs(): Promise<number> {
    let count = 0;
    const nowIso = new Date().toISOString();

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [res]: any = await db.query(
          `UPDATE queue_jobs 
           SET status = 'PENDING', attempts = 0, scheduled_for = ?, updated_at = ? 
           WHERE status = 'FAILED'`,
          [this.toMySqlDatetime(nowIso), this.toMySqlDatetime(nowIso)]
        );
        count = res?.affectedRows || 0;
      } catch {}
    }

    for (const j of this.inMemoryJobs.values()) {
      if (j.status === 'FAILED') {
        j.status = 'PENDING';
        j.attempts = 0;
        j.scheduledFor = nowIso;
        count++;
      }
    }

    return count;
  }

  async getStats(): Promise<WorkerStats> {
    let totalJobs = 0;
    let pendingCount = 0;
    let processingCount = 0;
    let completedCount = 0;
    let failedCount = 0;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT status, COUNT(*) as count FROM queue_jobs GROUP BY status`
        );
        for (const row of rows) {
          const c = Number(row.count) || 0;
          totalJobs += c;
          if (row.status === 'PENDING') pendingCount += c;
          else if (row.status === 'PROCESSING') processingCount += c;
          else if (row.status === 'COMPLETED') completedCount += c;
          else if (row.status === 'FAILED') failedCount += c;
        }
        return { totalJobs, pendingCount, processingCount, completedCount, failedCount };
      } catch {}
    }

    for (const j of this.inMemoryJobs.values()) {
      totalJobs++;
      if (j.status === 'PENDING') pendingCount++;
      else if (j.status === 'PROCESSING') processingCount++;
      else if (j.status === 'COMPLETED') completedCount++;
      else if (j.status === 'FAILED') failedCount++;
    }

    return { totalJobs, pendingCount, processingCount, completedCount, failedCount };
  }

  async clearPendingJobs(): Promise<void> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(`DELETE FROM queue_jobs WHERE status = 'PENDING'`);
      } catch {}
    }
    for (const [id, j] of this.inMemoryJobs.entries()) {
      if (j.status === 'PENDING') {
        this.inMemoryJobs.delete(id);
      }
    }
  }

  startWorker(intervalMs: number = 2000) {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        let hasMore = true;
        let batchCount = 0;
        // Process up to 10 jobs per tick to avoid event-loop hogging
        while (hasMore && batchCount < 10) {
          hasMore = await this.processNextJob();
          if (hasMore) batchCount++;
        }
      } catch (err) {
        console.warn('[JobQueue Worker Loop Error]', err);
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  stopWorker() {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }

  private mapRowToJob(row: any): QueueJob {
    let payload = row.payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {}
    }
    return {
      id: row.id,
      salonId: row.salon_id,
      type: row.type,
      payload,
      status: row.status,
      attempts: Number(row.attempts) || 0,
      maxAttempts: Number(row.max_attempts) || 3,
      lastError: row.last_error,
      scheduledFor: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : new Date().toISOString(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  private toMySqlDatetime(isoStr: string | null | undefined): string {
    if (!isoStr) return 'CURRENT_TIMESTAMP';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'CURRENT_TIMESTAMP';
    const YYYY = d.getUTCFullYear();
    const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
    const DD = String(d.getUTCDate()).padStart(2, '0');
    const HH = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
  }
}

export const jobQueue = new JobQueueService();
