import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { uniquenessService } from '../../src/security/uniqueness.service';
import { salonRoutes } from '../../src/routes/salon.routes';
import { authRoutes } from '../../src/routes/auth.routes';
import { referralRoutes } from '../../src/routes/referral.routes';
import { partnerRoutes } from '../../src/routes/partner.routes';
import { partnerRepo } from '../../src/db/repositories/partner.repo';
import { couponRepo } from '../../src/db/repositories/coupon.repo';
import { referralRepo } from '../../src/db/repositories/referral.repo';
import { organizationRepo } from '../../src/db/repositories/organization.repo';
import { salonRepo } from '../../src/db/repositories/salon.repo';

const app = new Elysia()
  .use(salonRoutes)
  .use(authRoutes)
  .use(referralRoutes)
  .use(partnerRoutes);

describe('Universal Uniqueness & Collision Prevention Engine', () => {
  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  describe('1. Salon & Organization Slug Uniqueness', () => {
    it('should reject reserved slugs with suggestions', async () => {
      const res = await uniquenessService.checkSlug('admin');
      expect(res.available).toBe(false);
      expect(res.collisionType).toBe('RESERVED');
      expect(res.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect existing salon slug collision via API', async () => {
      // Create a test salon
      const slug = `test-salon-${Date.now()}`;
      await salonRepo.createSalon({
        name: 'Collision Salon',
        slug,
        phone: '+919999988888',
      });

      const httpRes = await app.handle(
        new Request(`http://localhost/api/salons/check-slug?slug=${slug}`)
      );
      expect(httpRes.status).toBe(200);
      const data = await httpRes.json();
      expect(data.available).toBe(false);
      expect(data.collisionType).toBe('SALON');
      expect(data.suggestions.length).toBeGreaterThan(0);
    });

    it('should approve completely unique salon slug', async () => {
      const uniqueSlug = `super-unique-salon-${Date.now()}`;
      const res = await uniquenessService.checkSlug(uniqueSlug);
      expect(res.available).toBe(true);
      expect(res.value).toBe(uniqueSlug);
    });
  });

  describe('2. Owner & Staff Username Uniqueness', () => {
    it('should reject reserved usernames with suggestions', async () => {
      const res = await uniquenessService.checkUsername('superadmin');
      expect(res.available).toBe(false);
      expect(res.collisionType).toBe('RESERVED');
      expect(res.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect existing username via API', async () => {
      const username = `owner_${Date.now()}`;
      const { authService } = await import('../../src/auth/auth-service');
      await authService.createUser({
        username,
        password: 'Password123',
        role: 'SALON_OWNER',
      });

      const httpRes = await app.handle(
        new Request(`http://localhost/api/auth/check-username?username=${username}`)
      );
      expect(httpRes.status).toBe(200);
      const data = await httpRes.json();
      expect(data.available).toBe(false);
      expect(data.collisionType).toBe('USER');
      expect(data.suggestions.length).toBeGreaterThan(0);
    });

    it('should approve completely unique username', async () => {
      const uniqueUsername = `unique_barber_${Date.now()}`;
      const res = await uniquenessService.checkUsername(uniqueUsername);
      expect(res.available).toBe(true);
      expect(res.value).toBe(uniqueUsername);
    });
  });

  describe('3. Cross-Ecosystem Referral Code Collision Guard', () => {
    it('should reject reserved referral codes', async () => {
      const res = await uniquenessService.checkReferralCode('DISCOUNT');
      expect(res.available).toBe(false);
      expect(res.collisionType).toBe('RESERVED');
    });

    it('should detect collision when code is owned by a Partner', async () => {
      const p = await partnerRepo.createPartnerApplication({
        fullName: 'Vikram Singh',
        phone: '+919911223344',
        city: 'Jaipur',
        persona: 'CREATOR',
        referralCode: 'VIKRAM_PARTNER',
      });

      const res = await uniquenessService.checkReferralCode('VIKRAM_PARTNER');
      expect(res.available).toBe(false);
      expect(res.collisionType).toBe('PARTNER');
      expect(res.reason).toContain('Growth Partner');
    });

    it('should detect collision when code is an active Coupon', async () => {
      const couponCode = `SAVE_${Date.now().toString(36).toUpperCase()}`;
      await couponRepo.createCoupon({
        code: couponCode,
        targetType: 'SUBSCRIPTION',
        discountType: 'PERCENT',
        discountValue: 50,
      });

      const res = await uniquenessService.checkReferralCode(couponCode);
      expect(res.available).toBe(false);
      expect(res.collisionType).toBe('COUPON');
      expect(res.reason).toContain('coupon');
    });

    it('should detect collision when code matches an Organization slug', async () => {
      const orgSlug = `luxe_${Date.now().toString(36)}`;
      const org = await organizationRepo.createOrganization({
        name: 'Luxe Salon Chain',
        slug: orgSlug,
        tier: 'PRO',
      });

      const res = await uniquenessService.checkReferralCode(org.slug.toUpperCase());
      expect(res.available).toBe(false);
      expect(res.collisionType).toBe('ORGANIZATION');
      expect(res.reason).toContain('Salon Organization');
    });

    it('should detect collision when code is used by a Consumer Referral', async () => {
      const consumerCode = `REF_9876500000`;
      await referralRepo.recordAttribution({
        referralType: 'B2C_CONSUMER',
        referrerCode: consumerCode,
        referrerPhone: '+919876500000',
        rewardAmount: 50,
      });

      const res = await uniquenessService.checkReferralCode(consumerCode);
      expect(res.available).toBe(false);
      expect(res.collisionType).toBe('CONSUMER');
      expect(res.reason).toContain('customer referral');
    });

    it('should approve completely unique referral code across all namespaces', async () => {
      const uniqueCode = `UNIQ_${Date.now().toString(36).toUpperCase()}`;
      const res = await uniquenessService.checkReferralCode(uniqueCode);
      expect(res.available).toBe(true);
      expect(res.value).toBe(uniqueCode);
    });

    it('should prevent partner from updating to an existing coupon code', async () => {
      const couponCode = `CPN_${Date.now().toString(36).toUpperCase()}`;
      await couponRepo.createCoupon({
        code: couponCode,
        targetType: 'SUBSCRIPTION',
        discountType: 'PERCENT',
        discountValue: 20,
      });

      const p = await partnerRepo.createPartnerApplication({
        fullName: 'Test Hustler',
        phone: '+919811223344',
        city: 'Delhi',
        persona: 'GROUND_HUSTLER',
      });

      expect(
        partnerRepo.updatePartnerReferralCode(p.id, couponCode)
      ).rejects.toThrow(/discount coupon/i);
    });
  });

  describe('4. Atomic Onboarding Isolation Guard', () => {
    it('should isolate duplicate organization names and prevent Branch Quota collision', async () => {
      const commonName = `SharedNameSalon_${Date.now()}`;
      const slug1 = `shared-slug-1-${Date.now()}`;
      const slug2 = `shared-slug-2-${Date.now()}`;

      // Onboard first salon with tier STARTER
      const first = await salonRepo.onboardSalon({
        name: commonName,
        slug: slug1,
        organizationName: commonName,
        phone: '+919876511111',
        tier: 'STARTER',
        ownerUser: {
          username: `owner1_${Date.now()}`,
          email: `owner1_${Date.now()}@example.com`,
          password: 'Password123',
        },
      });
      expect(first.success).toBe(true);

      // Onboard second independent salon with SAME organizationName & tier STARTER
      // Should NOT collide or throw "Branch quota limit reached" because it receives an isolated organization!
      const second = await salonRepo.onboardSalon({
        name: commonName,
        slug: slug2,
        organizationName: commonName,
        phone: '+919876522222',
        tier: 'STARTER',
        ownerUser: {
          username: `owner2_${Date.now()}`,
          email: `owner2_${Date.now()}@example.com`,
          password: 'Password123',
        },
      });
      expect(second.success).toBe(true);
      expect(second.organization?.id).not.toBe(first.organization?.id);
    });

    it('should reject onboarding if salon slug already exists', async () => {
      const dupSlug = `duplicate-slug-${Date.now()}`;
      await salonRepo.createSalon({
        name: 'First Salon',
        slug: dupSlug,
        phone: '+919876533333',
      });

      expect(
        salonRepo.onboardSalon({
          name: 'Second Salon',
          slug: dupSlug,
          phone: '+919876544444',
        })
      ).rejects.toThrow(/already taken/i);
    });

    it('should reject onboarding if owner username already exists', async () => {
      const dupUsername = `dup_owner_${Date.now()}`;
      const { authService } = await import('../../src/auth/auth-service');
      await authService.createUser({
        username: dupUsername,
        password: 'Password123',
        role: 'SALON_OWNER',
      });

      expect(
        salonRepo.onboardSalon({
          name: 'Third Salon',
          slug: `third-salon-${Date.now()}`,
          phone: '+919876555555',
          ownerUser: {
            username: dupUsername,
            email: `third_${Date.now()}@example.com`,
            password: 'NewPassword123',
          },
        })
      ).rejects.toThrow(/already taken/i);
    });

    it('should reject onboarding if owner email is missing or duplicate', async () => {
      const timestamp = Date.now();
      // Missing email
      expect(
        salonRepo.onboardSalon({
          name: 'Fourth Salon',
          slug: `fourth-salon-${timestamp}`,
          phone: '+919876566666',
          ownerUser: {
            username: `owner4_${timestamp}`,
            password: 'Password123',
          } as any,
        })
      ).rejects.toThrow(/email address is mandatory/i);

      // Create first user with email
      const { authService } = await import('../../src/auth/auth-service');
      const registeredEmail = `owner_reg_${timestamp}@example.com`;
      await authService.createUser({
        username: `owner_reg_${timestamp}`,
        email: registeredEmail,
        password: 'Password123',
        role: 'SALON_OWNER',
      });

      // Duplicate email
      expect(
        salonRepo.onboardSalon({
          name: 'Fifth Salon',
          slug: `fifth-salon-${timestamp}`,
          phone: '+919876577777',
          ownerUser: {
            username: `owner5_${timestamp}`,
            email: registeredEmail,
            password: 'Password123',
          },
        })
      ).rejects.toThrow(/already registered/i);
    });
  });

  describe('5. Shared Phone Multi-Account Disambiguation & 3-Tier Login Guard', () => {
    it('should allow two different salon owners to share the same phone number and authenticate each uniquely', async () => {
      const { authService } = await import('../../src/auth/auth-service');
      const sharedPhone = '+919000011111';
      const ts = Date.now();

      const ownerA = await authService.createUser({
        username: `salon_a_owner_${ts}`,
        email: `salona_${ts}@example.com`,
        phone: sharedPhone,
        password: 'PasswordSalonA!',
        role: 'SALON_OWNER',
      });

      const ownerB = await authService.createUser({
        username: `salon_b_owner_${ts}`,
        email: `salonb_${ts}@example.com`,
        phone: sharedPhone,
        password: 'PasswordSalonB!',
        role: 'SALON_OWNER',
      });

      // 1. Primary: Login via Email (Tier 1)
      const authByEmailA = await authService.authenticateUser(ownerA.email!, 'PasswordSalonA!');
      expect(authByEmailA).not.toBeNull();
      expect(authByEmailA?.user.id).toBe(ownerA.id);

      const authByEmailB = await authService.authenticateUser(ownerB.email!, 'PasswordSalonB!');
      expect(authByEmailB).not.toBeNull();
      expect(authByEmailB?.user.id).toBe(ownerB.id);

      // 2. Secondary: Login via Username (Tier 2)
      const authByUsernameA = await authService.authenticateUser(ownerA.username, 'PasswordSalonA!');
      expect(authByUsernameA).not.toBeNull();
      expect(authByUsernameA?.user.id).toBe(ownerA.id);

      // 3. Shared Phone Login: Password disambiguates between Owner A and Owner B! (Tier 3)
      const authByPhoneA = await authService.authenticateUser(sharedPhone, 'PasswordSalonA!');
      expect(authByPhoneA).not.toBeNull();
      expect(authByPhoneA?.user.id).toBe(ownerA.id);

      const authByPhoneB = await authService.authenticateUser(sharedPhone, 'PasswordSalonB!');
      expect(authByPhoneB).not.toBeNull();
      expect(authByPhoneB?.user.id).toBe(ownerB.id);

      // 4. Invalid password for both
      const authFailed = await authService.authenticateUser(sharedPhone, 'WrongPassword!');
      expect(authFailed).toBeNull();
    });
  });
});
