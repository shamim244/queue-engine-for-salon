import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { queueEngine } from '../src/engine/queue-engine';
import { salonRoutes } from '../src/routes/salon.routes';
import { repository, seedDemoData } from '../src/db/repository';

describe('Staff Leave Management & Queue Absence Recovery Engine', () => {
  const app = new Elysia().use(salonRoutes);
  let salonId: string;
  let rahulId: string;
  let leoId: string;
  let serviceId: string;
  const salonSlug = `leave-test-${Date.now().toString(36)}`;

  beforeEach(async () => {
    seedDemoData();
    const salon = await repository.createSalon({
      name: 'Leave Test Salon',
      slug: salonSlug,
      phone: '+91 99999 88888',
      stylists: [
        { name: 'Rahul Barber', phone: '+91 99999 88881' },
        { name: 'Leo Barber', phone: '+91 99999 88882' },
      ],
      services: [
        { name: 'Haircut', basePrice: 150, estimatedDurationMinutes: 20 },
      ],
    });

    salonId = salon.id;
    rahulId = salon.stylists[0].id;
    leoId = salon.stylists[1].id;
    serviceId = salon.services[0].id;
  });

  it('1. Records planned staff leave and checks isStylistOnLeave correctly', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Verify initially not on leave
    const initialOnLeave = await repository.isStylistOnLeave(rahulId, today);
    expect(initialOnLeave).toBe(false);

    // Create leave for today
    const leave = await repository.createStaffLeave({
      salonId,
      stylistId: rahulId,
      leaveDate: today,
      reason: 'Family Emergency',
      status: 'APPROVED',
      appliedBy: 'OWNER',
    });

    expect(leave.id).toBeDefined();
    expect(leave.stylistId).toBe(rahulId);
    expect(leave.status).toBe('APPROVED');

    // Verify now on leave
    const isOnLeave = await repository.isStylistOnLeave(rahulId, today);
    expect(isOnLeave).toBe(true);

    // Verify Leo is not on leave
    const isLeoOnLeave = await repository.isStylistOnLeave(leoId, today);
    expect(isLeoOnLeave).toBe(false);

    // Verify leaves list for salon
    const leaves = await repository.getStaffLeaves(salonId);
    expect(leaves.length).toBeGreaterThanOrEqual(1);
    expect(leaves.some((l) => l.stylistId === rahulId)).toBe(true);
  });

  it('2. Late-Detected Absence: Recovers stranded queue to Universal Fast Line preserving FIFO seniority', async () => {
    // 3 clients check in:
    // Client 1: Prefers Rahul
    const tkt1 = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Customer Rahul Fan 1 (#101)',
      customerPhone: '9800000001',
      serviceId,
      stylistId: rahulId,
      source: 'QR_SCAN',
    });

    // Client 2: Fast line (no preference)
    const tkt2 = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Fast Line Customer (#102)',
      customerPhone: '9800000002',
      serviceId,
      source: 'QR_SCAN',
    });

    // Client 3: Prefers Rahul
    const tkt3 = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Customer Rahul Fan 2 (#103)',
      customerPhone: '9800000003',
      serviceId,
      stylistId: rahulId,
      source: 'QR_SCAN',
    });

    // Verify initial stranded state before recovery: Leo calls next, without recovery, only gets #102!
    // But owner notices Rahul hasn't arrived, and triggers absence recovery to Universal Fast Line
    const recoveryResult = await repository.handleStaffAbsenceRecovery({
      salonId,
      stylistId: rahulId,
      action: 'UNIVERSAL_FAST_LINE',
    });

    expect(recoveryResult.affectedCount).toBe(2);

    // Verify tickets have null stylistId (Universal Fast Line)
    const refreshed1 = await repository.getTicketById(tkt1.id);
    const refreshed3 = await repository.getTicketById(tkt3.id);
    expect(refreshed1?.stylistId).toBeNull();
    expect(refreshed3?.stylistId).toBeNull();

    // Verify Rahul is now marked inactive
    const refreshedSalon = await repository.getSalonById(salonId);
    const refreshedRahul = refreshedSalon?.stylists.find((s) => s.id === rahulId);
    expect(refreshedRahul?.isActive).toBe(false);

    // Verify Leo calls next: because Client 1 arrived first at #101, Leo must get Client 1 (#101)!
    const leoCall1 = await queueEngine.callNext(salonId, leoId);
    expect(leoCall1?.id).toBe(tkt1.id);

    // Leo seats and completes Client 1, calls next -> gets Client 2 (#102)
    await queueEngine.seatCustomer(tkt1.id, leoId);
    await queueEngine.finishService(tkt1.id, 'CASH_PAID');
    const leoCall2 = await queueEngine.callNext(salonId, leoId);
    expect(leoCall2?.id).toBe(tkt2.id);

    // Leo seats and completes Client 2, calls next -> gets Client 3 (#103)
    await queueEngine.seatCustomer(tkt2.id, leoId);
    await queueEngine.finishService(tkt2.id, 'CASH_PAID');
    const leoCall3 = await queueEngine.callNext(salonId, leoId);
    expect(leoCall3?.id).toBe(tkt3.id);
  });

  it('3. Late-Detected Absence: Reassigns stranded queue to a specific active colleague', async () => {
    // Client prefers Rahul
    const tkt = await queueEngine.checkIn({
      salonSlug,
      customerName: 'Customer Rahul Reassign (#104)',
      customerPhone: '9800000004',
      serviceId,
      stylistId: rahulId,
      source: 'QR_SCAN',
    });

    // Reassign Rahul's tickets to Leo
    const recoveryResult = await repository.handleStaffAbsenceRecovery({
      salonId,
      stylistId: rahulId,
      action: 'REASSIGN_STYLIST',
      targetStylistId: leoId,
    });

    expect(recoveryResult.affectedCount).toBe(1);

    const refreshedTkt = await repository.getTicketById(tkt.id);
    expect(refreshedTkt?.stylistId).toBe(leoId);

    // Leo calls next and immediately gets the reassigned ticket
    const leoCall = await queueEngine.callNext(salonId, leoId);
    expect(leoCall?.id).toBe(tkt.id);
  });

  it('4. REST API: Create leave, list leaves, check stranded tickets, and handle absence', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Step A: Create leave via POST /api/salons/:id/staff-leaves
    const createRes = await app.handle(
      new Request(`http://localhost/api/salons/${salonId}/staff-leaves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stylistId: rahulId,
          leaveDate: today,
          reason: 'Sick Leave',
          status: 'APPROVED',
          appliedBy: 'OWNER',
        }),
      })
    );

    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    expect(createData.leave.id).toBeDefined();
    const leaveId = createData.leave.id;

    // Step B: List leaves via GET /api/salons/:id/staff-leaves
    const listRes = await app.handle(
      new Request(`http://localhost/api/salons/${salonId}/staff-leaves?stylistId=${rahulId}`)
    );
    expect(listRes.status).toBe(200);
    const listData = await listRes.json();
    expect(listData.leaves.length).toBeGreaterThanOrEqual(1);

    // Step C: Update leave status via PATCH /api/salons/:id/staff-leaves/:leaveId
    const patchRes = await app.handle(
      new Request(`http://localhost/api/salons/${salonId}/staff-leaves/${leaveId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
    );
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.leave.status).toBe('CANCELLED');

    // Step D: Add customer in queue preferring Rahul
    const tkt = await queueEngine.checkIn({
      salonSlug,
      customerName: 'API Test Customer',
      customerPhone: '9800000009',
      serviceId,
      stylistId: rahulId,
      source: 'QR_SCAN',
    });

    // Step E: Check stranded tickets via GET /api/salons/:id/stylists/:stylistId/stranded-tickets
    const strandedRes = await app.handle(
      new Request(`http://localhost/api/salons/${salonId}/stylists/${rahulId}/stranded-tickets`)
    );
    expect(strandedRes.status).toBe(200);
    const strandedData = await strandedRes.json();
    expect(strandedData.count).toBe(1);
    expect(strandedData.tickets[0].id).toBe(tkt.id);

    // Step F: Execute 1-tap absence recovery via POST /api/salons/:id/staff-leaves/handle-absence
    const recoveryRes = await app.handle(
      new Request(`http://localhost/api/salons/${salonId}/staff-leaves/handle-absence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stylistId: rahulId,
          action: 'UNIVERSAL_FAST_LINE',
          reason: 'Manager 1-tap shift to universal line',
        }),
      })
    );
    expect(recoveryRes.status).toBe(200);
    const recoveryData = await recoveryRes.json();
    expect(recoveryData.success).toBe(true);
    expect(recoveryData.affectedCount).toBe(1);

    // Verify ticket is now in Universal Fast Line
    const refreshedTkt = await repository.getTicketById(tkt.id);
    expect(refreshedTkt?.stylistId).toBeNull();
  });
});
