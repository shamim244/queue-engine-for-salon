import { jobQueue } from '../job-queue';
import { notificationService } from '../../notifications/whatsapp';
import type { QueueJob } from '../types';

export function registerNotificationHandler() {
  jobQueue.registerHandler('SEND_WHATSAPP', async (job: QueueJob) => {
    return await notificationService.sendWhatsApp(job.payload);
  });
}
