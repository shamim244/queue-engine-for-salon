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
  });
