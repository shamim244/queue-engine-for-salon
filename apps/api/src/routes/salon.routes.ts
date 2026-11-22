import { Elysia, t } from 'elysia';
import { repository } from '../db/repository';
import { uniquenessService } from '../security/uniqueness.service';

export const salonRoutes = new Elysia({ prefix: '/api/salons' })
  .get('/', async () => {
    return await repository.getAllSalons();
  })

  // 0. Real-Time Slug Availability & Collision Check
  .get('/check-slug', async ({ query, set }) => {
    const rawSlug = (query.slug || '').trim();
    if (!rawSlug) {
      set.status = 400;
      return {
        available: false,
        slug: '',
        reason: 'Slug parameter is required.',
        suggestions: [],
      };
    }
    const result = await uniquenessService.checkSlug(rawSlug);
    return {
      success: true,
      ...result,
      slug: result.value,
    };
  })

  // 1. Salon Self-Registration (Static route first)
  .post('/register', async ({ body, set }) => {
    try {
      const salon = await repository.createSalon(body as any);
      return {
        success: true,
        salon,
        links: {
          poster: `/poster.html?salon=${salon.slug}`,
          customer: `/s/${salon.slug}`,
          station: `/s/${salon.slug}/station`,
          barber: `/s/${salon.slug}/station`,
          desk: `/s/${salon.slug}/station`,
          tv: `/s/${salon.slug}/tv`,
        }
      };
    } catch (err: any) {
      set.status = 400;
      return { message: err.message };
    }
  }, {
    body: t.Object({
      name: t.String(),
      slug: t.Optional(t.String()),
      organizationId: t.Optional(t.String()),
      phone: t.String(),
      operatingMode: t.Optional(t.String()),
      currency: t.Optional(t.String()),
      wifiSsid: t.Optional(t.String()),
      wifiPassword: t.Optional(t.String()),
      enableLoungeWifi: t.Optional(t.Boolean()),
      enableScreenWakeLock: t.Optional(t.Boolean()),
      countryCode: t.Optional(t.String()),
      address: t.Optional(t.String()),
      upiPaymentId: t.Optional(t.String()),
      stylists: t.Optional(t.Array(t.Object({
        name: t.String(),
        phone: t.Optional(t.String()),
        avgDurationMinutes: t.Optional(t.Number()),
      }))),
      services: t.Optional(t.Array(t.Object({
        name: t.String(),
        basePrice: t.Number(),
        estimatedDurationMinutes: t.Number(),
        isAddOn: t.Optional(t.Boolean()),
        icon: t.Optional(t.String()),
      }))),
    })
  })

  // 1.1 List All Organizations (Optimized: O(1) single batch lookup)
  .get('/organizations', async () => {
    const [orgs, allSalons] = await Promise.all([
      repository.getAllOrganizations(),
      repository.getAllSalons(),
    ]);

    // Group salons by organizationId in O(1) map
    const orgSalonsMap = new Map<string, typeof allSalons>();
    for (const salon of allSalons) {
      if (!salon.organizationId) continue;
      const list = orgSalonsMap.get(salon.organizationId) || [];
      list.push(salon);
      orgSalonsMap.set(salon.organizationId, list);
    }

    const result = orgs.map((org) => {
      const branches = orgSalonsMap.get(org.id) || [];
      return {
        ...org,
        branchCount: branches.length,
        branches: branches.map(b => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          stylistsCount: b.stylists?.length || 0,
        })),
      };
    });

    return { organizations: result };
  })

  // 1.2 Get Specific Organization and Quota Usage
  .get('/organizations/:id', async ({ params, set }) => {
    const org = (await repository.getOrganizationById(params.id)) || (await repository.getOrganizationBySlug(params.id));
    if (!org) {
      set.status = 404;
      return { message: 'Organization not found' };
    }
    const branches = await repository.getSalonsByOrganizationId(org.id);
    return {
      organization: org,
      usage: {
        currentBranches: branches.length,
        maxBranches: org.maxBranches,
        tier: org.tier,
      },
      branches,
    };
  })

  // 1.3 Upgrade or Downgrade Organization Tier
  .post('/organizations/:id/tier', async ({ params, body, set }) => {
    const rawTier = (body as any).tier;
    const tier: SubscriptionTier = rawTier === 'PRO' || rawTier === 'ENTERPRISE' ? rawTier : 'STARTER';
    const updated = await repository.updateOrganizationTier(params.id, tier);
    if (!updated) {
      set.status = 404;
      return { message: 'Organization not found' };
    }
    return {
      success: true,
      message: `Organization tier updated to ${tier}`,
      organization: updated,
    };
  }, {
    body: t.Object({
      tier: t.Union([t.Literal('STARTER'), t.Literal('PRO'), t.Literal('ENTERPRISE'), t.Literal('SOLO')]),
    })
  })

  // 1.3.1 Assign Dynamic Subscription Plan to Organization
  .post('/organizations/:id/plan', async ({ params, body, set }) => {
    const { planId } = body as any;
    const updated = await repository.updateOrganizationPlan(params.id, planId);
    if (!updated) {
      set.status = 404;
      return { success: false, message: 'Organization or Subscription Plan not found' };
    }
    return {
      success: true,
      message: `Organization plan updated to ${updated.planId}`,
      organization: updated,
    };
  }, {
    body: t.Object({
      planId: t.String({ minLength: 1 }),
    })
  })

  // 1.4 Add Stylist to Salon (Gated by Tier Limits)
  .post('/:id/stylists', async ({ params, body, set }) => {
    try {
      const stylist = await repository.addStylist(params.id, body as any);
      return { success: true, stylist };
    } catch (err: any) {
      set.status = 400;
      return { message: err.message };
    }
  }, {
    body: t.Object({
      name: t.String(),
      phone: t.Optional(t.String()),
      avgDurationMinutes: t.Optional(t.Number()),
    })
  })

  // 1.4 Get Salon Stylist & Station Quota
  .get('/:id/quota', async ({ params, set }) => {
    const salon = (await repository.getSalonBySlug(params.id)) ||
                  (await repository.getAllSalons()).find(s => s.id === params.id);
    if (!salon) {
      set.status = 404;
      return { success: false, message: 'Salon not found' };
    }
    const quota = await repository.checkSalonStylistQuota(salon.id);
    return {
      success: true,
      ...quota,
    };
  })

  // 2. Get Salon by Slug or ID
  .get('/:id', async ({ params, set }) => {
    const salon = (await repository.getSalonBySlug(params.id)) ||
                  (await repository.getAllSalons()).find(s => s.id === params.id);
    if (!salon) {
      set.status = 404;
      return { message: 'Salon not found' };
    }
    const activeTickets = await repository.getActiveTickets(salon.id);
    return {
      salon,
      activeQueueCount: activeTickets.length,
    };
  })

  // 3. Update Operating Mode (Deprecated compatibility endpoint)
  .post('/:id/mode', async ({ params, body, set }) => {
    const { mode } = body as { mode?: string };
    if (mode) {
      await repository.updateSalonOperatingMode(params.id, mode);
    }
    return { success: true, mode: mode || 'STANDARD' };
  }, {
    body: t.Object({
      mode: t.Optional(t.String()),
    })
  })

  // 3.1 Update Salon Details (Admin / Owner)
  .patch('/:id', async ({ params, body, set }) => {
    try {
      const salon = await repository.updateSalon(params.id, body as any);
      if (!salon) {
        set.status = 404;
        return { success: false, message: 'Salon not found' };
      }
      return { success: true, salon };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      address: t.Optional(t.String()),
      upiPaymentId: t.Optional(t.String()),
      tagline: t.Optional(t.String()),
      about: t.Optional(t.String()),
      email: t.Optional(t.String()),
      whatsappPhone: t.Optional(t.String()),
      googleMapsUrl: t.Optional(t.String()),
      instagramHandle: t.Optional(t.String()),
      operatingHours: t.Optional(t.String()),
      amenities: t.Optional(t.Array(t.String())),
      announcement: t.Optional(t.String()),
      announcementActive: t.Optional(t.Boolean()),
      operatingMode: t.Optional(t.String()),
      status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('SUSPENDED'), t.Literal('MAINTENANCE')])),
      currency: t.Optional(t.String()),
      wifiSsid: t.Optional(t.String()),
      wifiPassword: t.Optional(t.String()),
      enableLoungeWifi: t.Optional(t.Boolean()),
      enableScreenWakeLock: t.Optional(t.Boolean()),
      loyaltyEnabled: t.Optional(t.Boolean()),
      loyaltyStampGoal: t.Optional(t.Number()),
      loyaltyReferrerBonus: t.Optional(t.Number()),
      loyaltyRefereeDiscount: t.Optional(t.Number()),
      loyaltyRewardDescription: t.Optional(t.String()),
    })
  })

  // 3.2 Delete / Archive Salon (Admin)
  .delete('/:id', async ({ params, set }) => {
    const success = await repository.deleteSalon(params.id);
    if (!success) {
      set.status = 404;
      return { success: false, message: 'Salon not found' };
    }
    return { success: true, message: 'Salon removed successfully' };
  })

  // 4. Add Service (Salon Owner)
  .post('/:id/services', async ({ params, body, set }) => {
    try {
      const b = body as {
        name: string;
        basePrice: number;
        estimatedDurationMinutes: number;
        pricingType?: 'FIXED' | 'STARTING_AT' | 'FLEXIBLE_CHAIR';
        isAddOn?: boolean;
        icon?: string;
      };
      const serviceId = 'srv-' + Math.random().toString(36).substring(2, 9);
      const service = await repository.addService({
        id: serviceId,
        salonId: params.id,
        name: b.name.trim(),
        basePrice: b.basePrice,
        estimatedDurationMinutes: b.estimatedDurationMinutes,
        pricingType: b.pricingType || 'FIXED',
        isAddOn: Boolean(b.isAddOn),
        icon: b.icon || '✂️',
      });
      return { success: true, service };
    } catch (err: any) {
      set.status = 400;
      return { message: err.message };
    }
  }, {
    body: t.Object({
      name: t.String(),
      basePrice: t.Number(),
      estimatedDurationMinutes: t.Number(),
      pricingType: t.Optional(t.Union([t.Literal('FIXED'), t.Literal('STARTING_AT'), t.Literal('FLEXIBLE_CHAIR')])),
      isAddOn: t.Optional(t.Boolean()),
      icon: t.Optional(t.String()),
    })
  })

  // 5. Delete Service (Salon Owner)
  .delete('/:id/services/:serviceId', async ({ params }) => {
    await repository.deleteService(params.serviceId);
    return { success: true };
  })

  // 5b. Update Service (Salon Owner)
  .patch('/:id/services/:serviceId', async ({ params, body }) => {
    const b = body as {
      name?: string;
      basePrice?: number;
      estimatedDurationMinutes?: number;
      pricingType?: 'FIXED' | 'STARTING_AT' | 'FLEXIBLE_CHAIR';
      isAddOn?: boolean;
      icon?: string;
    };
    await repository.updateService(params.serviceId, b);
    return { success: true };
  }, {
    body: t.Object({
      name: t.Optional(t.String()),
      basePrice: t.Optional(t.Number()),
      estimatedDurationMinutes: t.Optional(t.Number()),
      pricingType: t.Optional(t.Union([
        t.Literal('FIXED'),
        t.Literal('STARTING_AT'),
        t.Literal('FLEXIBLE_CHAIR'),
      ])),
      isAddOn: t.Optional(t.Boolean()),
      icon: t.Optional(t.String()),
    })
  })

  // 6. Salon Performance Metrics
  .get('/:id/metrics', async ({ params }) => {
    return await repository.getSalonMetrics(params.id);
  })

  // 7.1 Handle Late-Detected Staff Absence & Queue Recovery (Static sub-path first)
  .post('/:id/staff-leaves/handle-absence', async ({ params, body, set }) => {
    try {
      const b = body as {
        stylistId: string;
        action: 'UNIVERSAL_FAST_LINE' | 'REASSIGN_STYLIST';
        targetStylistId?: string;
        reason?: string;
      };
      const result = await repository.handleStaffAbsenceRecovery({
        salonId: params.id,
        stylistId: b.stylistId,
        action: b.action,
        targetStylistId: b.targetStylistId,
        reason: b.reason,
      });
      return result;
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      stylistId: t.String(),
      action: t.Union([t.Literal('UNIVERSAL_FAST_LINE'), t.Literal('REASSIGN_STYLIST')]),
      targetStylistId: t.Optional(t.String()),
      reason: t.Optional(t.String()),
    })
  })

  // 7.2 Get Salon Staff Leaves
  .get('/:id/staff-leaves', async ({ params, query }) => {
    const leaves = await repository.getStaffLeaves(params.id, {
      stylistId: (query as any)?.stylistId,
      date: (query as any)?.date,
    });
    return { success: true, leaves };
  })

  // 7.3 Create / Apply for Staff Leave
  .post('/:id/staff-leaves', async ({ params, body, set }) => {
    try {
      const b = body as {
        stylistId: string;
        leaveDate: string;
        endDate?: string;
        reason?: string;
        status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
        appliedBy?: string;
      };
      const leave = await repository.createStaffLeave({
        salonId: params.id,
        stylistId: b.stylistId,
        leaveDate: b.leaveDate,
        endDate: b.endDate,
        reason: b.reason,
        status: b.status,
        appliedBy: b.appliedBy,
      });
      return { success: true, leave };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      stylistId: t.String(),
      leaveDate: t.String(),
      endDate: t.Optional(t.String()),
      reason: t.Optional(t.String()),
      status: t.Optional(t.Union([
        t.Literal('PENDING'),
        t.Literal('APPROVED'),
        t.Literal('REJECTED'),
        t.Literal('CANCELLED'),
      ])),
      appliedBy: t.Optional(t.String()),
    })
  })

  // 7.4 Update Staff Leave Status
  .patch('/:id/staff-leaves/:leaveId', async ({ params, body, set }) => {
    try {
      const b = body as { status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' };
      const updated = await repository.updateStaffLeaveStatus(params.leaveId, b.status);
      if (!updated) {
        set.status = 404;
        return { success: false, message: 'Leave record not found' };
      }
      return { success: true, leave: updated };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal('PENDING'),
        t.Literal('APPROVED'),
        t.Literal('REJECTED'),
        t.Literal('CANCELLED'),
      ]),
    })
  })

  // 7.5 Inspect Stylist Stranded Queue Tickets
  .get('/:id/stylists/:stylistId/stranded-tickets', async ({ params }) => {
    const tickets = await repository.getStylistStrandedTickets(params.id, params.stylistId);
    return {
      success: true,
      count: tickets.length,
      tickets,
    };
  });
