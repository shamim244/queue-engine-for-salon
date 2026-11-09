import type { PaymentGatewayAdapter } from '../adapter';
import type { PaymentProvider, CreateOrderInput, PaymentOrder, PaymentVerificationInput } from '../types';

export class CashPaymentAdapter implements PaymentGatewayAdapter {
  getProviderName(): PaymentProvider {
    return 'CASH';
  }

  async createOrder(payload: CreateOrderInput, internalOrderId: string): Promise<Record<string, any>> {
    return {
      cashInstructions: 'Please collect cash at the salon reception desk or verify counter settlement.',
      amount: payload.amount,
      currency: payload.currency || 'INR',
      orderRef: internalOrderId,
      settlementType: 'COUNTER_CASH',
    };
  }

  async verifyPayment(
    order: PaymentOrder,
    verification: PaymentVerificationInput
  ): Promise<{ verified: boolean; transactionRef: string; message?: string }> {
    const timestamp = Date.now();
    const ref = verification.transactionRef?.trim() || `CASH-${timestamp}-${order.id.slice(0, 6).toUpperCase()}`;

    return {
      verified: true,
      transactionRef: ref,
      message: 'Cash payment settled and recorded in audit log.',
    };
  }
}

export const cashAdapter = new CashPaymentAdapter();
