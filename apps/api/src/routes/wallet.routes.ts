import { Elysia, t } from 'elysia';
import { walletService } from '../wallet/wallet.service';

export const walletRoutes = new Elysia({ prefix: '/api/wallets' })
  // 1. Get Wallet Balance
  .get(
    '/balance',
    async ({ query, set }) => {
      try {
        const result = await walletService.getBalance(
          query.walletType as any,
          query.identifier,
          query.salonId
        );
        return {
          success: true,
          ...result,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message || 'Failed to retrieve wallet balance.',
        };
      }
    },
    {
      query: t.Object({
        walletType: t.Union([t.Literal('OWNER'), t.Literal('CONSUMER')]),
        identifier: t.String({ minLength: 1 }),
        salonId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )

  // 2. Get Passbook Transactions
  .get(
    '/passbook',
    async ({ query, set }) => {
      try {
        const limit = query.limit ? Number(query.limit) : 50;
        const transactions = await walletService.getPassbook(
          query.walletType as any,
          query.identifier,
          query.salonId,
          limit
        );
        return {
          success: true,
          transactions,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message || 'Failed to retrieve passbook history.',
          transactions: [],
        };
      }
    },
    {
      query: t.Object({
        walletType: t.Union([t.Literal('OWNER'), t.Literal('CONSUMER')]),
        identifier: t.String({ minLength: 1 }),
        salonId: t.Optional(t.Union([t.String(), t.Null()])),
        limit: t.Optional(t.String()),
      }),
    }
  )

  // 3. Admin Top-up / Promotional Credit
  .post(
    '/credit',
    async ({ body, set }) => {
      try {
        const result = await walletService.creditBonus({
          walletType: body.walletType as any,
          identifier: body.identifier,
          salonId: body.salonId,
          amount: Number(body.amount),
          reason: body.reason,
          referenceId: body.referenceId,
        });
        return {
          success: true,
          ...result,
        };
      } catch (err: any) {
        set.status = 400;
        return {
          success: false,
          message: err.message || 'Failed to credit wallet.',
        };
      }
    },
    {
      body: t.Object({
        walletType: t.Union([t.Literal('OWNER'), t.Literal('CONSUMER')]),
        identifier: t.String({ minLength: 1 }),
        salonId: t.Optional(t.Union([t.String(), t.Null()])),
        amount: t.Number({ minimum: 1 }),
        reason: t.String({ minLength: 1 }),
        referenceId: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  );
