import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { adminRoutes } from '../src/routes/admin.routes';
import { salonRoutes } from '../src/routes/salon.routes';
import { repository, seedDemoData } from '../src/db/repository';
import { authService } from '../src/auth/auth-service';

describe('Admin Telemetry, Configuration, and Onboarding API', () => {
  const app = new Elysia().use(adminRoutes).use(salonRoutes);

  beforeEach(async () => {
    seedDemoData();
    await authService.seedDefaultUsers();
  });

  it('GET /api/admin/stats should return system telemetry and health status', async () => {
    const res = await app.handle(new Request('http://localhost/api/admin/stats'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalSalons).toBeGreaterThanOrEqual(2);
    expect(data.totalStylists).toBeGreaterThanOrEqual(5);
    expect(typeof data.totalTicketsToday).toBe('number');
    expect(typeof data.socketClientsCount).toBe('number');
    expect(typeof data.uptimeSeconds).toBe('number');
    expect(data.systemHealth).toBe('HEALTHY');
  });

  it('GET /api/admin/settings should return platform configuration defaults', async () => {
    const res = await app.handle(new Request('http://localhost/api/admin/settings'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.general).toBeDefined();
    expect(data.general.platformName).toBe('Engine Que Enterprise');
    expect(data.general.supportEmail).toBe('support@engineque.com');
    expect(data.appearance.themeAccent).toBe('blue');
    expect(data.appearance.tvDisplayMode).toBe('AIRPORT_DEPARTURE');
    expect(data.engine.heartbeatIntervalSeconds).toBe(10);
    expect(data.engine.watchdogTimeoutSeconds).toBe(3);
    expect(data.gateway.provider).toBe('SIMULATOR');
  });

  it('POST /api/admin/settings should update and persist configuration', async () => {
    const updatePayload = {
      general: {
        platformName: 'Engine Que Pro Edition',
        supportEmail: 'admin@engineque.pro',
      },
      appearance: {
        themeAccent: 'violet',
      },
    };

    const postRes = await app.handle(
      new Request('http://localhost/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
    );
    expect(postRes.status).toBe(200);
    const postData = await postRes.json();
    expect(postData.success).toBe(true);
    expect(postData.general?.platformName || postData.settings?.general?.platformName).toBe('Engine Que Pro Edition');

    // Verify GET retrieves updated settings
    const getRes = await app.handle(new Request('http://localhost/api/admin/settings'));
    const getData = await getRes.json();
    expect(getData.general.platformName).toBe('Engine Que Pro Edition');
    expect(getData.appearance.themeAccent).toBe('violet');
  });

  it('GET /api/admin/audit-logs should return audit trail entries', async () => {
    const res = await app.handle(new Request('http://localhost/api/admin/audit-logs'));
    expect(res.status).toBe(200);
    const logs = await res.json();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    const first = logs[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('timestamp');
    expect(first).toHaveProperty('action');
    expect(first).toHaveProperty('actor');
    expect(first).toHaveProperty('details');
    expect(first).toHaveProperty('category');
  });

  it('POST /api/admin/kill-switch should toggle maintenance lockdown state', async () => {
    // 1. Activate kill switch
    const activateRes = await app.handle(
      new Request('http://localhost/api/admin/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: true,
          message: 'Emergency maintenance lockdown',
        }),
      })
    );
    expect(activateRes.status).toBe(200);
    const activateData = await activateRes.json();
    expect(activateData.active).toBe(true);
    expect(activateData.message).toBe('Emergency maintenance lockdown');

    // 2. Deactivate kill switch
    const deactivateRes = await app.handle(
      new Request('http://localhost/api/admin/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: false,
          message: 'All systems normal',
        }),
      })
    );
    expect(deactivateRes.status).toBe(200);
    const deactivateData = await deactivateRes.json();
    expect(deactivateData.active).toBe(false);
  });

  it('POST /api/admin/onboard should atomically onboard salon with owner account, stylists, and services', async () => {
    const onboardPayload = {
      salonName: 'Royal Crown Barber & Spa',
      slug: 'royal-crown-barber',
      phone: '+91 91234 56789',
      operatingMode: 'MODERN_MULTI' as const,
      organizationName: 'Royal Group of Salons',
      tier: 'PRO' as const,
      ownerUser: {
        username: 'royal_owner',
        password: 'Password123!',
        email: 'owner@royalcrown.com',
      },
      stylists: [
        { name: 'Vikram Stylist', phone: '+91 91234 56780', avgDurationMinutes: 25 },
        { name: 'Pooja Stylist', phone: '+91 91234 56781', avgDurationMinutes: 30 },
      ],
      services: [
        { name: 'Signature Haircut', basePrice: 250, estimatedDurationMinutes: 30, isAddOn: false },
        { name: 'Beard Trim & Spa', basePrice: 150, estimatedDurationMinutes: 20, isAddOn: true },
      ],
    };

    const res = await app.handle(
      new Request('http://localhost/api/admin/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardPayload),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.salon).toBeDefined();
    expect(data.salon.name).toBe('Royal Crown Barber & Spa');
    expect(data.salon.slug).toBe('royal-crown-barber');
    expect(data.salon.stylists.length).toBe(2);
    expect(data.salon.services.length).toBe(2);

    // Verify owner user was created and can be authenticated
    const authContext = await authService.authenticateUser('royal_owner', 'Password123!');
    expect(authContext).not.toBeNull();
    expect(authContext?.user.role).toBe('SALON_OWNER');
    expect(authContext?.user.salonId).toBe(data.salon.id);

    // Verify audit log recorded onboarding
    const auditRes = await app.handle(new Request('http://localhost/api/admin/audit-logs'));
    const logs = await auditRes.json();
    const onboardLog = logs.find((l: any) => l.action === 'TENANT_ONBOARDED');
    expect(onboardLog).toBeDefined();
  });

  it('POST /api/admin/test-notification should dispatch test notification via configured gateway', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/admin/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+91 98765 43210',
          message: 'Diagnostic test message',
        }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.provider).toBe('SIMULATOR');
  });

  it('PATCH /api/salons/:id should update salon details and toggle status', async () => {
    // 1. Update Ramesh Barber details
    const patchRes = await app.handle(
      new Request('http://localhost/api/salons/ramesh-barber', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ramesh Elite Traditional Barber',
          phone: '+91 98765 99999',
          upiPaymentId: 'ramesh@upi',
          status: 'SUSPENDED',
        }),
      })
    );
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.success).toBe(true);
    expect(patchData.salon.name).toBe('Ramesh Elite Traditional Barber');
    expect(patchData.salon.phone).toBe('+91 98765 99999');
    expect(patchData.salon.upiPaymentId).toBe('ramesh@upi');
    expect(patchData.salon.status).toBe('SUSPENDED');

    // Verify GET retrieves the updated salon
    const getRes = await app.handle(new Request('http://localhost/api/salons/ramesh-barber'));
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.salon.name).toBe('Ramesh Elite Traditional Barber');
  });

  it('DELETE /api/salons/:id should delete salon branch', async () => {
    // 1. Create a temporary salon to delete
    const tempSalon = await repository.createSalon({
      name: 'Temp Deletable Salon',
      slug: 'temp-deletable-salon',
      phone: '+91 00000 11111',
      operatingMode: 'RURAL_SOLO',
    });
    expect(await repository.getSalonBySlug('temp-deletable-salon')).not.toBeNull();

    // 2. Delete it via API
    const delRes = await app.handle(
      new Request(`http://localhost/api/salons/${tempSalon.id}`, {
        method: 'DELETE',
      })
    );
    expect(delRes.status).toBe(200);
    const delData = await delRes.json();
    expect(delData.success).toBe(true);

    // 3. Verify it is no longer found
    const getDeleted = await app.handle(new Request(`http://localhost/api/salons/${tempSalon.id}`));
    expect(getDeleted.status).toBe(404);
  });

  it('GET /api/admin/workers/stats should return background worker telemetry', async () => {
    const res = await app.handle(new Request('http://localhost/api/admin/workers/stats'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.totalJobs).toBe('number');
    expect(typeof data.stats.pendingCount).toBe('number');
  });

  it('POST /api/admin/workers/retry-failed should trigger retry and audit log', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/admin/workers/retry-failed', {
        method: 'POST',
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.retriedCount).toBe('number');
  });

  it('POST /api/admin/workers/reset-nightly should trigger midnight queue reset', async () => {
    const res = await app.handle(
      new Request('http://localhost/api/admin/workers/reset-nightly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cutoffHours: 12 }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.expiredCount).toBe('number');
  });
});
