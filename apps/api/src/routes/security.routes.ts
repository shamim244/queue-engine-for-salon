import { Elysia, t } from 'elysia';
import { securityRepo } from '../db/repositories/security.repo';

export const securityRoutes = new Elysia({ prefix: '/api/admin/security' })
  .get('/settings', async () => {
    const settings = await securityRepo.getSettings();
    return {
      success: true,
      settings,
    };
  })
  .put('/settings', async ({ body }) => {
    const updated = await securityRepo.updateSettings(body as any);
    return {
      success: true,
      settings: updated,
    };
  }, {
    body: t.Object({
      pinMaxAttempts: t.Optional(t.Number({ minimum: 1, maximum: 50 })),
      pinWindowSeconds: t.Optional(t.Number({ minimum: 10, maximum: 86400 })),
      loginMaxAttempts: t.Optional(t.Number({ minimum: 1, maximum: 50 })),
      loginWindowSeconds: t.Optional(t.Number({ minimum: 10, maximum: 86400 })),
      checkinMaxAttempts: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      checkinWindowSeconds: t.Optional(t.Number({ minimum: 10, maximum: 86400 })),
      allowedCustomOrigins: t.Optional(t.Array(t.String({ maxLength: 255 }))),
      defaultCountryCode: t.Optional(t.String({ maxLength: 10 })),
      allowedCountryCodes: t.Optional(t.Array(t.String({ maxLength: 10 }))),
    })
  });
