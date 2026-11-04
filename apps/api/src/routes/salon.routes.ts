import { Elysia, t } from 'elysia';
import { repository } from '../db/repository';

export const salonRoutes = new Elysia({ prefix: '/api/salons' })
  .get('/', async () => {
    return await repository.getAllSalons();
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

  // 1.1 List All Organizations
  .get('/organizations', async () => {
    const orgs = await repository.getAllOrganizations();
    const result = [];
    for (const org of orgs) {
      const branches = await repository.getSalonsByOrganizationId(org.id);
      result.push({
        ...org,
        branchCount: branches.length,
        branches: branches.map(b => ({ id: b.id, name: b.name, slug: b.slug, stylistsCount: b.stylists.length })),
      });
    }
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
      operatingMode: t.Optional(t.String()),
      status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('SUSPENDED'), t.Literal('MAINTENANCE')])),
      currency: t.Optional(t.String()),
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

  // 6. Salon Performance Metrics
  .get('/:id/metrics', async ({ params }) => {
    return await repository.getSalonMetrics(params.id);
  });
