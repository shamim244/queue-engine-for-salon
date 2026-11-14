import { describe, it, expect, beforeEach } from 'bun:test';
import { securityRepo } from '../src/db/repositories/security.repo';
import { app } from '../index';

describe('Task 1: Dynamic Security Settings & Admin Control API', () => {
  beforeEach(async () => {
    // Reset to defaults before test
    await securityRepo.updateSettings({
      pinMaxAttempts: 5,
      pinWindowSeconds: 900,
      loginMaxAttempts: 10,
      loginWindowSeconds: 900,
      checkinMaxAttempts: 10,
      checkinWindowSeconds: 300,
      allowedCustomOrigins: [],
      defaultCountryCode: '+91',
      allowedCountryCodes: ['+91', '+1', '+44', '+971', '+65'],
    });
  });

  it('1.1 should retrieve default security settings', async () => {
    const settings = await securityRepo.getSettings();
    expect(settings).toBeDefined();
    expect(settings.pinMaxAttempts).toBe(5);
    expect(settings.pinWindowSeconds).toBe(900);
    expect(settings.loginMaxAttempts).toBe(10);
    expect(settings.defaultCountryCode).toBe('+91');
    expect(settings.allowedCountryCodes).toContain('+91');
    expect(settings.allowedCountryCodes).toContain('+1');
  });

  it('1.2 should allow admin to dynamically update security limits without hardcoding', async () => {
    const updated = await securityRepo.updateSettings({
      pinMaxAttempts: 3,
      pinWindowSeconds: 600,
      defaultCountryCode: '+91',
      allowedCustomOrigins: ['https://portal.nexgentech.site'],
    });

    expect(updated.pinMaxAttempts).toBe(3);
    expect(updated.pinWindowSeconds).toBe(600);
    expect(updated.allowedCustomOrigins).toContain('https://portal.nexgentech.site');

    const retrieved = await securityRepo.getSettings();
    expect(retrieved.pinMaxAttempts).toBe(3);
    expect(retrieved.allowedCustomOrigins).toContain('https://portal.nexgentech.site');
  });

  it('1.3 should expose GET /api/admin/security/settings endpoint', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/admin/security/settings', {
        method: 'GET',
      })
    );

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.settings.pinMaxAttempts).toBeDefined();
    expect(body.settings.defaultCountryCode).toBe('+91');
  });

  it('1.4 should expose PUT /api/admin/security/settings to update settings on the fly', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/api/admin/security/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pinMaxAttempts: 2,
          loginMaxAttempts: 5,
          defaultCountryCode: '+91',
          allowedCustomOrigins: ['https://admin.nexgentech.site'],
        }),
      })
    );

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.settings.pinMaxAttempts).toBe(2);
    expect(body.settings.loginMaxAttempts).toBe(5);

    const check = await securityRepo.getSettings();
    expect(check.pinMaxAttempts).toBe(2);
    expect(check.loginMaxAttempts).toBe(5);
  });
});
