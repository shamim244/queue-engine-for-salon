import { isMySqlConnected, getDb } from '../mysql';
import type {
  Salon,
  Stylist,
  ServiceDefinition,
  QueueTicket,
  Organization,
  PlatformSettings,
  AuditLog,
  MaintenanceMode,
} from '../../engine/types';

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
export const memoryStore = {
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
export interface SalonCacheEntry {
  salon: Salon;
  cachedAt: number;
}
export const salonCache = new Map<string, SalonCacheEntry>();
export const CACHE_TTL_MS = 60000;

export function invalidateSalonCache(salonIdOrSlug?: string): void {
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
}

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
      'Kids & Family Friendly',
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

export async function syncDemoToMySql(salons: Salon[]) {
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
