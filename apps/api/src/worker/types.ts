export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type JobType =
  | 'SEND_WHATSAPP'
  | 'SEND_SMS'
  | 'MIDNIGHT_RESET'
  | 'DAILY_TELEMETRY'
  | string;

export interface QueueJob<T = any> {
  id: string;
  salonId?: string | null;
  type: JobType;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  scheduledFor: string;
  retryDelayMs?: number;
  createdAt: string;
  updatedAt: string;
}

export type JobHandler<T = any> = (job: QueueJob<T>) => Promise<any>;

export interface EnqueueOptions {
  salonId?: string | null;
  maxAttempts?: number;
  retryDelayMs?: number;
  delayMs?: number;
}

export interface WorkerStats {
  totalJobs: number;
  pendingCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
}
