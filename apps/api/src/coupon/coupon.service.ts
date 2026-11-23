import { couponRepo } from '../db/repositories/coupon.repo';
import type { ApplyCouponInput, ApplyCouponResult, Coupon, CreateCouponPayload } from './types';

export class CouponService {
  async validateAndApplyCoupon(input: ApplyCouponInput): Promise<ApplyCouponResult> {
    if (!input.code || !input.code.trim()) {
      return {
        valid: false,
        message: 'Please enter a coupon code.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    if (!input.orderAmount || input.orderAmount <= 0) {
      return {
        valid: false,
        message: 'Order amount must be greater than zero.',
        discountAmount: 0,
        netPayable: 0,
      };
    }

    const cleanCode = input.code.trim().toUpperCase();

    // 0. Check Auto Partner or Salon Referral Resolution
    if (cleanCode === 'AUTO' || cleanCode === 'PARTNER_AUTO') {
      const { partnerRepo } = await import('../db/repositories/partner.repo');
      const { salonRepo } = await import('../db/repositories/salon.repo');
      const { referralRepo } = await import('../db/repositories/referral.repo');
      const { repository } = await import('../db/repository');

      let targetOrgId = input.organizationId;
      let targetSalonId = input.salonId;
      if (!targetOrgId && targetSalonId) {
        const salon = await salonRepo.getSalonById(targetSalonId);
        if (salon?.organizationId) targetOrgId = salon.organizationId;
      }
      if (!targetSalonId && targetOrgId) {
        const salons = await salonRepo.getAllSalons();
        const match = salons.find((s) => s.organizationId === targetOrgId);
        if (match) targetSalonId = match.id;
      }

      // 0a. Check B2B Salon Referral Pending Attribution
      if (targetOrgId) {
        const { referralService } = await import('../wallet/referral.service');
        const eligibility = await referralService.isOrgEligibleForReferral(targetOrgId);
        if (eligibility.eligible) {
          const b2bPending = await referralRepo.getPendingAttributionForOrg(targetOrgId);
          if (b2bPending && b2bPending.referrerOrgId) {
            if (input.targetType !== 'SUBSCRIPTION') {
              return {
                valid: false,
                message: 'Salon referral discounts apply only to subscription plans.',
                discountAmount: 0,
                netPayable: input.orderAmount,
              };
            }
            const platformSettings = repository.getPlatformSettings();
            const discountPercent = Math.max(0, Math.min(100, platformSettings.b2bReferral?.refereeDiscountPercent ?? 20));
            const rawDiscount = (input.orderAmount * discountPercent) / 100;
            const discountAmount = Math.min(Math.round(rawDiscount * 100) / 100, input.orderAmount);
            const netPayable = Math.max(0, Math.round((input.orderAmount - discountAmount) * 100) / 100);

            return {
              valid: true,
              coupon: {
                id: `b2b_ref_${b2bPending.referrerOrgId}`,
                code: b2bPending.referrerCode,
                discountType: 'PERCENT',
                discountValue: discountPercent,
                maxDiscountAmount: null,
                minOrderAmount: 0,
              },
              discountAmount,
              netPayable,
            };
          }
        }
      }

      // 0b. Check Affiliate Partner Referral Attribution
      if (targetSalonId) {
        const attribution = await partnerRepo.getAttributionBySalonId(targetSalonId);
        if (attribution) {
          const partner = await partnerRepo.getPartnerById(attribution.partnerId);
          if (partner && partner.status === 'ACTIVE') {
            if (input.targetType !== 'SUBSCRIPTION') {
              return {
                valid: false,
                message: 'Partner referral discounts apply only to subscription plans.',
                discountAmount: 0,
                netPayable: input.orderAmount,
              };
            }
            const settings = await partnerRepo.getProgramSettings();
            const discountPercent = Math.max(0, Math.min(100, settings.defaultReferralDiscountPercent ?? 10));
            const rawDiscount = (input.orderAmount * discountPercent) / 100;
            const discountAmount = Math.min(Math.round(rawDiscount * 100) / 100, input.orderAmount);
            const netPayable = Math.max(0, Math.round((input.orderAmount - discountAmount) * 100) / 100);

            return {
              valid: true,
              coupon: {
                id: `partner_${partner.id}`,
                code: partner.referralCode,
                discountType: 'PERCENT',
                discountValue: discountPercent,
                maxDiscountAmount: null,
                minOrderAmount: 0,
              },
              discountAmount,
              netPayable,
            };
          }
        }
      }
      return {
        valid: false,
        message: 'No active partner or salon referral discount found for this salon.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    const coupon = await couponRepo.getCouponByCode(input.code);
    if (!coupon) {
      // 1. Check if code matches an active partner referral code
      const { partnerRepo } = await import('../db/repositories/partner.repo');
      const partner = await partnerRepo.getPartnerByCode(input.code);
      if (partner && partner.status === 'ACTIVE') {
        if (input.targetType !== 'SUBSCRIPTION') {
          return {
            valid: false,
            message: 'Partner referral codes are valid only for subscription plans.',
            discountAmount: 0,
            netPayable: input.orderAmount,
          };
        }

        const settings = await partnerRepo.getProgramSettings();
        const discountPercent = Math.max(0, Math.min(100, settings.defaultReferralDiscountPercent ?? 10));
        const rawDiscount = (input.orderAmount * discountPercent) / 100;
        const discountAmount = Math.min(Math.round(rawDiscount * 100) / 100, input.orderAmount);
        const netPayable = Math.max(0, Math.round((input.orderAmount - discountAmount) * 100) / 100);

        return {
          valid: true,
          coupon: {
            id: `partner_${partner.id}`,
            code: partner.referralCode,
            discountType: 'PERCENT',
            discountValue: discountPercent,
            maxDiscountAmount: null,
          },
          discountAmount,
          netPayable,
        };
      }

      // 2. Check if code matches a Salon Owner B2B referral code (e.g. REF_GETSALON or getsalon)
      const { referralService } = await import('../wallet/referral.service');
      const referrerOrgId = await referralService.resolveReferrerOrg(input.code);
      if (referrerOrgId) {
        if (input.targetType !== 'SUBSCRIPTION') {
          return {
            valid: false,
            message: 'Salon referral codes are valid only for subscription plans.',
            discountAmount: 0,
            netPayable: input.orderAmount,
          };
        }

        // Prevent self-referral
        if (input.organizationId && referrerOrgId === input.organizationId) {
          return {
            valid: false,
            message: 'You cannot use your own referral code.',
            discountAmount: 0,
            netPayable: input.orderAmount,
          };
        }

        // Enforce strictly one-time referral usage
        if (input.organizationId) {
          const eligibility = await referralService.isOrgEligibleForReferral(input.organizationId);
          if (!eligibility.eligible) {
            return {
              valid: false,
              message: eligibility.reason || 'Referral discount is valid for your first subscription purchase only.',
              discountAmount: 0,
              netPayable: input.orderAmount,
            };
          }
        }

        const { repository } = await import('../db/repository');
        const platformSettings = repository.getPlatformSettings();
        const discountPercent = Math.max(0, Math.min(100, platformSettings.b2bReferral?.refereeDiscountPercent ?? 20));
        const rawDiscount = (input.orderAmount * discountPercent) / 100;
        const discountAmount = Math.min(Math.round(rawDiscount * 100) / 100, input.orderAmount);
        const netPayable = Math.max(0, Math.round((input.orderAmount - discountAmount) * 100) / 100);

        // Record attribution if organizationId is present and no pending attribution exists
        if (input.organizationId) {
          const { referralRepo } = await import('../db/repositories/referral.repo');
          const existing = await referralRepo.getPendingAttributionForOrg(input.organizationId);
          if (!existing) {
            await referralService.attributeReferral({
              referralType: 'B2B_OWNER',
              referrerCode: cleanCode,
              referredOrgId: input.organizationId,
              salonId: input.salonId || null,
            });
          }
        }

        return {
          valid: true,
          coupon: {
            id: `b2b_ref_${referrerOrgId}`,
            code: cleanCode,
            discountType: 'PERCENT',
            discountValue: discountPercent,
            maxDiscountAmount: null,
            minOrderAmount: 0,
          },
          discountAmount,
          netPayable,
        };
      }

      // 3. Check if code matches a Milestone Loyalty Voucher (e.g. REW_GETSALON_ABC123)
      const { loyaltyRepo } = await import('../db/repositories/loyalty.repo');
      const voucher = await loyaltyRepo.getVoucherByCode(cleanCode);
      if (voucher) {
        if (voucher.status !== 'ACTIVE') {
          return {
            valid: false,
            message: `This loyalty reward voucher (${voucher.voucherCode}) has already been redeemed or expired.`,
            discountAmount: 0,
            netPayable: input.orderAmount,
          };
        }

        // Multi-salon isolation check: vouchers are bound to the salon where stamps were earned
        if (input.salonId && voucher.salonId !== input.salonId) {
          return {
            valid: false,
            message: 'This loyalty reward voucher is locked to the salon where it was earned and cannot be redeemed here.',
            discountAmount: 0,
            netPayable: input.orderAmount,
          };
        }

        // Customer Phone check if provided
        if (input.userId) {
          const rawVoucherPhone = voucher.customerPhone.replace(/\D/g, '').slice(-10);
          const rawUserPhone = input.userId.replace(/\D/g, '').slice(-10);
          if (rawVoucherPhone && rawUserPhone && rawVoucherPhone !== rawUserPhone) {
            return {
              valid: false,
              message: 'This loyalty voucher is locked to another customer phone number.',
              discountAmount: 0,
              netPayable: input.orderAmount,
            };
          }
        }

        // Calculate 100% deduction on the reward service or up to orderAmount
        const rewardFaceValue = voucher.rewardServicePrice > 0 ? voucher.rewardServicePrice : input.orderAmount;
        const discountAmount = Math.min(rewardFaceValue, input.orderAmount);
        const netPayable = Math.max(0, Math.round((input.orderAmount - discountAmount) * 100) / 100);

        return {
          valid: true,
          coupon: {
            id: `voucher_${voucher.id}`,
            code: voucher.voucherCode,
            discountType: 'FLAT',
            discountValue: rewardFaceValue,
            maxDiscountAmount: rewardFaceValue,
            minOrderAmount: 0,
          },
          discountAmount,
          netPayable,
        };
      }

      // 4. Check Consumer-to-Consumer Referral Code (e.g. REF_9876543210)
      if (cleanCode.startsWith('REF_')) {
        const phoneDigits = cleanCode.replace('REF_', '').replace(/\D/g, '').slice(-10);
        if (phoneDigits.length === 10) {
          if (input.targetType === 'SUBSCRIPTION') {
            return {
              valid: false,
              message: 'Customer referral codes are valid only for salon grooming services.',
              discountAmount: 0,
              netPayable: input.orderAmount,
            };
          }

          // Anti self-referral
          if (input.userId) {
            const rawUserPhone = input.userId.replace(/\D/g, '').slice(-10);
            if (rawUserPhone === phoneDigits) {
              return {
                valid: false,
                message: 'You cannot use your own referral code.',
                discountAmount: 0,
                netPayable: input.orderAmount,
              };
            }
          }

          // Salon-level referee discount or platform default ₹50
          let discountVal = 50;
          if (input.salonId) {
            const { salonRepo } = await import('../db/repositories/salon.repo');
            const salon = await salonRepo.getSalonById(input.salonId);
            if (salon && typeof salon.loyaltyRefereeDiscount === 'number' && salon.loyaltyRefereeDiscount > 0) {
              discountVal = salon.loyaltyRefereeDiscount;
            }
          }

          const discountAmount = Math.min(discountVal, input.orderAmount);
          const netPayable = Math.max(0, Math.round((input.orderAmount - discountAmount) * 100) / 100);

          return {
            valid: true,
            coupon: {
              id: `c2c_ref_${phoneDigits}`,
              code: cleanCode,
              discountType: 'FLAT',
              discountValue: discountVal,
              maxDiscountAmount: null,
              minOrderAmount: 0,
            },
            discountAmount,
            netPayable,
          };
        }
      }

      return {
        valid: false,
        message: `Coupon code "${cleanCode}" is invalid.`,
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 1. Status Check
    if (coupon.status !== 'ACTIVE') {
      return {
        valid: false,
        message: 'This coupon is inactive.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 2. Date Validity Check
    const now = new Date();
    if (new Date(coupon.validFrom) > now) {
      return {
        valid: false,
        message: 'This coupon is not yet active.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return {
        valid: false,
        message: 'This coupon has expired.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 3. Target Scoping Check (Review Focus #4)
    if (coupon.targetType !== input.targetType) {
      return {
        valid: false,
        message: `This coupon is valid only for ${
          coupon.targetType === 'SUBSCRIPTION' ? 'subscription plans' : 'salon services'
        }.`,
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 4. Salon Scoping Check (Multi-Tenant Isolation)
    if (coupon.salonId) {
      if (!input.salonId) {
        return {
          valid: false,
          message: 'This promotional coupon is valid only at its issuing salon location.',
          discountAmount: 0,
          netPayable: input.orderAmount,
        };
      }

      // Resolve salonId/slug to check both id and slug
      const { salonRepo } = await import('../db/repositories/salon.repo');
      const allSalons = await salonRepo.getAllSalons();
      const targetSalon = allSalons.find(
        (s) => s.id === input.salonId || s.slug === input.salonId
      );
      const couponSalon = allSalons.find(
        (s) => s.id === coupon.salonId || s.slug === coupon.salonId
      );

      const targetId = targetSalon ? targetSalon.id : input.salonId;
      const targetSlug = targetSalon ? targetSalon.slug : input.salonId;
      const couponId = couponSalon ? couponSalon.id : coupon.salonId;
      const couponSlug = couponSalon ? couponSalon.slug : coupon.salonId;

      if (targetId !== couponId && targetSlug !== couponSlug) {
        return {
          valid: false,
          message: 'This coupon belongs to another salon and cannot be used here.',
          discountAmount: 0,
          netPayable: input.orderAmount,
        };
      }
    }

    // 5. Minimum Order Threshold Check (Review Focus #2)
    if (input.orderAmount < coupon.minOrderAmount) {
      return {
        valid: false,
        message: `Minimum order amount of ₹${coupon.minOrderAmount} required to use this coupon.`,
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 6. Max Overall Uses Check
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return {
        valid: false,
        message: 'This coupon has reached its maximum usage limit.',
        discountAmount: 0,
        netPayable: input.orderAmount,
      };
    }

    // 7. Identity & Mobile Number Requirement for Tracked / Restricted Coupons
    const effectiveUserId = (input.userId || input.organizationId || '').trim();

    if (coupon.isFirstTimeOnly) {
      if (!effectiveUserId) {
        return {
          valid: false,
          message: 'Customer mobile number is required to verify coupon eligibility.',
          discountAmount: 0,
          netPayable: input.orderAmount,
        };
      }
    } else if (coupon.salonId && coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined && coupon.maxUsesPerUser < 9000) {
      if (!effectiveUserId && input.salonId) {
        return {
          valid: false,
          message: 'Customer mobile number is required to verify coupon eligibility.',
          discountAmount: 0,
          netPayable: input.orderAmount,
        };
      }
    }

    // 7b. First-Time Customer Check (New User Verification)
    if (coupon.isFirstTimeOnly && coupon.salonId && effectiveUserId) {
      const priorVisits = await couponRepo.getCustomerCompletedVisitsCount(coupon.salonId, effectiveUserId);
      if (priorVisits > 0) {
        return {
          valid: false,
          message: 'This promotional code is valid only on your first visit to this salon. Welcome back as our valued returning guest!',
          discountAmount: 0,
          netPayable: input.orderAmount,
        };
      }
    }

    // 7c. Per-User Usage Limit Check (1 time, 2 times, 3 times, etc.)
    if (effectiveUserId && coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined && coupon.maxUsesPerUser < 9000) {
      const priorUses = await couponRepo.getUserRedemptionCount(coupon.id, effectiveUserId);
      if (priorUses >= coupon.maxUsesPerUser) {
        return {
          valid: false,
          message: `You have already redeemed this coupon the maximum allowed times (${coupon.maxUsesPerUser} time${coupon.maxUsesPerUser > 1 ? 's' : ''}).`,
          discountAmount: 0,
          netPayable: input.orderAmount,
        };
      }
    }

    // 8. Discount Calculation Math (Review Focus #1 & #5 & #7)
    let rawDiscount = 0;
    if (coupon.discountType === 'PERCENT') {
      const safePercent = Math.max(0, Math.min(100, coupon.discountValue));
      rawDiscount = (input.orderAmount * safePercent) / 100;
      if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
        rawDiscount = Math.min(rawDiscount, Math.max(0, coupon.maxDiscountAmount));
      }
    } else {
      rawDiscount = Math.max(0, coupon.discountValue);
    }

    // Cap discount so it never exceeds orderAmount, round cleanly to 2 decimal places
    const discountAmount = Math.min(Math.round(Math.max(0, rawDiscount) * 100) / 100, input.orderAmount);
    const netPayable = Math.max(0, Math.round((input.orderAmount - discountAmount) * 100) / 100);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minOrderAmount: coupon.minOrderAmount,
        isFirstTimeOnly: coupon.isFirstTimeOnly,
        maxUsesPerUser: coupon.maxUsesPerUser,
      },
      discountAmount,
      netPayable,
    };
  }

  async createCoupon(payload: CreateCouponPayload): Promise<Coupon> {
    return couponRepo.createCoupon(payload);
  }

  async getAllCoupons(filter?: Parameters<typeof couponRepo.getAllCoupons>[0]): Promise<Coupon[]> {
    return couponRepo.getAllCoupons(filter);
  }

  async getCouponById(id: string): Promise<Coupon | null> {
    return couponRepo.getCouponById(id);
  }

  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    return couponRepo.updateCoupon(id, updates);
  }

  async deleteCoupon(id: string): Promise<boolean> {
    return couponRepo.deleteCoupon(id);
  }
}

export const couponService = new CouponService();
