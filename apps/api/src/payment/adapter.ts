import type { PaymentOrder, PaymentProvider, CreateOrderInput, PaymentVerificationInput } from './types';

export interface PaymentGatewayAdapter {
  getProviderName(): PaymentProvider;
  createOrder(payload: CreateOrderInput, internalOrderId: string): Promise<Record<string, any>>;
  verifyPayment(
    order: PaymentOrder,
    verification: PaymentVerificationInput
  ): Promise<{ verified: boolean; transactionRef: string; message?: string }>;
}
