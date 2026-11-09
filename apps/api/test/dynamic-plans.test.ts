import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { planRoutes } from '../src/routes/plan.routes';
import { planRepo } from '../src/db/repositories/plan.repo';
import { organizationRepo } from '../src/db/repositories/organization.repo';
import { salonRepo } from '../src/db/repositories/salon.repo';
import { seedDemoData, memoryStore } from '../src/db/repositories/store';
import type { CreatePlanPayload } from '../src/engine/types';

describe('Dynamic Subscription Plans & Feature Quota Engine - Unit Tests', () => {
  beforeEach(() => {
    seedDemoData();
    planRepo.invalidatePlanCache();
  });

  it('should seed default demo plans with correct pricing and features', async () => {
    const plans = await planRepo.getAllPlans();
    expect(plans.length).toBeGreaterThanOrEqual(3);

    const solo = await planRepo.getPlanBySlug('solo-barber');
    expect(solo).toBeDefined();
    expect(solo?.price1m).toBe(499);
    expect(solo?.cycle1mEnabled).toBe(true);
    expect(solo?.cycle3mEnabled).toBe(true);
    expect(solo?.maxBranches).toBe(1);
    expect(solo?.maxStylistsPerBranch).toBe(1);
    expect(solo?.features).toContain('station_chair_transfers');

    const pro = await planRepo.getPlanBySlug('growth-studio-pro');
    expect(pro).toBeDefined();
    expect(pro?.isFeatured).toBe(true);
    expect(pro?.maxBranches).toBe(3);
    expect(pro?.maxStylistsPerBranch).toBe(10);
  });

  it('should create a custom plan and auto-calculate cycle prices if not provided', async () => {
    const payload: CreatePlanPayload = {
      name: 'Diwali Festive Tier',
      price1m: 1000,
      discountPct3m: 10,
      discountPct6m: 20,
      discountPct1y: 30,
      maxBranches: 2,
      maxStylistsPerBranch: 4,
      features: ['tv_departure_mirror', 'whatsapp_sms_notifications', 'custom_coupons'],
    };

    const created = await planRepo.createPlan(payload);
    expect(created.id).toBeDefined();
    expect(created.slug).toBe('diwali-festive-tier');
    expect(created.price1m).toBe(1000);
    // 1000 * 3 * 0.9 = 2700
    expect(created.price3m).toBe(2700);
    // 1000 * 6 * 0.8 = 4800
    expect(created.price6m).toBe(4800);
    // 1000 * 12 * 0.7 = 8400
    expect(created.price1y).toBe(8400);
    expect(created.status).toBe('ACTIVE');
    expect(created.features.length).toBe(3);

    // Verify lookup by id
    const fetched = await planRepo.getPlanById(created.id);
    expect(fetched?.name).toBe('Diwali Festive Tier');
  });

  it('should allow selective billing cycles and custom cycle price overrides', async () => {
    const payload: CreatePlanPayload = {
      name: 'Flash Weekend Pass',
      price1m: 299,
      price3m: 799, // Custom manual override
      cycle1mEnabled: true,
      cycle3mEnabled: true,
      cycle6mEnabled: false,
      cycle1yEnabled: false,
      maxBranches: 1,
      maxStylistsPerBranch: 2,
      features: ['station_soft_bump'],
    };

    const plan = await planRepo.createPlan(payload);
    expect(plan.cycle1mEnabled).toBe(true);
    expect(plan.cycle3mEnabled).toBe(true);
    expect(plan.cycle6mEnabled).toBe(false);
    expect(plan.cycle1yEnabled).toBe(false);
    expect(plan.price3m).toBe(799);
  });

  it('should update existing plan and immediately invalidate cache', async () => {
    const initial = await planRepo.createPlan({
      name: 'Micro Studio',
      price1m: 399,
      maxBranches: 1,
      maxStylistsPerBranch: 2,
      features: ['station_hold_pause'],
    });

    // Populate cache
    const cachedBefore = await planRepo.getAllPlans();
    expect(cachedBefore.some((p) => p.id === initial.id)).toBe(true);

    // Update plan
    const updated = await planRepo.updatePlan(initial.id, {
      name: 'Micro Studio Platinum',
      price1m: 599,
      maxStylistsPerBranch: 4,
      features: ['station_hold_pause', 'tv_departure_mirror'],
    });

    expect(updated?.name).toBe('Micro Studio Platinum');
    expect(updated?.price1m).toBe(599);
    expect(updated?.maxStylistsPerBranch).toBe(4);
    expect(updated?.features).toContain('tv_departure_mirror');

    // Cached getAllPlans should reflect the update immediately
    const cachedAfter = await planRepo.getAllPlans();
    const found = cachedAfter.find((p) => p.id === initial.id);
    expect(found?.name).toBe('Micro Studio Platinum');
    expect(found?.price1m).toBe(599);
  });

  it('should soft-archive a plan without deleting historical record', async () => {
    const plan = await planRepo.createPlan({
      name: 'Temporary Promo Plan',
      price1m: 199,
      maxBranches: 1,
      maxStylistsPerBranch: 1,
      features: [],
    });

    const archived = await planRepo.archivePlan(plan.id);
    expect(archived).toBe(true);

    const fetched = await planRepo.getPlanById(plan.id);
    expect(fetched?.status).toBe('ARCHIVED');

    // Default getAllPlans (ACTIVE only) should not include it
    const activePlans = await planRepo.getAllPlans({ status: 'ACTIVE' });
    expect(activePlans.some((p) => p.id === plan.id)).toBe(false);

    // getAllPlans with status: 'all' should still return it
    const allPlans = await planRepo.getAllPlans({ status: 'all' });
    expect(allPlans.some((p) => p.id === plan.id)).toBe(true);
  });

  it('should dynamically resolve branch and stylist quotas against tenant subscription plan', async () => {
    // 1. Create a 2-branch, 3-stylist dynamic plan
    const customPlan = await planRepo.createPlan({
      name: 'Twin Boutique Tier',
      price1m: 999,
      maxBranches: 2,
      maxStylistsPerBranch: 3,
      features: ['station_chair_transfers'],
    });

    // 2. Create organization attached to this plan
    const org = await organizationRepo.createOrganization({
      name: 'Twin Barber Co',
      planId: customPlan.id,
    });

    expect(org.planId).toBe(customPlan.id);
    expect(org.maxBranches).toBe(2);
    expect(org.maxStylistsPerBranch).toBe(3);

    // 3. Check branch quota: currently 0 branches
    const branchCheck1 = await organizationRepo.checkOrganizationBranchQuota(org.id, () => salonRepo.getAllSalons());
    expect(branchCheck1.allowed).toBe(true);
    expect(branchCheck1.max).toBe(2);
    expect(branchCheck1.current).toBe(0);

    // 4. Dynamically upgrade the plan limits by SuperAdmin: expand to 5 branches, 8 stylists
    await planRepo.updatePlan(customPlan.id, {
      maxBranches: 5,
      maxStylistsPerBranch: 8,
    });

    // 5. Quota check dynamically reflects new limits immediately!
    const branchCheck2 = await organizationRepo.checkOrganizationBranchQuota(org.id, () => salonRepo.getAllSalons());
    expect(branchCheck2.max).toBe(5);
  });
});

describe('Dynamic Subscription Plans REST API (/api/plans)', () => {
  const app = new Elysia().use(planRoutes);

  beforeEach(() => {
    seedDemoData();
    planRepo.invalidatePlanCache();
  });

  it('GET /api/plans should return active subscription plans catalog', async () => {
    const res = await app.handle(new Request('http://localhost/api/plans'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.plans)).toBe(true);
    expect(data.plans.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/plans should validate TypeBox schema and create new plan with status 201', async () => {
    const payload = {
      name: 'Executive Studio Elite',
      badge: 'VIP Only',
      description: 'Exclusive multi-chair salon tier with concierge features',
      price1m: 2499,
      discountPct3m: 15,
      discountPct6m: 20,
      discountPct1y: 35,
      cycle1mEnabled: true,
      cycle3mEnabled: true,
      cycle6mEnabled: true,
      cycle1yEnabled: true,
      maxBranches: 4,
      maxStylistsPerBranch: 8,
      features: ['station_chair_transfers', 'tv_departure_mirror', 'custom_coupons'],
      isFeatured: true,
      sortOrder: 4,
    };

    const res = await app.handle(
      new Request('http://localhost/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.plan.name).toBe('Executive Studio Elite');
    expect(data.plan.slug).toBe('executive-studio-elite');
    expect(data.plan.price1m).toBe(2499);
    expect(data.plan.maxBranches).toBe(4);
    expect(data.plan.isFeatured).toBe(true);
  });

  it('GET /api/plans/:id should retrieve single plan by id or slug', async () => {
    const res = await app.handle(new Request('http://localhost/api/plans/solo-barber'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.plan.name).toBe('Solo Traditional Barber');

    const res404 = await app.handle(new Request('http://localhost/api/plans/nonexistent-plan'));
    expect(res404.status).toBe(404);
  });

  it('PATCH /api/plans/:id should update plan attributes and invalidate catalog cache', async () => {
    // 1. Fetch current solo-barber
    const getRes = await app.handle(new Request('http://localhost/api/plans/solo-barber'));
    const plan = (await getRes.json()).plan;

    // 2. Patch price and quotas
    const patchRes = await app.handle(
      new Request(`http://localhost/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price1m: 549,
          maxStylistsPerBranch: 2,
        }),
      })
    );

    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.plan.price1m).toBe(549);
    expect(patchData.plan.maxStylistsPerBranch).toBe(2);

    // 3. Verify subsequent GET reflects updated values
    const verifyRes = await app.handle(new Request(`http://localhost/api/plans/${plan.id}`));
    const verifyData = await verifyRes.json();
    expect(verifyData.plan.price1m).toBe(549);
  });

  it('DELETE /api/plans/:id should soft-archive the plan', async () => {
    const getRes = await app.handle(new Request('http://localhost/api/plans/growth-studio-pro'));
    const plan = (await getRes.json()).plan;

    const delRes = await app.handle(
      new Request(`http://localhost/api/plans/${plan.id}`, {
        method: 'DELETE',
      })
    );

    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.success).toBe(true);

    // Active list should no longer include it
    const activeRes = await app.handle(new Request('http://localhost/api/plans'));
    const activeData = await activeRes.json();
    expect(activeData.plans.some((p: any) => p.id === plan.id)).toBe(false);

    // Query with ?status=all should still return it with ARCHIVED status
    const allRes = await app.handle(new Request('http://localhost/api/plans?status=all'));
    const allData = await allRes.json();
    const found = allData.plans.find((p: any) => p.id === plan.id);
    expect(found).toBeDefined();
    expect(found.status).toBe('ARCHIVED');
  });
});
