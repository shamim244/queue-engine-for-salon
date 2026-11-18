import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';
import { adminPartnerRoutes, partnerRoutes } from '../../src/routes/partner.routes';

describe('Suite 10: Admin Direct Partner Onboarding vs User Application', () => {
  beforeEach(async () => {
    await partnerRepo.resetForTesting();
  });

  it('T10.1: should allow Super Admin to onboard partner directly with immediate ACTIVE status', async () => {
    const res = await adminPartnerRoutes.handle(
      new Request('http://localhost/api/v1/admin/partners/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Vikram Malhotra',
          phone: '9876543210',
          email: 'vikram@example.com',
          city: 'Mumbai',
          persona: 'GROUND_HUSTLER',
          password: 'SecretPassword123!',
          referralCode: 'VIKRAMPRO',
          commissionModel: 'RECURRING_PERCENT',
          commissionPercent: 15.0,
        }),
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.partner.status).toBe('ACTIVE'); // Directly ACTIVE!
    expect(data.partner.referralCode).toBe('VIKRAMPRO');
    expect(data.partner.commissionPercent).toBe(15.0);
    expect(data.partner.hasPassword).toBe(true);

    // Partner can immediately log in with the configured password
    const loginRes = await partnerRoutes.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: '9876543210',
          password: 'SecretPassword123!',
        }),
      })
    );
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.success).toBe(true);
    expect(loginData.partner.id).toBe(data.partner.id);
  });

  it('T10.2: user public application must remain in PENDING_REVIEW requiring Super Admin approval', async () => {
    const applyRes = await partnerRoutes.handle(
      new Request('http://localhost/api/v1/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Applicant Rajesh',
          phone: '9876500001',
          email: 'rajesh@example.com',
          city: 'Pune',
          persona: 'CREATOR',
          password: 'Password999!',
        }),
      })
    );

    expect(applyRes.status).toBe(200);
    const applyData = await applyRes.json();
    expect(applyData.success).toBe(true);
    expect(applyData.partner.status).toBe('PENDING_REVIEW'); // Must require admin review!

    // Cannot log in while in PENDING_REVIEW
    const loginRes = await partnerRoutes.handle(
      new Request('http://localhost/api/v1/partners/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: '9876500001',
          password: 'Password999!',
        }),
      })
    );
    expect(loginRes.status).toBe(403);
    const loginData = await loginRes.json();
    expect(loginData.message).toContain('pending');
  });

  it('T10.3: admin onboarding should reject invalid phone or duplicate phone', async () => {
    // 1. Invalid phone (<10 digits)
    const invalidPhoneRes = await adminPartnerRoutes.handle(
      new Request('http://localhost/api/v1/admin/partners/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Short Phone',
          phone: '12345',
          email: 'shortphone@example.com',
          city: 'Delhi',
        }),
      })
    );
    expect(invalidPhoneRes.status).toBe(400);

    // 2. Onboard first partner
    await adminPartnerRoutes.handle(
      new Request('http://localhost/api/v1/admin/partners/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'First Partner',
          phone: '9876500002',
          email: 'first@example.com',
          city: 'Delhi',
        }),
      })
    );

    // 3. Duplicate phone should be rejected
    const dupRes = await adminPartnerRoutes.handle(
      new Request('http://localhost/api/v1/admin/partners/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Duplicate Partner',
          phone: '9876500002',
          email: 'dup@example.com',
          city: 'Delhi',
        }),
      })
    );
    expect(dupRes.status).toBe(400);
    const dupData = await dupRes.json();
    expect(dupData.message).toContain('already registered');
  });
});
