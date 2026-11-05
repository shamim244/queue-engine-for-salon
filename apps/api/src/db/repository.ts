import { isMySqlConnected, getDb } from './mysql';
import type {
  Salon,
  Stylist,
  ServiceDefinition,
  QueueTicket,
  TicketStatus,
  Organization,
  SubscriptionTier,
  PlatformSettings,
  AuditLog,
  MaintenanceMode,
  OnboardSalonPayload,
} from '../engine/types';
import { websocketHub } from '../websocket/hub';

export const defaultPlatformSettings: PlatformSettings = {
  general: {
    platformName: 'Engine Que Enterprise',
    supportEmail: 'support@engineque.com',
    supportPhone: '+91 99999 88888',
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    defaultGracePeriodMinutes: 3,
    defaultBufferMinutes: 5,
  },
  appearance: {
    themeAccent: 'blue',
    whiteLabelEnabled: false,
    customCssEnabled: false,
    tvDisplayMode: 'AIRPORT_DEPARTURE',
  },
  engine: {
    heartbeatIntervalSeconds: 10,
    watchdogTimeoutSeconds: 3,
    autoSummonThresholdSeconds: 180,
    ticketRetentionHours: 24,
  },
  gateway: {
    provider: 'SIMULATOR',
    senderPhone: '+91 98765 00000',
  },
};

export const defaultAuditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    action: 'SYSTEM_BOOTSTRAP',
    actor: 'SYSTEM',
    details: 'Engine Que enterprise core initialized with multi-tenant schema.',
    category: 'SYSTEM',
  },
  {
    id: 'audit-002',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    action: 'SECURITY_AUDIT',
    actor: 'superadmin',
    details: 'SuperAdmin credentials verified and session tokens encrypted.',
    category: 'SECURITY',
  },
  {
    id: 'audit-003',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'GATEWAY_HEALTH_CHECK',
    actor: 'SYSTEM',
    details: 'Notification delivery pipeline initialized and operational.',
    category: 'CONFIG',
  },
];

// In-Memory fallback store
const memoryStore = {
  organizations: new Map<string, Organization>(),
  salons: new Map<string, Salon>(),
  stylists: new Map<string, Stylist>(),
  services: new Map<string, ServiceDefinition>(),
  tickets: new Map<string, QueueTicket>(),
  ticketSequence: new Map<string, number>(),
  settings: JSON.parse(JSON.stringify(defaultPlatformSettings)) as PlatformSettings,
  auditLogs: [...defaultAuditLogs] as AuditLog[],
  maintenanceMode: {
    active: false,
    message: 'System operational.',
    activatedAt: null as string | null,
  } as MaintenanceMode,
};

// Salon catalog in-memory TTL cache (60 seconds)
interface SalonCacheEntry {
  salon: Salon;
  cachedAt: number;
}
const salonCache = new Map<string, SalonCacheEntry>();
const CACHE_TTL_MS = 60000;

export function seedDemoData() {
  salonCache.clear();
  memoryStore.tickets.clear();
  memoryStore.ticketSequence.clear();
  memoryStore.salons.clear();
  memoryStore.stylists.clear();
  memoryStore.services.clear();
  memoryStore.organizations.clear();
  memoryStore.settings = JSON.parse(JSON.stringify(defaultPlatformSettings));
  memoryStore.auditLogs = [...defaultAuditLogs];
  memoryStore.maintenanceMode = {
    active: false,
    message: 'System operational.',
    activatedAt: null,
  };
  // 0. Seed Organizations
  const rameshOrg: Organization = {
    id: 'org-ramesh',
    name: 'Ramesh Traditional Grooming',
    slug: 'ramesh-grooming',
    tier: 'STARTER',
    maxBranches: 1,
    maxStylistsPerBranch: 1,
    createdAt: new Date(),
  };

  memoryStore.organizations.set(rameshOrg.id, rameshOrg);
  memoryStore.organizations.set(rameshOrg.slug, rameshOrg);

  // 1. Primary Operating Salon
  const ruralSalon: Salon = {
    id: 'salon-rural-01',
    organizationId: rameshOrg.id,
    name: 'Ramesh Traditional Barber',
    slug: 'ramesh-barber',
    phone: '+91 98765 43210',
    countryCode: '+91',
    currency: 'INR',
    address: 'Near Main Market, Central Point',
    upiPaymentId: 'rameshbarber@upi',
    tagline: 'Authentic Traditional Barbering, Hot Towel Shaves & Grooming Excellence',
    about: 'Serving the central community with master craftsmanship, hygienic tools, and unmatched traditional hospitality. Whether you need a sharp executive cut, clean razor shave, or a relaxing champi, we ensure you leave refreshed without endless waiting.',
    email: 'contact@rameshbarber.com',
    whatsappPhone: '+91 98765 43210',
    googleMapsUrl: 'https://maps.google.com/?q=Main+Market+Central+Point',
    instagramHandle: '@rameshbarber',
    operatingHours: 'Mon - Sat: 8:00 AM – 9:00 PM | Sun: 8:00 AM – 2:00 PM',
    amenities: [
      'Air Conditioned',
      'High-Speed Wi-Fi',
      'Complimentary Chai',
      'UPI & Cards Accepted',
      '100% Sanitized Tools',
      'Kids & Family Friendly'
    ],
    announcement: '',
    announcementActive: false,
    createdAt: new Date(),
    stylists: [],
    services: [],
  };

  const rameshStylist: Stylist = {
    id: 'stylist-ramesh-01',
    salonId: ruralSalon.id,
    name: 'Ramesh Kumar',
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

  ruralSalon.stylists = [rameshStylist];
  ruralSalon.services = ruralServices;

  // Save in memory
  memoryStore.salons.set(ruralSalon.id, ruralSalon);
  memoryStore.salons.set(ruralSalon.slug, ruralSalon);

  for (const s of ruralSalon.stylists) memoryStore.stylists.set(s.id, s);
  for (const s of ruralServices) memoryStore.services.set(s.id, s);

  memoryStore.ticketSequence.set(ruralSalon.id, 100);

  // Sync to MySQL if connected
  if (isMySqlConnected) {
    syncDemoToMySql([ruralSalon]).catch((e) =>
      console.warn('[MySQL Seed Warning]', e.message)
    );
  }
}

async function syncDemoToMySql(salons: Salon[]) {
  const db = getDb();

  // Sync Organizations first
  for (const org of memoryStore.organizations.values()) {
    await db.query(
      `INSERT INTO organizations (id, name, slug, tier, max_branches, max_stylists_per_branch)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), tier=VALUES(tier)`,
      [org.id, org.name, org.slug, org.tier, org.maxBranches, org.maxStylistsPerBranch]
    );
  }

  for (const salon of salons) {
    await db.query(
      `INSERT INTO salons (id, organization_id, name, slug, phone, operating_mode, country_code, currency, address, upi_payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), organization_id=VALUES(organization_id), operating_mode=VALUES(operating_mode)`,
      [salon.id, salon.organizationId || null, salon.name, salon.slug, salon.phone, salon.operatingMode || null, salon.countryCode, salon.currency, salon.address || null, salon.upiPaymentId || null]
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
// HELPER METHODS FOR SQL FORMATTING
// -------------------------------------------------------------

export function toMySqlDatetime(val?: string | Date | null): string | null {
  if (!val) return null;
  const d = typeof val === 'string' ? new Date(val) : val;
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export function toIsoStringSafe(val?: string | Date | null): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

// -------------------------------------------------------------
// REPOSITORY METHODS
// -------------------------------------------------------------

export const repository = {
  // Organizations
  async getOrganizationById(id: string): Promise<Organization | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM organizations WHERE id = ? LIMIT 1', [id]);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        tier: r.tier,
        ownerId: r.owner_id,
        maxBranches: Number(r.max_branches),
        maxStylistsPerBranch: Number(r.max_stylists_per_branch),
        createdAt: r.created_at,
      };
    }
    return memoryStore.organizations.get(id) || null;
  },

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM organizations WHERE slug = ? LIMIT 1', [slug]);
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        tier: r.tier,
        ownerId: r.owner_id,
        maxBranches: Number(r.max_branches),
        maxStylistsPerBranch: Number(r.max_stylists_per_branch),
        createdAt: r.created_at,
      };
    }
    return memoryStore.organizations.get(slug) || null;
  },

  async getAllOrganizations(): Promise<Organization[]> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM organizations');
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        tier: r.tier,
        ownerId: r.owner_id,
        maxBranches: Number(r.max_branches),
        maxStylistsPerBranch: Number(r.max_stylists_per_branch),
        createdAt: r.created_at,
      }));
    }
    const unique = new Set(memoryStore.organizations.values());
    return Array.from(unique);
  },

  async createOrganization(params: {
    name: string;
    slug?: string;
    tier?: SubscriptionTier;
    ownerId?: string | null;
    maxBranches?: number;
    maxStylistsPerBranch?: number;
  }): Promise<Organization> {
    const rawSlug = (params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'org';
    let slug = rawSlug;
    let counter = 1;
    while (await this.getOrganizationBySlug(slug)) {
      slug = `${rawSlug}-${counter++}`;
    }

    const tier: SubscriptionTier = params.tier === 'PRO' || params.tier === 'ENTERPRISE' ? params.tier : 'STARTER';
    const limits = {
      STARTER: { maxBranches: 1, maxStylistsPerBranch: 1 },
      PRO: { maxBranches: 3, maxStylistsPerBranch: 10 },
      ENTERPRISE: { maxBranches: 999, maxStylistsPerBranch: 999 },
    }[tier] || { maxBranches: 1, maxStylistsPerBranch: 1 };

    const org: Organization = {
      id: 'org-' + Math.random().toString(36).substring(2, 9),
      name: params.name,
      slug,
      tier,
      ownerId: params.ownerId || null,
      maxBranches: params.maxBranches ?? limits.maxBranches,
      maxStylistsPerBranch: params.maxStylistsPerBranch ?? limits.maxStylistsPerBranch,
      createdAt: new Date(),
    };

    memoryStore.organizations.set(org.id, org);
    memoryStore.organizations.set(org.slug, org);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO organizations (id, name, slug, tier, owner_id, max_branches, max_stylists_per_branch)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [org.id, org.name, org.slug, org.tier, org.ownerId, org.maxBranches, org.maxStylistsPerBranch]
      );
    }

    return org;
  },

  async getSalonsByOrganizationId(orgId: string): Promise<Salon[]> {
    const all = await repository.getAllSalons();
    return all.filter((s) => s.organizationId === orgId);
  },

  async updateOrganizationTier(orgId: string, tier: SubscriptionTier): Promise<Organization | null> {
    const limits = {
      STARTER: { maxBranches: 1, maxStylistsPerBranch: 1 },
      PRO: { maxBranches: 3, maxStylistsPerBranch: 10 },
      ENTERPRISE: { maxBranches: 999, maxStylistsPerBranch: 999 },
    }[tier] || { maxBranches: 1, maxStylistsPerBranch: 1 };

    const org = await this.getOrganizationById(orgId);
    if (!org) return null;

    org.tier = tier;
    org.maxBranches = limits.maxBranches;
    org.maxStylistsPerBranch = limits.maxStylistsPerBranch;

    memoryStore.organizations.set(org.id, org);
    memoryStore.organizations.set(org.slug, org);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        'UPDATE organizations SET tier = ?, max_branches = ?, max_stylists_per_branch = ? WHERE id = ?',
        [tier, limits.maxBranches, limits.maxStylistsPerBranch, orgId]
      );
    }
    return org;
  },

  async checkOrganizationBranchQuota(orgId: string): Promise<{ allowed: boolean; current: number; max: number; tier: SubscriptionTier }> {
    const org = await this.getOrganizationById(orgId);
    if (!org) return { allowed: true, current: 0, max: 999, tier: 'ENTERPRISE' };
    const branches = await this.getSalonsByOrganizationId(orgId);
    return {
      allowed: branches.length < org.maxBranches,
      current: branches.length,
      max: org.maxBranches,
      tier: org.tier,
    };
  },

  async checkSalonStylistQuota(salonId: string): Promise<{ allowed: boolean; current: number; max: number; tier: SubscriptionTier }> {
    const all = await this.getAllSalons();
    const salon = all.find((s) => s.id === salonId);
    if (!salon || !salon.organizationId) {
      return { allowed: true, current: salon ? salon.stylists.length : 0, max: 999, tier: 'ENTERPRISE' };
    }
    const org = await this.getOrganizationById(salon.organizationId);
    if (!org) {
      return { allowed: true, current: salon.stylists.length, max: 999, tier: 'ENTERPRISE' };
    }
    return {
      allowed: salon.stylists.length < org.maxStylistsPerBranch,
      current: salon.stylists.length,
      max: org.maxStylistsPerBranch,
      tier: org.tier,
    };
  },

  // Salons
  invalidateSalonCache(salonIdOrSlug?: string): void {
    if (!salonIdOrSlug) {
      salonCache.clear();
      return;
    }
    const entry = salonCache.get(salonIdOrSlug);
    if (entry) {
      salonCache.delete(entry.salon.slug);
      salonCache.delete(entry.salon.id);
    } else {
      salonCache.delete(salonIdOrSlug);
      for (const [key, val] of salonCache.entries()) {
        if (val.salon.id === salonIdOrSlug || val.salon.slug === salonIdOrSlug) {
          salonCache.delete(key);
        }
      }
    }
  },

  async getSalonById(id: string, options?: { skipCache?: boolean }): Promise<Salon | null> {
    return this.getSalonBySlug(id, options);
  },

  async getSalonBySlug(slug: string, options?: { skipCache?: boolean }): Promise<Salon | null> {
    if (!options?.skipCache) {
      const cached = salonCache.get(slug);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return JSON.parse(JSON.stringify(cached.salon));
      }
    }

    let salon: Salon | null = null;
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM salons WHERE slug = ? OR id = ? LIMIT 1', [slug, slug]);
      if (rows.length === 0) return null;
      const salonRow = rows[0];

      const [stylistRows]: any = await db.query('SELECT * FROM stylists WHERE salon_id = ? AND is_active = TRUE', [salonRow.id]);
      const [serviceRows]: any = await db.query('SELECT * FROM services WHERE salon_id = ?', [salonRow.id]);

      salon = {
        id: salonRow.id,
        organizationId: salonRow.organization_id || null,
        name: salonRow.name,
        slug: salonRow.slug,
        phone: salonRow.phone,
        operatingMode: salonRow.operating_mode,
        countryCode: salonRow.country_code,
        currency: salonRow.currency,
        address: salonRow.address,
        upiPaymentId: salonRow.upi_payment_id,
        tagline: salonRow.tagline || undefined,
        about: salonRow.about || undefined,
        email: salonRow.email || undefined,
        whatsappPhone: salonRow.whatsapp_phone || undefined,
        googleMapsUrl: salonRow.google_maps_url || undefined,
        instagramHandle: salonRow.instagram_handle || undefined,
        operatingHours: salonRow.operating_hours || undefined,
        amenities: typeof salonRow.amenities === 'string' ? JSON.parse(salonRow.amenities) : (salonRow.amenities || undefined),
        announcement: salonRow.announcement || undefined,
        announcementActive: Boolean(salonRow.announcement_active),
        createdAt: salonRow.created_at,
        stylists: stylistRows.map((r: any) => ({
          id: r.id,
          salonId: r.salon_id,
          name: r.name,
          phone: r.phone,
          isActive: Boolean(r.is_active),
          historicalAvgDurationMinutes: r.historical_avg_duration_minutes,
          customAvgDurationMinutes: r.custom_avg_duration_minutes || null,
        })),
        services: serviceRows.map((r: any) => ({
          id: r.id,
          salonId: r.salon_id,
          name: r.name,
          basePrice: Number(r.base_price),
          estimatedDurationMinutes: Number(r.estimated_duration_minutes),
          pricingType: r.pricing_type || 'FIXED',
          isAddOn: Boolean(r.is_add_on),
          icon: r.icon,
        })),
      };
    } else {
      salon = memoryStore.salons.get(slug) || null;
    }

    if (salon) {
      const cloned = JSON.parse(JSON.stringify(salon));
      salonCache.set(salon.slug, { salon: cloned, cachedAt: Date.now() });
      salonCache.set(salon.id, { salon: cloned, cachedAt: Date.now() });
      return JSON.parse(JSON.stringify(salon));
    }
    return null;
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

  async createSalon(params: {
    name: string;
    slug?: string;
    organizationId?: string;
    phone: string;
    operatingMode?: string;
    currency?: string;
    countryCode?: string;
    address?: string;
    upiPaymentId?: string;
    stylists?: { name: string; phone?: string; avgDurationMinutes?: number }[];
    services?: { name: string; basePrice: number; estimatedDurationMinutes: number; isAddOn?: boolean; icon?: string }[];
  }): Promise<Salon> {
    if (params.organizationId) {
      const quota = await this.checkOrganizationBranchQuota(params.organizationId);
      if (!quota.allowed) {
        throw new Error(`Branch quota limit (${quota.max}) reached for tier ${quota.tier}. Please upgrade your organization tier.`);
      }
    }

    const rawSlug = (params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'salon';
    let slug = rawSlug;
    let counter = 1;

    // Ensure unique slug
    while (await repository.getSalonBySlug(slug)) {
      slug = `${rawSlug}-${counter++}`;
    }

    const salonId = 'salon-' + Math.random().toString(36).substring(2, 9);
    const newSalon: Salon = {
      id: salonId,
      organizationId: params.organizationId || null,
      name: params.name,
      slug,
      phone: params.phone,
      operatingMode: params.operatingMode || 'STANDARD',
      countryCode: params.countryCode || '+91',
      currency: params.currency || 'INR',
      address: params.address,
      upiPaymentId: params.upiPaymentId,
      createdAt: new Date(),
      stylists: [],
      services: [],
    };

    // Default stylist if none provided
    const stylistInputs = params.stylists && params.stylists.length > 0
      ? params.stylists
      : [{ name: `${params.name} Stylist` }];

    if (params.organizationId) {
      const org = await this.getOrganizationById(params.organizationId);
      if (org && stylistInputs.length > org.maxStylistsPerBranch) {
        throw new Error(`Stylist count (${stylistInputs.length}) exceeds branch limit (${org.maxStylistsPerBranch}) for tier ${org.tier}. Please upgrade.`);
      }
    }

    newSalon.stylists = stylistInputs.map((st, idx) => ({
      id: `stylist-${salonId}-${idx + 1}`,
      salonId,
      name: st.name,
      phone: st.phone || params.phone,
      isActive: true,
      historicalAvgDurationMinutes: st.avgDurationMinutes || 25,
    }));

    // Default services if none provided
    const serviceInputs = params.services && params.services.length > 0
      ? params.services
      : [
          { name: 'Signature Haircut', basePrice: 150, estimatedDurationMinutes: 25, isAddOn: false, icon: '✂️' },
          { name: 'Beard Trim & Sculpt', basePrice: 80, estimatedDurationMinutes: 15, isAddOn: false, icon: '🧔' },
          { name: 'Hair Wash & Styling', basePrice: 120, estimatedDurationMinutes: 15, isAddOn: true, icon: '💆' },
        ];

    newSalon.services = serviceInputs.map((srv, idx) => ({
      id: `srv-${salonId}-${idx + 1}`,
      salonId,
      name: srv.name,
      basePrice: Number(srv.basePrice),
      estimatedDurationMinutes: Number(srv.estimatedDurationMinutes),
      isAddOn: Boolean(srv.isAddOn),
      icon: srv.icon || (srv.isAddOn ? '✨' : '✂️'),
    }));

    // Save in memory
    memoryStore.salons.set(newSalon.id, newSalon);
    memoryStore.salons.set(newSalon.slug, newSalon);
    for (const st of newSalon.stylists) memoryStore.stylists.set(st.id, st);
    for (const srv of newSalon.services) memoryStore.services.set(srv.id, srv);
    memoryStore.ticketSequence.set(newSalon.id, 100);

    // Save in MySQL if connected
    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO salons (id, organization_id, name, slug, phone, operating_mode, country_code, currency, address, upi_payment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newSalon.id, newSalon.organizationId || null, newSalon.name, newSalon.slug, newSalon.phone, newSalon.operatingMode, newSalon.countryCode, newSalon.currency, newSalon.address || null, newSalon.upiPaymentId || null]
      );

      for (const st of newSalon.stylists) {
        await db.query(
          `INSERT INTO stylists (id, salon_id, name, phone, is_active, historical_avg_duration_minutes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [st.id, st.salonId, st.name, st.phone, st.isActive, st.historicalAvgDurationMinutes]
        );
      }

      for (const srv of newSalon.services) {
        await db.query(
          `INSERT INTO services (id, salon_id, name, base_price, estimated_duration_minutes, is_add_on, icon)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [srv.id, srv.salonId, srv.name, srv.basePrice, srv.estimatedDurationMinutes, srv.isAddOn, srv.icon || null]
        );
      }
    }

    this.invalidateSalonCache(newSalon.id);
    this.invalidateSalonCache(newSalon.slug);
    return newSalon;
  },

  async addStylist(salonId: string, params: { name: string; phone?: string; avgDurationMinutes?: number }): Promise<Stylist> {
    const quota = await this.checkSalonStylistQuota(salonId);
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
    this.invalidateSalonCache(salonId);
    return stylist;
  },

  async updateSalonOperatingMode(salonId: string, mode?: string) {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE salons SET operating_mode = ? WHERE id = ?', [mode || 'STANDARD', salonId]);
      } catch {}
    }
    for (const [k, s] of memoryStore.salons.entries()) {
      if (s.id === salonId) {
        s.operatingMode = mode || 'STANDARD';
      }
    }
    this.invalidateSalonCache(salonId);
  },

  async updateSalon(salonId: string, updates: {
    name?: string;
    phone?: string;
    address?: string;
    upiPaymentId?: string;
    tagline?: string;
    about?: string;
    email?: string;
    whatsappPhone?: string;
    googleMapsUrl?: string;
    instagramHandle?: string;
    operatingHours?: string;
    amenities?: string[];
    announcement?: string;
    announcementActive?: boolean;
    operatingMode?: string;
    currency?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE';
  }): Promise<Salon | null> {
    const all = await this.getAllSalons();
    const salon = all.find((s) => s.id === salonId || s.slug === salonId);
    if (!salon) return null;

    if (updates.name !== undefined) salon.name = updates.name.trim();
    if (updates.phone !== undefined) salon.phone = updates.phone.trim();
    if (updates.address !== undefined) salon.address = updates.address.trim();
    if (updates.upiPaymentId !== undefined) salon.upiPaymentId = updates.upiPaymentId.trim();
    if (updates.tagline !== undefined) salon.tagline = updates.tagline.trim();
    if (updates.about !== undefined) salon.about = updates.about.trim();
    if (updates.email !== undefined) salon.email = updates.email.trim();
    if (updates.whatsappPhone !== undefined) salon.whatsappPhone = updates.whatsappPhone.trim();
    if (updates.googleMapsUrl !== undefined) salon.googleMapsUrl = updates.googleMapsUrl.trim();
    if (updates.instagramHandle !== undefined) salon.instagramHandle = updates.instagramHandle.trim();
    if (updates.operatingHours !== undefined) salon.operatingHours = updates.operatingHours.trim();
    if (updates.amenities !== undefined) salon.amenities = updates.amenities;
    if (updates.announcement !== undefined) salon.announcement = updates.announcement.trim();
    if (updates.announcementActive !== undefined) salon.announcementActive = Boolean(updates.announcementActive);
    if (updates.operatingMode !== undefined) salon.operatingMode = updates.operatingMode;
    if (updates.currency !== undefined) salon.currency = updates.currency.trim();
    if (updates.status !== undefined) (salon as any).status = updates.status;

    memoryStore.salons.set(salon.id, salon);
    memoryStore.salons.set(salon.slug, salon);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `UPDATE salons 
         SET name = ?, phone = ?, address = ?, upi_payment_id = ?, operating_mode = ?,
             tagline = ?, about = ?, email = ?, whatsapp_phone = ?, google_maps_url = ?,
             instagram_handle = ?, operating_hours = ?, amenities = ?, announcement = ?, announcement_active = ?
         WHERE id = ?`,
        [
          salon.name,
          salon.phone,
          salon.address || null,
          salon.upiPaymentId || null,
          salon.operatingMode || 'STANDARD',
          salon.tagline || null,
          salon.about || null,
          salon.email || null,
          salon.whatsappPhone || null,
          salon.googleMapsUrl || null,
          salon.instagramHandle || null,
          salon.operatingHours || null,
          salon.amenities ? JSON.stringify(salon.amenities) : null,
          salon.announcement || null,
          salon.announcementActive ? 1 : 0,
          salon.id,
        ]
      );
    }
    this.invalidateSalonCache(salon.id);
    this.invalidateSalonCache(salon.slug);
    return salon;
  },

  async deleteSalon(salonId: string): Promise<boolean> {
    const all = await this.getAllSalons();
    const salon = all.find((s) => s.id === salonId || s.slug === salonId);
    if (!salon) return false;

    memoryStore.salons.delete(salon.id);
    memoryStore.salons.delete(salon.slug);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query('DELETE FROM queue_tickets WHERE salon_id = ?', [salon.id]);
      await db.query('DELETE FROM services WHERE salon_id = ?', [salon.id]);
      await db.query('DELETE FROM stylists WHERE salon_id = ?', [salon.id]);
      await db.query('DELETE FROM salons WHERE id = ?', [salon.id]);
    }
    this.invalidateSalonCache(salon.id);
    this.invalidateSalonCache(salon.slug);
    return true;
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
          ticket.serviceId,
          ticket.serviceName,
          JSON.stringify(ticket.selectedAddOns),
          ticket.totalPrice,
          ticket.totalDurationMinutes,
          ticket.status,
          ticket.source,
          ticket.estimatedWaitMinutes,
          ticket.paymentStatus,
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
    const ticket = await repository.getTicketById(ticketId);
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
        this.invalidateSalonCache(stylist.salonId);
      }
    } else {
      this.invalidateSalonCache();
    }
    return true;
  },

  async addService(service: ServiceDefinition): Promise<ServiceDefinition> {
    memoryStore.services.set(service.id, service);
    for (const salon of memoryStore.salons.values()) {
      if (salon.id === service.salonId) {
        salon.services.push(service);
        break;
      }
    }

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO services (id, salon_id, name, base_price, estimated_duration_minutes, pricing_type, is_add_on, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          service.id,
          service.salonId,
          service.name,
          service.basePrice,
          service.estimatedDurationMinutes,
          service.pricingType || 'FIXED',
          service.isAddOn ? 1 : 0,
          service.icon || '✂️',
        ]
      );
    }
    this.invalidateSalonCache(service.salonId);
    return service;
  },

  async deleteService(serviceId: string): Promise<boolean> {
    const srv = memoryStore.services.get(serviceId);
    const targetSalonId = srv?.salonId;

    memoryStore.services.delete(serviceId);
    for (const salon of memoryStore.salons.values()) {
      salon.services = salon.services.filter((s) => s.id !== serviceId);
    }

    if (isMySqlConnected) {
      const db = getDb();
      await db.query('DELETE FROM services WHERE id = ?', [serviceId]);
    }

    if (targetSalonId) {
      this.invalidateSalonCache(targetSalonId);
    } else {
      this.invalidateSalonCache();
    }
    return true;
  },

  async getSalonMetrics(salonId: string) {
    const activeTickets = await repository.getActiveTickets(salonId);
    let totalServedToday = 0;
    let totalRevenueToday = 0;

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT COUNT(*) as served, COALESCE(SUM(payment_amount), 0) as revenue
         FROM queue_tickets
         WHERE salon_id = ? AND status = 'COMPLETED' AND DATE(completed_time) = CURRENT_DATE()`,
        [salonId]
      );
      if (rows.length > 0) {
        totalServedToday = Number(rows[0].served);
        totalRevenueToday = Number(rows[0].revenue);
      }
    } else {
      const completed = Array.from(memoryStore.tickets.values()).filter(
        (t) => t.salonId === salonId && t.status === 'COMPLETED'
      );
      totalServedToday = completed.length;
      totalRevenueToday = completed.reduce((sum, t) => sum + (t.paymentAmount || t.totalPrice), 0);
    }

    const avgWaitTime = activeTickets.length > 0
      ? Math.round(activeTickets.reduce((sum, t) => sum + t.estimatedWaitMinutes, 0) / activeTickets.length)
      : 0;

    return {
      salonId,
      activeQueueCount: activeTickets.length,
      totalServedToday,
      totalRevenueToday,
      avgWaitTime,
    };
  },

  async getPlatformMetrics() {
    const salons = await repository.getAllSalons();
    const orgs = await repository.getAllOrganizations();
    const orgMap = new Map(orgs.map((o) => [o.id, o]));
    let totalActiveTickets = 0;
    let totalServedAllTime = 0;
    let totalRevenueAllTime = 0;

    for (const s of salons) {
      const active = await repository.getActiveTickets(s.id);
      totalActiveTickets += active.length;
    }

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT COUNT(*) as served, COALESCE(SUM(payment_amount), 0) as revenue
         FROM queue_tickets WHERE status = 'COMPLETED'`
      );
      if (rows.length > 0) {
        totalServedAllTime = Number(rows[0].served);
        totalRevenueAllTime = Number(rows[0].revenue);
      }
    }

    return {
      totalSalons: salons.length,
      totalActiveTickets,
      totalServedAllTime,
      totalRevenueAllTime,
      salons: salons.map((s) => {
        const org = s.organizationId ? orgMap.get(s.organizationId) : null;
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          organizationId: s.organizationId,
          tier: org?.tier || 'STARTER',
          operatingMode: s.operatingMode,
          phone: s.phone,
          stylistCount: s.stylists.length,
          serviceCount: s.services.length,
        };
      }),
    };
  },

  async getTotalTicketsToday(): Promise<number> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        `SELECT COUNT(*) as count FROM queue_tickets WHERE DATE(check_in_time) = CURRENT_DATE()`
      );
      return Number(rows[0]?.count || 0);
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const tickets = Array.from(memoryStore.tickets.values());
    const count = tickets.filter((t) => t.checkInTime && t.checkInTime.slice(0, 10) === todayStr).length;
    return count;
  },

  async getAdminStats() {
    const salons = await this.getAllSalons();
    const totalSalons = salons.length;
    let totalStylists = 0;
    for (const s of salons) {
      totalStylists += (s.stylists ? s.stylists.length : 0);
    }
    const totalTicketsToday = await this.getTotalTicketsToday();
    const socketClientsCount = websocketHub.getClientCount();
    const uptimeSeconds = Math.floor(process.uptime());
    const systemHealth = memoryStore.maintenanceMode.active ? 'MAINTENANCE' : 'HEALTHY';

    return {
      totalSalons,
      totalStylists,
      totalTicketsToday,
      socketClientsCount,
      uptimeSeconds,
      systemHealth,
    };
  },

  getPlatformSettings(): PlatformSettings {
    return JSON.parse(JSON.stringify(memoryStore.settings));
  },

  updatePlatformSettings(updates: Partial<PlatformSettings>, actor: string = 'superadmin'): PlatformSettings {
    if (updates.general) {
      memoryStore.settings.general = { ...memoryStore.settings.general, ...updates.general };
    }
    if (updates.appearance) {
      memoryStore.settings.appearance = { ...memoryStore.settings.appearance, ...updates.appearance };
    }
    if (updates.engine) {
      memoryStore.settings.engine = { ...memoryStore.settings.engine, ...updates.engine };
    }
    if (updates.gateway) {
      memoryStore.settings.gateway = { ...memoryStore.settings.gateway, ...updates.gateway };
    }
    this.addAuditLog(
      'SETTINGS_UPDATED',
      actor,
      `Platform settings updated: ${Object.keys(updates).join(', ')}`,
      'CONFIG'
    );
    return JSON.parse(JSON.stringify(memoryStore.settings));
  },

  getAuditLogs(): AuditLog[] {
    return [...memoryStore.auditLogs];
  },

  addAuditLog(action: string, actor: string, details: string, category: string = 'SYSTEM'): AuditLog {
    const entry: AuditLog = {
      id: 'audit-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      category,
    };
    memoryStore.auditLogs.unshift(entry);
    if (memoryStore.auditLogs.length > 200) {
      memoryStore.auditLogs.pop();
    }
    return entry;
  },

  getMaintenanceMode(): MaintenanceMode {
    return { ...memoryStore.maintenanceMode };
  },

  toggleMaintenanceMode(active: boolean, message?: string, actor: string = 'superadmin'): MaintenanceMode {
    memoryStore.maintenanceMode = {
      active,
      message: message || (active ? 'Emergency maintenance lockdown' : 'All systems normal'),
      activatedAt: active ? new Date().toISOString() : null,
    };
    this.addAuditLog(
      active ? 'KILL_SWITCH_ENGAGED' : 'KILL_SWITCH_DISENGAGED',
      actor,
      `Maintenance mode set to ${active ? 'ACTIVE' : 'INACTIVE'}. Notice: "${memoryStore.maintenanceMode.message}"`,
      'SECURITY'
    );
    return { ...memoryStore.maintenanceMode };
  },

  async onboardSalon(payload: OnboardSalonPayload): Promise<{
    success: boolean;
    salon: Salon;
    organization?: Organization | null;
    ownerUser?: any;
  }> {
    const salonName = payload.salonName || payload.name;
    if (!salonName) {
      throw new Error('Salon name is required for onboarding.');
    }

    // 1. Organization creation if specified
    let org: Organization | null = null;
    if (payload.organizationName) {
      const orgSlug = payload.organizationSlug || payload.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      org = await this.getOrganizationBySlug(orgSlug);
      if (!org) {
        org = await this.createOrganization({
          name: payload.organizationName,
          slug: orgSlug,
          tier: payload.tier || 'STARTER',
        });
      }
    }

    // 2. Slug check & auto-generation
    let finalSlug = payload.slug;
    if (finalSlug) {
      const existing = await this.getSalonBySlug(finalSlug);
      if (existing) {
        finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 6)}`;
      }
    }

    // 3. Salon Creation
    const salon = await this.createSalon({
      name: salonName,
      slug: finalSlug,
      organizationId: org ? org.id : undefined,
      phone: payload.phone,
      operatingMode: payload.operatingMode || 'STANDARD',
      currency: payload.currency || 'INR',
      countryCode: payload.countryCode || '+91',
      address: payload.address,
      upiPaymentId: payload.upiPaymentId,
      stylists: payload.stylists,
      services: payload.services,
    });

    // 4. Create Owner User if credentials provided
    let ownerUser: any = null;
    if (payload.ownerUser && payload.ownerUser.username && payload.ownerUser.password) {
      const { authService } = await import('../auth/auth-service');
      const cleanUsername = payload.ownerUser.username.trim().toLowerCase();
      const existingUser = await authService.getUserByUsername(cleanUsername);
      if (!existingUser) {
        ownerUser = await authService.createUser({
          username: cleanUsername,
          password: payload.ownerUser.password,
          role: 'SALON_OWNER',
          salonId: salon.id,
          organizationId: salon.organizationId,
          phone: payload.ownerUser.phone || salon.phone,
          email: payload.ownerUser.email,
        });
      } else {
        ownerUser = existingUser;
      }
    }

    // 5. Log audit event
    this.addAuditLog(
      'TENANT_ONBOARDED',
      payload.ownerUser?.username || 'superadmin',
      `Onboarded salon '${salon.name}' (${salon.slug}) with ${salon.stylists.length} stylists and ${salon.services.length} services`,
      'ONBOARDING'
    );

    return {
      success: true,
      salon,
      organization: org,
      ownerUser: ownerUser ? {
        id: ownerUser.id,
        username: ownerUser.username,
        role: ownerUser.role,
        salonId: ownerUser.salonId,
        organizationId: ownerUser.organizationId,
        phone: ownerUser.phone,
        email: ownerUser.email,
      } : null,
    };
  },
};
