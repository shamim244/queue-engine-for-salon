import { Elysia, t } from 'elysia';
import { repository } from '../db/repository';
import { paymentRepo } from '../db/repositories/payment.repo';
import { queueEngine } from '../engine/queue-engine';
import { websocketHub } from '../websocket/hub';
import { notificationService } from '../notifications/whatsapp';
import { runDailySettlement } from '../worker/payout-worker';
import { validateAppointmentTransition } from '../engine/state-machine';
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

    const policy = await repository.getSalonAppointmentPolicy(salon.id);
    if (!policy.enabled) {
      return {
        date,
        slots: [],
        enabled: false,
        message: 'Online appointments are currently disabled by this salon.',
      };
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

  // 1a-3. Reset Salon Appointment Booking Policy to Platform Default
  .post('/api/v1/salons/:slug/appointments/policy/reset', async ({ params, set }) => {
    const salon = await repository.getSalonBySlug(params.slug);
    if (!salon) {
      set.status = 404;
      return { success: false, error: 'Salon not found' };
    }

    const defaultPolicy = await repository.resetSalonAppointmentPolicy(salon.id);
    return {
      success: true,
      message: 'Salon policy reset to platform defaults successfully',
      policy: defaultPolicy,
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

  // 1c. Get Customer Appointments by Phone (for /me Portal and Mobile Booking Passes)
  .get('/api/v1/customer/appointments', async ({ query, set }) => {
    const phone = query.phone as string | undefined;
    if (!phone) {
      set.status = 400;
      return { success: false, error: 'Customer phone number is required' };
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10) || phone.trim();
    const appointments = await repository.getAppointments({ phone: cleanPhone });

    // Enrich with salon metadata (name, slug, address)
    const enriched = await Promise.all(
      appointments.map(async (appt) => {
        const salon = await repository.getSalonById(appt.salonId);
        return {
          ...appt,
          salonName: salon?.name || 'Salon',
          salonSlug: salon?.slug || '',
          salonAddress: salon?.address || '',
        };
      })
    );

    return {
      success: true,
      count: enriched.length,
      appointments: enriched,
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

      const rawTotalPrice = service.basePrice + selectedAddOns.reduce((sum: number, a: any) => sum + a.basePrice, 0);

      // Handle coupon discount if provided
      let totalPrice = rawTotalPrice;
      let couponDiscountAmount = 0;
      let appliedCoupon: any = null;

      if ((body as any).couponCode && String((body as any).couponCode).trim()) {
        const { couponService } = await import('../coupon/coupon.service');
        const couponRes = await couponService.validateAndApplyCoupon({
          code: String((body as any).couponCode).trim(),
          targetType: 'SALON_SERVICE',
          orderAmount: rawTotalPrice,
          salonId: salon.id,
          userId: (body as any).customerPhone ? String((body as any).customerPhone).trim() : undefined,
        });

        if (!couponRes.valid) {
          set.status = 400;
          return { success: false, error: couponRes.message || 'Invalid coupon code.' };
        }

        couponDiscountAmount = couponRes.discountAmount;
        totalPrice = Math.max(0, rawTotalPrice - couponDiscountAmount);
        appliedCoupon = couponRes.coupon;
      }
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

      if (!policy.enabled) {
        set.status = 400;
        return {
          success: false,
          error: 'Online appointments are currently disabled by this salon. Please join the walk-in queue.',
        };
      }

      // 1. Calculate minimum required deposit based on salon booking policy
      let minRequiredAdvance = 0;
      if (policy.policyType === 'FULL') {
        minRequiredAdvance = totalPrice;
      } else if (policy.policyType === 'PERCENTAGE') {
        const pct = typeof policy.percentage === 'number' ? policy.percentage : 50;
        minRequiredAdvance = Math.max(0, Math.round((totalPrice * pct) / 100));
      } else if (policy.policyType === 'FIXED_TOKEN') {
        const token = typeof policy.tokenAmount === 'number' ? policy.tokenAmount : 100;
        minRequiredAdvance = token === 0 ? 0 : Math.min(totalPrice, token);
      } else {
        // FREE policy: Minimum deposit is ₹0
        minRequiredAdvance = 0;
      }

      // 2. Enforce minimum deposit rule:
      // If the owner configured a minimum deposit (> 0), customer cannot bypass or pay less than minimum!
      if (minRequiredAdvance > 0 && (advanceType === 'FREE' || advanceType === 'PAY_AT_SALON')) {
        set.status = 400;
        return {
          success: false,
          error: `This salon requires a minimum advance deposit of ₹${minRequiredAdvance}. You cannot pay less than the minimum.`,
        };
      }

      // 3. Compute payable advanceAmount based on customer choice (MINIMUM, FULL, CUSTOM, or FREE)
      let advanceAmount = 0;
      let paymentMethod: any = 'RAZORPAY';
      let initialStatus: AppointmentStatus = 'PENDING_PAYMENT';
      let escrowStatus: any = 'HELD';

      if (advanceType === 'FULL') {
        // Customer chose to pay 100% in full upfront
        advanceAmount = totalPrice + (policy.convenienceFee || 0);
      } else if (
        (advanceType === 'PARTIAL' || advanceType === 'CUSTOM') &&
        typeof body.customAdvanceAmount === 'number'
      ) {
        if (body.customAdvanceAmount < minRequiredAdvance) {
          set.status = 400;
          return {
            success: false,
            error: `Partial advance payment (₹${body.customAdvanceAmount}) cannot be less than the minimum required deposit of ₹${minRequiredAdvance}.`,
          };
        }
        const clamped = Math.min(totalPrice, body.customAdvanceAmount);
        advanceAmount = clamped + (policy.convenienceFee || 0);
        if (advanceAmount === 0) {
          paymentMethod = 'PAY_AT_SALON';
          initialStatus = 'CONFIRMED';
          escrowStatus = 'RELEASED_TO_OWNER';
        }
      } else if (minRequiredAdvance === 0 && (advanceType === 'FREE' || advanceType === 'PAY_AT_SALON' || !advanceType)) {
        // Free policy: customer chooses to pay in person at salon chair
        advanceAmount = 0;
        paymentMethod = 'PAY_AT_SALON';
        initialStatus = 'CONFIRMED';
        escrowStatus = 'RELEASED_TO_OWNER';
      } else {
        // Default: Minimum Required Advance Deposit
        advanceAmount = minRequiredAdvance + (policy.convenienceFee || 0);
        if (advanceAmount === 0) {
          paymentMethod = 'PAY_AT_SALON';
          initialStatus = 'CONFIRMED';
          escrowStatus = 'RELEASED_TO_OWNER';
        }
      }

      const now = new Date().toISOString();
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
        createdAt: now,
        updatedAt: now,
      };

      await repository.createAppointment(appointment);

      // If advance payment is required, persist a tracking PaymentOrder
      if (advanceAmount > 0) {
        await paymentRepo.createOrder({
          id: razorpayOrderId,
          salonId: salon.id,
          amount: advanceAmount,
          currency: 'INR',
          provider: (paymentMethod === 'UPI_MANUAL' ? 'UPI_MANUAL' : 'RAZORPAY') as any,
          targetType: 'APPOINTMENT_ADVANCE' as any,
          targetId: apptId,
          status: 'PENDING',
          metadata: {
            appointmentId: apptId,
            customerName: customerName.trim(),
            customerPhone: cleanPhone,
            couponId: appliedCoupon?.id || null,
            couponCode: appliedCoupon?.code || null,
            couponDiscount: couponDiscountAmount,
          },
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          createdAt: now,
          updatedAt: now,
        });
      }

      // If free booking auto-confirmed, burn any applied coupon/loyalty voucher and trigger queue/notification
      if (initialStatus === 'CONFIRMED') {
        if (appliedCoupon) {
          try {
            if (appliedCoupon.id?.startsWith('voucher_') || appliedCoupon.code?.toUpperCase().startsWith('REW_')) {
              const { loyaltyRepo } = await import('../db/repositories/loyalty.repo');
              await loyaltyRepo.redeemVoucher(appliedCoupon.code, salon.id, apptId);
            } else {
              const { couponRepo } = await import('../db/repositories/coupon.repo');
              await couponRepo.recordRedemption({
                couponId: appliedCoupon.id,
                targetType: 'SALON_SERVICE',
                targetOrderId: apptId,
                userId: cleanPhone,
                discountApplied: couponDiscountAmount,
              });
            }
          } catch (couponErr) {
            console.warn('[appointments.initiate] Free booking coupon/voucher redemption warning:', couponErr);
          }
        }
        try {
          await queueEngine.recalculateQueue(salon.id);
          websocketHub.broadcastToSalon(salon.id, {
            type: 'APPOINTMENT_CONFIRMED',
            appointmentId: apptId,
            customerName: appointment.customerName,
            slotTime: appointment.slotStartTime,
          });
          await notificationService.sendWhatsApp({
            salonId: salon.id,
            salonName: salon.name,
            ticketId: apptId,
            recipientPhone: appointment.customerPhone,
            recipientName: appointment.customerName,
            type: 'TICKET_CONFIRMATION',
            ticketNumber: 0,
            customMessage: `Guaranteed Free Appointment Confirmed for ${appointment.slotStartTime} on ${appointment.scheduledDate}!`,
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

  // 3. Confirm Prepaid Booking (Protected via ADR 005 C1)
  .post('/api/v1/appointments/confirm', async ({ body, set }) => {
    try {
      const { appointmentId, paymentId } = body as any;
      if (!appointmentId) {
        set.status = 400;
        return { success: false, error: 'appointmentId is required' };
      }

      const appt = await repository.getAppointmentById(appointmentId);
      if (!appt) {
        set.status = 404;
        return { success: false, error: 'Appointment not found' };
      }

      // Idempotency: If already confirmed, return success without re-dispatching
      if (appt.status === 'CONFIRMED') {
        return { success: true, appointment: appt, message: 'Appointment already confirmed' };
      }

      // Transition check: Enforce valid state transition
      const transitionResult = validateAppointmentTransition(appt, 'CONFIRMED');
      if (!transitionResult.allowed) {
        set.status = 400;
        return { success: false, error: transitionResult.reason };
      }

      // Hold Window Guard: Reject if hold window (>10 mins) has elapsed
      const createdAtMs = appt.createdAt ? new Date(appt.createdAt).getTime() : Date.now();
      const holdWindowMs = 10 * 60 * 1000;
      if (Date.now() - createdAtMs > holdWindowMs) {
        await repository.updateAppointment(appointmentId, { status: 'EXPIRED' });
        set.status = 400;
        return { success: false, error: 'Appointment hold window has expired (10 minutes limit)' };
      }

      const cleanPaymentId = (paymentId || '').trim();

      // Payment Verification Guard for Prepaid Appointments
      if (appt.advanceAmount > 0) {
        if (!cleanPaymentId) {
          set.status = 400;
          return { success: false, error: 'paymentId is required for prepaid appointments' };
        }

        // Anti-Replay: Ensure paymentId is not reused by another appointment
        const salonAppts = await repository.getAppointments(appt.salonId);
        const isReused = salonAppts.some(
          (a) => a.id !== appt.id && a.gatewayPaymentId === cleanPaymentId && a.status !== 'CANCELLED' && a.status !== 'EXPIRED'
        );
        if (isReused) {
          set.status = 400;
          return { success: false, error: 'Payment ID has already been used for another appointment' };
        }

        // Validate and complete associated PaymentOrder if present
        if (appt.gatewayOrderId) {
          const order = await paymentRepo.getOrderById(appt.gatewayOrderId);
          if (order) {
            if (order.status === 'REJECTED' || order.status === 'EXPIRED') {
              set.status = 400;
              return { success: false, error: `Associated payment order is in ${order.status} state` };
            }
            if (order.amount !== appt.advanceAmount) {
              set.status = 400;
              return {
                success: false,
                error: `Payment order amount (₹${order.amount}) does not match appointment deposit (₹${appt.advanceAmount})`,
              };
            }
            await paymentRepo.updateOrderStatus(order.id, 'COMPLETED', cleanPaymentId, new Date());

            if (order.metadata?.couponId || order.metadata?.couponCode) {
              try {
                const cId = String(order.metadata.couponId || '');
                const cCode = String(order.metadata.couponCode || '');
                if (cId.startsWith('voucher_') || cCode.toUpperCase().startsWith('REW_')) {
                  const { loyaltyRepo } = await import('../db/repositories/loyalty.repo');
                  await loyaltyRepo.redeemVoucher(cCode, appt.salonId, appt.id);
                } else if (cId) {
                  const { couponRepo } = await import('../db/repositories/coupon.repo');
                  await couponRepo.recordRedemption({
                    couponId: cId,
                    targetType: 'SALON_SERVICE',
                    targetOrderId: appt.id,
                    userId: appt.customerPhone,
                    discountApplied: Number(order.metadata.couponDiscount || 0),
                  });
                }
              } catch (redemptionErr) {
                console.warn('[appointments.confirm] Coupon/voucher redemption record warning:', redemptionErr);
              }
            }
          }
        }
      }

      const updated = await repository.updateAppointment(appointmentId, {
        status: 'CONFIRMED',
        gatewayPaymentId: cleanPaymentId || (appt.advanceAmount === 0 ? 'FREE_BOOKING' : null),
        escrowStatus: 'HELD',
        updatedAt: new Date().toISOString(),
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

      const wasCompleted = appt.status === 'COMPLETED';
      const updated = await repository.updateAppointment(params.id, {
        status: 'COMPLETED',
        escrowStatus: 'RELEASED_TO_OWNER',
      });

      // Award loyalty stamp on first completion if paid (> ₹0) and NOT a loyalty voucher redemption
      if (!wasCompleted && appt.customerPhone) {
        try {
          const { loyaltyRepo } = await import('../db/repositories/loyalty.repo');
          const { loyaltyService } = await import('../loyalty/loyalty.service');

          let couponCode: string | undefined;
          let couponId: string | undefined;
          if (appt.gatewayOrderId) {
            const order = await paymentRepo.getOrderById(appt.gatewayOrderId);
            if (order?.metadata) {
              couponCode = order.metadata.couponCode || undefined;
              couponId = order.metadata.couponId || undefined;
            }
          }
          const vouchers = await loyaltyRepo.getVouchersByPhone(appt.customerPhone, appt.salonId);
          const redeemedForAppt = vouchers.some((v) => v.redeemedTicketId === appt.id);

          await loyaltyService.awardStamp({
            salonId: appt.salonId,
            customerPhone: appt.customerPhone,
            customerName: appt.customerName,
            ticketId: appt.id,
            finalPrice: appt.totalPrice,
            isRewardRedemption: redeemedForAppt,
            couponCode,
            couponId,
          });
        } catch (loyaltyErr) {
          console.warn('[appointments.complete] Loyalty stamp check warning:', loyaltyErr);
        }
      }

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
