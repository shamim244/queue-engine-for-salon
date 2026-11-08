import { Elysia, t } from 'elysia';
import { repository } from '../db/repository';
import { notificationService } from '../notifications/whatsapp';
import { authService } from '../auth/auth-service';
import { jobQueue } from '../worker/job-queue';
import { executeMidnightQueueReset } from '../worker/handlers/reset.handler';
import { compressionManager } from '../engine/compression-manager';

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

  // 5.1 Adaptive Compression Capabilities & Live Diagnostics
  .get('/compression', () => {
    return {
      success: true,
      capabilities: compressionManager.getCapabilities(),
      settings: compressionManager.getSettings(),
      benchmark: compressionManager.runBenchmark(),
    };
  })
  .post('/compression', ({ body }) => {
    const updated = compressionManager.updateSettings(body as any);
    return {
      success: true,
      settings: updated,
    };
  })
  .post('/compression/benchmark', ({ body }) => {
    const payload = (body as any)?.payload;
    const benchmark = compressionManager.runBenchmark(payload);
    return {
      success: true,
      benchmark,
    };
  })

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
        operatingMode: t.Optional(t.String()),
        phone: t.String(),
        address: t.Optional(t.String()),
        currency: t.Optional(t.String()),
        countryCode: t.Optional(t.String()),
        upiPaymentId: t.Optional(t.String()),
        organizationName: t.Optional(t.String()),
        organizationSlug: t.Optional(t.String()),
        tier: t.Optional(
          t.Union([
            t.Literal('STARTER'),
            t.Literal('PRO'),
            t.Literal('ENTERPRISE'),
            t.Literal('SOLO'),
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
              pin: t.Optional(t.String()),
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
  )

  // 8. Super Admin User Directory Management (GET /api/admin/users)
  .get('/users', async ({ query }) => {
    const q = query as { role?: string; salonId?: string; search?: string };
    const users = await authService.listAllUsers(q);
    return { success: true, users };
  })

  // 9. Super Admin Create User (POST /api/admin/users)
  .post(
    '/users',
    async ({ body, set }) => {
      try {
        const { username, password, role, fullName, email, phone, salonId, organizationId } = body as {
          username: string;
          password: string;
          role: 'SUPER_ADMIN' | 'SALON_OWNER' | 'STAFF';
          fullName?: string;
          email?: string;
          phone?: string;
          salonId?: string;
          organizationId?: string;
        };

        const user = await authService.createUser({
          username,
          password,
          role,
          fullName,
          email,
          phone,
          salonId: salonId || null,
          organizationId: organizationId || null,
        });

        repository.addAuditLog(
          'USER_CREATED',
          'superadmin',
          `Created user '${user.username}' with role '${user.role}'`,
          'SECURITY'
        );

        return { success: true, user };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
        role: t.Union([t.Literal('SUPER_ADMIN'), t.Literal('SALON_OWNER'), t.Literal('STAFF')]),
        fullName: t.Optional(t.String()),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        salonId: t.Optional(t.String()),
        organizationId: t.Optional(t.String()),
      }),
    }
  )

  // 10. Super Admin Update User (PATCH /api/admin/users/:id)
  .patch(
    '/users/:id',
    async ({ params, body, set }) => {
      try {
        const updated = await authService.updateUser(params.id, body as any);
        if (!updated) {
          set.status = 404;
          return { success: false, message: 'User not found' };
        }
        repository.addAuditLog(
          'USER_UPDATED',
          'superadmin',
          `Updated profile/status for user ID '${params.id}'`,
          'SECURITY'
        );
        return { success: true, user: updated };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        fullName: t.Optional(t.String()),
        email: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        role: t.Optional(t.Union([t.Literal('SUPER_ADMIN'), t.Literal('SALON_OWNER'), t.Literal('STAFF')])),
        status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('SUSPENDED'), t.Literal('INACTIVE')])),
        salonId: t.Optional(t.String()),
      }),
    }
  )

  // 11. Super Admin Password Reset (POST /api/admin/users/:id/reset-password)
  .post(
    '/users/:id/reset-password',
    async ({ params, body, set }) => {
      try {
        const { newPassword } = body as { newPassword: string };
        if (!newPassword || newPassword.length < 6) {
          set.status = 400;
          return { success: false, message: 'Password must be at least 6 characters long' };
        }
        await authService.updatePassword(params.id, newPassword);
        // Revoke existing sessions for security
        await authService.revokeAllUserSessions(params.id);

        repository.addAuditLog(
          'PASSWORD_RESET',
          'superadmin',
          `Administrative password reset performed for user ID '${params.id}'`,
          'SECURITY'
        );
        return { success: true, message: 'Password reset successfully' };
      } catch (err: any) {
        set.status = 400;
        return { success: false, message: err.message };
      }
    },
    {
      body: t.Object({
        newPassword: t.String(),
      }),
    }
  )

  // 12. Super Admin Delete User (DELETE /api/admin/users/:id)
  .delete('/users/:id', async ({ params, set }) => {
    try {
      const deleted = await authService.deleteUser(params.id);
      if (!deleted) {
        set.status = 404;
        return { success: false, message: 'User not found' };
      }
      repository.addAuditLog(
        'USER_DELETED',
        'superadmin',
        `Deleted user ID '${params.id}'`,
        'SECURITY'
      );
      return { success: true, message: 'User deleted successfully' };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  })

  // 13. Background Worker Telemetry Stats (GET /api/admin/workers/stats)
  .get('/workers/stats', async () => {
    const stats = await jobQueue.getStats();
    return {
      success: true,
      stats,
    };
  })

  // 14. Retry Failed Background Jobs (POST /api/admin/workers/retry-failed)
  .post('/workers/retry-failed', async () => {
    const retriedCount = await jobQueue.retryFailedJobs();
    repository.addAuditLog(
      'WORKER_RETRY',
      'superadmin',
      `Manual retry triggered for ${retriedCount} failed background jobs`,
      'SYSTEM'
    );
    return {
      success: true,
      retriedCount,
      message: `Re-enqueued ${retriedCount} failed jobs for processing`,
    };
  })

  // 15. Manual Nightly Queue Reset Trigger (POST /api/admin/workers/reset-nightly)
  .post(
    '/workers/reset-nightly',
    async ({ body }) => {
      const payload = (body as any) || {};
      const result = await executeMidnightQueueReset(payload);
      repository.addAuditLog(
        'MIDNIGHT_RESET',
        'superadmin',
        `Midnight queue reset executed. Expired ${result.expiredCount} stale tickets.`,
        'OPERATIONS'
      );
      return {
        ...result,
      };
    },
    {
      body: t.Optional(
        t.Object({
          cutoffHours: t.Optional(t.Number()),
          salonId: t.Optional(t.String()),
        })
      ),
    }
  );
