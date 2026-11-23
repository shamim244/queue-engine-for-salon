import { isMySqlConnected, getDb } from '../mysql';
import type { Salon, Organization, OnboardSalonPayload } from '../../engine/types';
import { memoryStore, salonCache, CACHE_TTL_MS, invalidateSalonCache } from './store';
import { cacheService } from '../../cache/cache.service';
import { organizationRepo } from './organization.repo';

export const salonRepo = {
  invalidateSalonCache,

  async getSalonById(id: string, options?: { skipCache?: boolean }): Promise<Salon | null> {
    return this.getSalonBySlug(id, options);
  },

  async getSalonBySlug(slug: string, options?: { skipCache?: boolean }): Promise<Salon | null> {
    const cacheKey = `salon:catalog:${slug}`;
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        let salon: Salon | null = null;
        if (isMySqlConnected) {
          const db = getDb();
          const [rows]: any = await db.query('SELECT * FROM salons WHERE slug = ? OR id = ? LIMIT 1', [slug, slug]);
          if (rows.length === 0) return null;
          const salonRow = rows[0];

          const [stylistRows]: any = await db.query('SELECT * FROM stylists WHERE salon_id = ? AND is_active = TRUE', [salonRow.id]);
          const [serviceRows]: any = await db.query('SELECT * FROM services WHERE salon_id = ?', [salonRow.id]);

          salon = {
            id: salonRow.id,
            organizationId: salonRow.organization_id || null,
            name: salonRow.name,
            slug: salonRow.slug,
            phone: salonRow.phone,
            operatingMode: salonRow.operating_mode,
            countryCode: salonRow.country_code,
            currency: salonRow.currency,
            address: salonRow.address,
            upiPaymentId: salonRow.upi_payment_id,
            tagline: salonRow.tagline || undefined,
            about: salonRow.about || undefined,
            email: salonRow.email || undefined,
            whatsappPhone: salonRow.whatsapp_phone || undefined,
            googleMapsUrl: salonRow.google_maps_url || undefined,
            instagramHandle: salonRow.instagram_handle || undefined,
            operatingHours: salonRow.operating_hours || undefined,
            amenities: typeof salonRow.amenities === 'string' ? JSON.parse(salonRow.amenities) : (salonRow.amenities || undefined),
            announcement: salonRow.announcement || undefined,
            announcementActive: Boolean(salonRow.announcement_active),
            wifiSsid: salonRow.wifi_ssid || undefined,
            wifiPassword: salonRow.wifi_password || undefined,
            enableLoungeWifi: salonRow.enable_lounge_wifi !== undefined && salonRow.enable_lounge_wifi !== null ? Boolean(salonRow.enable_lounge_wifi) : true,
            enableScreenWakeLock: salonRow.enable_screen_wake_lock !== undefined && salonRow.enable_screen_wake_lock !== null ? Boolean(salonRow.enable_screen_wake_lock) : true,
            loyaltyEnabled: salonRow.loyalty_enabled !== undefined && salonRow.loyalty_enabled !== null ? Boolean(salonRow.loyalty_enabled) : true,
            loyaltyStampGoal: salonRow.loyalty_stamp_goal ? Number(salonRow.loyalty_stamp_goal) : 6,
            loyaltyRewardServiceId: salonRow.loyalty_reward_service_id || undefined,
            loyaltyRewardServiceName: salonRow.loyalty_reward_service_name || undefined,
            loyaltyCooldownHours: salonRow.loyalty_cooldown_hours ? Number(salonRow.loyalty_cooldown_hours) : 4,
            loyaltyVoucherValidityDays: salonRow.loyalty_voucher_validity_days ? Number(salonRow.loyalty_voucher_validity_days) : 90,
            loyaltyReferrerBonus: salonRow.loyalty_referrer_bonus !== undefined && salonRow.loyalty_referrer_bonus !== null ? Number(salonRow.loyalty_referrer_bonus) : 50,
            loyaltyRefereeDiscount: salonRow.loyalty_referee_discount !== undefined && salonRow.loyalty_referee_discount !== null ? Number(salonRow.loyalty_referee_discount) : 50,
            loyaltyRewardDescription: salonRow.loyalty_reward_description || 'Free Haircut or Beard Grooming',
            createdAt: salonRow.created_at,
            stylists: stylistRows.map((r: any) => ({
              id: r.id,
              salonId: r.salon_id,
              name: r.name,
              phone: r.phone,
              isActive: Boolean(r.is_active),
              historicalAvgDurationMinutes: r.historical_avg_duration_minutes,
              customAvgDurationMinutes: r.custom_avg_duration_minutes || null,
            })),
            services: serviceRows.map((r: any) => ({
              id: r.id,
              salonId: r.salon_id,
              name: r.name,
              basePrice: Number(r.base_price),
              estimatedDurationMinutes: Number(r.estimated_duration_minutes),
              pricingType: r.pricing_type || 'FIXED',
              isAddOn: Boolean(r.is_add_on),
              icon: r.icon,
            })),
          };
        } else {
          salon = memoryStore.salons.get(slug) || null;
        }

        if (salon) {
          const cloned = JSON.parse(JSON.stringify(salon));
          salonCache.set(salon.slug, { salon: cloned, cachedAt: Date.now() });
          salonCache.set(salon.id, { salon: cloned, cachedAt: Date.now() });
          // Also prime cross-key lookup (both ID and slug) in centralized cache
          if (salon.id !== salon.slug) {
            cacheService.set(`salon:catalog:${salon.id}`, cloned, 60).catch(() => {});
          }
          return cloned;
        }
        return null;
      },
      60,
      { skipCache: options?.skipCache }
    );
  },

  async getAllSalons(): Promise<Salon[]> {
    if (isMySqlConnected) {
      return await cacheService.getOrSet(
        'salons:all',
        async () => {
          const db = getDb();
          const [rows]: any = await db.query('SELECT * FROM salons');
          const results = await Promise.all(
            rows.map((row: any) => this.getSalonBySlug(row.slug))
          );
          return results.filter(Boolean) as Salon[];
        },
        30
      );
    }
    const unique = new Set(memoryStore.salons.values());
    return Array.from(unique);
  },

  async createSalon(params: {
    name: string;
    slug?: string;
    organizationId?: string;
    phone: string;
    operatingMode?: string;
    currency?: string;
    countryCode?: string;
    address?: string;
    upiPaymentId?: string;
    stylists?: { name: string; phone?: string; avgDurationMinutes?: number }[];
    services?: { name: string; basePrice: number; estimatedDurationMinutes: number; isAddOn?: boolean; icon?: string }[];
  }): Promise<Salon> {
    if (params.organizationId) {
      const quota = await organizationRepo.checkOrganizationBranchQuota(params.organizationId, () => this.getAllSalons());
      if (!quota.allowed) {
        throw new Error(`Branch quota limit (${quota.max}) reached for tier ${quota.tier}. Please upgrade your organization tier.`);
      }
    }

    const rawSlug = (params.slug || params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'salon';
    let slug = rawSlug;
    let counter = 1;

    // Ensure unique slug
    while (await this.getSalonBySlug(slug)) {
      slug = `${rawSlug}-${counter++}`;
    }

    const salonId = 'salon-' + Math.random().toString(36).substring(2, 9);
    const newSalon: Salon = {
      id: salonId,
      organizationId: params.organizationId || null,
      name: params.name,
      slug,
      phone: params.phone,
      operatingMode: params.operatingMode || 'STANDARD',
      countryCode: params.countryCode || '+91',
      currency: params.currency || 'INR',
      address: params.address,
      upiPaymentId: params.upiPaymentId,
      createdAt: new Date(),
      stylists: [],
      services: [],
    };

    // Default stylist if none provided
    const stylistInputs = params.stylists && params.stylists.length > 0
      ? params.stylists
      : [{ name: `${params.name} Stylist` }];

    if (params.organizationId) {
      const org = await organizationRepo.getOrganizationById(params.organizationId);
      if (org && stylistInputs.length > org.maxStylistsPerBranch) {
        throw new Error(`Stylist count (${stylistInputs.length}) exceeds branch limit (${org.maxStylistsPerBranch}) for tier ${org.tier}. Please upgrade.`);
      }
    }

    newSalon.stylists = stylistInputs.map((st, idx) => ({
      id: `stylist-${salonId}-${idx + 1}`,
      salonId,
      name: st.name,
      phone: st.phone || params.phone,
      isActive: true,
      historicalAvgDurationMinutes: st.avgDurationMinutes || 25,
    }));

    // Default services if none provided
    const serviceInputs = params.services && params.services.length > 0
      ? params.services
      : [
          { name: 'Signature Haircut', basePrice: 150, estimatedDurationMinutes: 25, isAddOn: false, icon: '✂️' },
          { name: 'Beard Trim & Sculpt', basePrice: 80, estimatedDurationMinutes: 15, isAddOn: false, icon: '🧔' },
          { name: 'Hair Wash & Styling', basePrice: 120, estimatedDurationMinutes: 15, isAddOn: true, icon: '💆' },
        ];

    newSalon.services = serviceInputs.map((srv, idx) => ({
      id: `srv-${salonId}-${idx + 1}`,
      salonId,
      name: srv.name,
      basePrice: Number(srv.basePrice),
      estimatedDurationMinutes: Number(srv.estimatedDurationMinutes),
      isAddOn: Boolean(srv.isAddOn),
      icon: srv.icon || (srv.isAddOn ? '✨' : '✂️'),
    }));

    // Save in memory
    memoryStore.salons.set(newSalon.id, newSalon);
    memoryStore.salons.set(newSalon.slug, newSalon);
    for (const st of newSalon.stylists) memoryStore.stylists.set(st.id, st);
    for (const srv of newSalon.services) memoryStore.services.set(srv.id, srv);
    memoryStore.ticketSequence.set(newSalon.id, 100);

    // Save in MySQL if connected
    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO salons (id, organization_id, name, slug, phone, operating_mode, country_code, currency, address, upi_payment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newSalon.id, newSalon.organizationId || null, newSalon.name, newSalon.slug, newSalon.phone, newSalon.operatingMode, newSalon.countryCode, newSalon.currency, newSalon.address || null, newSalon.upiPaymentId || null]
      );

      for (const st of newSalon.stylists) {
        await db.query(
          `INSERT INTO stylists (id, salon_id, name, phone, is_active, historical_avg_duration_minutes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [st.id, st.salonId, st.name, st.phone, st.isActive, st.historicalAvgDurationMinutes]
        );
      }

      for (const srv of newSalon.services) {
        await db.query(
          `INSERT INTO services (id, salon_id, name, base_price, estimated_duration_minutes, is_add_on, icon)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [srv.id, srv.salonId, srv.name, srv.basePrice, srv.estimatedDurationMinutes, srv.isAddOn, srv.icon || null]
        );
      }
    }

    this.invalidateSalonCache(newSalon.id);
    this.invalidateSalonCache(newSalon.slug);
    return newSalon;
  },

  async updateSalonOperatingMode(salonId: string, mode?: string): Promise<void> {
    if (isMySqlConnected) {
      try {
        const db = getDb();
        await db.query('UPDATE salons SET operating_mode = ? WHERE id = ?', [mode || 'STANDARD', salonId]);
      } catch {}
    }
    for (const [, s] of memoryStore.salons.entries()) {
      if (s.id === salonId) {
        s.operatingMode = mode || 'STANDARD';
      }
    }
    this.invalidateSalonCache(salonId);
  },

  async updateSalon(salonId: string, updates: {
    name?: string;
    phone?: string;
    address?: string;
    upiPaymentId?: string;
    tagline?: string;
    about?: string;
    email?: string;
    whatsappPhone?: string;
    googleMapsUrl?: string;
    instagramHandle?: string;
    operatingHours?: string;
    amenities?: string[];
    announcement?: string;
    announcementActive?: boolean;
    operatingMode?: string;
    currency?: string;
    status?: 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE';
    wifiSsid?: string;
    wifiPassword?: string;
    enableLoungeWifi?: boolean;
    enableScreenWakeLock?: boolean;
    loyaltyEnabled?: boolean;
    loyaltyStampGoal?: number;
    loyaltyRewardServiceId?: string;
    loyaltyRewardServiceName?: string;
    loyaltyCooldownHours?: number;
    loyaltyVoucherValidityDays?: number;
    loyaltyReferrerBonus?: number;
    loyaltyRefereeDiscount?: number;
    loyaltyRewardDescription?: string;
  }): Promise<Salon | null> {
    const salon = (await this.getSalonById(salonId, { skipCache: true })) || (await this.getAllSalons()).find((s) => s.id === salonId || s.slug === salonId);
    if (!salon) return null;

    if (updates.name !== undefined) salon.name = updates.name.trim();
    if (updates.phone !== undefined) salon.phone = updates.phone.trim();
    if (updates.address !== undefined) salon.address = updates.address.trim();
    if (updates.upiPaymentId !== undefined) salon.upiPaymentId = updates.upiPaymentId.trim();
    if (updates.tagline !== undefined) salon.tagline = updates.tagline.trim();
    if (updates.about !== undefined) salon.about = updates.about.trim();
    if (updates.email !== undefined) salon.email = updates.email.trim();
    if (updates.whatsappPhone !== undefined) salon.whatsappPhone = updates.whatsappPhone.trim();
    if (updates.googleMapsUrl !== undefined) salon.googleMapsUrl = updates.googleMapsUrl.trim();
    if (updates.instagramHandle !== undefined) salon.instagramHandle = updates.instagramHandle.trim();
    if (updates.operatingHours !== undefined) salon.operatingHours = updates.operatingHours.trim();
    if (updates.amenities !== undefined) salon.amenities = updates.amenities;
    if (updates.announcement !== undefined) salon.announcement = updates.announcement.trim();
    if (updates.announcementActive !== undefined) salon.announcementActive = Boolean(updates.announcementActive);
    if (updates.operatingMode !== undefined) salon.operatingMode = updates.operatingMode;
    if (updates.currency !== undefined) salon.currency = updates.currency.trim();
    if (updates.status !== undefined) (salon as any).status = updates.status;
    if (updates.wifiSsid !== undefined) salon.wifiSsid = updates.wifiSsid ? updates.wifiSsid.trim() : undefined;
    if (updates.wifiPassword !== undefined) salon.wifiPassword = updates.wifiPassword ? updates.wifiPassword.trim() : undefined;
    if (updates.enableLoungeWifi !== undefined) salon.enableLoungeWifi = Boolean(updates.enableLoungeWifi);
    if (updates.enableScreenWakeLock !== undefined) salon.enableScreenWakeLock = Boolean(updates.enableScreenWakeLock);
    if (updates.loyaltyEnabled !== undefined) salon.loyaltyEnabled = Boolean(updates.loyaltyEnabled);
    if (updates.loyaltyStampGoal !== undefined) salon.loyaltyStampGoal = Number(updates.loyaltyStampGoal);
    if (updates.loyaltyRewardServiceId !== undefined) salon.loyaltyRewardServiceId = updates.loyaltyRewardServiceId ? updates.loyaltyRewardServiceId.trim() : undefined;
    if (updates.loyaltyRewardServiceName !== undefined) salon.loyaltyRewardServiceName = updates.loyaltyRewardServiceName ? updates.loyaltyRewardServiceName.trim() : undefined;
    if (updates.loyaltyCooldownHours !== undefined) salon.loyaltyCooldownHours = Number(updates.loyaltyCooldownHours);
    if (updates.loyaltyVoucherValidityDays !== undefined) salon.loyaltyVoucherValidityDays = Number(updates.loyaltyVoucherValidityDays);
    if (updates.loyaltyReferrerBonus !== undefined) salon.loyaltyReferrerBonus = Number(updates.loyaltyReferrerBonus);
    if (updates.loyaltyRefereeDiscount !== undefined) salon.loyaltyRefereeDiscount = Number(updates.loyaltyRefereeDiscount);
    if (updates.loyaltyRewardDescription !== undefined) salon.loyaltyRewardDescription = updates.loyaltyRewardDescription.trim();

    memoryStore.salons.set(salon.id, salon);
    memoryStore.salons.set(salon.slug, salon);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `UPDATE salons 
         SET name = ?, phone = ?, address = ?, upi_payment_id = ?, operating_mode = ?,
             tagline = ?, about = ?, email = ?, whatsapp_phone = ?, google_maps_url = ?,
             instagram_handle = ?, operating_hours = ?, amenities = ?, announcement = ?, announcement_active = ?,
             wifi_ssid = ?, wifi_password = ?, enable_lounge_wifi = ?, enable_screen_wake_lock = ?,
             loyalty_enabled = ?, loyalty_stamp_goal = ?, loyalty_referrer_bonus = ?, loyalty_referee_discount = ?, loyalty_reward_description = ?,
             loyalty_reward_service_id = ?, loyalty_reward_service_name = ?, loyalty_cooldown_hours = ?, loyalty_voucher_validity_days = ?
         WHERE id = ?`,
        [
          salon.name,
          salon.phone,
          salon.address || null,
          salon.upiPaymentId || null,
          salon.operatingMode || 'STANDARD',
          salon.tagline || null,
          salon.about || null,
          salon.email || null,
          salon.whatsappPhone || null,
          salon.googleMapsUrl || null,
          salon.instagramHandle || null,
          salon.operatingHours || null,
          salon.amenities ? JSON.stringify(salon.amenities) : null,
          salon.announcement || null,
          salon.announcementActive ? 1 : 0,
          salon.wifiSsid || null,
          salon.wifiPassword || null,
          salon.enableLoungeWifi ? 1 : 0,
          salon.enableScreenWakeLock ? 1 : 0,
          salon.loyaltyEnabled !== undefined ? (salon.loyaltyEnabled ? 1 : 0) : 1,
          salon.loyaltyStampGoal ?? 6,
          salon.loyaltyReferrerBonus ?? 50,
          salon.loyaltyRefereeDiscount ?? 50,
          salon.loyaltyRewardDescription || 'Free Haircut or Beard Grooming',
          salon.loyaltyRewardServiceId || null,
          salon.loyaltyRewardServiceName || null,
          salon.loyaltyCooldownHours ?? 4,
          salon.loyaltyVoucherValidityDays ?? 90,
          salon.id,
        ]
      );
    }
    this.invalidateSalonCache(salon.id);
    this.invalidateSalonCache(salon.slug);
    await cacheService.del('salons:all').catch(() => {});
    await cacheService.delPattern('salons:*').catch(() => {});
    return salon;
  },

  async deleteSalon(salonId: string): Promise<boolean> {
    const salon = (await this.getSalonById(salonId, { skipCache: true })) || (await this.getAllSalons()).find((s) => s.id === salonId || s.slug === salonId);
    if (!salon) return false;

    memoryStore.salons.delete(salon.id);
    memoryStore.salons.delete(salon.slug);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query('DELETE FROM queue_tickets WHERE salon_id = ?', [salon.id]);
      await db.query('DELETE FROM services WHERE salon_id = ?', [salon.id]);
      await db.query('DELETE FROM stylists WHERE salon_id = ?', [salon.id]);
      await db.query('DELETE FROM salons WHERE id = ?', [salon.id]);
    }
    this.invalidateSalonCache(salon.id);
    this.invalidateSalonCache(salon.slug);
    await cacheService.del('salons:all').catch(() => {});
    await cacheService.delPattern('salons:*').catch(() => {});
    return true;
  },

  async onboardSalon(payload: OnboardSalonPayload, auditLogger?: (action: string, actor: string, details: string, category: string) => void): Promise<{
    success: boolean;
    salon: Salon;
    organization?: Organization | null;
    ownerUser?: any;
  }> {
    const salonName = payload.salonName || payload.name;
    if (!salonName) {
      throw new Error('Salon name is required for onboarding.');
    }

    // 1. Organization creation if specified
    let org: Organization | null = null;
    if (payload.organizationName) {
      const orgSlug = payload.organizationSlug || payload.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existingOrg = await organizationRepo.getOrganizationBySlug(orgSlug);
      if (!existingOrg) {
        org = await organizationRepo.createOrganization({
          name: payload.organizationName,
          slug: orgSlug,
          tier: payload.tier || 'FREE',
          planId: payload.planId || null,
        });
      } else {
        // Multi-tenant isolation: Ensure independent new salons receive their own unique organization
        // so they do not collide with or exhaust branch quotas of unrelated tenants
        const safeOrgSlug = `${orgSlug}-${payload.slug || Math.random().toString(36).substring(2, 6)}`;
        org = await organizationRepo.createOrganization({
          name: payload.organizationName,
          slug: safeOrgSlug,
          tier: payload.tier || 'FREE',
          planId: payload.planId || null,
        });
      }

      // If onboarded on a Free tier plan (zero payment required), fulfill active subscription immediately
      if (org && org.tier === 'FREE' && org.planId) {
        try {
          const { paymentRepo } = await import('./payment.repo');
          const existingSub = await paymentRepo.getActiveSubscriptionByOrgId(org.id);
          if (!existingSub) {
            const now = new Date();
            const cycle = (payload.billingCycle || '1m') as any;
            const daysToAdd = cycle === '1y' ? 365 : cycle === '6m' ? 180 : cycle === '3m' ? 90 : 30;
            const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
            await paymentRepo.createSubscription({
              id: 'sub-' + Math.random().toString(36).substring(2, 9),
              organizationId: org.id,
              planId: org.planId,
              cycle: cycle,
              status: 'ACTIVE',
              startsAt: now,
              expiresAt,
              autoRenew: true,
              createdAt: now,
              updatedAt: now,
            });
          }
        } catch (subErr) {
          console.warn('[onboardSalon] Failed to create initial free subscription record:', subErr);
        }
      }
    }

    // 2. Slug check: Ensure unique salon handle
    let finalSlug = payload.slug;
    if (finalSlug) {
      const existing = await this.getSalonBySlug(finalSlug);
      if (existing) {
        throw new Error(`Salon URL handle '/s/${finalSlug}' is already taken. Please choose a different URL handle.`);
      }
    }

    // 3. Salon Creation
    const salon = await this.createSalon({
      name: salonName,
      slug: finalSlug,
      organizationId: org ? org.id : undefined,
      phone: payload.phone,
      operatingMode: payload.operatingMode || 'STANDARD',
      currency: payload.currency || 'INR',
      countryCode: payload.countryCode || '+91',
      address: payload.address,
      upiPaymentId: payload.upiPaymentId,
      stylists: payload.stylists,
      services: payload.services,
    });

    // 3.1 Partner Attribution Hook
    if (payload.partnerCode) {
      const { partnerRepo } = await import('./partner.repo');
      const partner = await partnerRepo.getPartnerByCode(payload.partnerCode);
      if (partner && partner.status === 'ACTIVE') {
        await partnerRepo.createAttribution({
          partnerId: partner.id,
          salonId: salon.id,
          source: 'PROMO_CODE',
          qualificationStatus: 'UNQUALIFIED',
        });

        if (!partner.isCommissionPaused && partner.bountyAmount > 0 && (partner.commissionModel === 'FLAT_BOUNTY' || partner.commissionModel === 'HYBRID')) {
          await partnerRepo.addLedgerEntry({
            partnerId: partner.id,
            salonId: salon.id,
            transactionType: 'BOUNTY_CREDIT',
            commissionAmount: partner.bountyAmount,
            balanceType: 'PENDING_LOCK',
            description: 'Activation Bounty',
          });
        }

        await partnerRepo.createNotification({
          partnerId: partner.id,
          title: 'New Salon Onboarded!',
          message: `${salon.name} has registered using your partner code.`,
          type: 'SALON_JOINED',
        });
      } else {
        // Attribute to Salon Owner B2B referral
        try {
          const { referralService } = await import('../../wallet/referral.service');
          const referrerOrgId = await referralService.resolveReferrerOrg(payload.partnerCode);
          if (referrerOrgId && salon.organizationId && referrerOrgId !== salon.organizationId) {
            await referralService.attributeReferral({
              referralType: 'B2B_OWNER',
              referrerCode: payload.partnerCode.trim().toUpperCase(),
              referredOrgId: salon.organizationId,
              salonId: salon.id,
            });
          }
        } catch (refErr: any) {
          console.warn('[onboardSalon] Failed to record B2B referral attribution:', refErr?.message);
        }
      }
    }

    // 4. Create Owner User if credentials provided
    let ownerUser: any = null;
    if (payload.ownerUser && payload.ownerUser.username && payload.ownerUser.password) {
      const { authService } = await import('../../auth/auth-service');
      const cleanUsername = payload.ownerUser.username.trim().toLowerCase();
      const existingUser = await authService.getUserByUsername(cleanUsername);
      if (existingUser) {
        throw new Error(`Owner login username '@${cleanUsername}' is already taken. Please choose a different username.`);
      }

      const cleanEmail = payload.ownerUser.email ? payload.ownerUser.email.trim().toLowerCase() : '';
      if (!cleanEmail) {
        throw new Error('Owner email address is mandatory for primary account login and authentication.');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new Error('Please enter a valid owner email address format.');
      }
      const existingEmail = await authService.getUserByEmail(cleanEmail);
      if (existingEmail) {
        throw new Error(`Owner email address '${cleanEmail}' is already registered to another account.`);
      }

      ownerUser = await authService.createUser({
        username: cleanUsername,
        password: payload.ownerUser.password,
        role: 'SALON_OWNER',
        salonId: salon.id,
        organizationId: salon.organizationId,
        phone: payload.ownerUser.phone || salon.phone,
        email: cleanEmail,
      });
    }

    // 5. Log audit event
    if (auditLogger) {
      auditLogger(
        'TENANT_ONBOARDED',
        payload.ownerUser?.username || 'superadmin',
        `Onboarded salon '${salon.name}' (${salon.slug}) with ${salon.stylists.length} stylists and ${salon.services.length} services`,
        'ONBOARDING'
      );
    }

    return {
      success: true,
      salon,
      organization: org,
      ownerUser: ownerUser ? {
        id: ownerUser.id,
        username: ownerUser.username,
        role: ownerUser.role,
        salonId: ownerUser.salonId,
        organizationId: ownerUser.organizationId,
        phone: ownerUser.phone,
        email: ownerUser.email,
      } : null,
    };
  },
};
