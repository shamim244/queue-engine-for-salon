export interface Stylist {
  id: string;
  salonId: string;
  name: string;
  phone?: string;
  pin?: string;
  userId?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  isOwner?: boolean;
  currentTicketId?: string | null;
  avgDurationMinutes?: number;
  historicalAvgDurationMinutes?: number;
}

export interface Service {
  id: string;
  salonId: string;
  name: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  pricingType: "FIXED" | "STARTING_AT" | "FLEXIBLE_CHAIR";
  isAddOn: boolean;
  icon?: string;
}

export interface Salon {
  id: string;
  organizationId?: string | null;
  name: string;
  slug: string;
  phone: string;
  address?: string;
  operatingMode?: string;
  currency: string;
  countryCode: string;
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
  status?: "ACTIVE" | "SUSPENDED" | "MAINTENANCE";
  stylists: Stylist[];
  services: Service[];
  createdAt?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: "STARTER" | "PRO" | "ENTERPRISE";
  maxBranches: number;
  maxStylistsPerBranch: number;
  allowCustomSmsGateway: boolean;
  allowWhiteLabeling: boolean;
  branchCount?: number;
  branches?: { id: string; name: string; slug: string; stylistsCount: number }[];
}

export interface Ticket {
  id: string;
  salonId: string;
  ticketNumber: number;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName?: string;
  salonName?: string;
  salonSlug?: string;
  stylistName?: string;
  addOnIds?: string[];
  stylistId?: string | null;
  status:
    | "WAITING"
    | "CALLED"
    | "IN_SERVICE"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW"
    | "SUMMONED"
    | "IN_CHAIR"
    | "SOFT_BUMPED";
  positionInQueue: number;
  estimatedWaitMinutes: number;
  servedByStylistId?: string | null;
  callCount?: number;
  calledAt?: string | null;
  seatedAt?: string | null;
  completedAt?: string | null;
  totalPrice?: number;
  paymentStatus?: "UNPAID" | "CASH_PAID" | "ONLINE_PAID";
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string | null;
  role: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF" | "CUSTOMER";
  organizationId?: string | null;
  salonId?: string | null;
  staffId?: string | null;
  phone?: string | null;
  email?: string | null;
  pin?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "TERMINATED" | "INACTIVE";
  salonName?: string | null;
  organizationName?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface AuthSessionResponse {
  success: boolean;
  token: string;
  user: AuthUser;
  organization?: Organization;
  salon?: Salon;
  staff?: Stylist;
  branches?: Salon[];
}

export interface PlatformSettings {
  general: {
    platformName: string;
    supportEmail: string;
    supportPhone: string;
    defaultCurrency: string;
    defaultTimezone: string;
    defaultGracePeriodMinutes: number;
    defaultBufferMinutes: number;
  };
  appearance: {
    themeAccent: string;
    whiteLabelEnabled: boolean;
    customCssEnabled: boolean;
    tvDisplayMode: string;
  };
  engine: {
    heartbeatIntervalSeconds: number;
    watchdogTimeoutSeconds: number;
    autoSummonThresholdSeconds: number;
    ticketRetentionHours: number;
  };
  gateway: {
    provider: string;
    senderPhone: string;
  };
}

export interface AdminStats {
  totalSalons: number;
  totalStylists: number;
  totalTicketsToday: number;
  socketClientsCount: number;
  uptimeSeconds: number;
  systemHealth: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  category: string;
}

export interface MaintenanceMode {
  active: boolean;
  message: string;
  activatedAt?: string | null;
}

export interface OnboardSalonPayload {
  salonName?: string;
  name?: string;
  slug?: string;
  operatingMode?: string;
  phone: string;
  address?: string;
  currency?: string;
  countryCode?: string;
  upiPaymentId?: string;
  organizationName?: string;
  organizationSlug?: string;
  tier?: "STARTER" | "PRO" | "ENTERPRISE";
  ownerUser?: {
    username: string;
    password: string;
    phone?: string;
    email?: string;
  };
  stylists?: Array<{
    name: string;
    phone?: string;
    avgDurationMinutes?: number;
    pin?: string;
  }>;
  services?: Array<{
    name: string;
    basePrice: number;
    estimatedDurationMinutes: number;
    isAddOn?: boolean;
    icon?: string;
  }>;
}
