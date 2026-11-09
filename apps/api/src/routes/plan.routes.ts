import { Elysia, t } from 'elysia';
import { repository } from '../db/repository';

export const planRoutes = new Elysia({ prefix: '/api/plans' })
  // 1. Get All Plans
  .get(
    '/',
    async ({ query }) => {
      const status = query.status || 'ACTIVE';
      const plans = await repository.getAllPlans({ status });
      return {
        success: true,
        plans,
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
      }),
    }
  )

  // 2. Create Plan
  .post(
    '/',
    async ({ body, set }) => {
      try {
        const plan = await repository.createPlan(body as any);
        set.status = 201;
        return {
          success: true,
          plan,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message,
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 100 }),
        slug: t.Optional(t.String({ maxLength: 100 })),
        badge: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        price1m: t.Number({ minimum: 0 }),
        price3m: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        price6m: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        price1y: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        discountPct3m: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 100 }), t.Null()])),
        discountPct6m: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 100 }), t.Null()])),
        discountPct1y: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 100 }), t.Null()])),
        cycle1mEnabled: t.Optional(t.Boolean()),
        cycle3mEnabled: t.Optional(t.Boolean()),
        cycle6mEnabled: t.Optional(t.Boolean()),
        cycle1yEnabled: t.Optional(t.Boolean()),
        maxBranches: t.Number({ minimum: 1 }),
        maxStylistsPerBranch: t.Number({ minimum: 1 }),
        features: t.Array(t.String()),
        status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('DRAFT'), t.Literal('ARCHIVED')])),
        isFeatured: t.Optional(t.Boolean()),
        sortOrder: t.Optional(t.Number()),
      }),
    }
  )

  // 3. Get Single Plan by ID or Slug
  .get('/:id', async ({ params, set }) => {
    let plan = await repository.getPlanById(params.id);
    if (!plan) {
      plan = await repository.getPlanBySlug(params.id);
    }
    if (!plan) {
      set.status = 404;
      return {
        success: false,
        message: 'Plan not found',
      };
    }
    return {
      success: true,
      plan,
    };
  })

  // 4. Update Plan
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      try {
        const plan = await repository.updatePlan(params.id, body as any);
        if (!plan) {
          set.status = 404;
          return {
            success: false,
            message: 'Plan not found',
          };
        }
        return {
          success: true,
          plan,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message,
        };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        slug: t.Optional(t.String({ maxLength: 100 })),
        badge: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
        description: t.Optional(t.Union([t.String(), t.Null()])),
        price1m: t.Optional(t.Number({ minimum: 0 })),
        price3m: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        price6m: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        price1y: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
        discountPct3m: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 100 }), t.Null()])),
        discountPct6m: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 100 }), t.Null()])),
        discountPct1y: t.Optional(t.Union([t.Number({ minimum: 0, maximum: 100 }), t.Null()])),
        cycle1mEnabled: t.Optional(t.Boolean()),
        cycle3mEnabled: t.Optional(t.Boolean()),
        cycle6mEnabled: t.Optional(t.Boolean()),
        cycle1yEnabled: t.Optional(t.Boolean()),
        maxBranches: t.Optional(t.Number({ minimum: 1 })),
        maxStylistsPerBranch: t.Optional(t.Number({ minimum: 1 })),
        features: t.Optional(t.Array(t.String())),
        status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('DRAFT'), t.Literal('ARCHIVED')])),
        isFeatured: t.Optional(t.Boolean()),
        sortOrder: t.Optional(t.Number()),
      }),
    }
  )

  // 5. Archive Plan
  .delete('/:id', async ({ params, set }) => {
    const success = await repository.archivePlan(params.id);
    if (!success) {
      set.status = 404;
      return {
        success: false,
        message: 'Plan not found',
      };
    }
    return {
      success: true,
      message: 'Plan archived successfully',
    };
  });
