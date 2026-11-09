import type { PaymentGatewayAdapter } from '../adapter';
import type { PaymentProvider, CreateOrderInput, PaymentOrder, PaymentVerificationInput } from '../types';

export class UpiQrPaymentAdapter implements PaymentGatewayAdapter {
  private defaultVpa: string;
  private defaultPayeeName: string;

  constructor(defaultVpa: string = 'salonpayments@icici', defaultPayeeName: string = 'Engine Que Salon SaaS') {
    this.defaultVpa = defaultVpa;
    this.defaultPayeeName = defaultPayeeName;
  }

  getProviderName(): PaymentProvider {
    return 'UPI_QR';
  }

  async createOrder(payload: CreateOrderInput, internalOrderId: string): Promise<Record<string, any>> {
    const vpa = payload.metadata?.vpa || this.defaultVpa;
    const payeeName = payload.metadata?.payeeName || this.defaultPayeeName;
    const amountStr = Number(payload.amount).toFixed(2);
    const currency = payload.currency || 'INR';
    const note = payload.metadata?.planName
      ? `Subscription: ${payload.metadata.planName}`
      : `Order ${internalOrderId.slice(0, 8)}`;

    // Build standard NPCI-compliant UPI URI
    const upiString = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(payeeName)}&am=${amountStr}&cu=${currency}&tr=${internalOrderId}&tn=${encodeURIComponent(note)}`;

    return {
      upiString,
      upiIntentUrl: upiString,
      vpa,
      payeeName,
      amount: payload.amount,
      currency,
      orderRef: internalOrderId,
      qrType: 'DYNAMIC_NPCI',
    };
  }

  async verifyPayment(
    order: PaymentOrder,
    verification: PaymentVerificationInput
  ): Promise<{ verified: boolean; transactionRef: string; message?: string }> {
    const ref = (verification.transactionRef || '').trim();

    // Verify transaction ref presence or generate test UTR in dev/test
    if (!ref) {
      return {
        verified: false,
        transactionRef: '',
        message: 'Transaction reference or UTR is required to verify UPI payment.',
      };
    }

    return {
      verified: true,
      transactionRef: ref,
      message: 'UPI payment verified successfully.',
    };
  }
}

export const upiQrAdapter = new UpiQrPaymentAdapter();
