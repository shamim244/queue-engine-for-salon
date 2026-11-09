import type { PaymentGatewayAdapter } from '../adapter';
import type {
  PaymentOrder,
  PaymentProvider,
  CreateOrderInput,
  PaymentOrderResult,
  PaymentVerificationInput,
  VerificationAdapterResult,
} from '../types';

export class WalletPaymentAdapter implements PaymentGatewayAdapter {
  getProviderName(): PaymentProvider {
    return 'WALLET';
  }

  async createOrder(
    order: PaymentOrder,
    input: CreateOrderInput
  ): Promise<PaymentOrderResult['paymentData']> {
    return {
      message: 'Settlement via Wallet balance. Proceed to instant verification.',
    };
  }

  async verifyPayment(
    order: PaymentOrder,
    input: PaymentVerificationInput
  ): Promise<VerificationAdapterResult> {
    const txRef = `WLT_${order.id.slice(-8).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

    return {
      verified: true,
      transactionRef: txRef,
      message: 'Wallet settlement verified successfully.',
    };
  }
}

export const walletPaymentAdapter = new WalletPaymentAdapter();
