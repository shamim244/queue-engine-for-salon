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
  });
