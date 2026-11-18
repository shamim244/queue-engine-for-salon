import { referralRepo } from '../db/repositories/referral.repo';
import { organizationRepo } from '../db/repositories/organization.repo';
import { walletService } from './wallet.service';
import type { ReferralAttribution, ReferralType } from '../engine/types';

export const REFERRAL_CONSTANTS = {
  B2B_DEFAULT_REWARD: 500.0,
  B2C_DEFAULT_REWARD: 50.0,
};

export interface AttributeReferralInput {
  referralType: ReferralType;
  referrerCode: string;
  referredOrgId?: string | null;
  referredPhone?: string | null;
  salonId?: string | null;
}

export class ReferralService {
  /**
   * Generates a canonical referral code for an organization.
   * Format: REF_<UPPERCASE_SLUG> or REF_<LAST_6_CHARS_OF_ID>
   */
  getOrgReferralCode(orgId: string, orgSlug?: string): string {
    if (orgSlug) {
      return `REF_${orgSlug.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
    }
    return `REF_${orgId.slice(-6).toUpperCase()}`;
  }

  /**
   * Generates a canonical referral code for a consumer.
   */
  getConsumerReferralCode(phone: string): string {
    return `REF_${phone.replace(/[^0-9]/g, '')}`;
  }

  /**
   * Resolves a referrer code to an organization ID or phone.
   */
  async resolveReferrerOrg(referrerCode: string): Promise<string | null> {
    const raw = referrerCode.trim();
    const clean = raw.toUpperCase();

    // 1. Check direct orgId match
    const byId = await organizationRepo.getOrganizationById(raw);
    if (byId) return byId.id;

    // 2. Check if slug matches organization
    const slugCandidate = raw.startsWith('REF_') ? raw.slice(4).toLowerCase() : raw.toLowerCase();
    const bySlug = await organizationRepo.getOrganizationBySlug(slugCandidate);
    if (bySlug) return bySlug.id;

    // 3. Check if slug matches a salon with an organization
    const { salonRepo } = await import('../db/repositories/salon.repo');
    const bySalonSlug = await salonRepo.getSalonBySlug(slugCandidate);
    if (bySalonSlug?.organizationId) return bySalonSlug.organizationId;

    // 4. Search all organizations by slug or ID match
    const allOrgs = await organizationRepo.getAllOrganizations();
    for (const org of allOrgs) {
      const orgRefCode = this.getOrgReferralCode(org.id, org.slug);
      if (
        orgRefCode === clean ||
        org.id === raw ||
        org.slug.toUpperCase() === clean ||
        `REF_${org.id.slice(-6).toUpperCase()}` === clean
      ) {
        return org.id;
      }
    }

    // 5. Search all salons by slug match
    const allSalons = await salonRepo.getAllSalons();
    for (const s of allSalons) {
      if (s.organizationId) {
        const salonRefCode = `REF_${s.slug.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
        if (salonRefCode === clean || s.slug.toUpperCase() === clean || s.id === raw) {
          return s.organizationId;
        }
      }
    }

    return null;
  }

  /**
   * Validates if an organization is eligible for a referral welcome discount.
   * Enforces the strictly one-time referral rule (first purchase only).
   */
  async isOrgEligibleForReferral(orgId: string): Promise<{ eligible: boolean; reason?: string }> {
    const cleanId = orgId.trim();
    const { repository } = await import('../db/repository');
    const platformSettings = repository.getPlatformSettings();
    const maxUses = platformSettings.b2bReferral?.maxUsesPerReferee ?? 1;

    // Check count of converted B2B referrals
    const convertedCount = await referralRepo.getConvertedReferralCountForOrg(cleanId);
    if (convertedCount >= maxUses) {
      return {
        eligible: false,
        reason: 'Referral discount and reward are valid for your first subscription purchase only.',
      };
    }

    // Check if org already has prior paid subscriptions
    const hasPriorPaid = await referralRepo.hasPriorPaidSubscription(cleanId);
    if (hasPriorPaid && convertedCount > 0) {
      return {
        eligible: false,
        reason: 'Referral discount is valid for your first subscription purchase only.',
      };
    }

    return { eligible: true };
  }

  /**
   * Records a referral attribution when a new user signs up or checks in with a referral code.
   */
  async attributeReferral(input: AttributeReferralInput): Promise<ReferralAttribution> {
    const { referralType, referrerCode, referredOrgId, referredPhone, salonId } = input;

    if (!referrerCode || !referrerCode.trim()) {
      throw new Error('Referrer code is required.');
    }

    if (referralType === 'B2B_OWNER') {
      if (!referredOrgId) {
        throw new Error('Referred organization ID is required for B2B referrals.');
      }

      // Enforce strictly one-time referral usage
      const eligibility = await this.isOrgEligibleForReferral(referredOrgId);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason || 'Referral discount is valid for your first subscription purchase only.');
      }

      // Check if already attributed
      const existing = await referralRepo.getPendingAttributionForOrg(referredOrgId);
      if (existing) {
        return existing; // Already attributed, idempotent
      }

      const referrerOrgId = await this.resolveReferrerOrg(referrerCode);
      if (!referrerOrgId) {
        throw new Error(`Invalid referral code "${referrerCode}". No matching salon organization found.`);
      }

      // Self-referral prevention
      if (referrerOrgId === referredOrgId) {
        throw new Error('Self-referral is not permitted. You cannot refer your own organization.');
      }

      return referralRepo.recordAttribution({
        referralType: 'B2B_OWNER',
        referrerCode: referrerCode.trim().toUpperCase(),
        referrerOrgId,
        referredOrgId,
        rewardAmount: REFERRAL_CONSTANTS.B2B_DEFAULT_REWARD,
      });
    } else {
      // B2C_CONSUMER
      if (!referredPhone || !salonId) {
        throw new Error('Referred phone number and salon ID are required for consumer referrals.');
      }

      const existing = await referralRepo.getPendingAttributionForConsumer(referredPhone, salonId);
      if (existing) {
        return existing;
      }

      // Extract referrer phone from code (e.g. REF_9876543210 -> 9876543210)
      const referrerPhone = referrerCode.replace(/^REF_/i, '').replace(/[^0-9]/g, '');
      if (!referrerPhone || referrerPhone.length < 10) {
        throw new Error(`Invalid consumer referral code "${referrerCode}".`);
      }

      // Self-referral prevention
      if (referrerPhone === referredPhone.replace(/[^0-9]/g, '')) {
        throw new Error('Self-referral is not permitted.');
      }

      return referralRepo.recordAttribution({
        referralType: 'B2C_CONSUMER',
        referrerCode: referrerCode.trim().toUpperCase(),
        referrerPhone,
        referredPhone,
        salonId,
        rewardAmount: REFERRAL_CONSTANTS.B2C_DEFAULT_REWARD,
      });
    }
  }

  /**
   * Converts a pending referral attribution upon first verified transaction.
   * Triggers atomic double-entry credit to referrer's wallet.
   */
  async processConversion(
    referralType: ReferralType,
    targetIdentifier: string,
    conversionReferenceId: string,
    salonId?: string | null,
    purchaseAmount?: number | null,
    breakdownInput?: {
      originalAmount?: number;
      subscriptionDiscount?: number;
      friendDiscount?: number;
    }
  ): Promise<ReferralAttribution | null> {
    if (referralType === 'B2B_OWNER') {
      const pending = await referralRepo.getPendingAttributionForOrg(targetIdentifier);
      if (!pending || pending.status !== 'PENDING' || !pending.referrerOrgId) {
        return null;
      }

      // Calculate dynamic admin-configured percentage reward if purchaseAmount provided
      const { repository } = await import('../db/repository');
      const platformSettings = repository.getPlatformSettings();
      const commissionPercent = platformSettings.b2bReferral?.commissionPercent ?? 30;
      const friendDiscountPercent = platformSettings.b2bReferral?.refereeDiscountPercent ?? 20;
      const calculationBasis = platformSettings.b2bReferral?.rewardCalculationBasis ?? 'NET_PAID';

      // Guard: strictly one-time reward per referred organization
      const convertedCount = await referralRepo.getConvertedReferralCountForOrg(targetIdentifier);
      const maxUses = platformSettings.b2bReferral?.maxUsesPerReferee ?? 1;
      if (convertedCount >= maxUses) {
        console.warn(`[referralService] Blocked duplicate referral conversion for org: ${targetIdentifier}`);
        return null;
      }

      // Net eligible amount calculation (Original - Subscription Discount - Friend Discount)
      const originalAmount = breakdownInput?.originalAmount ?? (purchaseAmount || 0);
      const subscriptionDiscount = breakdownInput?.subscriptionDiscount ?? 0;
      const friendDiscount = breakdownInput?.friendDiscount ?? 0;
      const netEligibleAmount = Math.max(0, originalAmount - subscriptionDiscount - friendDiscount);

      // Dual Engine:
      // If 'ORIGINAL_PRICE': calculate percentage on original plan price before discounts
      // If 'NET_PAID': calculate percentage on net cash received after friend discount
      let finalReward = 0;
      if (calculationBasis === 'ORIGINAL_PRICE') {
        const base = originalAmount > 0 ? originalAmount : (purchaseAmount || 0);
        finalReward = base > 0
          ? Math.round((base * commissionPercent) / 100)
          : (pending.rewardAmount || REFERRAL_CONSTANTS.B2B_DEFAULT_REWARD);
      } else {
        // NET_PAID (Default)
        finalReward = netEligibleAmount > 0
          ? Math.round((netEligibleAmount * commissionPercent) / 100)
          : (purchaseAmount && purchaseAmount > 0 
              ? Math.round((purchaseAmount * commissionPercent) / 100) 
              : (pending.rewardAmount || REFERRAL_CONSTANTS.B2B_DEFAULT_REWARD));
      }

      const financialBreakdown = {
        originalAmount,
        subscriptionDiscount,
        friendDiscount,
        netEligibleAmount: netEligibleAmount > 0 ? netEligibleAmount : (purchaseAmount || originalAmount),
        rewardPercentage: commissionPercent,
        friendDiscountPercentage: friendDiscountPercent,
        calculationBasis,
      };

      // 1. Atomically claim/mark converted conditional on status === 'PENDING'
      const converted = await referralRepo.markConverted(
        pending.id, 
        conversionReferenceId, 
        finalReward,
        financialBreakdown
      );
      if (!converted) {
        return null;
      }

      // 2. Credit referrer's wallet with reward (roll back on error to prevent lost rewards)
      const basisDesc = calculationBasis === 'ORIGINAL_PRICE'
        ? `original ₹${originalAmount}`
        : `net ₹${financialBreakdown.netEligibleAmount}`;
      try {
        await walletService.creditBonus({
          walletType: 'OWNER',
          identifier: pending.referrerOrgId,
          amount: finalReward,
          reason: `Referral reward (${commissionPercent}% on ${basisDesc}) for salon (${targetIdentifier}) subscription`,
          referenceId: conversionReferenceId,
        });
      } catch (creditErr) {
        await referralRepo.rollbackToPending(pending.id);
        throw creditErr;
      }

      return converted;
    } else {
      // B2C_CONSUMER
      if (!salonId) return null;
      const pending = await referralRepo.getPendingAttributionForConsumer(targetIdentifier, salonId);
      if (!pending || pending.status !== 'PENDING' || !pending.referrerPhone) {
        return null;
      }

      // 1. Atomically claim/mark converted
      const converted = await referralRepo.markConverted(pending.id, conversionReferenceId);
      if (!converted) {
        return null;
      }

      // 2. Credit referrer's consumer wallet (roll back on error)
      try {
        await walletService.creditBonus({
          walletType: 'CONSUMER',
          identifier: pending.referrerPhone,
          salonId,
          amount: pending.rewardAmount,
          reason: `Friend haircut referral reward (${targetIdentifier})`,
          referenceId: conversionReferenceId,
        });
      } catch (creditErr) {
        await referralRepo.rollbackToPending(pending.id);
        throw creditErr;
      }

      return converted;
    }
  }

  /**
   * Returns referral performance statistics.
   */
  async getStats(params: {
    referrerOrgId?: string | null;
    referrerPhone?: string | null;
    salonId?: string | null;
  }) {
    return referralRepo.getReferralStats(params);
  }
}

export const referralService = new ReferralService();
