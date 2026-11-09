import { walletRepo } from '../db/repositories/wallet.repo';
import type {
  Wallet,
  WalletTransaction,
  WalletType,
  CreditWalletPayload,
  DebitWalletPayload,
  WalletBalanceResult,
} from './types';

export class WalletService {
  async getWallet(
    walletType: WalletType,
    identifier: string,
    salonId?: string | null
  ): Promise<Wallet> {
    return walletRepo.getOrCreateWallet(walletType, identifier, salonId);
  }

  async getBalance(
    walletType: WalletType,
    identifier: string,
    salonId?: string | null
  ): Promise<WalletBalanceResult> {
    const wallet = await this.getWallet(walletType, identifier, salonId);
    return {
      walletId: wallet.id,
      walletType: wallet.walletType,
      balance: wallet.balance,
      currency: wallet.currency,
    };
  }

  async creditBonus(payload: CreditWalletPayload): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const wallet = await this.getWallet(payload.walletType, payload.identifier, payload.salonId);
    return walletRepo.creditWallet(wallet.id, payload.amount, payload.reason, payload.referenceId);
  }

  async deductForCheckout(payload: DebitWalletPayload): Promise<{ wallet: Wallet; transaction: WalletTransaction }> {
    const wallet = await this.getWallet(payload.walletType, payload.identifier, payload.salonId);
    return walletRepo.debitWallet(wallet.id, payload.amount, payload.reason, payload.referenceId);
  }

  async getPassbook(
    walletType: WalletType,
    identifier: string,
    salonId?: string | null,
    limit: number = 50
  ): Promise<WalletTransaction[]> {
    const wallet = await this.getWallet(walletType, identifier, salonId);
    return walletRepo.getPassbook(wallet.id, limit);
  }
}

export const walletService = new WalletService();
