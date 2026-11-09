import { Elysia, t } from 'elysia';
import { repository } from '../db/repository';
import { queueEngine } from '../engine/queue-engine';
import { websocketHub } from '../websocket/hub';
import { notificationService } from '../notifications/whatsapp';
import { runDailySettlement } from '../worker/payout-worker';
import type { Appointment, AppointmentStatus, PayoutStatus } from '../engine/types';

function addMinutesToTime(timeStr: string, minutes: number): string {
  const parts = timeStr.split(':').map((p) => parseInt(p, 10));
  const total = (parts[0] || 0) * 60 + (parts[1] || 0) + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export const appointmentRoutes = new Elysia()
  // 1. Get Available Slots for a Salon & Date
  .get('/api/v1/salons/:slug/appointments/slots', async ({ params, query, set }) => {
    const slug = params.slug;
    const date = (query.date as string) || new Date().toISOString().slice(0, 10);
    const stylistId = query.stylistId as string | undefined;

    const salon = await repository.getSalonBySlug(slug);
    if (!salon) {
      set.status = 404;
      return { success: false, error: 'Salon not found' };
    }

    const standardTimeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      '18:00', '18:30', '19:00', '19:30', '20:00',
    ];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const slots = await Promise.all(
      standardTimeSlots.map(async (time) => {
        const endTime = addMinutesToTime(time, 30);
        const [h, m] = time.split(':').map((p) => parseInt(p, 10));
        const slotTotalMins = (h || 0) * 60 + (m || 0);

        if (date === todayStr && slotTotalMins < nowMinutes) {
          return {
            time,
            available: false,
            reason: 'SLOT_PAST',
          };
        }

        const isAvailable = await repository.isSlotAvailable(
          salon.id,
          date,
          time,
          endTime,
          stylistId || null
        );

        if (!isAvailable) {
          return {
            time,
            available: false,
            reason: 'APPOINTMENT_BOOKED',
          };
        }

        return {
          time,
          available: true,
          stylistId: stylistId || undefined,
        };
      })
    );

    return {
      date,
      slots,
    };
  })

  // 1a. Get Salon Appointment Booking Policy
  .get('/api/v1/salons/:slug/appointments/policy', async ({ params, set }) => {
    const salon = await repository.getSalonBySlug(params.slug);
    if (!salon) {
      set.status = 404;
      return { success: false, error: 'Salon not found' };
    }

    const policy = await repository.getSalonAppointmentPolicy(salon.id);
    return {
      success: true,
      salonId: salon.id,
      salonName: salon.name,
      policy,
    };
  })

  // 1a-2. Update Salon Appointment Booking Policy (Admin / Salon Owner)
  .put('/api/v1/salons/:slug/appointments/policy', async ({ params, body, set }) => {
    const salon = await repository.getSalonBySlug(params.slug);
    if (!salon) {
      set.status = 404;
      return { success: false, error: 'Salon not found' };
    }

    const updatedPolicy = await repository.updateSalonAppointmentPolicy(salon.id, body as any);
    return {
      success: true,
      message: 'Appointment booking policy updated successfully',
      policy: updatedPolicy,
    };
  })

  // 1b. Get Salon Appointments List (for Owner/Dashboard)
  .get('/api/v1/salons/:slug/appointments', async ({ params, query, set }) => {
    const salon = await repository.getSalonBySlug(params.slug);
    if (!salon) {
      set.status = 404;
      return { success: false, error: 'Salon not found' };
    }

    const scheduledDate = query.date as string | undefined;
    const status = query.status as AppointmentStatus | undefined;
    const stylistId = query.stylistId as string | undefined;

    const appointments = await repository.getAppointments({
      salonId: salon.id,
      scheduledDate,
      status,
      stylistId,
    });

    return {
      success: true,
      count: appointments.length,
      appointments,
    };
  })

  // 2. Initiate Prepaid Booking
  .post('/api/v1/appointments/initiate', async ({ body, set }) => {
    try {
      const {
        salonSlug,
        serviceId,
        addOnIds,
        stylistId,
        date,
        slotTime,
        customerName,
        customerPhone,
        advanceType,
      } = body as any;

      const salon = await repository.getSalonBySlug(salonSlug);
      if (!salon) {
        set.status = 404;
        return { success: false, error: 'Salon not found' };
      }

      const service = salon.services.find((s) => s.id === serviceId);
      if (!service) {
        set.status = 400;
        return { success: false, error: 'Selected service not found' };
      }

      // Check duration & add-ons
      const selectedAddOns = (addOnIds || [])
        .map((id: string) => salon.services.find((s) => s.id === id))
        .filter((s: any): s is NonNullable<typeof s> => !!s);

      const totalPrice = service.basePrice + selectedAddOns.reduce((sum: number, a: any) => sum + a.basePrice, 0);
      const durationMinutes =
        service.estimatedDurationMinutes +
        selectedAddOns.reduce((sum: number, a: any) => sum + a.estimatedDurationMinutes, 0);

      const slotEndTime = addMinutesToTime(slotTime, durationMinutes);

      // Check slot availability
      const isAvailable = await repository.isSlotAvailable(
        salon.id,
        date,
        slotTime,
        slotEndTime,
        stylistId || null
      );

      if (!isAvailable) {
        set.status = 409;
        return { success: false, error: 'Selected slot is no longer available' };
      }

      // Dynamic advance calculation based on salon booking policy set by Admin/Owner
      const policy = await repository.getSalonAppointmentPolicy(salon.id);

      let advanceAmount = 0;
      let paymentMethod: any = 'RAZORPAY';
      let initialStatus: AppointmentStatus = 'PENDING_PAYMENT';
      let escrowStatus: any = 'HELD';

      if (
        policy.policyType === 'FREE' ||
        advanceType === 'FREE' ||
        (policy.allowFreeBooking && advanceType === 'FREE')
      ) {
        advanceAmount = 0;
        paymentMethod = 'PAY_AT_SALON';
        initialStatus = 'CONFIRMED'; // Free booking locks immediately!
        escrowStatus = 'RELEASED_TO_OWNER';
      } else if (advanceType === 'FULL' || policy.policyType === 'FULL') {
        advanceAmount = totalPrice + (policy.convenienceFee || 0);
      } else if (policy.policyType === 'PERCENTAGE') {
        advanceAmount =
          Math.max(0, Math.round((totalPrice * (policy.percentage || 50)) / 100)) +
          (policy.convenienceFee || 0);
      } else {
        // FIXED_TOKEN (Admin configurable token amount, default 100, or 0 for free)
        const token = typeof policy.tokenAmount === 'number' ? policy.tokenAmount : 100;
        if (token === 0) {
          advanceAmount = 0;
          paymentMethod = 'PAY_AT_SALON';
          initialStatus = 'CONFIRMED';
          escrowStatus = 'RELEASED_TO_OWNER';
        } else {
          advanceAmount = Math.min(totalPrice, token) + (policy.convenienceFee || 0);
        }
      }

      const apptId = 'appt-' + Math.random().toString(36).substring(2, 9);
      const razorpayOrderId = 'order_' + Math.random().toString(36).substring(2, 10);
      const upiQrString = `upi://pay?pa=salonpayments@icici&pn=SalonQueue&am=${advanceAmount}&tr=${apptId}`;

      const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10) || customerPhone.trim();

      const appointment: Appointment = {
        id: apptId,
        salonId: salon.id,
        stylistId: stylistId || null,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        serviceId: service.id,
        serviceName: service.name,
        scheduledDate: date,
        slotStartTime: slotTime,
        slotEndTime,
        durationMinutes,
        advanceAmount,
        totalPrice,
        paymentMethod,
        gatewayOrderId: razorpayOrderId,
        escrowStatus,
        status: initialStatus,
      };

      await repository.createAppointment(appointment);

      // If free booking auto-confirmed, trigger queue recalculation and notification
      if (initialStatus === 'CONFIRMED') {
        try {
          await queueEngine.recalculateQueue(salon.id);
          websocketHub.broadcast(salon.id, 'APPOINTMENT_CONFIRMED', {
            appointmentId: apptId,
            customerName: appointment.customerName,
            slotTime: appointment.slotStartTime,
          });
          await notificationService.sendTicketConfirmation({
            customerName: appointment.customerName,
            customerPhone: appointment.customerPhone,
            ticketNumber: 0,
            salonName: salon.name,
            estimatedWaitMinutes: 0,
          });
        } catch (postErr) {
          console.warn('[appointments] Post-confirmation tasks warning:', postErr);
        }
      }

      return {
        success: true,
        appointment,
        appointmentId: apptId,
        advanceAmount,
        policy,
        isFree: advanceAmount === 0,
        razorpayOrderId,
        upiQrString,
      };
    } catch (err: any) {
      if (err.message.includes('no longer available') || err.message.includes('just booked')) {
        set.status = 409;
      } else {
        set.status = 400;
      }
      return { success: false, error: err.message };
    }
  })

  // 3. Confirm Prepaid Booking
  .post('/api/v1/appointments/confirm', async ({ body, set }) => {
    try {
      const { appointmentId, paymentId } = body as any;
      const appt = await repository.getAppointmentById(appointmentId);
      if (!appt) {
        set.status = 404;
        return { success: false, error: 'Appointment not found' };
      }

      const updated = await repository.updateAppointment(appointmentId, {
        status: 'CONFIRMED',
        gatewayPaymentId: paymentId || 'pay_' + Math.random().toString(36).substring(2, 10),
        escrowStatus: 'HELD',
      });

      // Recalculate queue wait times dynamically
      await queueEngine.recalculateQueue(appt.salonId);

      // Disseminate WhatsApp confirmation
      const salon = await repository.getSalonById(appt.salonId);
      const salonName = salon?.name || 'Salon';
      try {
        await notificationService.sendWhatsApp({
          salonId: appt.salonId,
          salonName,
          ticketId: appt.id,
          recipientPhone: appt.customerPhone,
          recipientName: `${appt.customerName} (Appt ${appt.slotStartTime})`,
          type: 'TICKET_CONFIRMATION',
          ticketNumber: 1,
          estimatedWaitMinutes: 0,
        });
      } catch (notifErr) {
        console.warn('[Appointments] Notification dispatch error:', notifErr);
      }

      // WebSocket broadcast
      websocketHub.broadcastToSalon(appt.salonId, {
        type: 'QUEUE_UPDATED',
        salonId: appt.salonId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, appointment: updated };
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  })

  // 4. Get Appointment by ID
  .get('/api/v1/appointments/:id', async ({ params, set }) => {
    const appt = await repository.getAppointmentById(params.id);
    if (!appt) {
      set.status = 404;
      return { success: false, error: 'Appointment not found' };
    }
    const salon = await repository.getSalonById(appt.salonId);
    return {
      success: true,
      appointment: appt,
      salon,
    };
  })

  // 5. Self-Service Reschedule (Enforcing 1-Hr Cutoff Check & Atomic Slot Swap)
  .post('/api/v1/appointments/:id/reschedule', async ({ params, body, set }) => {
    try {
      const { newDate, newSlotTime, newStylistId } = body as any;

      const appt = await repository.getAppointmentById(params.id);
      if (!appt) {
        set.status = 404;
        return { success: false, error: 'Appointment not found' };
      }

      const newSlotEndTime = addMinutesToTime(newSlotTime, appt.durationMinutes);

      const updated = await repository.rescheduleAppointment(
        params.id,
        newDate,
        newSlotTime,
        newSlotEndTime,
        newStylistId
      );

      // Recalculate queue
      await queueEngine.recalculateQueue(appt.salonId);

      // Broadcast
      websocketHub.broadcastToSalon(appt.salonId, {
        type: 'QUEUE_UPDATED',
        salonId: appt.salonId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, appointment: updated };
    } catch (err: any) {
      if (err.message.includes('1 hour prior')) {
        set.status = 400;
      } else if (err.message.includes('just booked') || err.message.includes('no longer available')) {
        set.status = 409;
      } else {
        set.status = 400;
      }
      return { success: false, error: err.message };
    }
  })

  // 6. Appointment Check-in (Door Arrival / QR Scan)
  .post('/api/v1/appointments/:id/check-in', async ({ params, set }) => {
    try {
      const appt = await repository.getAppointmentById(params.id);
      if (!appt) {
        set.status = 404;
        return { success: false, error: 'Appointment not found' };
      }

      const updated = await repository.updateAppointment(params.id, {
        status: 'CHECKED_IN',
      });

      await queueEngine.recalculateQueue(appt.salonId);

      websocketHub.broadcastToSalon(appt.salonId, {
        type: 'QUEUE_UPDATED',
        salonId: appt.salonId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, appointment: updated };
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  })

  // 6b. Seat Appointment in Chair (Start Service)
  .post('/api/v1/appointments/:id/seat', async ({ params, body, set }) => {
    try {
      const { stylistId } = (body as any) || {};
      const appt = await repository.getAppointmentById(params.id);
      if (!appt) {
        set.status = 404;
        return { success: false, error: 'Appointment not found' };
      }

      if (appt.status === 'COMPLETED' || appt.status === 'CANCELLED' || appt.status === 'NO_SHOW') {
        set.status = 400;
        return { success: false, error: `Cannot seat appointment in ${appt.status} status` };
      }

      const updated = await repository.updateAppointment(params.id, {
        status: 'IN_CHAIR',
        stylistId: stylistId !== undefined ? stylistId : appt.stylistId,
      });

      await queueEngine.recalculateQueue(appt.salonId);

      websocketHub.broadcastToSalon(appt.salonId, {
        type: 'QUEUE_UPDATED',
        salonId: appt.salonId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, appointment: updated };
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  })

  // 7. Cancellation with Dynamic Escrow Refund
  .post('/api/v1/appointments/:id/cancel', async ({ params, set }) => {
    try {
      const appt = await repository.getAppointmentById(params.id);
      if (!appt) {
        set.status = 404;
        return { success: false, error: 'Appointment not found' };
      }

      // Refund Rule: >2 hrs = 100% refund, <2 hrs = 50% refund
      const slotDateTime = new Date(`${appt.scheduledDate}T${appt.slotStartTime}:00`);
      const hoursUntil = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

      const escrowStatus = hoursUntil >= 2 ? 'REFUNDED_TO_CUSTOMER' : 'PARTIAL_SPLIT';

      const updated = await repository.updateAppointment(params.id, {
        status: 'CANCELLED',
        escrowStatus,
      });

      await queueEngine.recalculateQueue(appt.salonId);

      websocketHub.broadcastToSalon(appt.salonId, {
        type: 'QUEUE_UPDATED',
        salonId: appt.salonId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        appointment: updated,
        refundPercentage: hoursUntil >= 2 ? 100 : 50,
      };
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  })

  // 8. Staff 1-Tap No-Show
  .post('/api/v1/appointments/:id/no-show', async ({ params, set }) => {
    try {
      const appt = await repository.getAppointmentById(params.id);
      if (!appt) {
        set.status = 404;
        return { success: false, error: 'Appointment not found' };
      }

      const updated = await repository.updateAppointment(params.id, {
        status: 'NO_SHOW',
        escrowStatus: 'RELEASED_TO_OWNER',
      });

      await queueEngine.recalculateQueue(appt.salonId);

      websocketHub.broadcastToSalon(appt.salonId, {
        type: 'QUEUE_UPDATED',
        salonId: appt.salonId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, appointment: updated };
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  })

  // 9. Mark Completed
  .post('/api/v1/appointments/:id/complete', async ({ params, set }) => {
    try {
      const appt = await repository.getAppointmentById(params.id);
      if (!appt) {
        set.status = 404;
        return { success: false, error: 'Appointment not found' };
      }

      const updated = await repository.updateAppointment(params.id, {
        status: 'COMPLETED',
        escrowStatus: 'RELEASED_TO_OWNER',
      });

      await queueEngine.recalculateQueue(appt.salonId);

      websocketHub.broadcastToSalon(appt.salonId, {
        type: 'QUEUE_UPDATED',
        salonId: appt.salonId,
        timestamp: new Date().toISOString(),
      });

      return { success: true, appointment: updated };
    } catch (err: any) {
      set.status = 400;
      return { success: false, error: err.message };
    }
  })

  // 10. Salon Payout Ledger (for Salon Owner)
  .get('/api/v1/salons/:slug/payouts', async ({ params, query, set }) => {
    const salon = await repository.getSalonBySlug(params.slug);
    if (!salon) {
      set.status = 404;
      return { success: false, error: 'Salon not found' };
    }

    const status = query.status as PayoutStatus | undefined;
    const records = await repository.getPayoutRecords({
      salonId: salon.id,
      status,
    });

    // Compute all-time / period totals
    const grossTotal = records.reduce((sum, r) => sum + r.grossAmount, 0);
    const netTotal = records.reduce((sum, r) => sum + r.netPayout, 0);
    const gatewayTotal = records.reduce((sum, r) => sum + r.gatewayFee, 0);
    const platformTotal = records.reduce((sum, r) => sum + r.platformFee, 0);

    return {
      success: true,
      salonId: salon.id,
      salonName: salon.name,
      payoutVpa: salon.upiPaymentId || 'salonpayments@icici',
      summary: {
        grossTotal,
        netTotal,
        gatewayTotal,
        platformTotal,
        payoutCount: records.length,
      },
      payouts: records,
    };
  })

  // 11. Platform Admin Escrow & Payout Command Center
  .get('/api/v1/admin/payouts', async ({ query }) => {
    const status = query.status as PayoutStatus | undefined;
    const records = await repository.getPayoutRecords({ status });

    const grossTotal = records.reduce((sum, r) => sum + r.grossAmount, 0);
    const netDisbursed = records
      .filter((r) => r.status === 'SETTLED')
      .reduce((sum, r) => sum + r.netPayout, 0);
    const pendingDisbursal = records
      .filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING')
      .reduce((sum, r) => sum + r.netPayout, 0);
    const platformRevenue = records.reduce((sum, r) => sum + r.platformFee, 0);
    const gatewayFees = records.reduce((sum, r) => sum + r.gatewayFee, 0);

    return {
      success: true,
      summary: {
        grossTotal,
        netDisbursed,
        pendingDisbursal,
        platformRevenue,
        gatewayFees,
        totalBatches: records.length,
      },
      payouts: records,
    };
  })

  // 12. Trigger Midnight Settlement Batch (Manual / Cron)
  .post('/api/v1/admin/payouts/settle-daily', async ({ body }) => {
    const { date, salonId } = (body as any) || {};
    const results = await runDailySettlement({ date, salonId });
    return {
      success: true,
      settledBatchesCount: results.length,
      batches: results,
    };
  })

  // 13. Admin 1-Tap Payout Disbursal Release
  .post('/api/v1/admin/payouts/:id/release', async ({ params, set }) => {
    const updated = await repository.updatePayoutStatus(
      params.id,
      'SETTLED',
      'manual_rel_' + Math.random().toString(36).substring(2, 9),
      new Date().toISOString()
    );
    if (!updated) {
      set.status = 404;
      return { success: false, error: 'Payout record not found' };
    }
    return { success: true, payout: updated };
  });
