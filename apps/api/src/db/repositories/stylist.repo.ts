import { isMySqlConnected, getDb } from '../mysql';
import type { Stylist, StaffLeave, QueueTicket } from '../../engine/types';
import { memoryStore, invalidateSalonCache, toIsoStringSafe } from './store';
import { organizationRepo } from './organization.repo';
import { salonRepo } from './salon.repo';

export const stylistRepo = {
  async addStylist(salonId: string, params: { name: string; phone?: string; avgDurationMinutes?: number }): Promise<Stylist> {
    const quota = await organizationRepo.checkSalonStylistQuota(salonId, () => salonRepo.getAllSalons());
    if (!quota.allowed) {
      throw new Error(`Stylist quota limit (${quota.max}) reached for tier ${quota.tier}. Please upgrade your organization tier.`);
    }

    const stylistId = 'stylist-' + Math.random().toString(36).substring(2, 9);
    const stylist: Stylist = {
      id: stylistId,
      salonId,
      name: params.name.trim(),
      phone: params.phone || '',
      isActive: true,
      historicalAvgDurationMinutes: params.avgDurationMinutes || 25,
    };

    memoryStore.stylists.set(stylistId, stylist);
    for (const s of memoryStore.salons.values()) {
      if (s.id === salonId) {
        s.stylists.push(stylist);
        break;
      }
    }

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO stylists (id, salon_id, name, phone, is_active, historical_avg_duration_minutes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stylist.id, stylist.salonId, stylist.name, stylist.phone, stylist.isActive, stylist.historicalAvgDurationMinutes]
      );
    }
    invalidateSalonCache(salonId);
    return stylist;
  },

  async updateStylistPreference(
    stylistId: string,
    updates: { customAvgDurationMinutes?: number; isActive?: boolean }
  ): Promise<boolean> {
    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `UPDATE stylists 
         SET custom_avg_duration_minutes = COALESCE(?, custom_avg_duration_minutes),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [
          updates.customAvgDurationMinutes !== undefined ? updates.customAvgDurationMinutes : null,
          updates.isActive !== undefined ? updates.isActive : null,
          stylistId,
        ]
      );
    }

    const stylist = memoryStore.stylists.get(stylistId);
    if (stylist) {
      if (updates.customAvgDurationMinutes !== undefined) {
        stylist.customAvgDurationMinutes = updates.customAvgDurationMinutes;
      }
      if (updates.isActive !== undefined) {
        stylist.isActive = updates.isActive;
      }
      if (stylist.salonId) {
        invalidateSalonCache(stylist.salonId);
      }
    } else {
      invalidateSalonCache();
    }
    return true;
  },

  async getStylistServiceDurations(stylistId: string): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    if (isMySqlConnected) {
      const db = getDb();
      const [rows] = await db.query(
        'SELECT service_id, duration_minutes FROM stylist_service_durations WHERE stylist_id = ?',
        [stylistId]
      );
      if (Array.isArray(rows)) {
        for (const row of rows as any[]) {
          const duration = Number(row.duration_minutes);
          result[row.service_id] = duration;
          memoryStore.stylistServiceDurations.set(`${stylistId}:${row.service_id}`, duration);
        }
      }
      return result;
    }

    // In-memory fallback
    for (const [key, duration] of memoryStore.stylistServiceDurations.entries()) {
      if (key.startsWith(`${stylistId}:`)) {
        const serviceId = key.substring(stylistId.length + 1);
        result[serviceId] = duration;
      }
    }
    return result;
  },

  async saveStylistServiceDurations(
    salonId: string,
    stylistId: string,
    overrides: Record<string, number | null>
  ): Promise<boolean> {
    const entries = Object.entries(overrides);
    if (isMySqlConnected) {
      const db = getDb();
      for (const [serviceId, duration] of entries) {
        if (duration === null || duration === undefined || duration <= 0) {
          await db.query(
            'DELETE FROM stylist_service_durations WHERE stylist_id = ? AND service_id = ?',
            [stylistId, serviceId]
          );
          memoryStore.stylistServiceDurations.delete(`${stylistId}:${serviceId}`);
        } else {
          const id = `ssd-${stylistId}-${serviceId}`.slice(0, 36);
          const minutes = Math.round(duration);
          await db.query(
            `INSERT INTO stylist_service_durations (id, salon_id, stylist_id, service_id, duration_minutes)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE duration_minutes = VALUES(duration_minutes)`,
            [id, salonId, stylistId, serviceId, minutes]
          );
          memoryStore.stylistServiceDurations.set(`${stylistId}:${serviceId}`, minutes);
        }
      }
    } else {
      for (const [serviceId, duration] of entries) {
        if (duration === null || duration === undefined || duration <= 0) {
          memoryStore.stylistServiceDurations.delete(`${stylistId}:${serviceId}`);
        } else {
          memoryStore.stylistServiceDurations.set(`${stylistId}:${serviceId}`, Math.round(duration));
        }
      }
    }
    invalidateSalonCache(salonId);
    return true;
  },

  async getStaffLeaves(
    salonId: string,
    options?: { stylistId?: string; date?: string }
  ): Promise<StaffLeave[]> {
    if (isMySqlConnected) {
      const db = getDb();
      let query = 'SELECT * FROM staff_leaves WHERE salon_id = ?';
      const params: any[] = [salonId];
      if (options?.stylistId) {
        query += ' AND stylist_id = ?';
        params.push(options.stylistId);
      }
      if (options?.date) {
        query += ' AND leave_date <= ? AND COALESCE(end_date, leave_date) >= ?';
        params.push(options.date, options.date);
      }
      query += ' ORDER BY leave_date DESC, created_at DESC';
      const [rows]: any = await db.query(query, params);
      if (Array.isArray(rows)) {
        return rows.map((r: any) => ({
          id: r.id,
          salonId: r.salon_id,
          stylistId: r.stylist_id,
          leaveDate: typeof r.leave_date === 'string' ? r.leave_date : r.leave_date.toISOString().slice(0, 10),
          endDate: r.end_date
            ? typeof r.end_date === 'string'
              ? r.end_date
              : r.end_date.toISOString().slice(0, 10)
            : null,
          reason: r.reason || null,
          status: r.status,
          appliedBy: r.applied_by,
          createdAt: toIsoStringSafe(r.created_at) || new Date().toISOString(),
          updatedAt: toIsoStringSafe(r.updated_at) || new Date().toISOString(),
        }));
      }
      return [];
    }

    // In-memory fallback
    return Array.from(memoryStore.staffLeaves.values())
      .filter((l) => {
        if (l.salonId !== salonId) return false;
        if (options?.stylistId && l.stylistId !== options.stylistId) return false;
        if (options?.date) {
          const end = l.endDate || l.leaveDate;
          if (options.date < l.leaveDate || options.date > end) return false;
        }
        return true;
      })
      .sort((a, b) => (b.leaveDate > a.leaveDate ? 1 : -1));
  },

  async createStaffLeave(params: {
    salonId: string;
    stylistId: string;
    leaveDate: string;
    endDate?: string | null;
    reason?: string | null;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    appliedBy?: string;
  }): Promise<StaffLeave> {
    const id = 'leave-' + Math.random().toString(36).substring(2, 11);
    const leaveDate = params.leaveDate.slice(0, 10);
    const endDate = params.endDate ? params.endDate.slice(0, 10) : null;
    const status = params.status || 'APPROVED';
    const appliedBy = params.appliedBy || 'OWNER';

    const leave: StaffLeave = {
      id,
      salonId: params.salonId,
      stylistId: params.stylistId,
      leaveDate,
      endDate,
      reason: params.reason || null,
      status,
      appliedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO staff_leaves (id, salon_id, stylist_id, leave_date, end_date, reason, status, applied_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [leave.id, leave.salonId, leave.stylistId, leave.leaveDate, leave.endDate, leave.reason, leave.status, leave.appliedBy]
      );
    }

    memoryStore.staffLeaves.set(leave.id, leave);

    // If leave is APPROVED and applies to today, automatically set stylist to inactive
    if (status === 'APPROVED') {
      const today = new Date().toISOString().slice(0, 10);
      const end = leave.endDate || leave.leaveDate;
      if (today >= leave.leaveDate && today <= end) {
        await this.updateStylistPreference(params.stylistId, { isActive: false });
      }
    }

    invalidateSalonCache(params.salonId);
    return leave;
  },

  async updateStaffLeaveStatus(
    leaveId: string,
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  ): Promise<StaffLeave | null> {
    let leave: StaffLeave | null = null;
    if (isMySqlConnected) {
      const db = getDb();
      await db.query('UPDATE staff_leaves SET status = ?, updated_at = NOW() WHERE id = ?', [status, leaveId]);
      const [rows]: any = await db.query('SELECT * FROM staff_leaves WHERE id = ? LIMIT 1', [leaveId]);
      if (Array.isArray(rows) && rows.length > 0) {
        const r = rows[0];
        leave = {
          id: r.id,
          salonId: r.salon_id,
          stylistId: r.stylist_id,
          leaveDate: typeof r.leave_date === 'string' ? r.leave_date : r.leave_date.toISOString().slice(0, 10),
          endDate: r.end_date
            ? typeof r.end_date === 'string'
              ? r.end_date
              : r.end_date.toISOString().slice(0, 10)
            : null,
          reason: r.reason || null,
          status: r.status,
          appliedBy: r.applied_by,
          createdAt: toIsoStringSafe(r.created_at) || new Date().toISOString(),
          updatedAt: toIsoStringSafe(r.updated_at) || new Date().toISOString(),
        };
      }
    } else {
      leave = memoryStore.staffLeaves.get(leaveId) || null;
      if (leave) {
        leave.status = status;
        leave.updatedAt = new Date().toISOString();
        memoryStore.staffLeaves.set(leaveId, leave);
      }
    }

    if (leave) {
      const today = new Date().toISOString().slice(0, 10);
      const end = leave.endDate || leave.leaveDate;
      if (status === 'APPROVED' && today >= leave.leaveDate && today <= end) {
        await this.updateStylistPreference(leave.stylistId, { isActive: false });
      } else if (status === 'CANCELLED' || status === 'REJECTED') {
        const stillOnLeave = await this.isStylistOnLeave(leave.stylistId, today);
        if (!stillOnLeave) {
          await this.updateStylistPreference(leave.stylistId, { isActive: true });
        }
      }
      invalidateSalonCache(leave.salonId);
    }

    return leave;
  },

  async isStylistOnLeave(stylistId: string, dateStr?: string): Promise<boolean> {
    const date = dateStr ? dateStr.slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT id FROM staff_leaves 
         WHERE stylist_id = ? 
           AND status = 'APPROVED' 
           AND leave_date <= ? 
           AND COALESCE(end_date, leave_date) >= ? 
         LIMIT 1`,
        [stylistId, date, date]
      );
      return Array.isArray(rows) && rows.length > 0;
    }

    for (const leave of memoryStore.staffLeaves.values()) {
      if (leave.stylistId === stylistId && leave.status === 'APPROVED') {
        const end = leave.endDate || leave.leaveDate;
        if (date >= leave.leaveDate && date <= end) {
          return true;
        }
      }
    }
    return false;
  },

  async getStylistStrandedTickets(salonId: string, stylistId: string): Promise<QueueTicket[]> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT * FROM queue_tickets
         WHERE salon_id = ? AND stylist_id = ? AND status IN ('WAITING', 'SUMMONED', 'SOFT_BUMPED')
         ORDER BY check_in_time ASC`,
        [salonId, stylistId]
      );
      return rows.map((r: any) => ({
        id: r.id,
        salonId: r.salon_id,
        stylistId: r.stylist_id,
        ticketNumber: r.ticket_number,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        serviceId: r.service_id,
        serviceName: r.service_name,
        selectedAddOns: typeof r.selected_add_ons === 'string' ? JSON.parse(r.selected_add_ons || '[]') : r.selected_add_ons || [],
        totalPrice: Number(r.total_price),
        totalDurationMinutes: Number(r.total_duration_minutes),
        status: r.status,
        source: r.source,
        estimatedWaitMinutes: Number(r.estimated_wait_minutes),
        checkInTime: toIsoStringSafe(r.check_in_time) || new Date().toISOString(),
        summonedTime: toIsoStringSafe(r.summoned_time),
        startedTime: toIsoStringSafe(r.started_time),
        completedTime: toIsoStringSafe(r.completed_time),
        paymentStatus: r.payment_status,
        paymentAmount: r.payment_amount ? Number(r.payment_amount) : null,
        positionInQueue: 0,
        notes: r.notes || null,
        groomingTags: typeof r.grooming_tags === 'string' ? JSON.parse(r.grooming_tags || '[]') : (r.grooming_tags || []),
      }));
    }

    return Array.from(memoryStore.tickets.values())
      .filter((t) => t.salonId === salonId && t.stylistId === stylistId && ['WAITING', 'SUMMONED', 'SOFT_BUMPED'].includes(t.status))
      .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
  },

  async handleStaffAbsenceRecovery(params: {
    salonId: string;
    stylistId: string;
    action: 'UNIVERSAL_FAST_LINE' | 'REASSIGN_STYLIST';
    targetStylistId?: string;
    reason?: string;
  }): Promise<{ success: boolean; affectedCount: number; message: string; tickets: QueueTicket[] }> {
    const strandedTickets = await this.getStylistStrandedTickets(params.salonId, params.stylistId);

    if (params.action === 'REASSIGN_STYLIST' && !params.targetStylistId) {
      throw new Error('targetStylistId is required for REASSIGN_STYLIST action');
    }

    for (const ticket of strandedTickets) {
      const isUniversal = params.action === 'UNIVERSAL_FAST_LINE';
      const newStylistId = isUniversal ? null : params.targetStylistId!;
      const newStatus = ticket.status === 'SUMMONED' ? 'SOFT_BUMPED' : ticket.status;
      const noteAppend = isUniversal
        ? '[Absence Recovery: Moved to Universal Fast Line - Arrival Seniority Preserved]'
        : `[Absence Recovery: Reassigned to Barber Chair ${params.targetStylistId} - Arrival Seniority Preserved]`;
      const updatedNotes = ticket.notes ? `${ticket.notes}\n${noteAppend}` : noteAppend;

      if (isMySqlConnected) {
        const db = getDb();
        await db.query(
          'UPDATE queue_tickets SET stylist_id = ?, status = ?, notes = ? WHERE id = ?',
          [newStylistId, newStatus, updatedNotes, ticket.id]
        );
      }

      ticket.stylistId = newStylistId;
      ticket.status = newStatus as any;
      ticket.notes = updatedNotes;
      memoryStore.tickets.set(ticket.id, ticket);
    }

    // Mark the absent stylist as inactive
    await this.updateStylistPreference(params.stylistId, { isActive: false });

    // Ensure approved leave record exists for today
    const today = new Date().toISOString().slice(0, 10);
    const alreadyOnLeave = await this.isStylistOnLeave(params.stylistId, today);
    if (!alreadyOnLeave) {
      await this.createStaffLeave({
        salonId: params.salonId,
        stylistId: params.stylistId,
        leaveDate: today,
        reason: params.reason || 'Late-detected absence recovered by manager',
        status: 'APPROVED',
        appliedBy: 'OWNER',
      });
    }

    invalidateSalonCache(params.salonId);

    // Dynamic import queueEngine for queue recalculation without circular static binding
    try {
      const { queueEngine } = await import('../../engine/queue-engine');
      await queueEngine.recalculateQueue(params.salonId);
    } catch (err) {
      console.warn('[handleStaffAbsenceRecovery] Queue recalculation notice:', err);
    }

    // Broadcast WebSocket notification to all salon clients
    try {
      const { websocketHub } = await import('../../websocket/hub');
      websocketHub.broadcastToSalon(params.salonId, {
        type: 'STAFF_ABSENCE_RECOVERED',
        salonId: params.salonId,
        stylistId: params.stylistId,
        action: params.action,
        targetStylistId: params.targetStylistId || null,
        affectedCount: strandedTickets.length,
      });
    } catch (err) {
      console.warn('[handleStaffAbsenceRecovery] WebSocket broadcast notice:', err);
    }

    // Queue WhatsApp notification for affected customers
    try {
      const salon = await salonRepo.getSalonById(params.salonId);
      const salonName = salon?.name || 'Your Salon';
      const { jobQueue } = await import('../../worker/job-queue');
      for (const t of strandedTickets) {
        if (t.customerPhone) {
          const customMessage =
            params.action === 'UNIVERSAL_FAST_LINE'
              ? `💈 Update on your Ticket #${t.ticketNumber}: Your preferred stylist is unavailable today. You have been moved to the Fastest Available Barber Line with your arrival priority fully preserved!`
              : `💈 Update on your Ticket #${t.ticketNumber}: Your preferred stylist is unavailable today. Your ticket has been transferred to another available barber with your queue seniority fully preserved!`;

          await jobQueue.enqueue('SEND_WHATSAPP', {
            salonId: params.salonId,
            salonName,
            ticketId: t.id,
            recipientName: t.customerName,
            recipientPhone: t.customerPhone,
            type: 'ABSENCE_QUEUE_REASSIGNMENT',
            ticketNumber: t.ticketNumber,
            customMessage,
          });
        }
      }
    } catch (err) {
      console.warn('[handleStaffAbsenceRecovery] WhatsApp alert notice:', err);
    }

    return {
      success: true,
      affectedCount: strandedTickets.length,
      message:
        params.action === 'UNIVERSAL_FAST_LINE'
          ? `Successfully moved ${strandedTickets.length} client(s) to Universal Fast Line.`
          : `Successfully reassigned ${strandedTickets.length} client(s) to another barber.`,
      tickets: strandedTickets,
    };
  },
};

