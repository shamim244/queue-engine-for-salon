import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from '../index';
import { repository, seedDemoData } from '../src/db/repository';
import { queueEngine } from '../src/engine/queue-engine';
import { calculateWaitTimes } from '../src/engine/wait-time';
import { runDailySettlement, calculatePayoutSplit } from '../src/worker/payout-worker';
import type { Appointment, QueueTicket, Stylist } from '../src/engine/types';

describe('Hybrid Appointment Booking, Dynamic Buffer Interleaving & Escrow Payout Engine', () => {
  const salonSlug = 'ramesh-barber';
  let salonId: string;

  beforeEach(async () => {
    seedDemoData();
    const salon = await repository.getSalonBySlug(salonSlug);
    if (salon) {
      salonId = salon.id;
    }
  });

  describe('1. Slot Generation & Double-Booking Prevention', () => {
    it('should generate available 30-minute slots for a given date', async () => {
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
      const res = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/appointments/slots?date=${tomorrow}`)
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.date).toBe(tomorrow);
      expect(Array.isArray(data.slots)).toBe(true);
      expect(data.slots.length).toBeGreaterThan(10);
      expect(data.slots.some((s: any) => s.time === '11:00' && s.available === true)).toBe(true);
    });

    it('should prevent double-booking the same stylist and slot atomically', async () => {
      const targetDate = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const salon = await repository.getSalonBySlug(salonSlug);
      const serviceId = salon?.services[0]?.id || 'service-01';
      const stylistId = salon?.stylists[0]?.id;

      // First Booking: initiate & confirm
      const initRes1 = await app.handle(
        new Request('http://localhost/api/v1/appointments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug,
            serviceId,
            stylistId,
            date: targetDate,
            slotTime: '11:00',
            customerName: 'Customer Alpha',
            customerPhone: '9876543210',
            advanceType: 'TOKEN',
          }),
        })
      );

      expect(initRes1.status).toBe(200);
      const initData1 = await initRes1.json();
      expect(initData1.success).toBe(true);
      expect(initData1.advanceAmount).toBeGreaterThanOrEqual(50);

      // Confirm First Booking
      const confirmRes = await app.handle(
        new Request('http://localhost/api/v1/appointments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: initData1.appointmentId,
            paymentId: 'pay_test_001',
          }),
        })
      );
      expect(confirmRes.status).toBe(200);
      const confirmData = await confirmRes.json();
      expect(confirmData.appointment.status).toBe('CONFIRMED');

      // Second Booking Attempt for the exact same slot & stylist
      const initRes2 = await app.handle(
        new Request('http://localhost/api/v1/appointments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug,
            serviceId,
            stylistId,
            date: targetDate,
            slotTime: '11:00',
            customerName: 'Customer Beta',
            customerPhone: '9876543211',
            advanceType: 'TOKEN',
          }),
        })
      );

      // Should be rejected with HTTP 409 Conflict
      expect(initRes2.status).toBe(409);
      const initData2 = await initRes2.json();
      expect(initData2.success).toBe(false);
      expect(initData2.error).toContain('no longer available');

      // Verify slots API now marks 11:00 as booked
      const slotsRes = await app.handle(
        new Request(
          `http://localhost/api/v1/salons/${salonSlug}/appointments/slots?date=${targetDate}&stylistId=${stylistId}`
        )
      );
      const slotsData = await slotsRes.json();
      const slot11 = slotsData.slots.find((s: any) => s.time === '11:00');
      expect(slot11?.available).toBe(false);
      expect(slot11?.reason).toBe('APPOINTMENT_BOOKED');
    });

    it('should resolve concurrent race condition when two users book the same slot at the exact same millisecond', async () => {
      const targetDate = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const salon = await repository.getSalonBySlug(salonSlug);
      const serviceId = salon?.services[0]?.id || 'service-01';
      const stylistId = salon?.stylists[0]?.id;

      // Two users concurrently attempt to book the identical stylist and slot
      const [res1, res2] = await Promise.all([
        app.handle(
          new Request('http://localhost/api/v1/appointments/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              salonSlug,
              serviceId,
              stylistId,
              date: targetDate,
              slotTime: '14:00',
              customerName: 'User Concurrent A',
              customerPhone: '9870001111',
              advanceType: 'TOKEN',
            }),
          })
        ),
        app.handle(
          new Request('http://localhost/api/v1/appointments/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              salonSlug,
              serviceId,
              stylistId,
              date: targetDate,
              slotTime: '14:00',
              customerName: 'User Concurrent B',
              customerPhone: '9870002222',
              advanceType: 'TOKEN',
            }),
          })
        ),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one succeeds (200) and one receives conflict (409)
      expect(statuses).toEqual([200, 409]);
    });
  });

  describe('2. Self-Service 1-Hour Reschedule Validation', () => {
    it('should successfully reschedule when more than 1 hour remains before slot', async () => {
      const date1 = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const date2 = new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const salon = await repository.getSalonBySlug(salonSlug);
      const serviceId = salon?.services[0]?.id || 'service-01';

      // Create appointment for date1 at 15:00
      const initRes = await app.handle(
        new Request('http://localhost/api/v1/appointments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug,
            serviceId,
            date: date1,
            slotTime: '15:00',
            customerName: 'Rohan Sharma',
            customerPhone: '9876543222',
            advanceType: 'FULL',
          }),
        })
      );
      const initData = await initRes.json();

      await app.handle(
        new Request('http://localhost/api/v1/appointments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: initData.appointmentId,
            paymentId: 'pay_test_002',
          }),
        })
      );

      // Reschedule to date2 at 16:00
      const reschedRes = await app.handle(
        new Request(`http://localhost/api/v1/appointments/${initData.appointmentId}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newDate: date2,
            newSlotTime: '16:00',
          }),
        })
      );

      expect(reschedRes.status).toBe(200);
      const reschedData = await reschedRes.json();
      expect(reschedData.success).toBe(true);
      expect(reschedData.appointment.scheduledDate).toBe(date2);
      expect(reschedData.appointment.slotStartTime).toBe('16:00');

      // Verify original slot is now released and free
      const slotsRes = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/appointments/slots?date=${date1}`)
      );
      const slotsData = await slotsRes.json();
      const slot15 = slotsData.slots.find((s: any) => s.time === '15:00');
      expect(slot15?.available).toBe(true);
    });

    it('should reject rescheduling when less than 1 hour remains before scheduled slot', async () => {
      // Create appointment starting in 20 minutes from now
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const in20Mins = new Date(now.getTime() + 20 * 60 * 1000);
      const slotTime = `${String(in20Mins.getHours()).padStart(2, '0')}:${String(in20Mins.getMinutes()).padStart(2, '0')}`;
      const endTime = `${String(in20Mins.getHours()).padStart(2, '0')}:${String(in20Mins.getMinutes() + 30).padStart(2, '0')}`;

      const salon = await repository.getSalonBySlug(salonSlug);
      const apptId = 'appt-late-' + Math.random().toString(36).substring(2, 9);
      const appt: Appointment = {
        id: apptId,
        salonId: salon!.id,
        stylistId: salon!.stylists[0].id,
        customerName: 'Late Customer',
        customerPhone: '9870001111',
        serviceId: salon!.services[0].id,
        serviceName: salon!.services[0].name,
        scheduledDate: todayStr,
        slotStartTime: slotTime,
        slotEndTime: endTime,
        durationMinutes: 30,
        advanceAmount: 100,
        totalPrice: 200,
        paymentMethod: 'RAZORPAY',
        escrowStatus: 'HELD',
        status: 'CONFIRMED',
      };
      await repository.createAppointment(appt);

      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
      const reschedRes = await app.handle(
        new Request(`http://localhost/api/v1/appointments/${apptId}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newDate: tomorrow,
            newSlotTime: '11:00',
          }),
        })
      );

      // Must be rejected with HTTP 400 Bad Request
      expect(reschedRes.status).toBe(400);
      const reschedData = await reschedRes.json();
      expect(reschedData.success).toBe(false);
      expect(reschedData.error).toContain('1 hour prior');
    });

    it('should reject rescheduling for non-CONFIRMED appointments (e.g. NO_SHOW or IN_CHAIR)', async () => {
      const targetDate = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const salon = await repository.getSalonBySlug(salonSlug);
      const apptId = 'appt-noshow-' + Math.random().toString(36).substring(2, 9);
      const appt: Appointment = {
        id: apptId,
        salonId: salon!.id,
        stylistId: salon!.stylists[0].id,
        customerName: 'No Show Customer',
        customerPhone: '9870003333',
        serviceId: salon!.services[0].id,
        serviceName: salon!.services[0].name,
        scheduledDate: targetDate,
        slotStartTime: '11:00',
        slotEndTime: '11:30',
        durationMinutes: 30,
        advanceAmount: 100,
        totalPrice: 200,
        paymentMethod: 'RAZORPAY',
        escrowStatus: 'RELEASED_TO_OWNER',
        status: 'NO_SHOW',
      };
      await repository.createAppointment(appt);

      const reschedRes = await app.handle(
        new Request(`http://localhost/api/v1/appointments/${apptId}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newDate: targetDate,
            newSlotTime: '14:00',
          }),
        })
      );

      expect(reschedRes.status).toBe(400);
      const data = await reschedRes.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Cannot reschedule appointment in NO_SHOW status');
    });
  });

  describe('2b. Appointment Seating and Chair Progression', () => {
    it('should seat a confirmed/checked-in appointment in chair and reflect on wait times', async () => {
      const salon = await repository.getSalonBySlug(salonSlug);
      const targetDate = new Date().toISOString().slice(0, 10);
      const apptId = 'appt-seat-' + Math.random().toString(36).substring(2, 9);
      const appt: Appointment = {
        id: apptId,
        salonId: salon!.id,
        stylistId: salon!.stylists[0].id,
        customerName: 'In-Chair VIP',
        customerPhone: '9870004444',
        serviceId: salon!.services[0].id,
        serviceName: salon!.services[0].name,
        scheduledDate: targetDate,
        slotStartTime: '12:00',
        slotEndTime: '12:45',
        durationMinutes: 45,
        advanceAmount: 150,
        totalPrice: 300,
        paymentMethod: 'RAZORPAY',
        escrowStatus: 'HELD',
        status: 'CHECKED_IN',
      };
      await repository.createAppointment(appt);

      // Seat the appointment
      const seatRes = await app.handle(
        new Request(`http://localhost/api/v1/appointments/${apptId}/seat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stylistId: salon!.stylists[0].id }),
        })
      );

      expect(seatRes.status).toBe(200);
      const seatData = await seatRes.json();
      expect(seatData.success).toBe(true);
      expect(seatData.appointment.status).toBe('IN_CHAIR');

      // Verify cannot re-seat or seat if completed
      await repository.updateAppointment(apptId, { status: 'COMPLETED' });
      const badSeatRes = await app.handle(
        new Request(`http://localhost/api/v1/appointments/${apptId}/seat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(badSeatRes.status).toBe(400);
    });
  });

  describe('3. Dynamic Timeline Buffer Interleaving & 10-Minute Grace Window', () => {
    it('should fit quick walk-in before appointment, and push long walk-in after appointment', () => {
      // Simulate current time: 10:15 AM
      const simulatedNow = new Date('2026-11-10T10:15:00.000Z');
      simulatedNow.setHours(10, 15, 0, 0);

      const stylist: Stylist = {
        id: 'stylist-vikas',
        salonId: 'salon-1',
        name: 'Vikas Barber',
        phone: '9800000001',
        isActive: true,
        historicalAvgDurationMinutes: 20,
      };

      // Current ticket in chair finishes at 10:45 AM (30 mins from 10:15)
      const inChairTicket: QueueTicket = {
        id: 'tkt-in-chair',
        salonId: 'salon-1',
        stylistId: stylist.id,
        ticketNumber: 101,
        customerName: 'Seated Walk-in',
        customerPhone: '9800000002',
        serviceId: 'srv-1',
        serviceName: 'Haircut',
        totalPrice: 150,
        totalDurationMinutes: 30,
        status: 'IN_CHAIR',
        source: 'QR_SCAN',
        checkInTime: new Date(simulatedNow.getTime() - 15 * 60 * 1000).toISOString(),
        startedTime: new Date(simulatedNow.getTime() - 15 * 60 * 1000).toISOString(),
      };

      // Locked appointment: 11:00 AM - 11:40 AM (45 mins from 10:15)
      const appointment: Appointment = {
        id: 'appt-rohan',
        salonId: 'salon-1',
        stylistId: stylist.id,
        customerName: 'Rohan Sharma',
        customerPhone: '9800000003',
        serviceId: 'srv-combo',
        serviceName: 'Haircut + Beard',
        scheduledDate: simulatedNow.toISOString().slice(0, 10),
        slotStartTime: '11:00',
        slotEndTime: '11:40',
        durationMinutes: 40,
        advanceAmount: 100,
        totalPrice: 350,
        paymentMethod: 'RAZORPAY',
        escrowStatus: 'HELD',
        status: 'CONFIRMED',
      };

      // Walk-in Ticket 1: Quick 10-minute trim (fits in the 10:45 - 11:00 gap!)
      const quickWalkIn: QueueTicket = {
        id: 'tkt-quick',
        salonId: 'salon-1',
        stylistId: stylist.id,
        ticketNumber: 102,
        customerName: 'Quick Trim Amit',
        customerPhone: '9800000004',
        serviceId: 'srv-trim',
        serviceName: 'Quick Trim',
        totalPrice: 80,
        totalDurationMinutes: 10,
        status: 'WAITING',
        source: 'QR_SCAN',
        checkInTime: simulatedNow.toISOString(),
      };

      // Walk-in Ticket 2: 40-minute styling (cannot fit before 11:00, must be pushed after 11:40!)
      const longWalkIn: QueueTicket = {
        id: 'tkt-long',
        salonId: 'salon-1',
        stylistId: stylist.id,
        ticketNumber: 103,
        customerName: 'Long Style Suresh',
        customerPhone: '9800000005',
        serviceId: 'srv-style',
        serviceName: 'Full Styling',
        totalPrice: 300,
        totalDurationMinutes: 40,
        status: 'WAITING',
        source: 'QR_SCAN',
        checkInTime: new Date(simulatedNow.getTime() + 1000).toISOString(),
      };

      const waitCalculations = calculateWaitTimes(
        [inChairTicket, quickWalkIn, longWalkIn],
        [stylist],
        [appointment],
        simulatedNow
      );

      // Quick walk-in starts when in-chair finishes at 10:45 (15 mins from 10:15)
      const quickCalc = waitCalculations.get(quickWalkIn.id);
      expect(quickCalc).toBeDefined();
      expect(quickCalc!.estimatedMinutes).toBe(15);

      // Long walk-in cannot fit before 11:00 AM, so it must wait until appointment ends at 11:40 AM
      // (10:15 to 11:40 is 85 minutes)
      const longCalc = waitCalculations.get(longWalkIn.id);
      expect(longCalc).toBeDefined();
      expect(longCalc!.estimatedMinutes).toBeGreaterThanOrEqual(85);
    });

    it('should forfeit late appointment and auto-summon next walk-in after 10-minute grace window', async () => {
      const salon = await repository.getSalonBySlug(salonSlug);
      expect(salon).toBeDefined();

      // Clear any pre-existing waiting tickets in salon for clean isolation
      const existing = await repository.getActiveTickets(salon!.id);
      for (const t of existing) {
        await repository.updateTicketStatus(t.id, 'COMPLETED');
      }

      const todayStr = new Date().toISOString().slice(0, 10);

      // Create an appointment scheduled for 10:00 AM
      const lateApptId = 'appt-grace-' + Math.random().toString(36).substring(2, 9);
      const lateAppt: Appointment = {
        id: lateApptId,
        salonId: salon!.id,
        stylistId: salon!.stylists[0].id,
        customerName: 'Late No-Show Customer',
        customerPhone: '9870009999',
        serviceId: salon!.services[0].id,
        serviceName: salon!.services[0].name,
        scheduledDate: todayStr,
        slotStartTime: '10:00',
        slotEndTime: '10:30',
        durationMinutes: 30,
        advanceAmount: 100,
        totalPrice: 200,
        paymentMethod: 'RAZORPAY',
        escrowStatus: 'HELD',
        status: 'CONFIRMED',
      };
      await repository.createAppointment(lateAppt);

      // Create a waiting walk-in ticket
      const walkInTicketId = 'tkt-next-' + Math.random().toString(36).substring(2, 9);
      const walkInTicket: QueueTicket = {
        id: walkInTicketId,
        salonId: salon!.id,
        stylistId: salon!.stylists[0].id,
        ticketNumber: 105,
        customerName: 'Waiting Walk-in Patron',
        customerPhone: '9870008888',
        serviceId: salon!.services[0].id,
        serviceName: salon!.services[0].name,
        totalPrice: 150,
        totalDurationMinutes: 25,
        status: 'WAITING',
        source: 'QR_SCAN',
        checkInTime: new Date().toISOString(),
      };
      await repository.createTicket(walkInTicket);

      // Simulate clock at 10:12 AM (12 minutes past slot_start_time, exceeding 10m grace period)
      const simulatedClock = new Date();
      simulatedClock.setHours(10, 12, 0, 0);

      const result = await queueEngine.checkAppointmentGracePeriod(salon!.id, simulatedClock);

      expect(result.expiredAppointments).toContain(lateApptId);

      // Check appointment status transitioned to NO_SHOW and escrow released to owner
      const updatedAppt = await repository.getAppointmentById(lateApptId);
      expect(updatedAppt?.status).toBe('NO_SHOW');
      expect(updatedAppt?.escrowStatus).toBe('RELEASED_TO_OWNER');

      // Verify the waiting walk-in ticket was summoned into the freed chair
      expect(result.autoSummonedTicket).toBeDefined();
      expect(result.autoSummonedTicket?.id).toBe(walkInTicketId);
      expect(result.autoSummonedTicket?.status).toBe('SUMMONED');
    });
  });

  describe('4. Daily Escrow Settlement & 97% Net Owner Payout Ledger Math', () => {
    it('should accurately calculate 97% net owner payout (2% PG fee + 1% platform commission)', () => {
      // Test cases with diverse amounts
      const testCases = [
        { gross: 4000, expectedGateway: 80.00, expectedPlatform: 40.00, expectedNet: 3880.00 },
        { gross: 350, expectedGateway: 7.00, expectedPlatform: 3.50, expectedNet: 339.50 },
        { gross: 100, expectedGateway: 2.00, expectedPlatform: 1.00, expectedNet: 97.00 },
        { gross: 1250.50, expectedGateway: 25.01, expectedPlatform: 12.51, expectedNet: 1212.98 },
      ];

      for (const tc of testCases) {
        const split = calculatePayoutSplit(tc.gross);
        expect(split.grossAmount).toBe(tc.gross);
        expect(split.gatewayFee).toBe(tc.expectedGateway);
        expect(split.platformFee).toBe(tc.expectedPlatform);
        expect(split.netPayout).toBe(tc.expectedNet);
        // Verify conservation of money: Net + PG + Platform = Gross
        const sum = Math.round((split.netPayout + split.gatewayFee + split.platformFee) * 100) / 100;
        expect(sum).toBe(tc.gross);
      }
    });

    it('should aggregate completed appointments and generate salon_payout_records', async () => {
      const salon = await repository.getSalonBySlug(salonSlug);
      const targetDate = '2026-11-08';

      // Seed 3 completed appointments with advance payments
      const appt1: Appointment = {
        id: 'appt-p1-' + Math.random().toString(36).substring(2, 9),
        salonId: salon!.id,
        customerName: 'Client 1',
        customerPhone: '9800000001',
        serviceId: 's1',
        serviceName: 'Haircut',
        scheduledDate: targetDate,
        slotStartTime: '10:00',
        slotEndTime: '10:30',
        durationMinutes: 30,
        advanceAmount: 100.00,
        totalPrice: 200.00,
        paymentMethod: 'RAZORPAY',
        escrowStatus: 'RELEASED_TO_OWNER',
        status: 'COMPLETED',
      };

      const appt2: Appointment = {
        id: 'appt-p2-' + Math.random().toString(36).substring(2, 9),
        salonId: salon!.id,
        customerName: 'Client 2',
        customerPhone: '9800000002',
        serviceId: 's2',
        serviceName: 'Beard Trim',
        scheduledDate: targetDate,
        slotStartTime: '11:00',
        slotEndTime: '11:30',
        durationMinutes: 30,
        advanceAmount: 150.00,
        totalPrice: 150.00,
        paymentMethod: 'RAZORPAY',
        escrowStatus: 'RELEASED_TO_OWNER',
        status: 'COMPLETED',
      };

      const appt3: Appointment = {
        id: 'appt-p3-' + Math.random().toString(36).substring(2, 9),
        salonId: salon!.id,
        customerName: 'Client 3',
        customerPhone: '9800000003',
        serviceId: 's3',
        serviceName: 'Facial',
        scheduledDate: targetDate,
        slotStartTime: '14:00',
        slotEndTime: '14:40',
        durationMinutes: 40,
        advanceAmount: 350.00,
        totalPrice: 500.00,
        paymentMethod: 'RAZORPAY',
        escrowStatus: 'RELEASED_TO_OWNER',
        status: 'COMPLETED',
      };

      await repository.createAppointment(appt1);
      await repository.createAppointment(appt2);
      await repository.createAppointment(appt3);

      // Run daily settlement for targetDate
      const records = await runDailySettlement({
        date: targetDate,
        salonId: salon!.id,
      });

      expect(records.length).toBe(1);
      const payout = records[0];

      // Total advance = 100 + 150 + 350 = 600
      expect(payout.grossAmount).toBe(600.00);
      expect(payout.gatewayFee).toBe(12.00);   // 2% of 600
      expect(payout.platformFee).toBe(6.00);   // 1% of 600
      expect(payout.netPayout).toBe(582.00);    // 97% of 600
      expect(payout.status).toBe('SETTLED');
      expect(payout.periodStart).toBe(targetDate);

      // Verify REST API endpoint returns this payout record
      const getRes = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/payouts`)
      );
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.success).toBe(true);
      expect(getData.summary.grossTotal).toBeGreaterThanOrEqual(600.00);
      expect(getData.summary.netTotal).toBeGreaterThanOrEqual(582.00);
    });
  });

  describe('6. Dynamic Platform vs Salon Owner Advance Policy (30%, 40%, Free, Disabled & Reset)', () => {
    it('should inherit Super Admin platform defaults when salon has not customized', async () => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/appointments/policy`)
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.policy.isCustomized).toBe(false);
    });

    it('should allow Super Admin to set platform default percentage (e.g. 30%) and apply to uncustomized salons', async () => {
      // Super Admin sets platform default to 30%
      await repository.updateGatewaySettings({
        appointmentAdvanceType: 'PERCENTAGE',
        appointmentPercentage: 30,
        appointmentConvenienceFee: 0,
      });

      const salon = await repository.getSalonBySlug(salonSlug);
      const service = salon?.services[0]; // Assume e.g. basePrice = 200 or 150
      const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

      const initRes = await app.handle(
        new Request('http://localhost/api/v1/appointments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug,
            serviceId: service?.id,
            date: tomorrow,
            slotTime: '15:00',
            customerName: 'Rohit Platform Default',
            customerPhone: '9876543201',
          }),
        })
      );

      expect(initRes.status).toBe(200);
      const initData = await initRes.json();
      const expectedAdvance = Math.round(((service?.basePrice || 200) * 30) / 100);
      expect(initData.advanceAmount).toBe(expectedAdvance);
    });

    it('should allow Salon Owner to override platform default with custom 40% percentage', async () => {
      // Salon Owner customizes their policy to 40%
      const putRes = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/appointments/policy`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            policyType: 'PERCENTAGE',
            percentage: 40,
            enabled: true,
          }),
        })
      );

      expect(putRes.status).toBe(200);
      const putData = await putRes.json();
      expect(putData.policy.percentage).toBe(40);
      expect(putData.policy.isCustomized).toBe(true);

      // Verify booking collects exactly 40%
      const salon = await repository.getSalonBySlug(salonSlug);
      const service = salon?.services[0];
      const targetDate = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);

      const initRes = await app.handle(
        new Request('http://localhost/api/v1/appointments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug,
            serviceId: service?.id,
            date: targetDate,
            slotTime: '15:30',
            customerName: 'Anita Custom Owner',
            customerPhone: '9876543202',
          }),
        })
      );

      expect(initRes.status).toBe(200);
      const initData = await initRes.json();
      const expectedAdvance = Math.round(((service?.basePrice || 200) * 40) / 100);
      expect(initData.advanceAmount).toBe(expectedAdvance);
    });

    it('should allow Salon Owner to set policy to FREE (₹0 advance / pay at salon)', async () => {
      const putRes = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/appointments/policy`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            policyType: 'FREE',
            enabled: true,
          }),
        })
      );

      expect(putRes.status).toBe(200);

      const salon = await repository.getSalonBySlug(salonSlug);
      const service = salon?.services[0];
      const targetDate = new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().slice(0, 10);

      const initRes = await app.handle(
        new Request('http://localhost/api/v1/appointments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug,
            serviceId: service?.id,
            date: targetDate,
            slotTime: '16:00',
            customerName: 'Free Booking Customer',
            customerPhone: '9876543203',
          }),
        })
      );

      expect(initRes.status).toBe(200);
      const initData = await initRes.json();
      expect(initData.advanceAmount).toBe(0);
      expect(initData.appointment.paymentMethod).toBe('PAY_AT_SALON');
      expect(initData.appointment.status).toBe('CONFIRMED');
    });

    it('should allow Salon Owner to turn off appointments completely (enabled: false)', async () => {
      // Salon Owner disables appointments
      const putRes = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/appointments/policy`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: false,
          }),
        })
      );

      expect(putRes.status).toBe(200);

      // Verify slots endpoint returns empty slots and enabled: false
      const slotsRes = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/appointments/slots?date=2026-11-20`)
      );
      expect(slotsRes.status).toBe(200);
      const slotsData = await slotsRes.json();
      expect(slotsData.enabled).toBe(false);
      expect(slotsData.slots.length).toBe(0);

      // Verify initiate fails with HTTP 400
      const salon = await repository.getSalonBySlug(salonSlug);
      const service = salon?.services[0];

      const initRes = await app.handle(
        new Request('http://localhost/api/v1/appointments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonSlug,
            serviceId: service?.id,
            date: '2026-11-20',
            slotTime: '16:30',
            customerName: 'Blocked User',
            customerPhone: '9876543204',
          }),
        })
      );

      expect(initRes.status).toBe(400);
      const initData = await initRes.json();
      expect(initData.error).toContain('disabled');
    });

    it('should allow Salon Owner to reset custom policy back to platform defaults', async () => {
      const resetRes = await app.handle(
        new Request(`http://localhost/api/v1/salons/${salonSlug}/appointments/policy/reset`, {
          method: 'POST',
        })
      );

      expect(resetRes.status).toBe(200);
      const resetData = await resetRes.json();
      expect(resetData.success).toBe(true);
      expect(resetData.policy.isCustomized).toBe(false);
      expect(resetData.policy.enabled).toBe(true);
    });
  });
});
