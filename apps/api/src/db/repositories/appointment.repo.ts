import { isMySqlConnected, getDb } from '../mysql';
import type {
  Appointment,
  AppointmentStatus,
  SalonPayoutRecord,
  PayoutStatus,
  AppointmentBookingPolicy,
} from '../../engine/types';
import { memoryStore, toMySqlDatetime, toIsoStringSafe } from './store';
import { salonRepo } from './salon.repo';

interface PendingSlotLock {
  salonId: string;
  scheduledDate: string;
  slotStartTime: string;
  slotEndTime: string;
  stylistId: string | null;
}

const pendingSlotLocks: PendingSlotLock[] = [];

function checkPendingLockConflict(
  salonId: string,
  scheduledDate: string,
  slotStartTime: string,
  slotEndTime: string,
  stylistId?: string | null
): boolean {
  return pendingSlotLocks.some((lock) => {
    if (lock.salonId !== salonId || lock.scheduledDate !== scheduledDate) return false;
    if (lock.stylistId && stylistId && lock.stylistId !== stylistId) return false;
    return slotStartTime < lock.slotEndTime && slotEndTime > lock.slotStartTime;
  });
}

export const appointmentRepo = {
  async createAppointment(appt: Appointment): Promise<Appointment> {
    // Synchronous lock check to prevent concurrent race conditions before event-loop tick
    if (
      checkPendingLockConflict(
        appt.salonId,
        appt.scheduledDate,
        appt.slotStartTime,
        appt.slotEndTime,
        appt.stylistId || null
      )
    ) {
      throw new Error('Selected slot is no longer available');
    }

    const lockEntry: PendingSlotLock = {
      salonId: appt.salonId,
      scheduledDate: appt.scheduledDate,
      slotStartTime: appt.slotStartTime,
      slotEndTime: appt.slotEndTime,
      stylistId: appt.stylistId || null,
    };
    pendingSlotLocks.push(lockEntry);

    try {
      // Atomic slot lock check to prevent double-booking
      const isAvail = await this.isSlotAvailable(
        appt.salonId,
        appt.scheduledDate,
        appt.slotStartTime,
        appt.slotEndTime,
        appt.stylistId || null
      );

      if (!isAvail) {
        throw new Error('Selected slot is no longer available');
      }

      const record: Appointment = {
        ...appt,
        createdAt: appt.createdAt || new Date().toISOString(),
        updatedAt: appt.updatedAt || new Date().toISOString(),
      };

      memoryStore.appointments.set(record.id, record);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO appointments (
            id, salon_id, stylist_id, customer_name, customer_phone,
            service_id, service_name, scheduled_date, slot_start_time,
            slot_end_time, duration_minutes, advance_amount, total_price,
            payment_method, gateway_order_id, gateway_payment_id,
            escrow_status, status, rescheduled_from_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            stylist_id = VALUES(stylist_id),
            scheduled_date = VALUES(scheduled_date),
            slot_start_time = VALUES(slot_start_time),
            slot_end_time = VALUES(slot_end_time),
            status = VALUES(status),
            escrow_status = VALUES(escrow_status),
            advance_amount = VALUES(advance_amount),
            total_price = VALUES(total_price),
            updated_at = VALUES(updated_at)`,
          [
            record.id,
            record.salonId,
            record.stylistId || null,
            record.customerName,
            record.customerPhone,
            record.serviceId,
            record.serviceName,
            record.scheduledDate,
            record.slotStartTime,
            record.slotEndTime,
            record.durationMinutes,
            record.advanceAmount,
            record.totalPrice,
            record.paymentMethod,
            record.gatewayOrderId || null,
            record.gatewayPaymentId || null,
            record.escrowStatus,
            record.status,
            record.rescheduledFromId || null,
            toMySqlDatetime(record.createdAt),
            toMySqlDatetime(record.updatedAt),
          ]
        );
      } catch (err) {
        console.warn('[appointmentRepo] MySQL insert error:', err);
      }
    }

    return record;
  } finally {
    const idx = pendingSlotLocks.indexOf(lockEntry);
    if (idx !== -1) {
      pendingSlotLocks.splice(idx, 1);
    }
  }
},

  async getAppointmentById(id: string): Promise<Appointment | null> {
    if (memoryStore.appointments.has(id)) {
      return memoryStore.appointments.get(id)!;
    }

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT * FROM appointments WHERE id = ? LIMIT 1`,
          [id]
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          const appt: Appointment = {
            id: r.id,
            salonId: r.salon_id,
            stylistId: r.stylist_id,
            customerName: r.customer_name,
            customerPhone: r.customer_phone,
            serviceId: r.service_id,
            serviceName: r.service_name,
            scheduledDate: typeof r.scheduled_date === 'string' ? r.scheduled_date.slice(0, 10) : new Date(r.scheduled_date).toISOString().slice(0, 10),
            slotStartTime: r.slot_start_time,
            slotEndTime: r.slot_end_time,
            durationMinutes: r.duration_minutes,
            advanceAmount: Number(r.advance_amount),
            totalPrice: Number(r.total_price),
            paymentMethod: r.payment_method,
            gatewayOrderId: r.gateway_order_id,
            gatewayPaymentId: r.gateway_payment_id,
            escrowStatus: r.escrow_status,
            status: r.status,
            rescheduledFromId: r.rescheduled_from_id,
            createdAt: toIsoStringSafe(r.created_at) || undefined,
            updatedAt: toIsoStringSafe(r.updated_at) || undefined,
          };
          memoryStore.appointments.set(appt.id, appt);
          return appt;
        }
      } catch (err) {
        console.warn('[appointmentRepo] MySQL getAppointmentById error:', err);
      }
    }

    return null;
  },

  async getAppointments(filter?: {
    salonId?: string;
    scheduledDate?: string;
    stylistId?: string | null;
    status?: AppointmentStatus | AppointmentStatus[];
    phone?: string;
  }): Promise<Appointment[]> {
    let list = Array.from(memoryStore.appointments.values());

    if (filter?.salonId) {
      list = list.filter((a) => a.salonId === filter.salonId);
    }
    if (filter?.scheduledDate) {
      list = list.filter((a) => a.scheduledDate === filter.scheduledDate);
    }
    if (filter?.stylistId !== undefined) {
      list = list.filter((a) => a.stylistId === filter.stylistId);
    }
    if (filter?.phone) {
      list = list.filter((a) => a.customerPhone === filter.phone);
    }
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      list = list.filter((a) => statuses.includes(a.status));
    }

    return list.sort((a, b) => {
      const cmpDate = a.scheduledDate.localeCompare(b.scheduledDate);
      if (cmpDate !== 0) return cmpDate;
      return a.slotStartTime.localeCompare(b.slotStartTime);
    });
  },

  async updateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment | null> {
    const existing = await this.getAppointmentById(id);
    if (!existing) return null;

    const updated: Appointment = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    memoryStore.appointments.set(id, updated);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE appointments SET
            stylist_id = COALESCE(?, stylist_id),
            scheduled_date = COALESCE(?, scheduled_date),
            slot_start_time = COALESCE(?, slot_start_time),
            slot_end_time = COALESCE(?, slot_end_time),
            advance_amount = COALESCE(?, advance_amount),
            total_price = COALESCE(?, total_price),
            gateway_order_id = COALESCE(?, gateway_order_id),
            gateway_payment_id = COALESCE(?, gateway_payment_id),
            escrow_status = COALESCE(?, escrow_status),
            status = COALESCE(?, status),
            rescheduled_from_id = COALESCE(?, rescheduled_from_id),
            updated_at = NOW()
          WHERE id = ?`,
          [
            updates.stylistId !== undefined ? updates.stylistId : null,
            updates.scheduledDate || null,
            updates.slotStartTime || null,
            updates.slotEndTime || null,
            updates.advanceAmount !== undefined ? updates.advanceAmount : null,
            updates.totalPrice !== undefined ? updates.totalPrice : null,
            updates.gatewayOrderId || null,
            updates.gatewayPaymentId || null,
            updates.escrowStatus || null,
            updates.status || null,
            updates.rescheduledFromId || null,
            id,
          ]
        );
      } catch (err) {
        console.warn('[appointmentRepo] MySQL updateAppointment error:', err);
      }
    }

    return updated;
  },

  async isSlotAvailable(
    salonId: string,
    scheduledDate: string,
    slotStartTime: string,
    slotEndTime: string,
    stylistId?: string | null,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    const salon = await salonRepo.getSalonById(salonId);
    const activeStylists = (salon?.stylists || []).filter((s) => s.isActive);

    // Active appointment statuses that block slot
    const activeStatuses: AppointmentStatus[] = [
      'CONFIRMED',
      'CHECKED_IN',
      'IN_CHAIR',
      'PENDING_PAYMENT',
    ];

    const appointments = await this.getAppointments({
      salonId,
      scheduledDate,
      status: activeStatuses,
    });

    // Filter out expired PENDING_PAYMENT (> 10 mins old) and excludeAppointmentId
    const now = Date.now();
    const blockingAppointments = appointments.filter((a) => {
      if (excludeAppointmentId && a.id === excludeAppointmentId) return false;
      if (a.status === 'PENDING_PAYMENT') {
        const createdMs = new Date(a.createdAt || now).getTime();
        if (now - createdMs > 10 * 60 * 1000) return false; // Expired 10-min window
      }
      // Check time overlap: startA < endB && endA > startB
      return slotStartTime < a.slotEndTime && slotEndTime > a.slotStartTime;
    });

    if (stylistId) {
      // Check if this specific stylist is already booked
      const isStylistBooked = blockingAppointments.some(
        (a) => a.stylistId === stylistId || !a.stylistId
      );
      return !isStylistBooked;
    } else {
      // Universal booking: free if there is at least one active stylist available
      const totalChairs = Math.max(1, activeStylists.length);
      return blockingAppointments.length < totalChairs;
    }
  },

  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newSlotStartTime: string,
    newSlotEndTime: string,
    newStylistId?: string | null
  ): Promise<Appointment> {
    const existing = await this.getAppointmentById(appointmentId);
    if (!existing) {
      throw new Error('Appointment not found');
    }

    if (existing.status !== 'CONFIRMED') {
      throw new Error(`Cannot reschedule appointment in ${existing.status} status`);
    }

    // 1-Hour Cutoff Enforcement
    // Combine existing scheduledDate and slotStartTime
    const [startHour, startMin] = existing.slotStartTime.split(':').map(Number);
    const scheduledDateTime = new Date(`${existing.scheduledDate}T${existing.slotStartTime}:00`);
    const nowMs = Date.now();
    const slotMs = scheduledDateTime.getTime();

    // Check if slot is less than 60 minutes away
    const msUntilSlot = slotMs - nowMs;
    if (msUntilSlot < 60 * 60 * 1000) {
      throw new Error('Rescheduling closes 1 hour prior to appointment');
    }

    // Check slot availability
    const targetStylist = newStylistId !== undefined ? newStylistId : existing.stylistId;
    const isAvailable = await this.isSlotAvailable(
      existing.salonId,
      newDate,
      newSlotStartTime,
      newSlotEndTime,
      targetStylist,
      appointmentId
    );

    if (!isAvailable) {
      throw new Error('Selected slot was just booked');
    }

    const updated = await this.updateAppointment(appointmentId, {
      scheduledDate: newDate,
      slotStartTime: newSlotStartTime,
      slotEndTime: newSlotEndTime,
      stylistId: targetStylist,
      status: 'CONFIRMED',
      rescheduledFromId: existing.id,
    });

    if (!updated) {
      throw new Error('Failed to update appointment');
    }

    return updated;
  },

  // Daily Settlement & Payout Ledger
  async createPayoutRecord(payout: SalonPayoutRecord): Promise<SalonPayoutRecord> {
    const record: SalonPayoutRecord = {
      ...payout,
      createdAt: payout.createdAt || new Date().toISOString(),
    };

    memoryStore.payoutRecords.set(record.id, record);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `INSERT INTO salon_payout_records (
            id, salon_id, period_start, period_end, gross_amount,
            gateway_fee, platform_fee, net_payout, payout_vpa,
            payout_reference_id, status, settled_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            gross_amount = VALUES(gross_amount),
            net_payout = VALUES(net_payout),
            status = VALUES(status),
            settled_at = VALUES(settled_at)`,
          [
            record.id,
            record.salonId,
            record.periodStart,
            record.periodEnd,
            record.grossAmount,
            record.gatewayFee,
            record.platformFee,
            record.netPayout,
            record.payoutVpa || null,
            record.payoutReferenceId || null,
            record.status,
            toMySqlDatetime(record.settledAt),
            toMySqlDatetime(record.createdAt),
          ]
        );
      } catch (err) {
        console.warn('[appointmentRepo] MySQL createPayoutRecord error:', err);
      }
    }

    return record;
  },

  async getPayoutRecords(filter?: {
    salonId?: string;
    status?: PayoutStatus;
  }): Promise<SalonPayoutRecord[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        let query = 'SELECT * FROM salon_payout_records WHERE 1=1';
        const params: any[] = [];
        if (filter?.salonId) {
          query += ' AND salon_id = ?';
          params.push(filter.salonId);
        }
        if (filter?.status) {
          query += ' AND status = ?';
          params.push(filter.status);
        }
        query += ' ORDER BY created_at DESC';
        const [rows] = await db.query<any[]>(query, params);
        if (rows && rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            salonId: r.salon_id,
            periodStart: typeof r.period_start === 'string' ? r.period_start.slice(0, 10) : new Date(r.period_start).toISOString().slice(0, 10),
            periodEnd: typeof r.period_end === 'string' ? r.period_end.slice(0, 10) : new Date(r.period_end).toISOString().slice(0, 10),
            grossAmount: Number(r.gross_amount),
            gatewayFee: Number(r.gateway_fee),
            platformFee: Number(r.platform_fee),
            netPayout: Number(r.net_payout),
            payoutVpa: r.payout_vpa,
            payoutReferenceId: r.payout_reference_id,
            status: r.status,
            settledAt: toIsoStringSafe(r.settled_at),
            createdAt: toIsoStringSafe(r.created_at) || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('[appointmentRepo] MySQL getPayoutRecords error:', err);
      }
    }

    let list = Array.from(memoryStore.payoutRecords.values());

    if (filter?.salonId) {
      list = list.filter((p) => p.salonId === filter.salonId);
    }
    if (filter?.status) {
      list = list.filter((p) => p.status === filter.status);
    }

    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  },

  async getPayoutById(id: string): Promise<SalonPayoutRecord | null> {
    if (memoryStore.payoutRecords.has(id)) {
      return memoryStore.payoutRecords.get(id)!;
    }

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          'SELECT * FROM salon_payout_records WHERE id = ? LIMIT 1',
          [id]
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            salonId: r.salon_id,
            periodStart: typeof r.period_start === 'string' ? r.period_start.slice(0, 10) : new Date(r.period_start).toISOString().slice(0, 10),
            periodEnd: typeof r.period_end === 'string' ? r.period_end.slice(0, 10) : new Date(r.period_end).toISOString().slice(0, 10),
            grossAmount: Number(r.gross_amount),
            gatewayFee: Number(r.gateway_fee),
            platformFee: Number(r.platform_fee),
            netPayout: Number(r.net_payout),
            payoutVpa: r.payout_vpa,
            payoutReferenceId: r.payout_reference_id,
            status: r.status,
            settledAt: toIsoStringSafe(r.settled_at),
            createdAt: toIsoStringSafe(r.created_at) || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('[appointmentRepo] MySQL getPayoutById error:', err);
      }
    }

    return null;
  },

  async updatePayoutStatus(
    id: string,
    status: PayoutStatus,
    referenceId?: string,
    settledAt?: string
  ): Promise<SalonPayoutRecord | null> {
    const existing = await this.getPayoutById(id);
    if (!existing) return null;

    const updated: SalonPayoutRecord = {
      ...existing,
      status,
      payoutReferenceId: referenceId || existing.payoutReferenceId,
      settledAt: settledAt || (status === 'SETTLED' ? new Date().toISOString() : existing.settledAt),
    };

    memoryStore.payoutRecords.set(id, updated);

    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query(
          `UPDATE salon_payout_records SET
            status = ?,
            payout_reference_id = COALESCE(?, payout_reference_id),
            settled_at = COALESCE(?, settled_at)
          WHERE id = ?`,
          [
            status,
            referenceId || null,
            toMySqlDatetime(updated.settledAt),
            id,
          ]
        );
      } catch (err) {
        console.warn('[appointmentRepo] MySQL updatePayoutStatus error:', err);
      }
    }

    return updated;
  },

  async getCompletedAppointmentsForPeriod(
    salonId: string,
    startDate: string,
    endDate: string
  ): Promise<Appointment[]> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        const [rows] = await db.query<any[]>(
          `SELECT * FROM appointments 
           WHERE salon_id = ? 
             AND status IN ('COMPLETED', 'NO_SHOW') 
             AND scheduled_date >= ? 
             AND scheduled_date <= ? 
             AND escrow_status = 'RELEASED_TO_OWNER'`,
          [salonId, startDate, endDate]
        );
        if (rows && rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            salonId: r.salon_id,
            stylistId: r.stylist_id,
            customerName: r.customer_name,
            customerPhone: r.customer_phone,
            serviceId: r.service_id,
            serviceName: r.service_name,
            scheduledDate: typeof r.scheduled_date === 'string' ? r.scheduled_date.slice(0, 10) : new Date(r.scheduled_date).toISOString().slice(0, 10),
            slotStartTime: r.slot_start_time,
            slotEndTime: r.slot_end_time,
            durationMinutes: r.duration_minutes,
            advanceAmount: Number(r.advance_amount),
            totalPrice: Number(r.total_price),
            paymentMethod: r.payment_method,
            gatewayOrderId: r.gateway_order_id,
            gatewayPaymentId: r.gateway_payment_id,
            escrowStatus: r.escrow_status,
            status: r.status,
            rescheduledFromId: r.rescheduled_from_id,
            createdAt: toIsoStringSafe(r.created_at) || new Date().toISOString(),
            updatedAt: toIsoStringSafe(r.updated_at) || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('[appointmentRepo] MySQL getCompletedAppointmentsForPeriod error:', err);
      }
    }

    const list = Array.from(memoryStore.appointments.values());
    return list.filter((a) => {
      return (
        a.salonId === salonId &&
        (a.status === 'COMPLETED' || a.status === 'NO_SHOW') &&
        a.scheduledDate >= startDate &&
        a.scheduledDate <= endDate &&
        a.escrowStatus === 'RELEASED_TO_OWNER'
      );
    });
  },

  async getSalonAppointmentPolicy(salonId: string): Promise<AppointmentBookingPolicy> {
    const existing = (memoryStore as any).appointmentPolicies?.get(salonId);
    if (existing && existing.isCustomized) {
      return existing;
    }

    const gw = (memoryStore as any).gatewaySettings || defaultPaymentGatewaySettings;

    const defaultPolicy: AppointmentBookingPolicy = {
      enabled: true,
      policyType: gw.appointmentAdvanceType || 'FIXED_TOKEN',
      tokenAmount: typeof gw.appointmentTokenAmount === 'number' ? gw.appointmentTokenAmount : 100,
      percentage: typeof gw.appointmentPercentage === 'number' ? gw.appointmentPercentage : 50,
      convenienceFee: typeof gw.appointmentConvenienceFee === 'number' ? gw.appointmentConvenienceFee : 0,
      allowFreeBooking: typeof gw.appointmentAllowFreeBooking === 'boolean' ? gw.appointmentAllowFreeBooking : true,
      cancellationCutoffHours: 2,
      isCustomized: false,
    };

    return defaultPolicy;
  },

  async updateSalonAppointmentPolicy(
    salonId: string,
    policy: Partial<AppointmentBookingPolicy>
  ): Promise<AppointmentBookingPolicy> {
    const current = await this.getSalonAppointmentPolicy(salonId);
    const updated: AppointmentBookingPolicy = {
      ...current,
      ...policy,
      enabled: typeof policy.enabled === 'boolean' ? policy.enabled : current.enabled,
      tokenAmount: typeof policy.tokenAmount === 'number' ? policy.tokenAmount : current.tokenAmount,
      percentage: typeof policy.percentage === 'number' ? policy.percentage : current.percentage,
      convenienceFee: typeof policy.convenienceFee === 'number' ? policy.convenienceFee : current.convenienceFee,
      allowFreeBooking: typeof policy.allowFreeBooking === 'boolean' ? policy.allowFreeBooking : current.allowFreeBooking,
      cancellationCutoffHours: typeof policy.cancellationCutoffHours === 'number' ? policy.cancellationCutoffHours : current.cancellationCutoffHours,
      policyType: policy.policyType || current.policyType,
      isCustomized: true,
    };

    if (!(memoryStore as any).appointmentPolicies) {
      (memoryStore as any).appointmentPolicies = new Map<string, AppointmentBookingPolicy>();
    }
    (memoryStore as any).appointmentPolicies.set(salonId, updated);
    return updated;
  },

  async resetSalonAppointmentPolicy(salonId: string): Promise<AppointmentBookingPolicy> {
    if ((memoryStore as any).appointmentPolicies) {
      (memoryStore as any).appointmentPolicies.delete(salonId);
    }
    return this.getSalonAppointmentPolicy(salonId);
  },
};
