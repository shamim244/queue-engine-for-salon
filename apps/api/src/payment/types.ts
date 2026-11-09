import type {
  PaymentProvider,
  PaymentTargetType,
  PaymentOrderStatus,
  PaymentOrder,
  OrganizationSubscription,
  BillingCycle,
} from '../engine/types';

export type {
  PaymentProvider,
  PaymentTargetType,
  PaymentOrderStatus,
  PaymentOrder,
  OrganizationSubscription,
  BillingCycle,
};

export interface CreateOrderInput {
  targetType: PaymentTargetType;
  targetId: string;
  amount: number;
  provider: PaymentProvider;
  currency?: string;
  organizationId?: string | null;
  salonId?: string | null;
  customerId?: string | null;
  metadata?: Record<string, any>;
}

export interface PaymentOrderResult {
  orderId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  expiresAt: string;
  paymentData: {
    upiString?: string;
    upiIntentUrl?: string;
    vpa?: string;
    payeeName?: string;
    razorpayOrderId?: string;
    razorpayKeyId?: string;
    cashInstructions?: string;
    [key: string]: any;
  };
}

export interface PaymentVerificationInput {
  orderId: string;
  provider: PaymentProvider;
  transactionRef?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  notes?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  orderId: string;
  status: PaymentOrderStatus;
  transactionRef: string;
  message?: string;
  subscription?: OrganizationSubscription | null;
}
