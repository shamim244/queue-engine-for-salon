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
  StaffLeave,
  SubscriptionPlan,
  PaymentOrder,
  OrganizationSubscription,
  Coupon,
  CouponRedemption,
  Wallet,
  WalletTransaction,
  ReferralAttribution,
  PaymentGatewaySettings,
  Appointment,
  SalonPayoutRecord,
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
  pwa: {
    autoInstallPrompt: false,
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

export const defaultPaymentGatewaySettings: PaymentGatewaySettings = {
  id: 'default_gateway_settings',
  upiManualEnabled: true,
  upiVpa: 'salonpayments@icici',
  upiMerchantName: 'Salon Queue SaaS',
  cashEnabled: true,
  cashInstructions: 'Pay at salon head office or deposit cash to our designated bank account.',
  razorpayEnabled: false,
  razorpayKeyId: 'rzp_test_placeholder',
  razorpayKeySecret: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// In-Memory fallback store
export const memoryStore = {
  organizations: new Map<string, Organization>(),
  salons: new Map<string, Salon>(),
  stylists: new Map<string, Stylist>(),
  services: new Map<string, ServiceDefinition>(),
  tickets: new Map<string, QueueTicket>(),
  ticketSequence: new Map<string, number>(),
  stylistServiceDurations: new Map<string, number>(), // key: `${stylistId}:${serviceId}` -> durationMinutes
  staffLeaves: new Map<string, StaffLeave>(),
  plans: new Map<string, SubscriptionPlan>(),
  paymentOrders: new Map<string, PaymentOrder>(),
  organizationSubscriptions: new Map<string, OrganizationSubscription>(),
  coupons: new Map<string, Coupon>(),
  couponRedemptions: new Map<string, CouponRedemption>(),
  wallets: new Map<string, Wallet>(),
  walletTransactions: new Map<string, WalletTransaction>(),
  referralAttributions: new Map<string, ReferralAttribution>(),
  appointments: new Map<string, Appointment>(),
  payoutRecords: new Map<string, SalonPayoutRecord>(),
  gatewaySettings: { ...defaultPaymentGatewaySettings } as PaymentGatewaySettings,
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
  const s = String(val).trim();
  if (!s) return null;
  // If MySQL DATETIME string like '2026-11-07 15:58:09' without timezone offset or Z
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) {
    return s.replace(' ', 'T') + 'Z';
  }
  return s;
}

export function seedDemoData() {
  salonCache.clear();
  memoryStore.tickets.clear();
  memoryStore.ticketSequence.clear();
  memoryStore.salons.clear();
  memoryStore.stylists.clear();
  memoryStore.services.clear();
  memoryStore.stylistServiceDurations.clear();
  memoryStore.staffLeaves.clear();
  memoryStore.organizations.clear();
  memoryStore.plans.clear();
  memoryStore.appointments.clear();
  memoryStore.payoutRecords.clear();
  memoryStore.settings = JSON.parse(JSON.stringify(defaultPlatformSettings));
  memoryStore.auditLogs = [...defaultAuditLogs];
  memoryStore.maintenanceMode = {
    active: false,
    message: 'System operational.',
    activatedAt: null,
  };

  // Seed Plans
  const demoPlans: SubscriptionPlan[] = [
    {
      id: 'plan-starter-01',
      name: 'Solo Traditional Barber',
      slug: 'solo-barber',
      badge: 'Starter',
      description: 'Perfect for single-chair barbers and independent grooming stations.',
      price1m: 499,
      price3m: 1347,
      price6m: 2515,
      price1y: 4192,
      discountPct3m: 10,
      discountPct6m: 16,
      discountPct1y: 30,
      cycle1mEnabled: true,
      cycle3mEnabled: true,
      cycle6mEnabled: true,
      cycle1yEnabled: true,
      maxBranches: 1,
      maxStylistsPerBranch: 1,
      features: [
        'station_chair_transfers',
        'station_soft_bump',
        'station_hold_pause',
        'digital_storefront',
      ],
      status: 'ACTIVE',
      isFeatured: false,
      sortOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'plan-pro-01',
      name: 'Growth Studio Pro',
      slug: 'growth-studio-pro',
      badge: 'Most Popular',
      description: 'Ideal for fast-paced multi-chair barbershops with TV departure mirrors and speed calibration.',
      price1m: 1499,
      price3m: 4047,
      price6m: 7555,
      price1y: 12592,
      discountPct3m: 10,
      discountPct6m: 16,
      discountPct1y: 30,
      cycle1mEnabled: true,
      cycle3mEnabled: true,
      cycle6mEnabled: true,
      cycle1yEnabled: true,
      maxBranches: 3,
      maxStylistsPerBranch: 10,
      features: [
        'station_chair_transfers',
        'station_soft_bump',
        'station_hold_pause',
        'tv_departure_mirror',
        'whatsapp_sms_notifications',
        'staff_shift_analytics',
        'stylist_duration_overrides',
        'digital_storefront',
        'custom_coupons',
      ],
      status: 'ACTIVE',
      isFeatured: true,
      sortOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'plan-enterprise-01',
      name: 'Franchise Scale',
      slug: 'franchise-scale',
      badge: 'Enterprise',
      description: 'Full-featured suite for luxury salon chains, franchises, and regional grooming centers.',
      price1m: 4999,
      price3m: 13497,
      price6m: 25195,
      price1y: 41992,
      discountPct3m: 10,
      discountPct6m: 16,
      discountPct1y: 30,
      cycle1mEnabled: true,
      cycle3mEnabled: true,
      cycle6mEnabled: true,
      cycle1yEnabled: true,
      maxBranches: 10,
      maxStylistsPerBranch: 20,
      features: [
        'station_chair_transfers',
        'station_soft_bump',
        'station_hold_pause',
        'tv_departure_mirror',
        'whatsapp_sms_notifications',
        'staff_shift_analytics',
        'stylist_duration_overrides',
        'staff_leave_recovery',
        'customer_loyalty_stamps',
        'consumer_referrals',
        'digital_storefront',
        'custom_coupons',
      ],
      status: 'ACTIVE',
      isFeatured: false,
      sortOrder: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const plan of demoPlans) {
    memoryStore.plans.set(plan.id, plan);
    memoryStore.plans.set(plan.slug, plan);
  }

  // 0. Seed Organizations
  const rameshOrg: Organization = {
    id: 'org-ramesh',
    name: 'Ramesh Traditional Grooming',
    slug: 'ramesh-grooming',
    tier: 'STARTER',
    planId: 'plan-starter-01',
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

  const sureshStylist: Stylist = {
    id: 'stylist-suresh-02',
    salonId: ruralSalon.id,
    name: 'Suresh Verma',
    phone: '+91 98765 43211',
    isActive: true,
    historicalAvgDurationMinutes: 25,
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

  // Sync Plans first
  for (const plan of memoryStore.plans.values()) {
    await db.query(
      `INSERT INTO subscription_plans (
        id, name, slug, badge, description,
        price_1m, price_3m, price_6m, price_1y,
        discount_pct_3m, discount_pct_6m, discount_pct_1y,
        cycle_1m_enabled, cycle_3m_enabled, cycle_6m_enabled, cycle_1y_enabled,
        max_branches, max_stylists_per_branch, features,
        status, is_featured, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name=VALUES(name), badge=VALUES(badge), description=VALUES(description),
        price_1m=VALUES(price_1m), price_3m=VALUES(price_3m), price_6m=VALUES(price_6m), price_1y=VALUES(price_1y),
        discount_pct_3m=VALUES(discount_pct_3m), discount_pct_6m=VALUES(discount_pct_6m), discount_pct_1y=VALUES(discount_pct_1y),
        cycle_1m_enabled=VALUES(cycle_1m_enabled), cycle_3m_enabled=VALUES(cycle_3m_enabled), cycle_6m_enabled=VALUES(cycle_6m_enabled), cycle_1y_enabled=VALUES(cycle_1y_enabled),
        max_branches=VALUES(max_branches), max_stylists_per_branch=VALUES(max_stylists_per_branch), features=VALUES(features),
        status=VALUES(status), is_featured=VALUES(is_featured), sort_order=VALUES(sort_order)`,
      [
        plan.id, plan.name, plan.slug, plan.badge || null, plan.description || null,
        plan.price1m, plan.price3m ?? null, plan.price6m ?? null, plan.price1y ?? null,
        plan.discountPct3m, plan.discountPct6m, plan.discountPct1y,
        plan.cycle1mEnabled, plan.cycle3mEnabled, plan.cycle6mEnabled, plan.cycle1yEnabled,
        plan.maxBranches, plan.maxStylistsPerBranch, JSON.stringify(plan.features),
        plan.status, plan.isFeatured, plan.sortOrder
      ]
    );
  }

  // Sync Organizations
  for (const org of memoryStore.organizations.values()) {
    await db.query(
      `INSERT INTO organizations (id, name, slug, tier, plan_id, max_branches, max_stylists_per_branch)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        name=VALUES(name), tier=VALUES(tier), plan_id=VALUES(plan_id),
        max_branches=VALUES(max_branches), max_stylists_per_branch=VALUES(max_stylists_per_branch)`,
      [org.id, org.name, org.slug, org.tier, org.planId || null, org.maxBranches, org.maxStylistsPerBranch]
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
