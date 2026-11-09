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

    // 2. Check if slug matches
    const slugCandidate = raw.startsWith('REF_') ? raw.slice(4).toLowerCase() : raw.toLowerCase();
    const bySlug = await organizationRepo.getOrganizationBySlug(slugCandidate);
    if (bySlug) return bySlug.id;

    // 3. Search all organizations by slug or ID match
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

    return null;
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
    salonId?: string | null
  ): Promise<ReferralAttribution | null> {
    if (referralType === 'B2B_OWNER') {
      const pending = await referralRepo.getPendingAttributionForOrg(targetIdentifier);
      if (!pending || pending.status !== 'PENDING' || !pending.referrerOrgId) {
        return null;
      }

      // 1. Mark converted
      const converted = await referralRepo.markConverted(pending.id, conversionReferenceId);

      // 2. Credit referrer's wallet with reward
      await walletService.creditBonus({
        walletType: 'OWNER',
        identifier: pending.referrerOrgId,
        amount: pending.rewardAmount,
        reason: `Referral commission for referred salon (${targetIdentifier}) subscription`,
        referenceId: conversionReferenceId,
      });

      return converted;
    } else {
      // B2C_CONSUMER
      if (!salonId) return null;
      const pending = await referralRepo.getPendingAttributionForConsumer(targetIdentifier, salonId);
      if (!pending || pending.status !== 'PENDING' || !pending.referrerPhone) {
        return null;
      }

      // 1. Mark converted
      const converted = await referralRepo.markConverted(pending.id, conversionReferenceId);

      // 2. Credit referrer's consumer wallet
      await walletService.creditBonus({
        walletType: 'CONSUMER',
        identifier: pending.referrerPhone,
        salonId,
        amount: pending.rewardAmount,
        reason: `Friend haircut referral reward (${targetIdentifier})`,
        referenceId: conversionReferenceId,
      });

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
