import { Elysia, t } from 'elysia';
import { paymentService } from '../payment/payment.service';
import { paymentRepo } from '../db/repositories/payment.repo';
import { organizationRepo } from '../db/repositories/organization.repo';

export const paymentRoutes = new Elysia({ prefix: '/api/payments' })
  // 1. Get Public Gateway Config
  .get('/config', async () => {
    const settings = await paymentRepo.getGatewaySettings();
    return {
      success: true,
      config: {
        upiManualEnabled: settings.upiManualEnabled,
        upiVpa: settings.upiVpa,
        upiMerchantName: settings.upiMerchantName,
        cashEnabled: settings.cashEnabled,
        cashInstructions: settings.cashInstructions,
        razorpayEnabled: settings.razorpayEnabled,
        razorpayKeyId: settings.razorpayKeyId || '',
      },
    };
  })

  // 2. Create Payment Order
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
        amount: t.Number({ minimum: 0 }),
        provider: t.Union([
          t.Literal('UPI_QR'),
          t.Literal('CASH'),
          t.Literal('RAZORPAY'),
          t.Literal('WALLET'),
        ]),
        currency: t.Optional(t.String()),
        organizationId: t.Optional(t.Union([t.String(), t.Null()])),
        salonId: t.Optional(t.Union([t.String(), t.Null()])),
        customerId: t.Optional(t.Union([t.String(), t.Null()])),
        metadata: t.Optional(t.Any()),
      }),
    }
  )

  // 3. Submit Manual Payment (UTR / Cash Request)
  .post(
    '/submit-manual',
    async ({ body, set }) => {
      try {
        const result = await paymentService.submitManualPayment(body as any);
        return {
          success: true,
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
        provider: t.Union([t.Literal('UPI_QR'), t.Literal('CASH')]),
        utrNumber: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )

  // 4. Verify Payment (Automated / Sandbox)
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
          t.Literal('WALLET'),
        ]),
        transactionRef: t.Optional(t.Union([t.String(), t.Null()])),
        razorpayPaymentId: t.Optional(t.Union([t.String(), t.Null()])),
        razorpaySignature: t.Optional(t.Union([t.String(), t.Null()])),
        notes: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )

  // 5. Admin: Get Gateway Settings
  .get('/admin/config', async () => {
    const config = await paymentRepo.getGatewaySettings();
    return {
      success: true,
      config,
    };
  })

  // 6. Admin: Update Gateway Settings
  .put(
    '/admin/config',
    async ({ body, set }) => {
      try {
        const updated = await paymentRepo.updateGatewaySettings(body as any);
        return {
          success: true,
          config: updated,
          message: 'Payment gateway configuration updated successfully.',
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
      body: t.Object({
        upiManualEnabled: t.Optional(t.Boolean()),
        upiVpa: t.Optional(t.String()),
        upiMerchantName: t.Optional(t.String()),
        cashEnabled: t.Optional(t.Boolean()),
        cashInstructions: t.Optional(t.String()),
        razorpayEnabled: t.Optional(t.Boolean()),
        razorpayKeyId: t.Optional(t.Union([t.String(), t.Null()])),
        razorpayKeySecret: t.Optional(t.Union([t.String(), t.Null()])),
      }),
    }
  )

  // 7. Admin: Get Pending Approval Orders
  .get('/admin/pending', async () => {
    const orders = await paymentRepo.getPendingApprovalOrders();
    const enriched = await Promise.all(
      orders.map(async (o) => {
        let orgName = 'Unknown Salon';
        if (o.organizationId) {
          const org = await organizationRepo.getOrganizationById(o.organizationId);
          if (org) orgName = org.name;
        }
        return {
          ...o,
          organizationName: orgName,
        };
      })
    );
    return {
      success: true,
      orders: enriched,
    };
  })

  // 8. Admin: Approve Pending Order
  .post(
    '/admin/approve',
    async ({ body, set }) => {
      try {
        const result = await paymentService.approvePaymentOrder(body as any);
        return {
          success: true,
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
        adminId: t.Optional(t.String()),
      }),
    }
  )

  // 9. Admin: Reject Pending Order
  .post(
    '/admin/reject',
    async ({ body, set }) => {
      try {
        const result = await paymentService.rejectPaymentOrder(body as any);
        return {
          success: true,
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
        reason: t.String({ minLength: 1 }),
        adminId: t.Optional(t.String()),
      }),
    }
  )

  // 10. Get Active Subscription for Organization
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

  // 11. Get Payment Order by ID
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
