import { describe, it, expect, beforeEach } from 'bun:test';
import { executeMidnightQueueReset, registerResetHandler } from '../src/worker/handlers/reset.handler';
import { repository, seedDemoData } from '../src/db/repository';
import { jobQueue } from '../src/worker/job-queue';

describe('Midnight Queue Auto-Reset & Stale Ticket Cleanup Worker', () => {
  beforeEach(async () => {
    seedDemoData();
    registerResetHandler();
    await jobQueue.clearPendingJobs();
  });

  it('should automatically expire tickets older than cutoff hours and mark as NO_SHOW', async () => {
    // 1. Create a stale ticket with checkInTime 24 hours in the past
    const staleTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const staleTicketId = 'tkt-stale-' + Math.random().toString(36).substring(2, 7);

    await repository.createTicket({
      id: staleTicketId,
      salonId: 'salon-rural-01',
      ticketNumber: 999,
      customerName: 'Stale Client',
      customerPhone: '9876543299',
      serviceId: 'srv-rural-haircut',
      serviceName: 'Haircut',
      totalPrice: 100,
      totalDurationMinutes: 15,
      status: 'WAITING',
      source: 'QR_SCAN',
      estimatedWaitMinutes: 0,
      checkInTime: staleTime,
      paymentStatus: 'PENDING',
    });

    // 2. Execute midnight reset with 12-hour cutoff
    const result = await executeMidnightQueueReset({ cutoffHours: 12, salonId: 'salon-rural-01' });
    expect(result.expiredCount).toBeGreaterThanOrEqual(1);

    // 3. Verify ticket status is now NO_SHOW
    const updated = await repository.getTicketById(staleTicketId);
    expect(updated?.status).toBe('NO_SHOW');
  });

  it('should not expire fresh tickets created within normal operating hours', async () => {
    const freshTicketId = 'tkt-fresh-' + Math.random().toString(36).substring(2, 7);

    await repository.createTicket({
      id: freshTicketId,
      salonId: 'salon-rural-01',
      ticketNumber: 998,
      customerName: 'Fresh Client',
      customerPhone: '9876543298',
      serviceId: 'srv-rural-haircut',
      serviceName: 'Haircut',
      totalPrice: 100,
      totalDurationMinutes: 15,
      status: 'WAITING',
      source: 'QR_SCAN',
      estimatedWaitMinutes: 10,
      checkInTime: new Date().toISOString(),
      paymentStatus: 'PENDING',
    });

    const result = await executeMidnightQueueReset({ cutoffHours: 12, salonId: 'salon-rural-01' });
    const freshTicket = await repository.getTicketById(freshTicketId);
    expect(freshTicket?.status).toBe('WAITING');
  });

  it('should successfully execute via jobQueue.enqueue(MIDNIGHT_RESET)', async () => {
    const job = await jobQueue.enqueue('MIDNIGHT_RESET', { cutoffHours: 12 });
    expect(job.status).toBe('PENDING');

    const processed = await jobQueue.processNextJob();
    expect(processed).toBe(true);

    const completedJob = await jobQueue.getJobById(job.id);
    expect(completedJob?.status).toBe('COMPLETED');
  });
});
