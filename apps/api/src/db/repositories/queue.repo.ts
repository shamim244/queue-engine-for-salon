import { isMySqlConnected, getDb } from '../mysql';
import type { QueueTicket, TicketStatus } from '../../engine/types';
import { memoryStore, toMySqlDatetime, toIsoStringSafe } from './store';

export const queueRepo = {
  async getNextTicketNumber(salonId: string): Promise<number> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        'SELECT COALESCE(MAX(ticket_number), 100) + 1 AS next_num FROM queue_tickets WHERE salon_id = ?',
        [salonId]
      );
      return rows[0].next_num;
    }
    const current = memoryStore.ticketSequence.get(salonId) || 100;
    const next = current + 1;
    memoryStore.ticketSequence.set(salonId, next);
    return next;
  },

  async createTicket(ticket: QueueTicket): Promise<QueueTicket> {
    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO queue_tickets 
          (id, salon_id, stylist_id, ticket_number, customer_name, customer_phone, service_id, service_name, 
           selected_add_ons, total_price, total_duration_minutes, status, source, estimated_wait_minutes, payment_status, check_in_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
        [
          ticket.id,
          ticket.salonId,
          ticket.stylistId || null,
          ticket.ticketNumber,
          ticket.customerName,
          ticket.customerPhone,
          ticket.serviceId || 'srv-haircut-01',
          ticket.serviceName || 'Haircut',
          JSON.stringify(ticket.selectedAddOns || []),
          ticket.totalPrice !== undefined ? ticket.totalPrice : 100,
          ticket.totalDurationMinutes || ticket.estimatedWaitMinutes || 20,
          ticket.status || 'WAITING',
          ticket.source || 'QR_SCAN',
          ticket.estimatedWaitMinutes || 0,
          ticket.paymentStatus || 'PENDING',
          toMySqlDatetime(ticket.checkInTime),
        ]
      );
    }

    // Only commit to memory store after database write succeeds
    memoryStore.tickets.set(ticket.id, ticket);
    return ticket;
  },

  async getActiveTickets(salonId: string): Promise<QueueTicket[]> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT * FROM queue_tickets 
         WHERE salon_id = ? AND status IN ('WAITING', 'SUMMONED', 'IN_CHAIR', 'SOFT_BUMPED')
         ORDER BY check_in_time ASC`,
        [salonId]
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
      }));
    }

    return Array.from(memoryStore.tickets.values())
      .filter((t) => t.salonId === salonId && ['WAITING', 'SUMMONED', 'IN_CHAIR', 'SOFT_BUMPED'].includes(t.status))
      .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
  },

  async getTicketById(ticketId: string): Promise<QueueTicket | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM queue_tickets WHERE id = ? LIMIT 1', [ticketId]);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
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
      };
    }
    return memoryStore.tickets.get(ticketId) || null;
  },

  async getTicketsByCustomer(phone: string): Promise<QueueTicket[]> {
    const rawClean = (phone || '').trim().replace(/[^0-9]/g, '');
    if (!rawClean || rawClean.length < 4) {
      return [];
    }
    const last10 = rawClean.slice(-10);

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT * FROM queue_tickets 
         WHERE customer_phone LIKE ? 
         ORDER BY check_in_time DESC`,
        [`%${last10}`]
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
      }));
    }

    return Array.from(memoryStore.tickets.values())
      .filter((t) => {
        const ticketDigits = t.customerPhone.replace(/[^0-9]/g, '');
        return ticketDigits && (ticketDigits.endsWith(last10) || last10.endsWith(ticketDigits));
      })
      .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
  },

  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    metadata?: {
      stylistId?: string;
      summonedTime?: string;
      startedTime?: string;
      completedTime?: string;
      paymentStatus?: 'PENDING' | 'CASH_PAID' | 'ONLINE_PAID';
      paymentAmount?: number;
    }
  ): Promise<QueueTicket | null> {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) return null;

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `UPDATE queue_tickets 
         SET status = ?, stylist_id = COALESCE(?, stylist_id), 
             summoned_time = COALESCE(?, summoned_time),
             started_time = COALESCE(?, started_time),
             completed_time = COALESCE(?, completed_time),
             payment_status = COALESCE(?, payment_status),
             payment_amount = COALESCE(?, payment_amount)
         WHERE id = ?`,
        [
          status,
          metadata?.stylistId || null,
          toMySqlDatetime(metadata?.summonedTime),
          toMySqlDatetime(metadata?.startedTime),
          toMySqlDatetime(metadata?.completedTime),
          metadata?.paymentStatus || null,
          metadata?.paymentAmount !== undefined ? metadata.paymentAmount : null,
          ticketId,
        ]
      );
    }

    // Only update memory after database write succeeds
    ticket.status = status;
    if (metadata?.stylistId !== undefined) ticket.stylistId = metadata.stylistId;
    if (metadata?.summonedTime) ticket.summonedTime = metadata.summonedTime;
    if (metadata?.startedTime) ticket.startedTime = metadata.startedTime;
    if (metadata?.completedTime) ticket.completedTime = metadata.completedTime;
    if (metadata?.paymentStatus) ticket.paymentStatus = metadata.paymentStatus;
    if (metadata?.paymentAmount !== undefined) ticket.paymentAmount = metadata.paymentAmount;

    memoryStore.tickets.set(ticketId, ticket);
    return ticket;
  },

  async updateTicketStylist(ticketId: string, stylistId: string | null): Promise<QueueTicket | null> {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) return null;

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        'UPDATE queue_tickets SET stylist_id = ? WHERE id = ?',
        [stylistId || null, ticketId]
      );
    }

    ticket.stylistId = stylistId;
    memoryStore.tickets.set(ticketId, ticket);
    return ticket;
  },

  async updateTicketWaitTime(ticketId: string, estimatedMinutes: number): Promise<void> {
    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        'UPDATE queue_tickets SET estimated_wait_minutes = ? WHERE id = ?',
        [estimatedMinutes, ticketId]
      );
    }
    const ticket = memoryStore.tickets.get(ticketId);
    if (ticket) {
      ticket.estimatedWaitMinutes = estimatedMinutes;
    }
  },

  async updateTicketWaitTimesBatch(
    updates: Array<{ id: string; estimatedWaitMinutes: number }>
  ): Promise<void> {
    if (updates.length === 0) return;

    if (isMySqlConnected) {
      const db = getDb();
      const cases = updates.map(() => 'WHEN ? THEN ?').join(' ');
      const placeholders = updates.map(() => '?').join(', ');
      const params: any[] = [];
      for (const u of updates) {
        params.push(u.id, u.estimatedWaitMinutes);
      }
      for (const u of updates) {
        params.push(u.id);
      }

      await db.query(
        `UPDATE queue_tickets 
         SET estimated_wait_minutes = CASE id ${cases} END
         WHERE id IN (${placeholders})`,
        params
      );
    }

    for (const u of updates) {
      const mem = memoryStore.tickets.get(u.id);
      if (mem) {
        mem.estimatedWaitMinutes = u.estimatedWaitMinutes;
      }
    }
  },
};
