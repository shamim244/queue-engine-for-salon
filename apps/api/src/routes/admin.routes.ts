import { Elysia, t } from 'elysia';
import { repository } from '../db/repository';
import { notificationService } from '../notifications/whatsapp';

export const adminRoutes = new Elysia({ prefix: '/api/admin' })
  // 1. System Telemetry & Health Statistics
  .get('/stats', async () => {
    return await repository.getAdminStats();
  })

  // 2. Platform Configuration Settings (GET)
  .get('/settings', () => {
    const settings = repository.getPlatformSettings();
    return {
      ...settings,
      settings,
      success: true,
    };
  })

  // 3. Platform Configuration Settings (POST)
  .post(
    '/settings',
    ({ body, set }) => {
      try {
        const payload = (body as any).settings
          ? { ...(body as any).settings, ...body }
          : body;
        const updated = repository.updatePlatformSettings(payload);
        return {
          success: true,
          settings: updated,
          ...updated,
        };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        general: t.Optional(
          t.Object({
            platformName: t.Optional(t.String()),
            supportEmail: t.Optional(t.String()),
            supportPhone: t.Optional(t.String()),
            defaultCurrency: t.Optional(t.String()),
            defaultTimezone: t.Optional(t.String()),
            defaultGracePeriodMinutes: t.Optional(t.Number()),
            defaultBufferMinutes: t.Optional(t.Number()),
          })
        ),
        appearance: t.Optional(
          t.Object({
            themeAccent: t.Optional(t.String()),
            whiteLabelEnabled: t.Optional(t.Boolean()),
            customCssEnabled: t.Optional(t.Boolean()),
            tvDisplayMode: t.Optional(t.String()),
          })
        ),
        engine: t.Optional(
          t.Object({
            heartbeatIntervalSeconds: t.Optional(t.Number()),
            watchdogTimeoutSeconds: t.Optional(t.Number()),
            autoSummonThresholdSeconds: t.Optional(t.Number()),
            ticketRetentionHours: t.Optional(t.Number()),
          })
        ),
        gateway: t.Optional(
          t.Object({
            provider: t.Optional(t.String()),
            senderPhone: t.Optional(t.String()),
          })
        ),
        settings: t.Optional(t.Any()),
      }),
    }
  )

  // 4. Audit Trail Logs
  .get('/audit-logs', () => {
    return repository.getAuditLogs();
  })

  // 5. Emergency Maintenance Kill Switch
  .post(
    '/kill-switch',
    ({ body }) => {
      const mode = repository.toggleMaintenanceMode(body.active, body.message);
      return {
        success: true,
        active: mode.active,
        message: mode.message,
        activatedAt: mode.activatedAt,
      };
    },
    {
      body: t.Object({
        active: t.Boolean(),
        message: t.Optional(t.String()),
      }),
    }
  )

  // 6. Tenant Onboarding (Atomic salon, organization, stylists, services & owner account)
  .post(
    '/onboard',
    async ({ body, set }) => {
      try {
        const result = await repository.onboardSalon(body as any);
        return result;
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        salonName: t.Optional(t.String()),
        name: t.Optional(t.String()),
        slug: t.Optional(t.String()),
        operatingMode: t.Optional(
          t.Union([t.Literal('RURAL_SOLO'), t.Literal('MODERN_MULTI')])
        ),
        phone: t.String(),
        address: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        countryCode: t.Optional(t.String()),
        upiPaymentId: t.Optional(t.String()),
        organizationName: t.Optional(t.String()),
        organizationSlug: t.Optional(t.String()),
        tier: t.Optional(
          t.Union([
            t.Literal('SOLO'),
            t.Literal('PRO'),
            t.Literal('ENTERPRISE'),
          ])
        ),
        ownerUser: t.Optional(
          t.Object({
            username: t.String(),
            password: t.String(),
            phone: t.Optional(t.String()),
            email: t.Optional(t.String()),
          })
        ),
        stylists: t.Optional(
          t.Array(
            t.Object({
              name: t.String(),
              phone: t.Optional(t.String()),
              avgDurationMinutes: t.Optional(t.Number()),
            })
          )
        ),
        services: t.Optional(
          t.Array(
            t.Object({
              name: t.String(),
              basePrice: t.Number(),
              estimatedDurationMinutes: t.Number(),
              isAddOn: t.Optional(t.Boolean()),
              icon: t.Optional(t.String()),
            })
          )
        ),
      }),
    }
  )

  // 7. Test Notification Dispatch Pipeline
  .post(
    '/test-notification',
    async ({ body, set }) => {
      try {
        const settings = repository.getPlatformSettings();
        const provider = settings.gateway?.provider || 'SIMULATOR';
        const recipientPhone =
          body?.phone || settings.gateway?.senderPhone || '+91 98765 00000';
        const notificationMessage =
          body?.message || 'Engine Que Admin Test Notification';

        const notif = await notificationService.sendWhatsApp({
          salonId: 'admin-telemetry',
          salonName: settings.general?.platformName || 'Engine Que Enterprise',
          ticketId: 'test-diagnostic',
          recipientPhone,
          recipientName: 'Platform Administrator',
          type: 'TICKET_CONFIRMATION',
          ticketNumber: 999,
          estimatedWaitMinutes: 5,
        });

        repository.addAuditLog(
          'TEST_NOTIFICATION_DISPATCHED',
          'superadmin',
          `Dispatched test notification via ${provider} to ${recipientPhone}`,
          'CONFIG'
        );

        return {
          success: true,
          provider,
          notificationId: notif.id,
          recipientPhone,
          timestamp: notif.sentAt,
          message: notificationMessage,
        };
      } catch (err: any) {
        set.status = 500;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Optional(
        t.Object({
          phone: t.Optional(t.String()),
          message: t.Optional(t.String()),
        })
      ),
    }
  );
