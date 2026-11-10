export type SalonOperatingMode = string;

export type SubscriptionTier = 'STARTER' | 'PRO' | 'ENTERPRISE';

export type UserRole = 'SUPER_ADMIN' | 'SALON_OWNER' | 'BRANCH_MANAGER' | 'STAFF' | 'CUSTOMER';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export type PricingType = 'FIXED' | 'STARTING_AT' | 'FLEXIBLE_CHAIR';

export type RoutingPreference = 'AUTO_FASTEST' | 'SPECIFIC_STYLIST';

export type TicketStatus = 
  | 'WAITING'       // Waiting in virtual queue
  | 'SUMMONED'      // Called to chair (T-10m warning or Ready)
  | 'IN_CHAIR'      // Currently receiving service
  | 'COMPLETED'     // Finished service and paid
  | 'SOFT_BUMPED'   // Not present within 3-min grace, moved to next slot
  | 'CANCELLED'     // Cancelled by client or barber
  | 'NO_SHOW'       // Marked as no-show
  | 'PAUSED';       // Stepped out on errand/tea, held without blocking active calls until resumed

export type TicketSource = 'QR_SCAN' | 'BARBER_QUICK_ADD' | 'RECEPTIONIST' | 'REMOTE_WEB';

export type PaymentStatus = 'PENDING' | 'CASH_PAID' | 'ONLINE_PAID';

export type BillingCycle = '1m' | '3m' | '6m' | '1y';

export type PlanStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type PaymentProvider = 'UPI_QR' | 'CASH' | 'RAZORPAY' | 'WALLET';

export type PaymentTargetType = 'SUBSCRIPTION' | 'QUEUE_TICKET' | 'WALLET_TOPUP';

export type PaymentOrderStatus =
  | 'PENDING'
  | 'PENDING_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'REJECTED';

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'GRACE_PERIOD';

export interface PaymentGatewaySettings {
  id: string;
  upiManualEnabled: boolean;
  upiVpa: string;
  upiMerchantName: string;
  cashEnabled: boolean;
  cashInstructions: string;
  razorpayEnabled: boolean;
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
  appointmentAdvanceType?: 'FREE' | 'FIXED_TOKEN' | 'PERCENTAGE' | 'FULL';
  appointmentTokenAmount?: number;
  appointmentPercentage?: number;
  appointmentConvenienceFee?: number;
  appointmentAllowFreeBooking?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PaymentOrder {
  id: string;
  targetType: PaymentTargetType;
  targetId: string;
  organizationId?: string | null;
  salonId?: string | null;
  customerId?: string | null;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerOrderId?: string | null;
  transactionRef?: string | null;
  utrNumber?: string | null;
  paymentProofNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | string | null;
  rejectionReason?: string | null;
  status: PaymentOrderStatus;
  paymentData?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  expiresAt: Date | string;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface OrganizationSubscription {
  id: string;
  organizationId: string;
  planId: string;
  cycle: BillingCycle | 'custom';
  startsAt: Date | string;
  expiresAt: Date | string;
  basePrice: number;
  couponId?: string | null;
  couponDiscount: number;
  walletDeducted: number;
  netAmountPaid: number;
  paymentMethod: string;
  paymentOrderId?: string | null;
  transactionRef?: string | null;
  status: SubscriptionStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CouponTargetType = 'SUBSCRIPTION' | 'SALON_SERVICE';

export type CouponDiscountType = 'PERCENT' | 'FLAT';

export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface Coupon {
  id: string;
  code: string;
  targetType: CouponTargetType;
  organizationId?: string | null;
  salonId?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  maxUses?: number | null;
  usedCount: number;
  maxUsesPerUser: number;
  validFrom: Date | string;
  validUntil?: Date | string | null;
  status: CouponStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CouponRedemption {
  id: string;
  couponId: string;
  targetType: CouponTargetType;
  targetOrderId: string;
  userId?: string | null;
  discountApplied: number;
  redeemedAt: Date | string;
}

export interface CreateCouponPayload {
  code: string;
  targetType: CouponTargetType;
  organizationId?: string | null;
  salonId?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  validFrom?: Date | string;
  validUntil?: Date | string | null;
  status?: CouponStatus;
}

export type WalletType = 'OWNER' | 'CONSUMER';

export type WalletTransactionType = 'CREDIT' | 'DEBIT';

export type ReferralType = 'B2B_OWNER' | 'B2C_CONSUMER';

export type ReferralStatus = 'PENDING' | 'CONVERTED' | 'EXPIRED';

export interface Wallet {
  id: string;
  walletType: WalletType;
  ownerOrgId?: string | null;
  consumerPhone?: string | null;
  salonId?: string | null;
  balance: number;
  currency: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  walletType: WalletType;
  ownerOrgId?: string | null;
  consumerPhone?: string | null;
  salonId?: string | null;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  reason: string;
  referenceId?: string | null;
  createdAt: Date | string;
}

export interface ReferralAttribution {
  id: string;
  referralType: ReferralType;
  referrerCode: string;
  referrerOrgId?: string | null;
  referrerPhone?: string | null;
  referredOrgId?: string | null;
  referredPhone?: string | null;
  salonId?: string | null;
  rewardAmount: number;
  status: ReferralStatus;
  conversionReferenceId?: string | null;
  convertedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  badge?: string | null;
  description?: string | null;
  price1m: number;
  price3m?: number | null;
  price6m?: number | null;
  price1y?: number | null;
  discountPct3m: number;
  discountPct6m: number;
  discountPct1y: number;
  cycle1mEnabled: boolean;
  cycle3mEnabled: boolean;
  cycle6mEnabled: boolean;
  cycle1yEnabled: boolean;
  maxBranches: number;
  maxStylistsPerBranch: number;
  features: string[];
  status: PlanStatus;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreatePlanPayload {
  name: string;
  slug?: string;
  badge?: string | null;
  description?: string | null;
  price1m: number;
  price3m?: number | null;
  price6m?: number | null;
  price1y?: number | null;
  discountPct3m?: number | null;
  discountPct6m?: number | null;
  discountPct1y?: number | null;
  cycle1mEnabled?: boolean;
  cycle3mEnabled?: boolean;
  cycle6mEnabled?: boolean;
  cycle1yEnabled?: boolean;
  maxBranches: number;
  maxStylistsPerBranch: number;
  features: string[];
  status?: PlanStatus;
  isFeatured?: boolean;
  sortOrder?: number;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: SubscriptionTier;
  planId?: string | null;
  ownerId?: string | null;
  maxBranches: number;
  maxStylistsPerBranch: number;
  createdAt: Date | string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export interface User {
  id: string;
  organizationId?: string | null;
  salonId?: string | null;
  username: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  passwordHash: string;
  pinHash?: string | null; // 4-digit quick PIN for mirror tablets
  role: UserRole;
  staffId?: string | null;
  status: UserStatus;
  lastLoginAt?: Date | string | null;
  createdAt: Date | string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  passwordHash?: string | null;
  createdAt: Date | string;
}

export interface ServiceAddOn {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface ServiceDefinition {
  id: string;
  salonId: string;
  name: string;
  basePrice: number;
  estimatedDurationMinutes: number;
  pricingType?: PricingType;
  isAddOn: boolean;
  icon?: string;
}

export interface Stylist {
  id: string;
  salonId: string;
  name: string;
  phone: string;
  email?: string | null;
  username?: string | null;
  userId?: string | null;
  pin?: string | null;
  customAvgDurationMinutes?: number | null;
  isActive: boolean;
  historicalAvgDurationMinutes: number;
  currentTicketId?: string | null;
}

export interface AppointmentBookingPolicy {
  enabled: boolean;
  policyType: 'FREE' | 'FIXED_TOKEN' | 'PERCENTAGE' | 'FULL';
  tokenAmount: number; // e.g. 50, 100, 0
  percentage?: number; // e.g. 30, 40, 50
  convenienceFee: number; // e.g. 0
  allowFreeBooking: boolean;
  cancellationCutoffHours: number; // e.g. 2
  isCustomized?: boolean; // true if salon owner customized, false if inheriting platform default
}

export interface Salon {
  id: string;
  organizationId?: string | null;
  name: string;
  slug: string;
  phone: string;
  operatingMode?: string;
  countryCode: string;
  currency: string;
  address?: string;
  upiPaymentId?: string; // Direct UPI QR for Indian / rural salons
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
  wifiSsid?: string;
  wifiPassword?: string;
  enableLoungeWifi?: boolean;
  enableScreenWakeLock?: boolean;
  appointmentPolicy?: AppointmentBookingPolicy;
  services: ServiceDefinition[];
  stylists: Stylist[];
  createdAt: Date;
}

export interface QueueTicket {
  id: string;
  salonId: string;
  stylistId: string | null;
  ticketNumber: number;
  customerName: string;
  customerPhone: string;
  customerId?: string | null;
  serviceId: string;
  serviceName: string;
  selectedAddOns: ServiceAddOn[];
  totalPrice: number;
  totalDurationMinutes: number;
  status: TicketStatus;
  source: TicketSource;
  routingPreference: RoutingPreference;
  estimatedWaitMinutes: number;
  checkInTime: string;
  summonedTime?: string | null;
  startedTime?: string | null;
  completedTime?: string | null;
  paymentStatus: PaymentStatus;
  paymentAmount?: number | null;
  positionInQueue: number;
  notes?: string | null;
  groomingTags?: string[];
  visitCount?: number;
  lastVisitedAt?: string | null;
  lastServiceName?: string | null;
}

export interface QueueEventPayload {
  type: 
    | 'TICKET_CREATED' 
    | 'TICKET_SUMMONED' 
    | 'TICKET_SEATED' 
    | 'TICKET_COMPLETED' 
    | 'TICKET_CANCELLED' 
    | 'TICKET_SOFT_BUMPED' 
    | 'QUEUE_RECALCULATED'
    | 'QUEUE_UPDATED'
    | 'EMERGENCY_HALT';
  salonId: string;
  ticket?: QueueTicket;
  activeQueueCount?: number;
  timestamp: string;
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
  pwa?: {
    autoInstallPrompt: boolean;
  };
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
  activatedAt: string | null;
}

export interface OnboardSalonPayload {
  salonName?: string;
  name?: string;
  slug?: string;
  operatingMode?: SalonOperatingMode;
  phone: string;
  address?: string;
  currency?: string;
  countryCode?: string;
  upiPaymentId?: string;
  organizationName?: string;
  organizationSlug?: string;
  tier?: SubscriptionTier;
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

export interface StaffLeave {
  id: string;
  salonId: string;
  stylistId: string;
  leaveDate: string;
  endDate?: string | null;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  appliedBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type AppointmentStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_CHAIR'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type EscrowStatus = 'HELD' | 'RELEASED_TO_OWNER' | 'REFUNDED_TO_CUSTOMER' | 'PARTIAL_SPLIT';

export type AppointmentPaymentMethod = 'RAZORPAY' | 'UPI_QR' | 'WALLET' | 'PAY_AT_SALON';

export interface Appointment {
  id: string;
  salonId: string;
  stylistId?: string | null;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  scheduledDate: string; // YYYY-MM-DD
  slotStartTime: string; // HH:mm (24-hr)
  slotEndTime: string;   // HH:mm (24-hr)
  durationMinutes: number;
  advanceAmount: number;
  totalPrice: number;
  paymentMethod: AppointmentPaymentMethod;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  escrowStatus: EscrowStatus;
  status: AppointmentStatus;
  rescheduledFromId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'SETTLED' | 'FAILED';

export interface SalonPayoutRecord {
  id: string;
  salonId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  grossAmount: number;
  gatewayFee: number;  // 2.0%
  platformFee: number; // 1.0%
  netPayout: number;   // 97.0%
  payoutVpa?: string | null;
  payoutReferenceId?: string | null;
  status: PayoutStatus;
  settledAt?: Date | string | null;
  createdAt?: Date | string;
}

