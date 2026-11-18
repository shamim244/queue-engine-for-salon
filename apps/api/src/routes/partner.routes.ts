import { Elysia, t } from 'elysia';
import { partnerRepo, sanitizePartner } from '../db/repositories/partner.repo';
import { repository } from '../db/repository';
import { phoneValidator } from '../security/phone-validator';
import { uniquenessService } from '../security/uniqueness.service';
import type { Partner, PartnerStatus, PartnerPersona, PartnerCommissionModel, PartnerDurationType } from '../engine/types';

export async function resolvePartner(headers: Record<string, string | undefined>, query?: Record<string, string | undefined>): Promise<Partner | null> {
  const directId = headers['x-partner-id'] || query?.partnerId;
  if (directId) {
    const p = await partnerRepo.getPartnerById(directId);
    if (p) return p;
  }

  const authHeader = headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token.startsWith('part_sess_')) {
      // Token format: part_sess_<partnerId>_<timestamp>
      // Strip 'part_sess_' prefix and remove trailing _<timestamp>
      const rest = token.slice('part_sess_'.length);
      const lastUnderscore = rest.lastIndexOf('_');
      const partnerId = lastUnderscore !== -1 ? rest.substring(0, lastUnderscore) : rest;
      if (partnerId) {
        const p = await partnerRepo.getPartnerById(partnerId);
        if (p) return p;
      }
    }
    // Also try token as partner id
    const p = await partnerRepo.getPartnerById(token);
    if (p) return p;
  }

  return null;
}

export const partnerRoutes = new Elysia({ prefix: '/api/v1/partners' })
  // 1. Public Partner Application
  .post(
    '/apply',
    async ({ body, set }) => {
      try {
        if (body.password && body.password.trim().length < 8) {
          set.status = 400;
          return { success: false, message: 'Password must be at least 8 characters long.' };
        }
        const phoneCheck = phoneValidator.validatePhone(body.phone, (body as any).countryCode || '+91');
        if (!phoneCheck.valid || !phoneValidator.is10DigitNumber(phoneCheck.nationalNumber)) {
          set.status = 400;
          return {
            success: false,
            message: 'Invalid mobile number. Must be a valid 10-digit mobile number.',
          };
        }
        if (!body.email || !body.email.trim()) {
          set.status = 400;
          return { success: false, message: 'Email address is required for partner registration.' };
        }
        const partner = await partnerRepo.createPartnerApplication({
          ...body,
          phone: phoneCheck.e164,
          email: body.email.trim(),
        } as any);
        return {
          success: true,
          message: 'Partner application submitted successfully. Super Admin review pending.',
          partner: sanitizePartner(partner),
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        fullName: t.String(),
        phone: t.String(),
        city: t.String(),
        persona: t.String(),
        email: t.String(),
        password: t.Optional(t.String()),
        payoutUpiId: t.Optional(t.String()),
        payoutHolderName: t.Optional(t.String()),
        payoutBankName: t.Optional(t.String()),
        payoutBankAccount: t.Optional(t.String()),
        payoutBankIfsc: t.Optional(t.String()),
        payoutAccountType: t.Optional(t.String()),
        pitchNotes: t.Optional(t.String()),
        referralCode: t.Optional(t.String()),
      }),
    }
  )

  // 2. Partner Login (Multi-identifier or Phone)
  .post(
    '/login',
    async ({ body, set }) => {
      const identifier = (body.identifier || body.phone || '').trim();
      const password = body.password;

      if (!identifier) {
        set.status = 400;
        return { success: false, message: 'Identifier or phone number is required.' };
      }

      if (password) {
        try {
          const authResult = await partnerRepo.authenticatePartner({ identifier, password });
          const token = `part_sess_${authResult.partner.id}_${Date.now()}`;
          return {
            success: true,
            token,
            partner: sanitizePartner(authResult.partner),
          };
        } catch (err: any) {
          if (err.message.includes('NO_PASSWORD_SET')) {
            set.status = 400;
            return {
              success: false,
              code: 'PASSWORD_NOT_SET',
              message: 'No password configured for this partner account. Please contact Super Admin to set your password.',
            };
          }
          if (
            err.message.includes('pending Super Admin review') ||
            err.message.includes('rejected') ||
            err.message.includes('suspended')
          ) {
            set.status = 403;
          } else {
            set.status = 401;
          }
          return { success: false, message: err.message };
        }
      }

      // Legacy fallback if no password passed (e.g. OTP flow in existing test mocks)
      const cleanPhone = identifier;
      const partners = await partnerRepo.getAllPartners();
      const partner = partners.find(
        (p) => p.phone === cleanPhone || p.phone.replace(/\D/g, '').endsWith(cleanPhone.replace(/\D/g, ''))
      );

      if (!partner) {
        set.status = 404;
        return { success: false, message: 'No partner account found with this phone number. Please submit an application.' };
      }

      if (partner.status === 'PENDING_REVIEW') {
        set.status = 403;
        return { success: false, message: 'Your application is currently under review by Super Admin.' };
      }

      if (partner.status === 'REJECTED') {
        set.status = 403;
        return { success: false, message: 'Your partner application was not approved.' };
      }

      if (partner.status === 'PAUSED') {
        set.status = 403;
        return { success: false, message: 'Your partner account is currently suspended. Please contact support.' };
      }

      const token = `part_sess_${partner.id}_${Date.now()}`;
      return {
        success: true,
        token,
        partner: sanitizePartner(partner),
      };
    },
    {
      body: t.Object({
        identifier: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        password: t.Optional(t.String()),
        otp: t.Optional(t.String()),
      }),
    }
  )

  // 2.5 Real-Time Partner Referral Code Uniqueness & Collision Check
  .get('/check-code', async ({ query, set }) => {
    const rawCode = (query.code || '').trim();
    if (!rawCode) {
      set.status = 400;
      return {
        available: false,
        code: '',
        reason: 'Referral code parameter is required.',
        suggestions: [],
      };
    }
    const result = await uniquenessService.checkReferralCode(rawCode, query.excludeId);
    return {
      success: true,
      ...result,
      code: result.value,
    };
  })

  // 3. Verify Partner Referral Code & Live Discount Quote (used during salon onboarding wizard)
  .get('/verify-code', async ({ query, set }) => {
    const code = (query.code || '').trim();
    if (!code) {
      set.status = 400;
      return { success: false, message: 'Referral code is required' };
    }

    const planQuery = (query.plan as string) || 'PRO';
    let basePrice = 999;
    let resolvedTier = 'PRO';

    const { planRepo } = await import('../db/repositories/plan.repo');
    let plan = await planRepo.getPlanById(planQuery);
    if (!plan) {
      plan = await planRepo.getPlanBySlug(planQuery);
    }
    if (!plan) {
      const allPlans = await planRepo.getAllPlans();
      plan = allPlans.find(
        (p) =>
          p.id.toLowerCase() === planQuery.toLowerCase() ||
          p.slug.toLowerCase() === planQuery.toLowerCase() ||
          p.name.toLowerCase() === planQuery.toLowerCase()
      ) || null;
    }

    if (plan) {
      basePrice = Number(plan.price1m);
      if (Number(plan.price1m) === 0 && Number(plan.price3m) === 0) {
        resolvedTier = 'FREE';
      } else if (plan.maxBranches > 5 || plan.name.toLowerCase().includes('enterprise')) {
        resolvedTier = 'ENTERPRISE';
      } else if (plan.maxBranches > 1 || plan.name.toLowerCase().includes('pro')) {
        resolvedTier = 'PRO';
      } else {
        resolvedTier = 'STARTER';
      }
    } else {
      if (planQuery === 'FREE') {
        basePrice = 0;
        resolvedTier = 'FREE';
      } else if (planQuery === 'STARTER') {
        basePrice = 499;
        resolvedTier = 'STARTER';
      } else if (planQuery === 'PRO') {
        basePrice = 1499;
        resolvedTier = 'PRO';
      } else if (planQuery === 'ENTERPRISE') {
        basePrice = 4999;
        resolvedTier = 'ENTERPRISE';
      }
    }

    const quote = await partnerRepo.quoteReferralDiscount({
      partnerCode: code,
      planTier: resolvedTier,
      basePrice,
    });

    if (!quote.isValid) {
      return {
        success: true,
        isValid: false,
        valid: false,
        message: quote.message || 'Invalid or inactive partner referral code',
      };
    }

    const partner = await partnerRepo.getPartnerByCode(code);
    return {
      success: true,
      isValid: true,
      valid: true,
      partner: partner
        ? {
            id: partner.id,
            fullName: partner.fullName,
            city: partner.city,
            referralCode: partner.referralCode,
            persona: partner.persona,
          }
        : quote.partnerId
        ? {
            id: quote.partnerId,
            fullName: quote.partnerName || 'Partner Salon Owner',
            city: quote.city || 'Verified Salon Partner',
            referralCode: code.toUpperCase(),
            persona: 'SALON_OWNER',
          }
        : undefined,
      discount: {
        type: 'PERCENTAGE',
        value: quote.discountPercent,
        grossPlanPrice: basePrice,
        discountAmount: quote.discountAmount,
        netPayableAmount: quote.netPayableAmount,
        message: quote.message,
      },
      message: quote.message,
    };
  })

  // 3b. Partner Marketing Collateral Content (Public & Authenticated)
  .get('/marketing-content', async () => {
    const content = await partnerRepo.getMarketingContent();
    return {
      success: true,
      content,
    };
  })

  // 4. Authenticated Partner Profile & Dashboard Telemetry
  .get('/me', async ({ headers, query, set }) => {
    const partner = await resolvePartner(headers, query);
    if (!partner) {
      set.status = 401;
      return { success: false, message: 'Unauthorized. Partner token or header required.' };
    }

    const wallet = await partnerRepo.getWalletBalance(partner.id);
    const attributions = await partnerRepo.getAttributionsByPartnerId(partner.id);
    const notifications = await partnerRepo.getNotifications(partner.id);

    const stats = {
      totalSalons: attributions.length,
      qualifiedSalons: attributions.filter((a) => a.qualificationStatus === 'QUALIFIED').length,
      pendingSalons: attributions.filter((a) => a.qualificationStatus === 'UNQUALIFIED').length,
      unreadNotifications: notifications.filter((n) => !n.isRead).length,
    };

    return {
      success: true,
      partner: sanitizePartner(partner),
      wallet,
      stats,
    };
  })

  // 4b. Update / Change Partner Password
  .put(
    '/me/password',
    async ({ headers, query, body, set }) => {
      const partner = await resolvePartner(headers, query);
      if (!partner) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const cleanPassword = (body.newPassword || '').trim();
      if (cleanPassword.length < 8) {
        set.status = 400;
        return { success: false, message: 'Password must be at least 8 characters long.' };
      }

      if (partner.passwordHash && body.currentPassword) {
        const isMatch = await Bun.password.verify(body.currentPassword, partner.passwordHash);
        if (!isMatch) {
          set.status = 400;
          return { success: false, message: 'Current password is incorrect.' };
        }
      }

      const updated = await partnerRepo.setPartnerPassword(partner.id, cleanPassword);
      return {
        success: true,
        message: 'Password updated successfully.',
        partner: sanitizePartner(updated),
      };
    },
    {
      body: t.Object({
        currentPassword: t.Optional(t.String()),
        newPassword: t.String(),
      }),
    }
  )

  // 4c. Check Referral Code Uniqueness & Format Availability
  .get(
    '/check-code-availability',
    async ({ query, headers }) => {
      const code = (query.code || '').trim().toUpperCase();
      let excludePartnerId: string | undefined = query.excludeId;
      if (query.excludeSelf === 'true') {
        const currentPartner = await resolvePartner(headers, query);
        if (currentPartner?.id) {
          excludePartnerId = currentPartner.id;
        }
      }
      const res = await uniquenessService.checkReferralCode(code, excludePartnerId);
      return {
        success: true,
        available: res.available,
        message: res.available ? 'This referral code is available!' : (res.reason || 'Referral code is not available.'),
        collisionType: res.collisionType,
        suggestions: res.suggestions,
      };
    },
    {
      query: t.Object({
        code: t.String(),
        excludeSelf: t.Optional(t.String()),
        excludeId: t.Optional(t.String()),
      }),
    }
  )

  // 4d. Customize / Update Partner Referral Code
  .put(
    '/me/referral-code',
    async ({ headers, query, body, set }) => {
      const partner = await resolvePartner(headers, query);
      if (!partner) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const updated = await partnerRepo.updatePartnerReferralCode(partner.id, body.referralCode);
        return {
          success: true,
          message: 'Referral code updated successfully!',
          partner: sanitizePartner(updated),
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message || 'Failed to update referral code',
        };
      }
    },
    {
      body: t.Object({
        referralCode: t.String(),
      }),
    }
  )

  // 5. Update Profile (UPI / Bank Settings)
  .patch(
    '/me/profile',
    async ({ headers, query, body, set }) => {
      const partner = await resolvePartner(headers, query);
      if (!partner) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      const updated = await partnerRepo.updateCommissionTerms(partner.id, body as any);
      return {
        success: true,
        partner: updated,
      };
    },
    {
      body: t.Object({
        payoutUpiId: t.Optional(t.String()),
        payoutBankAccount: t.Optional(t.String()),
        payoutBankIfsc: t.Optional(t.String()),
        pitchNotes: t.Optional(t.String()),
      }),
    }
  )

  // 6. List Referred Salons
  .get('/me/salons', async ({ headers, query, set }) => {
    const partner = await resolvePartner(headers, query);
    if (!partner) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    const { organizationRepo } = await import('../db/repositories/organization.repo');
    const { paymentRepo } = await import('../db/repositories/payment.repo');
    const { planRepo } = await import('../db/repositories/plan.repo');

    const attributions = await partnerRepo.getAttributionsByPartnerId(partner.id);
    const ledger = await partnerRepo.getLedgerByPartnerId(partner.id);

    const salonsWithDetails = await Promise.all(
      attributions.map(async (attr) => {
        const salon = await repository.getSalonById(attr.salonId);
        const orgId = salon?.organizationId;
        const org = orgId ? await organizationRepo.getOrganizationById(orgId) : null;
        const activeSub = orgId ? await paymentRepo.getActiveSubscriptionByOrgId(orgId) : null;

        let plan = null;
        if (activeSub?.planId) {
          plan = await planRepo.getPlanById(activeSub.planId);
        }
        if (!plan && org?.planId) {
          plan = await planRepo.getPlanById(org.planId);
        }

        // Check pending manual payment order
        let pendingOrder: any = null;
        if (orgId) {
          const orders = await paymentRepo.getAllOrders({
            organizationId: orgId,
            status: 'PENDING_APPROVAL',
            limit: 1,
          });
          if (orders && orders.length > 0) {
            pendingOrder = orders[0];
          }
        }

        // Calculate total commission earned from this salon
        const earnedFromSalon = ledger
          .filter((l) => l.salonId === attr.salonId && Number(l.commissionAmount) > 0)
          .reduce((sum, l) => sum + Number(l.commissionAmount), 0);

        // Derive plan name, tier, and billing cycle
        let currentTier = org?.tier || 'FREE';
        if (plan) {
          const badgeUpper = (plan.badge || '').toUpperCase();
          const nameUpper = (plan.name || '').toUpperCase();
          if (badgeUpper.includes('ENTERPRISE') || nameUpper.includes('ENTERPRISE') || plan.maxBranches > 5) {
            currentTier = 'ENTERPRISE';
          } else if (badgeUpper.includes('PRO') || nameUpper.includes('PRO') || plan.maxBranches > 1 || plan.maxStylistsPerBranch > 2) {
            currentTier = 'PRO';
          } else if (Number(plan.price1m) > 0) {
            currentTier = 'STARTER';
          }
        } else if (activeSub && (Number(activeSub.basePrice) > 0 || Number(activeSub.netAmountPaid) > 0)) {
          currentTier = org?.tier && org.tier !== 'FREE' ? org.tier : 'PRO';
        }
        const currentPlanName = plan?.name || (currentTier === 'FREE' ? 'Free Testing Plan' : `${currentTier} Plan`);
        const billingCycle = activeSub?.cycle || pendingOrder?.metadata?.billingCycle || '1m';

        // Derive live payment status
        let paymentStatus: 'ACTIVE_PAID' | 'PENDING_APPROVAL' | 'FREE_TESTING' | 'REJECTED' = 'FREE_TESTING';
        if (pendingOrder) {
          paymentStatus = 'PENDING_APPROVAL';
        } else if (activeSub && (Number(activeSub.basePrice) > 0 || Number(activeSub.netAmountPaid) > 0) && activeSub.status === 'ACTIVE') {
          paymentStatus = 'ACTIVE_PAID';
        } else if (currentTier === 'FREE') {
          paymentStatus = 'FREE_TESTING';
        }

        return {
          attributionId: attr.id,
          salonId: attr.salonId,
          salonName: salon?.name || 'Partner Salon',
          salonSlug: salon?.slug || attr.salonId,
          salonPhone: salon?.phone || '',
          source: attr.source,
          qualificationStatus: attr.qualificationStatus,
          ticketsCompletedCount: attr.ticketsCompletedCount,
          firstPaidPlanAt: attr.firstPaidPlanAt,
          commissionExpiresAt: attr.commissionExpiresAt,
          onboardedAt: attr.createdAt,
          currentTier,
          currentPlanName,
          billingCycle,
          paymentStatus,
          pendingAmount: pendingOrder ? Number(pendingOrder.amount) : null,
          pendingUtr: pendingOrder ? (pendingOrder.utrNumber || pendingOrder.transactionRef || null) : null,
          earnedCommission: Number(earnedFromSalon.toFixed(2)),
        };
      })
    );

    return {
      success: true,
      salons: salonsWithDetails,
    };
  })

  // 7. Wallet Ledger Transactions
  .get('/me/ledger', async ({ headers, query, set }) => {
    const partner = await resolvePartner(headers, query);
    if (!partner) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    const ledger = await partnerRepo.getLedgerByPartnerId(partner.id);
    const payouts = await partnerRepo.getPayoutRequests(partner.id);
    const wallet = await partnerRepo.getWalletBalance(partner.id);

    return {
      success: true,
      wallet,
      ledger,
      payouts,
    };
  })

  // 7b. Manage Payout Methods (Profile Settings)
  .put(
    '/me/payout-methods',
    async ({ headers, query, body, set }) => {
      const partner = await resolvePartner(headers, query);
      if (!partner) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        const updated = await partnerRepo.updatePayoutMethods(partner.id, body as any);
        return {
          success: true,
          message: 'Payout methods updated successfully.',
          partner: updated,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        payoutUpiId: t.Optional(t.String()),
        payoutHolderName: t.Optional(t.String()),
        payoutBankName: t.Optional(t.String()),
        payoutBankAccount: t.Optional(t.String()),
        payoutBankIfsc: t.Optional(t.String()),
        payoutAccountType: t.Optional(t.String()),
      }),
    }
  )

  // 8. Request Payout (Option-based or explicit target)
  .post(
    '/me/payout',
    async ({ headers, query, body, set }) => {
      const partner = await resolvePartner(headers, query);
      if (!partner) {
        set.status = 401;
        return { success: false, message: 'Unauthorized' };
      }

      try {
        let payout;
        if (body.payoutTarget) {
          payout = await partnerRepo.requestPayout({
            partnerId: partner.id,
            amount: body.amount,
            payoutMethod: body.payoutMethod as any,
            payoutTarget: body.payoutTarget,
          });
        } else {
          payout = await partnerRepo.requestPayoutByOption({
            partnerId: partner.id,
            amount: body.amount,
            payoutMethod: body.payoutMethod as any,
          });
        }

        const wallet = await partnerRepo.getWalletBalance(partner.id);
        return {
          success: true,
          message: 'Withdrawal request submitted successfully.',
          payout,
          wallet,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        amount: t.Number(),
        payoutMethod: t.String(),
        payoutTarget: t.Optional(t.String()),
      }),
    }
  )

  // 9. Door-to-Door Assisted Onboarding Wizard
  .post(
    '/assisted-onboard',
    async ({ headers, query, body, set }) => {
      const partner = await resolvePartner(headers, query);
      if (!partner) {
        set.status = 401;
        return { success: false, message: 'Unauthorized partner' };
      }

      try {
        const result = await repository.onboardSalon({
          name: body.salonName,
          phone: body.ownerPhone,
          address: body.address,
          currency: body.currency || 'INR',
          partnerCode: partner.referralCode,
          stylists: body.stylists && body.stylists.length > 0
            ? body.stylists
            : [{ name: body.ownerName || 'Master Barber', pin: '1234' }],
          services: body.services && body.services.length > 0
            ? body.services
            : [{ name: 'Standard Haircut', basePrice: 150, estimatedDurationMinutes: 25 }],
        });

        // Set source specifically to ASSISTED_ONBOARDING
        const attr = await partnerRepo.getAttributionBySalonId(result.salon.id);
        if (attr) {
          attr.source = 'ASSISTED_ONBOARDING';
          await partnerRepo.updateAttribution(attr);
        }

        return {
          success: true,
          message: `Salon '${result.salon.name}' successfully onboarded and attributed to ${partner.fullName}!`,
          salon: result.salon,
          attribution: attr,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        salonName: t.String(),
        ownerPhone: t.String(),
        ownerName: t.String(),
        address: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        stylists: t.Optional(t.Array(t.Any())),
        services: t.Optional(t.Array(t.Any())),
      }),
    }
  )

  // 10. Partner In-App Notifications Feed
  .get('/me/notifications', async ({ headers, query, set }) => {
    const partner = await resolvePartner(headers, query);
    if (!partner) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    const notifications = await partnerRepo.getNotifications(partner.id);
    return {
      success: true,
      notifications,
    };
  })

  // 11. Mark Notification as Read
  .patch('/me/notifications/:id/read', async ({ params, headers, query, set }) => {
    const partner = await resolvePartner(headers, query);
    if (!partner) {
      set.status = 401;
      return { success: false, message: 'Unauthorized' };
    }

    await partnerRepo.markNotificationRead(params.id);
    return { success: true };
  });

// Admin Partner Governance Routes
export const adminPartnerRoutes = new Elysia({ prefix: '/api/v1/admin/partners' })
  // 1. List All Partners with KPI Aggregates
  .get('/', async ({ query }) => {
    const partners = await partnerRepo.getAllPartners({
      persona: query.persona,
      status: query.status,
    });

    const partnersWithStats = await Promise.all(
      partners.map(async (p) => {
        const wallet = await partnerRepo.getWalletBalance(p.id);
        const attributions = await partnerRepo.getAttributionsByPartnerId(p.id);
        return {
          ...sanitizePartner(p),
          wallet,
          salonCount: attributions.length,
          qualifiedSalonCount: attributions.filter((a) => a.qualificationStatus === 'QUALIFIED').length,
        };
      })
    );

    return {
      success: true,
      partners: partnersWithStats,
    };
  })

  // 1b. Direct Super Admin Onboarding (Auto-Approved & Activated)
  .post(
    '/onboard',
    async ({ body, set }) => {
      try {
        const phoneCheck = phoneValidator.validatePhone(body.phone, (body as any).countryCode || '+91');
        if (!phoneCheck.valid || !phoneValidator.is10DigitNumber(phoneCheck.nationalNumber)) {
          set.status = 400;
          return {
            success: false,
            message: 'Invalid mobile number. Must be a valid 10-digit mobile number.',
          };
        }

        if (body.password && body.password.trim().length < 8) {
          set.status = 400;
          return {
            success: false,
            message: 'Password must be at least 8 characters long.',
          };
        }

        if (!body.email || !body.email.trim()) {
          set.status = 400;
          return {
            success: false,
            message: 'Email address is required for partner onboarding.',
          };
        }

        const initialPassword = body.password?.trim() || `Part_${Math.random().toString(36).substring(2, 6).toUpperCase()}!${Math.floor(100 + Math.random() * 900)}`;

        const partner = await partnerRepo.adminOnboardPartner({
          fullName: body.fullName,
          phone: phoneCheck.e164,
          city: body.city,
          persona: (body.persona as any) || 'GROUND_HUSTLER',
          email: body.email.trim(),
          password: initialPassword,
          referralCode: body.referralCode,
          status: 'ACTIVE',
          commissionModel: body.commissionModel as any,
          commissionPercent: body.commissionPercent !== undefined ? Number(body.commissionPercent) : undefined,
          bountyAmount: body.bountyAmount !== undefined ? Number(body.bountyAmount) : undefined,
          durationType: body.durationType as any,
          payoutUpiId: body.payoutUpiId,
          pitchNotes: body.pitchNotes,
        });

        return {
          success: true,
          message: `Partner ${partner.fullName} onboarded and activated successfully.`,
          partner: {
            ...sanitizePartner(partner),
            initialPassword,
          },
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message || 'Failed to onboard partner.' };
      }
    },
    {
      body: t.Object({
        fullName: t.String(),
        phone: t.String(),
        city: t.String(),
        persona: t.Optional(t.String()),
        email: t.String(),
        password: t.Optional(t.String()),
        referralCode: t.Optional(t.String()),
        commissionModel: t.Optional(t.String()),
        commissionPercent: t.Optional(t.Number()),
        bountyAmount: t.Optional(t.Number()),
        durationType: t.Optional(t.String()),
        payoutUpiId: t.Optional(t.String()),
        pitchNotes: t.Optional(t.String()),
        countryCode: t.Optional(t.String()),
      }),
    }
  )

  // 2. Get Single Partner 360° View
  .get('/:id', async ({ params, set }) => {
    const partner = await partnerRepo.getPartnerById(params.id);
    if (!partner) {
      set.status = 404;
      return { success: false, message: 'Partner not found' };
    }

    const wallet = await partnerRepo.getWalletBalance(partner.id);
    const attributions = await partnerRepo.getAttributionsByPartnerId(partner.id);
    const ledger = await partnerRepo.getLedgerByPartnerId(partner.id);
    const payouts = await partnerRepo.getPayoutRequests(partner.id);

    return {
      success: true,
      partner: sanitizePartner(partner),
      wallet,
      attributions,
      ledger,
      payouts,
    };
  })

  // 3. Update Partner Status (APPROVE / REJECT / PAUSE)
  .patch(
    '/:id/status',
    async ({ params, body, set }) => {
      try {
        const updated = await partnerRepo.updatePartnerStatus(params.id, body.status as PartnerStatus);
        return {
          success: true,
          message: `Partner status updated to ${body.status}`,
          partner: sanitizePartner(updated),
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        status: t.String(),
      }),
    }
  )

  // 4. Update Partner Commission Terms
  .patch(
    '/:id/commission',
    async ({ params, body, set }) => {
      try {
        const b = body as any;
        if (b.isCommissionPaused !== undefined) {
          await partnerRepo.setCommissionPaused(params.id, b.isCommissionPaused);
        }

        const updated = await partnerRepo.updateCommissionTerms(params.id, {
          commissionModel: b.commissionModel,
          commissionPercent: b.commissionPercent !== undefined ? Number(b.commissionPercent) : undefined,
          bountyAmount: b.bountyAmount !== undefined ? Number(b.bountyAmount) : undefined,
          durationType: b.durationType,
          durationEndDate: b.durationEndDate,
        });

        return {
          success: true,
          message: 'Partner terms updated successfully',
          partner: sanitizePartner(updated),
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        commissionModel: t.Optional(t.String()),
        commissionPercent: t.Optional(t.Number()),
        bountyAmount: t.Optional(t.Number()),
        durationType: t.Optional(t.String()),
        durationEndDate: t.Optional(t.Any()),
        isCommissionPaused: t.Optional(t.Boolean()),
      }),
    }
  )

  // 4b. Set / Reset Partner Password (Admin Action)
  .post(
    '/:id/password',
    async ({ params, body, set }) => {
      try {
        if (!body.password || body.password.trim().length < 8) {
          set.status = 400;
          return { success: false, message: 'Password must be at least 8 characters long.' };
        }

        const updated = await partnerRepo.setPartnerPassword(params.id, body.password);
        return {
          success: true,
          message: 'Partner password updated successfully.',
          partner: sanitizePartner(updated),
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        password: t.String(),
      }),
    }
  )

  // 4c. Set / Override Partner Referral Code (Super Admin Action)
  .patch(
    '/:id/referral-code',
    async ({ params, body, set }) => {
      try {
        const updated = await partnerRepo.updatePartnerReferralCode(params.id, body.referralCode);
        return {
          success: true,
          message: 'Partner referral code updated successfully by Super Admin.',
          partner: sanitizePartner(updated),
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message || 'Failed to update partner referral code',
        };
      }
    },
    {
      body: t.Object({
        referralCode: t.String(),
      }),
    }
  )

  // 5. List All Withdrawal Requests
  .get('/payouts', async () => {
    const payouts = await partnerRepo.getPayoutRequests();
    const payoutsWithPartner = await Promise.all(
      payouts.map(async (p) => {
        const partner = await partnerRepo.getPartnerById(p.partnerId);
        return {
          ...p,
          partnerName: partner?.fullName || 'Unknown',
          partnerPhone: partner?.phone || '',
          partnerPersona: partner?.persona || 'GROUND_HUSTLER',
        };
      })
    );

    return {
      success: true,
      payouts: payoutsWithPartner,
    };
  })

  // 6. Settle Payout Request (Admin UTR Entry)
  .post(
    '/payouts/:id/settle',
    async ({ params, body, set }) => {
      try {
        const settled = await partnerRepo.settlePayout(params.id, {
          utrReference: body.utrReference,
          adminNotes: body.adminNotes,
        });

        return {
          success: true,
          message: `Payout settled successfully with UTR ${body.utrReference}`,
          payout: settled,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        utrReference: t.String(),
        adminNotes: t.Optional(t.String()),
      }),
    }
  )

  // 7. Reject Payout Request
  .post(
    '/payouts/:id/reject',
    async ({ params, body, set }) => {
      try {
        const rejected = await partnerRepo.rejectPayout(params.id, body.reason);
        return {
          success: true,
          message: 'Payout request rejected and balance refunded to partner',
          payout: rejected,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        reason: t.String(),
      }),
    }
  )

  // 8. Get Partner Program Settings
  .get('/settings', async () => {
    const settings = await partnerRepo.getProgramSettings();
    return {
      success: true,
      settings,
    };
  })

  // 9. Update Partner Program Settings
  .put(
    '/settings',
    async ({ body }) => {
      const updated = await partnerRepo.updateProgramSettings(body as any);
      return {
        success: true,
        message: 'Partner program settings updated successfully',
        settings: updated,
      };
    },
    {
      body: t.Object({
        defaultCommissionModel: t.Optional(t.String()),
        defaultCommissionPercent: t.Optional(t.Number()),
        defaultBountyAmount: t.Optional(t.Number()),
        defaultDurationType: t.Optional(t.String()),
        defaultReferralDiscountPercent: t.Optional(t.Number()),
        qualificationTicketsThreshold: t.Optional(t.Number()),
        minPayoutThreshold: t.Optional(t.Number()),
        autoApprovePartners: t.Optional(t.Boolean()),
      }),
    }
  )

  // 10. Get Marketing Collateral Content (CMS)
  .get('/marketing-content', async () => {
    const content = await partnerRepo.getMarketingContent();
    return {
      success: true,
      content,
    };
  })

  // 11. Update Marketing Collateral Content (CMS)
  .put(
    '/marketing-content',
    async ({ body }) => {
      const updated = await partnerRepo.updateMarketingContent(body as any);
      return {
        success: true,
        message: 'Marketing kit collateral updated successfully',
        content: updated,
      };
    },
    {
      body: t.Object({
        pitchScriptHindi: t.Optional(t.String()),
        pitchScriptEnglish: t.Optional(t.String()),
        whatsappInviteTemplate: t.Optional(t.String()),
        objectionHandling: t.Optional(t.Any()),
        posterHeadline: t.Optional(t.String()),
        posterSubheadline: t.Optional(t.String()),
        posterBulletPoints: t.Optional(t.Any()),
      }),
    }
  )

  // 12. List All Attributions & Ticket Milestones
  .get('/attributions', async () => {
    const attributions = await partnerRepo.getAllAttributionsWithDetails();
    return {
      success: true,
      attributions,
    };
  })

  // 13. Manually Attribute Salon to Partner
  .post(
    '/attributions/manual',
    async ({ body, set }) => {
      try {
        const attribution = await partnerRepo.createManualAttribution(body.salonId, body.partnerId);
        return {
          success: true,
          message: 'Salon attributed successfully to partner',
          attribution,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        salonId: t.String(),
        partnerId: t.String(),
      }),
    }
  )

  // 14. Reassign Attribution to Another Partner
  .patch(
    '/attributions/:id/reassign',
    async ({ params, body, set }) => {
      try {
        const attribution = await partnerRepo.reassignAttribution(params.id, body.newPartnerId);
        return {
          success: true,
          message: 'Attribution reassigned to new partner successfully',
          attribution,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        newPartnerId: t.String(),
      }),
    }
  );
