import { isMySqlConnected, getDb } from './mysql';
import type { Salon, Stylist, ServiceDefinition, QueueTicket, TicketStatus } from '../engine/types';

// In-Memory fallback store
const memoryStore = {
  salons: new Map<string, Salon>(),
  stylists: new Map<string, Stylist>(),
  services: new Map<string, ServiceDefinition>(),
  tickets: new Map<string, QueueTicket>(),
  ticketSequence: new Map<string, number>(),
};

// Seed initial demo data
export function seedDemoData() {
  // 1. Rural Solo-Barber Shop
  const ruralSalon: Salon = {
    id: 'salon-rural-01',
    name: 'Ramesh Traditional Barber',
    slug: 'ramesh-barber',
    phone: '+91 98765 43210',
    operatingMode: 'RURAL_SOLO',
    countryCode: '+91',
    currency: 'INR',
    address: 'Near Main Market Tea Stall, Village Center',
    upiPaymentId: 'rameshbarber@upi',
    createdAt: new Date(),
    stylists: [],
    services: [],
  };

  const rameshStylist: Stylist = {
    id: 'stylist-ramesh-01',
    salonId: ruralSalon.id,
    name: 'Ramesh Kumar (Owner & Barber)',
    phone: '+91 98765 43210',
    isActive: true,
    historicalAvgDurationMinutes: 20,
    currentTicketId: null,
  };

  const ruralServices: ServiceDefinition[] = [
    { id: 'srv-r-1', salonId: ruralSalon.id, name: 'Haircut (बाल कटिंग)', basePrice: 80, estimatedDurationMinutes: 20, isAddOn: false, icon: '✂️' },
    { id: 'srv-r-2', salonId: ruralSalon.id, name: 'Clean Shave (दाढ़ी शेव)', basePrice: 40, estimatedDurationMinutes: 15, isAddOn: false, icon: '🪒' },
    { id: 'srv-r-3', salonId: ruralSalon.id, name: 'Hair Cut + Shave Combo', basePrice: 110, estimatedDurationMinutes: 30, isAddOn: false, icon: '💈' },
    { id: 'srv-r-4', salonId: ruralSalon.id, name: 'Beard Styling & Trim', basePrice: 30, estimatedDurationMinutes: 10, isAddOn: true, icon: '🧔' },
    { id: 'srv-r-5', salonId: ruralSalon.id, name: 'Head Massage / Champy (चम्पी)', basePrice: 50, estimatedDurationMinutes: 15, isAddOn: true, icon: '💆' },
  ];

  // 2. Modern Multi-Station Salon
  const modernSalon: Salon = {
    id: 'salon-modern-01',
    name: 'Aura Premium Salon & Spa',
    slug: 'aura-salon',
    phone: '+91 99887 76655',
    operatingMode: 'MODERN_MULTI',
    countryCode: '+91',
    currency: 'INR',
    address: 'Plot 42, High Street Galleria, 2nd Floor',
    createdAt: new Date(),
    stylists: [],
    services: [],
  };

  const modernStylists: Stylist[] = [
    { id: 'stylist-m-1', salonId: modernSalon.id, name: 'Leo (Master Stylist)', phone: '+91 99887 76651', isActive: true, historicalAvgDurationMinutes: 35 },
    { id: 'stylist-m-2', salonId: modernSalon.id, name: 'Sarah (Senior Stylist)', phone: '+91 99887 76652', isActive: true, historicalAvgDurationMinutes: 30 },
    { id: 'stylist-m-3', salonId: modernSalon.id, name: 'Maria (Color Specialist)', phone: '+91 99887 76653', isActive: true, historicalAvgDurationMinutes: 45 },
    { id: 'stylist-m-4', salonId: modernSalon.id, name: 'Sam (Junior Stylist)', phone: '+91 99887 76654', isActive: true, historicalAvgDurationMinutes: 25 },
  ];

  const modernServices: ServiceDefinition[] = [
    { id: 'srv-m-1', salonId: modernSalon.id, name: 'Signature Haircut & Styling', basePrice: 450, estimatedDurationMinutes: 30, isAddOn: false, icon: '✂️' },
    { id: 'srv-m-2', salonId: modernSalon.id, name: 'Beard Trim & Sculpting', basePrice: 200, estimatedDurationMinutes: 20, isAddOn: false, icon: '🧔' },
    { id: 'srv-m-3', salonId: modernSalon.id, name: 'Hair Spa & Deep Conditioning', basePrice: 850, estimatedDurationMinutes: 45, isAddOn: false, icon: '🧖' },
    { id: 'srv-m-4', salonId: modernSalon.id, name: 'Organic Beard Oil Treatment', basePrice: 150, estimatedDurationMinutes: 10, isAddOn: true, icon: '✨' },
    { id: 'srv-m-5', salonId: modernSalon.id, name: 'Hair Wash & Scalp Massage', basePrice: 180, estimatedDurationMinutes: 15, isAddOn: true, icon: '💆' },
  ];

  ruralSalon.stylists = [rameshStylist];
  ruralSalon.services = ruralServices;
  modernSalon.stylists = modernStylists;
  modernSalon.services = modernServices;

  // Save in memory
  memoryStore.salons.set(ruralSalon.id, ruralSalon);
  memoryStore.salons.set(ruralSalon.slug, ruralSalon);
  memoryStore.salons.set(modernSalon.id, modernSalon);
  memoryStore.salons.set(modernSalon.slug, modernSalon);

  for (const s of [rameshStylist, ...modernStylists]) memoryStore.stylists.set(s.id, s);
  for (const s of [...ruralServices, ...modernServices]) memoryStore.services.set(s.id, s);

  memoryStore.ticketSequence.set(ruralSalon.id, 100);
  memoryStore.ticketSequence.set(modernSalon.id, 200);

  // Sync to MySQL if connected
  if (isMySqlConnected) {
    syncDemoToMySql([ruralSalon, modernSalon]).catch((e) =>
      console.warn('[MySQL Seed Warning]', e.message)
    );
  }
}

async function syncDemoToMySql(salons: Salon[]) {
  const db = getDb();
  for (const salon of salons) {
    await db.query(
      `INSERT INTO salons (id, name, slug, phone, operating_mode, country_code, currency, address, upi_payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), operating_mode=VALUES(operating_mode)`,
      [salon.id, salon.name, salon.slug, salon.phone, salon.operatingMode, salon.countryCode, salon.currency, salon.address || null, salon.upiPaymentId || null]
    );

    for (const st of salon.stylists) {
      await db.query(
        `INSERT INTO stylists (id, salon_id, name, phone, is_active, historical_avg_duration_minutes)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), is_active=VALUES(is_active)`,
        [st.id, st.salonId, st.name, st.phone, st.isActive, st.historicalAvgDurationMinutes]
      );
    }

    for (const srv of salon.services) {
      await db.query(
        `INSERT INTO services (id, salon_id, name, base_price, estimated_duration_minutes, is_add_on, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), base_price=VALUES(base_price)`,
        [srv.id, srv.salonId, srv.name, srv.basePrice, srv.estimatedDurationMinutes, srv.isAddOn, srv.icon || null]
      );
    }
  }
}

// -------------------------------------------------------------
// REPOSITORY METHODS
// -------------------------------------------------------------

export const repository = {
  // Salons
  async getSalonBySlug(slug: string): Promise<Salon | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM salons WHERE slug = ? LIMIT 1', [slug]);
      if (rows.length === 0) return null;
      const salonRow = rows[0];

      const [stylistRows]: any = await db.query('SELECT * FROM stylists WHERE salon_id = ? AND is_active = TRUE', [salonRow.id]);
      const [serviceRows]: any = await db.query('SELECT * FROM services WHERE salon_id = ?', [salonRow.id]);

      return {
        id: salonRow.id,
        name: salonRow.name,
        slug: salonRow.slug,
        phone: salonRow.phone,
        operatingMode: salonRow.operating_mode,
        countryCode: salonRow.country_code,
        currency: salonRow.currency,
        address: salonRow.address,
        upiPaymentId: salonRow.upi_payment_id,
        createdAt: salonRow.created_at,
        stylists: stylistRows.map((r: any) => ({
          id: r.id,
          salonId: r.salon_id,
          name: r.name,
          phone: r.phone,
          isActive: Boolean(r.is_active),
          historicalAvgDurationMinutes: r.historical_avg_duration_minutes,
        })),
        services: serviceRows.map((r: any) => ({
          id: r.id,
          salonId: r.salon_id,
          name: r.name,
          basePrice: Number(r.base_price),
          estimatedDurationMinutes: Number(r.estimated_duration_minutes),
          isAddOn: Boolean(r.is_add_on),
          icon: r.icon,
        })),
      };
    }
    return memoryStore.salons.get(slug) || null;
  },

  async getAllSalons(): Promise<Salon[]> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM salons');
      const results: Salon[] = [];
      for (const row of rows) {
        const full = await repository.getSalonBySlug(row.slug);
        if (full) results.push(full);
      }
      return results;
    }
    const unique = new Set(memoryStore.salons.values());
    return Array.from(unique);
  },

  async updateSalonOperatingMode(salonId: string, mode: 'RURAL_SOLO' | 'MODERN_MULTI') {
    if (isMySqlConnected) {
      const db = getDb();
      await db.query('UPDATE salons SET operating_mode = ? WHERE id = ?', [mode, salonId]);
    }
    for (const [k, s] of memoryStore.salons.entries()) {
      if (s.id === salonId) {
        s.operatingMode = mode;
      }
    }
  },

  // Tickets
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
    memoryStore.tickets.set(ticket.id, ticket);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO queue_tickets 
          (id, salon_id, stylist_id, ticket_number, customer_name, customer_phone, service_id, service_name, 
           selected_add_ons, total_price, total_duration_minutes, status, source, estimated_wait_minutes, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket.id,
          ticket.salonId,
          ticket.stylistId || null,
          ticket.ticketNumber,
          ticket.customerName,
          ticket.customerPhone,
          ticket.serviceId,
          ticket.serviceName,
          JSON.stringify(ticket.selectedAddOns),
          ticket.totalPrice,
          ticket.totalDurationMinutes,
          ticket.status,
          ticket.source,
          ticket.estimatedWaitMinutes,
          ticket.paymentStatus,
        ]
      );
    }
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
        checkInTime: r.check_in_time,
        summonedTime: r.summoned_time,
        startedTime: r.started_time,
        completedTime: r.completed_time,
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
        checkInTime: r.check_in_time,
        summonedTime: r.summoned_time,
        startedTime: r.started_time,
        completedTime: r.completed_time,
        paymentStatus: r.payment_status,
        paymentAmount: r.payment_amount ? Number(r.payment_amount) : null,
        positionInQueue: 0,
      };
    }
    return memoryStore.tickets.get(ticketId) || null;
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
    const ticket = await repository.getTicketById(ticketId);
    if (!ticket) return null;

    ticket.status = status;
    if (metadata?.stylistId !== undefined) ticket.stylistId = metadata.stylistId;
    if (metadata?.summonedTime) ticket.summonedTime = metadata.summonedTime;
    if (metadata?.startedTime) ticket.startedTime = metadata.startedTime;
    if (metadata?.completedTime) ticket.completedTime = metadata.completedTime;
    if (metadata?.paymentStatus) ticket.paymentStatus = metadata.paymentStatus;
    if (metadata?.paymentAmount !== undefined) ticket.paymentAmount = metadata.paymentAmount;

    memoryStore.tickets.set(ticketId, ticket);

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
          metadata?.summonedTime || null,
          metadata?.startedTime || null,
          metadata?.completedTime || null,
          metadata?.paymentStatus || null,
          metadata?.paymentAmount !== undefined ? metadata.paymentAmount : null,
          ticketId,
        ]
      );
    }

    return ticket;
  },
};
