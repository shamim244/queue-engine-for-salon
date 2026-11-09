import { repository } from '../db/repository';
import { jobQueue } from './job-queue';
import type { SalonPayoutRecord, Appointment } from '../engine/types';

export function calculatePayoutSplit(grossAmount: number): {
  grossAmount: number;
  gatewayFee: number;
  platformFee: number;
  netPayout: number;
} {
  const gross = Math.round(grossAmount * 100) / 100;
  const gatewayFee = Math.round(gross * 0.02 * 100) / 100;     // 2.0% Payment Gateway Fee
  const platformFee = Math.round(gross * 0.01 * 100) / 100;    // 1.0% Platform Commission
  const netPayout = Math.round((gross - gatewayFee - platformFee) * 100) / 100; // 97.0% Net Owner Payout

  return {
    grossAmount: gross,
    gatewayFee,
    platformFee,
    netPayout,
  };
}

export interface DailySettlementOptions {
  date?: string;           // YYYY-MM-DD
  salonId?: string;
  autoSettle?: boolean;
}

/**
 * Daily Midnight Settlement Engine (T+1 Automated Disbursal)
 * Aggregates all completed appointments from the prior operating day,
 * calculates 97% net owner payout (2% PG fee + 1% platform commission),
 * and creates salon_payout_records.
 */
export async function runDailySettlement(
  options: DailySettlementOptions = {}
): Promise<SalonPayoutRecord[]> {
  // Default date to yesterday if not specified
  const targetDate =
    options.date ||
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const salons = options.salonId
    ? [await repository.getSalonById(options.salonId)].filter(Boolean)
    : await repository.getAllSalons();

  const payoutRecords: SalonPayoutRecord[] = [];

  for (const salon of salons) {
    if (!salon) continue;

    // Fetch all completed/no-show appointments for this date where funds are released to owner
    const allAppointments = await repository.getAppointments({
      salonId: salon.id,
      scheduledDate: targetDate,
    });

    const eligibleAppointments = allAppointments.filter((a) => {
      // Completed services or forfeited customer no-shows
      const isFinished = a.status === 'COMPLETED' || a.status === 'NO_SHOW';
      const isReleased = a.escrowStatus === 'RELEASED_TO_OWNER';
      return isFinished && isReleased && a.advanceAmount > 0;
    });

    if (eligibleAppointments.length === 0) {
      continue;
    }

    const grossAmount = eligibleAppointments.reduce(
      (sum, a) => sum + (a.advanceAmount || 0),
      0
    );

    if (grossAmount <= 0) continue;

    const split = calculatePayoutSplit(grossAmount);
    const payoutId = 'payout-' + Math.random().toString(36).substring(2, 9);
    const referenceId = 'disb_' + Math.random().toString(36).substring(2, 10);

    const record: SalonPayoutRecord = {
      id: payoutId,
      salonId: salon.id,
      periodStart: targetDate,
      periodEnd: targetDate,
      grossAmount: split.grossAmount,
      gatewayFee: split.gatewayFee,
      platformFee: split.platformFee,
      netPayout: split.netPayout,
      payoutVpa: salon.upiPaymentId || 'salon@upi',
      payoutReferenceId: referenceId,
      status: options.autoSettle !== false ? 'SETTLED' : 'PENDING',
      settledAt: options.autoSettle !== false ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    const saved = await repository.createPayoutRecord(record);
    payoutRecords.push(saved);
  }

  return payoutRecords;
}

export function registerPayoutHandler(): void {
  jobQueue.registerHandler('DAILY_PAYOUT_SETTLEMENT', async (job) => {
    const payload = job.payload || {};
    const results = await runDailySettlement({
      date: payload.date,
      salonId: payload.salonId,
    });
    return {
      settledCount: results.length,
      records: results.map((r) => ({ id: r.id, netPayout: r.netPayout })),
    };
  });
}
