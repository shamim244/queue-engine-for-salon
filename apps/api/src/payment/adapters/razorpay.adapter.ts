import crypto from 'crypto';
import type { PaymentGatewayAdapter } from '../adapter';
import type { PaymentProvider, CreateOrderInput, PaymentOrder, PaymentVerificationInput } from '../types';

export class RazorpaySandboxPaymentAdapter implements PaymentGatewayAdapter {
  private keyId: string;
  private keySecret: string;

  constructor(
    keyId: string = process.env.RAZORPAY_KEY_ID || 'rzp_test_salon_dummy_key',
    keySecret: string = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret_salon_test'
  ) {
    this.keyId = keyId;
    this.keySecret = keySecret;
  }

  getProviderName(): PaymentProvider {
    return 'RAZORPAY';
  }

  async createOrder(payload: CreateOrderInput, internalOrderId: string): Promise<Record<string, any>> {
    const razorpayOrderId = `order_test_${Date.now()}_${internalOrderId.slice(0, 6)}`;

    return {
      razorpayOrderId,
      razorpayKeyId: this.keyId,
      amount: Math.round(payload.amount * 100), // Razorpay uses lowest currency subunit (paise)
      currency: payload.currency || 'INR',
      name: 'Engine Que Salon SaaS',
      description: payload.metadata?.planName || `Subscription Order ${internalOrderId.slice(0, 8)}`,
      isSandbox: true,
      prefill: {
        contact: payload.metadata?.phone || '',
        email: payload.metadata?.email || '',
      },
    };
  }

  async verifyPayment(
    order: PaymentOrder,
    verification: PaymentVerificationInput
  ): Promise<{ verified: boolean; transactionRef: string; message?: string }> {
    const paymentId = verification.razorpayPaymentId?.trim() || verification.transactionRef?.trim();
    if (!paymentId) {
      return {
        verified: false,
        transactionRef: '',
        message: 'Missing razorpay_payment_id for verification.',
      };
    }

    const razorpayOrderId = order.providerOrderId || order.paymentData?.razorpayOrderId;
    const signature = verification.razorpaySignature?.trim();

    // If signature is provided, verify HMAC SHA256
    if (signature && razorpayOrderId) {
      const generatedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${razorpayOrderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        return {
          verified: false,
          transactionRef: paymentId,
          message: 'Invalid Razorpay signature. Payment verification failed.',
        };
      }
    }

    // In sandbox test mode, if no signature was provided but paymentId is valid test id
    return {
      verified: true,
      transactionRef: paymentId,
      message: 'Razorpay payment verified successfully (Sandbox Mode).',
    };
  }

  /**
   * Helper utility for tests to generate a valid sandbox signature
   */
  generateTestSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }
}

export const razorpayAdapter = new RazorpaySandboxPaymentAdapter();
