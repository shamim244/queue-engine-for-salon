import { Elysia, t } from 'elysia';
import { repository } from '../db/repository';

export const salonRoutes = new Elysia({ prefix: '/api/salons' })
  .get('/', async () => {
    return await repository.getAllSalons();
  })
  .get('/:slug', async ({ params, error }) => {
    const salon = await repository.getSalonBySlug(params.slug);
    if (!salon) return error(404, { message: 'Salon not found' });
    const activeTickets = await repository.getActiveTickets(salon.id);
    return {
      salon,
      activeQueueCount: activeTickets.length,
    };
  })
  .post('/:id/mode', async ({ params, body, error }) => {
    const { mode } = body as { mode: 'RURAL_SOLO' | 'MODERN_MULTI' };
    if (!['RURAL_SOLO', 'MODERN_MULTI'].includes(mode)) {
      return error(400, { message: 'Invalid mode' });
    }
    await repository.updateSalonOperatingMode(params.id, mode);
    return { success: true, mode };
  }, {
    body: t.Object({
      mode: t.Union([t.Literal('RURAL_SOLO'), t.Literal('MODERN_MULTI')]),
    })
  })
  .post('/register', async ({ body, error }) => {
    try {
      const salon = await repository.createSalon(body as any);
      return {
        success: true,
        salon,
        links: {
          poster: `/poster.html?salon=${salon.slug}`,
          customer: `/customer.html?salon=${salon.slug}`,
          barber: salon.operatingMode === 'RURAL_SOLO' ? `/barber.html?salon=${salon.slug}` : `/desk.html?salon=${salon.slug}`,
        }
      };
    } catch (err: any) {
      return error(400, { message: err.message });
    }
  }, {
    body: t.Object({
      name: t.String(),
      slug: t.Optional(t.String()),
      phone: t.String(),
      operatingMode: t.Union([t.Literal('RURAL_SOLO'), t.Literal('MODERN_MULTI')]),
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

  // 4. Add Service (Salon Owner)
  .post('/:id/services', async ({ params, body, error }) => {
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
      return error(400, { message: err.message });
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
