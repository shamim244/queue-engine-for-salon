import { getDb, isMySqlConnected } from '../../db/mysql';
import { repository } from '../../db/repository';
import { websocketHub } from '../../websocket/hub';
import { jobQueue } from '../job-queue';
import type { QueueJob } from '../types';

export interface ResetParams {
  cutoffHours?: number;
  salonId?: string;
}

export async function executeMidnightQueueReset(params: ResetParams = {}): Promise<{
  success: boolean;
  expiredCount: number;
  cutoffTime: string;
}> {
  const cutoffHours = params.cutoffHours || 12;
  const cutoffDate = new Date(Date.now() - cutoffHours * 60 * 60 * 1000);
  const cutoffIso = cutoffDate.toISOString();

  let expiredCount = 0;
  const affectedSalonIds = new Set<string>();

  if (params.salonId) {
    affectedSalonIds.add(params.salonId);
  }

  if (isMySqlConnected) {
    try {
      const db = getDb();
      let query = `UPDATE queue_tickets 
                   SET status = 'NO_SHOW' 
                   WHERE status IN ('WAITING', 'SUMMONED', 'SOFT_BUMPED') 
                     AND check_in_time <= DATE_SUB(NOW(), INTERVAL ? HOUR)`;
      const queryParams: any[] = [cutoffHours];

      if (params.salonId) {
        query += ` AND salon_id = ?`;
        queryParams.push(params.salonId);
      }

      const [res]: any = await db.query(query, queryParams);
      expiredCount = res?.affectedRows || 0;
    } catch (err: any) {
      console.warn(`[ResetHandler MySQL Warning] ${err.message}`);
    }
  }

  // Also clean up any in-memory tickets (for fallback / unit test environments)
  const allSalons = await repository.getAllSalons();
  for (const s of allSalons) {
    if (params.salonId && s.id !== params.salonId) continue;
    const active = await repository.getActiveTickets(s.id);
    for (const t of active) {
      const ticketTime = new Date(t.checkInTime).getTime();
      if (ticketTime <= cutoffDate.getTime()) {
        await repository.updateTicketStatus(t.id, 'NO_SHOW');
        expiredCount++;
        affectedSalonIds.add(s.id);
      }
    }
  }

  // Broadcast updates to clients in affected salons
  for (const sId of affectedSalonIds) {
    websocketHub.broadcastToSalon(sId, {
      type: 'QUEUE_UPDATED',
      salonId: sId,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    success: true,
    expiredCount,
    cutoffTime: cutoffIso,
  };
}

export function registerResetHandler() {
  jobQueue.registerHandler('MIDNIGHT_RESET', async (job: QueueJob<ResetParams>) => {
    return await executeMidnightQueueReset(job.payload || {});
  });
}

function toMySqlDatetime(isoStr: string): string {
  const d = new Date(isoStr);
  const YYYY = d.getUTCFullYear();
  const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(d.getUTCDate()).padStart(2, '0');
  const HH = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}
