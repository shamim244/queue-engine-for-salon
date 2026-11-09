import type {
  Wallet,
  WalletTransaction,
  WalletType,
  WalletTransactionType,
  ReferralType,
  ReferralStatus,
  ReferralAttribution,
} from '../engine/types';

export type {
  Wallet,
  WalletTransaction,
  WalletType,
  WalletTransactionType,
  ReferralType,
  ReferralStatus,
  ReferralAttribution,
};

export interface CreditWalletPayload {
  walletType: WalletType;
  identifier: string; // ownerOrgId for OWNER, consumerPhone for CONSUMER
  salonId?: string | null;
  amount: number;
  reason: string;
  referenceId?: string | null;
}

export interface DebitWalletPayload {
  walletType: WalletType;
  identifier: string; // ownerOrgId for OWNER, consumerPhone for CONSUMER
  salonId?: string | null;
  amount: number;
  reason: string;
  referenceId?: string | null;
}

export interface WalletBalanceResult {
  walletId: string;
  walletType: WalletType;
  balance: number;
  currency: string;
}
