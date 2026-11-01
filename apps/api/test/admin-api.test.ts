import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { adminRoutes } from '../src/routes/admin.routes';
import { repository, seedDemoData } from '../src/db/repository';
import { authService } from '../src/auth/auth-service';

describe('Admin Telemetry, Configuration, and Onboarding API', () => {
  const app = new Elysia().use(adminRoutes);

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
});
