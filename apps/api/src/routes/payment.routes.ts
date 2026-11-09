import { Elysia, t } from 'elysia';
import { paymentService } from '../payment/payment.service';
import { paymentRepo } from '../db/repositories/payment.repo';

export const paymentRoutes = new Elysia({ prefix: '/api/payments' })
  // 1. Create Payment Order
  .post(
    '/create-order',
    async ({ body, set }) => {
      try {
        const order = await paymentService.createPaymentOrder(body as any);
        set.status = 201;
        return {
          success: true,
          order,
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
        targetType: t.Union([
          t.Literal('SUBSCRIPTION'),
          t.Literal('QUEUE_TICKET'),
          t.Literal('WALLET_TOPUP'),
        ]),
        targetId: t.String(),
        amount: t.Number({ minimum: 0.01 }),
        provider: t.Union([
          t.Literal('UPI_QR'),
          t.Literal('CASH'),
          t.Literal('RAZORPAY'),
        ]),
        currency: t.Optional(t.String()),
        organizationId: t.Optional(t.Union([t.String(), t.Null()])),
        salonId: t.Optional(t.Union([t.String(), t.Null()])),
        customerId: t.Optional(t.Union([t.String(), t.Null()])),
        metadata: t.Optional(t.Any()),
      }),
    }
  )

  // 2. Verify Payment
  .post(
    '/verify',
    async ({ body, set }) => {
      try {
        const result = await paymentService.verifyPayment(body as any);
        if (!result.success) {
          set.status = 400;
        }
        return {
          success: result.success,
          ...result,
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
        orderId: t.String(),
        provider: t.Union([
          t.Literal('UPI_QR'),
          t.Literal('CASH'),
          t.Literal('RAZORPAY'),
        ]),
        transactionRef: t.Optional(t.Union([t.String(), t.Null()])),
        razorpayPaymentId: t.Optional(t.Union([t.String(), t.Null()])),
        razorpaySignature: t.Optional(t.Union([t.String(), t.Null()])),
        notes: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )

  // 3. Get Active Subscription for Organization
  .get(
    '/subscriptions/:orgId',
    async ({ params, set }) => {
      try {
        const subscription = await paymentRepo.getActiveSubscriptionByOrgId(params.orgId);
        return {
          success: true,
          subscription,
        };
      } catch (err: any) {
        set.status = 500;
        return {
          success: false,
          message: err.message,
        };
      }
    },
    {
      params: t.Object({
        orgId: t.String(),
      }),
    }
  )

  // 4. Get Payment Order by ID
  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        const order = await paymentRepo.getOrderById(params.id);
        if (!order) {
          set.status = 404;
          return {
            success: false,
            message: `Payment order not found: ${params.id}`,
          };
        }
        return {
          success: true,
          order,
        };
      } catch (err: any) {
        set.status = 500;
        return {
          success: false,
          message: err.message,
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
