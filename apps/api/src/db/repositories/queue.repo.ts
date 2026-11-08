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
           selected_add_ons, total_price, total_duration_minutes, status, source, estimated_wait_minutes, payment_status, check_in_time, notes, grooming_tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()), ?, ?)`,
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
          ticket.notes || null,
          ticket.groomingTags ? JSON.stringify(ticket.groomingTags) : null,
        ]
      );
    }

    // Only commit to memory store after database write succeeds
    memoryStore.tickets.set(ticket.id, ticket);
    return ticket;
  },

  async getActiveTickets(salonId: string): Promise<QueueTicket[]> {
    let tickets: QueueTicket[] = [];
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT * FROM queue_tickets 
         WHERE salon_id = ? AND status IN ('WAITING', 'SUMMONED', 'IN_CHAIR', 'SOFT_BUMPED', 'PAUSED')
         ORDER BY check_in_time ASC`,
        [salonId]
      );
      tickets = rows.map((r: any) => ({
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
    } else {
      tickets = Array.from(memoryStore.tickets.values())
        .filter((t) => t.salonId === salonId && ['WAITING', 'SUMMONED', 'IN_CHAIR', 'SOFT_BUMPED', 'PAUSED'].includes(t.status))
        .sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
    }

    return await this.enrichTicketsIntelligence(tickets, salonId);
  },

  async getTicketById(ticketId: string): Promise<QueueTicket | null> {
    let ticket: QueueTicket | null = null;
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM queue_tickets WHERE id = ? LIMIT 1', [ticketId]);
      if (rows.length === 0) return null;
      const r = rows[0];
      ticket = {
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
      };
    } else {
      ticket = memoryStore.tickets.get(ticketId) || null;
    }

    if (!ticket) return null;
    const [enriched] = await this.enrichTicketsIntelligence([ticket], ticket.salonId);
    return enriched || ticket;
  },

  async enrichTicketsIntelligence(tickets: QueueTicket[], salonId?: string): Promise<QueueTicket[]> {
    if (!tickets || tickets.length === 0) return tickets;

    const phones = Array.from(new Set(tickets.map((t) => t.customerPhone).filter(Boolean)));
    if (phones.length === 0) return tickets;

    if (isMySqlConnected) {
      try {
        const db = getDb();
        const placeholders = phones.map(() => '?').join(', ');
        const [counts]: any = await db.query(
          `SELECT customer_phone, COUNT(*) AS completed_count, MAX(completed_time) AS last_visited_at 
           FROM queue_tickets 
           WHERE status = 'COMPLETED' AND customer_phone IN (${placeholders})
           GROUP BY customer_phone`,
          phones
        );

        const [lastServices]: any = await db.query(
          `SELECT t.customer_phone, t.service_name 
           FROM queue_tickets t
           INNER JOIN (
             SELECT customer_phone, MAX(completed_time) AS max_time 
             FROM queue_tickets 
             WHERE status = 'COMPLETED' AND customer_phone IN (${placeholders})
             GROUP BY customer_phone
           ) latest ON t.customer_phone = latest.customer_phone AND t.completed_time = latest.max_time`,
          phones
        );

        const countMap = new Map<string, { count: number; lastVisitedAt: string | null }>();
        for (const row of counts) {
          countMap.set(row.customer_phone, {
            count: Number(row.completed_count),
            lastVisitedAt: toIsoStringSafe(row.last_visited_at),
          });
        }

        const serviceMap = new Map<string, string>();
        for (const row of lastServices) {
          serviceMap.set(row.customer_phone, row.service_name);
        }

        for (const ticket of tickets) {
          if (!ticket.customerPhone) {
            ticket.visitCount = 1;
            continue;
          }
          const stats = countMap.get(ticket.customerPhone);
          const completedCount = stats?.count || 0;
          ticket.visitCount = completedCount + 1;
          ticket.lastVisitedAt = stats?.lastVisitedAt || null;
          ticket.lastServiceName = serviceMap.get(ticket.customerPhone) || null;
        }
        return tickets;
      } catch (err) {
        console.warn('[QueueRepo] MySQL enrichTicketsIntelligence warning:', err);
      }
    }

    // Memory store fallback
    for (const ticket of tickets) {
      if (!ticket.customerPhone) {
        ticket.visitCount = 1;
        continue;
      }
      const phoneDigits = ticket.customerPhone.replace(/[^0-9]/g, '');
      const last10 = phoneDigits.slice(-10);

      const completedForCustomer = Array.from(memoryStore.tickets.values())
        .filter((t) => {
          if (t.status !== 'COMPLETED') return false;
          const td = (t.customerPhone || '').replace(/[^0-9]/g, '');
          return td && (td.endsWith(last10) || last10.endsWith(td));
        })
        .sort((a, b) => new Date(b.completedTime || b.checkInTime).getTime() - new Date(a.completedTime || a.checkInTime).getTime());

      ticket.visitCount = completedForCustomer.length + 1;
      if (completedForCustomer.length > 0) {
        ticket.lastVisitedAt = completedForCustomer[0].completedTime || completedForCustomer[0].checkInTime;
        ticket.lastServiceName = completedForCustomer[0].serviceName;
      } else {
        ticket.lastVisitedAt = null;
        ticket.lastServiceName = null;
      }

      if (!ticket.groomingTags || ticket.groomingTags.length === 0) {
        const prevWithTags = Array.from(memoryStore.tickets.values())
          .filter((t) => {
            const td = (t.customerPhone || '').replace(/[^0-9]/g, '');
            return td && (td.endsWith(last10) || last10.endsWith(td)) && t.groomingTags && t.groomingTags.length > 0;
          })
          .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
        if (prevWithTags.length > 0) {
          ticket.groomingTags = prevWithTags[0].groomingTags;
        }
      }
    }
    return tickets;
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

  async updateTicketServices(
    ticketId: string,
    params: {
      serviceId?: string;
      serviceName?: string;
      selectedAddOns: Array<{ id: string; name: string; price: number; durationMinutes: number }>;
      totalPrice: number;
      totalDurationMinutes: number;
    }
  ): Promise<QueueTicket | null> {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) return null;

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `UPDATE queue_tickets 
         SET service_id = COALESCE(?, service_id),
             service_name = COALESCE(?, service_name),
             selected_add_ons = ?,
             total_price = ?,
             total_duration_minutes = ?
         WHERE id = ?`,
        [
          params.serviceId || null,
          params.serviceName || null,
          JSON.stringify(params.selectedAddOns),
          params.totalPrice,
          params.totalDurationMinutes,
          ticketId,
        ]
      );
    }

    if (params.serviceId) ticket.serviceId = params.serviceId;
    if (params.serviceName) ticket.serviceName = params.serviceName;
    ticket.selectedAddOns = params.selectedAddOns;
    ticket.totalPrice = params.totalPrice;
    ticket.totalDurationMinutes = params.totalDurationMinutes;

    memoryStore.tickets.set(ticketId, ticket);
    return ticket;
  },

  async updateTicketNotes(
    ticketId: string,
    params: {
      notes?: string | null;
      groomingTags?: string[];
    }
  ): Promise<QueueTicket | null> {
    const ticket = await this.getTicketById(ticketId);
    if (!ticket) return null;

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `UPDATE queue_tickets 
         SET notes = ?,
             grooming_tags = ?
         WHERE id = ?`,
        [
          params.notes !== undefined ? params.notes : (ticket.notes || null),
          params.groomingTags !== undefined ? JSON.stringify(params.groomingTags) : JSON.stringify(ticket.groomingTags || []),
          ticketId,
        ]
      );
    }

    if (params.notes !== undefined) ticket.notes = params.notes;
    if (params.groomingTags !== undefined) ticket.groomingTags = params.groomingTags;

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
