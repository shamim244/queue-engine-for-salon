import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { repository, seedDemoData } from '../src/db/repository';
import { paymentRepo } from '../src/db/repositories/payment.repo';
import type { Appointment } from '../src/engine/types';

describe('ADR 005 - C1: Secure Appointment Payment Confirmation', () => {
  const salonSlug = 'ramesh-barber';
  let salonId: string;
  let serviceId: string;
  let stylistId: string;

  beforeEach(async () => {
    seedDemoData();
    const salon = await repository.getSalonBySlug(salonSlug);
    if (salon) {
      salonId = salon.id;
      serviceId = salon.services[0]?.id || 'service-01';
      stylistId = salon.stylists[0]?.id || 'stylist-01';
    }
  });

  it('C1.1: should reject confirmation for non-existent appointment ID', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/v1/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: 'non-existent-appt-id',
          paymentId: 'pay_valid_123',
        }),
      })
    );

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('C1.2: should reject confirmation without paymentId when advanceAmount > 0', async () => {
    const targetDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const initRes = await app.handle(
      new Request('http://localhost/api/v1/appointments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonSlug,
          serviceId,
          stylistId,
          date: targetDate,
          slotTime: '12:00',
          customerName: 'Test Unpaid',
          customerPhone: '9876543210',
          advanceType: 'TOKEN',
        }),
      })
    );
    const initData = await initRes.json();
    expect(initData.success).toBe(true);

    const confirmRes = await app.handle(
      new Request('http://localhost/api/v1/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: initData.appointmentId,
          paymentId: '', // Empty paymentId
        }),
      })
    );

    expect(confirmRes.status).toBe(400);
    const confirmData = await confirmRes.json();
    expect(confirmData.success).toBe(false);
  });

  it('C1.3: should reject confirmation for a CANCELLED appointment', async () => {
    const targetDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const initRes = await app.handle(
      new Request('http://localhost/api/v1/appointments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonSlug,
          serviceId,
          stylistId,
          date: targetDate,
          slotTime: '13:00',
          customerName: 'Cancelled Booking',
          customerPhone: '9876543210',
          advanceType: 'TOKEN',
        }),
      })
    );
    const initData = await initRes.json();
    await repository.updateAppointment(initData.appointmentId, { status: 'CANCELLED' });

    const confirmRes = await app.handle(
      new Request('http://localhost/api/v1/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: initData.appointmentId,
          paymentId: 'pay_cancelled_attempt',
        }),
      })
    );

    expect(confirmRes.status).toBe(400);
    const confirmData = await confirmRes.json();
    expect(confirmData.success).toBe(false);
    expect(confirmData.error).toContain('Cannot transition');
  });

  it('C1.4: should reject confirmation when hold window (10 minutes) has expired', async () => {
    const targetDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const initRes = await app.handle(
      new Request('http://localhost/api/v1/appointments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonSlug,
          serviceId,
          stylistId,
          date: targetDate,
          slotTime: '14:00',
          customerName: 'Expired Booking',
          customerPhone: '9876543210',
          advanceType: 'TOKEN',
        }),
      })
    );
    const initData = await initRes.json();

    // Artificially age the appointment by 15 minutes
    const oldTimestamp = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    await repository.updateAppointment(initData.appointmentId, { createdAt: oldTimestamp } as any);

    const confirmRes = await app.handle(
      new Request('http://localhost/api/v1/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: initData.appointmentId,
          paymentId: 'pay_expired_window',
        }),
      })
    );

    expect(confirmRes.status).toBe(400);
    const confirmData = await confirmRes.json();
    expect(confirmData.success).toBe(false);
    expect(confirmData.error).toContain('expired');
  });

  it('C1.5: should reject confirmation when paymentId is reused across appointments', async () => {
    const targetDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    
    // Booking 1
    const initRes1 = await app.handle(
      new Request('http://localhost/api/v1/appointments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonSlug,
          serviceId,
          stylistId,
          date: targetDate,
          slotTime: '15:00',
          customerName: 'User One',
          customerPhone: '9876543210',
          advanceType: 'TOKEN',
        }),
      })
    );
    const initData1 = await initRes1.json();

    // Confirm Booking 1 with shared payment ID
    const sharedPaymentId = 'pay_reused_unique_999';
    const confirmRes1 = await app.handle(
      new Request('http://localhost/api/v1/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: initData1.appointmentId,
          paymentId: sharedPaymentId,
        }),
      })
    );
    expect(confirmRes1.status).toBe(200);

    // Booking 2
    const initRes2 = await app.handle(
      new Request('http://localhost/api/v1/appointments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonSlug,
          serviceId,
          stylistId,
          date: targetDate,
          slotTime: '16:00',
          customerName: 'User Two',
          customerPhone: '9876543211',
          advanceType: 'TOKEN',
        }),
      })
    );
    const initData2 = await initRes2.json();

    // Attempt to confirm Booking 2 with same reused paymentId
    const confirmRes2 = await app.handle(
      new Request('http://localhost/api/v1/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: initData2.appointmentId,
          paymentId: sharedPaymentId,
        }),
      })
    );

    expect(confirmRes2.status).toBe(400);
    const confirmData2 = await confirmRes2.json();
    expect(confirmData2.success).toBe(false);
    expect(confirmData2.error).toContain('already been used');
  });

  it('C1.6: should confirm valid appointment and be idempotent on duplicate calls', async () => {
    const targetDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    const initRes = await app.handle(
      new Request('http://localhost/api/v1/appointments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonSlug,
          serviceId,
          stylistId,
          date: targetDate,
          slotTime: '17:00',
          customerName: 'Idempotent User',
          customerPhone: '9876543210',
          advanceType: 'TOKEN',
        }),
      })
    );
    const initData = await initRes.json();
    const paymentId = 'pay_success_1700';

    // First call: Should succeed
    const confirmRes1 = await app.handle(
      new Request('http://localhost/api/v1/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: initData.appointmentId,
          paymentId,
        }),
      })
    );
    expect(confirmRes1.status).toBe(200);
    const data1 = await confirmRes1.json();
    expect(data1.success).toBe(true);
    expect(data1.appointment.status).toBe('CONFIRMED');
    expect(data1.appointment.gatewayPaymentId).toBe(paymentId);

    // Second call: Should be safe idempotent success
    const confirmRes2 = await app.handle(
      new Request('http://localhost/api/v1/appointments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: initData.appointmentId,
          paymentId,
        }),
      })
    );
    expect(confirmRes2.status).toBe(200);
    const data2 = await confirmRes2.json();
    expect(data2.success).toBe(true);
    expect(data2.appointment.status).toBe('CONFIRMED');
  });
});
