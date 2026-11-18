import { describe, it, expect, beforeEach } from 'bun:test';
import { partnerRepo } from '../../src/db/repositories/partner.repo';

describe('Suite 6: Multi-Identifier Partner Authentication', () => {
  let partnerId: string;
  const rawPassword = 'SecretPassword@123';

  beforeEach(async () => {
    await partnerRepo.resetForTesting();
    const p = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Vikram Malhotra',
      phone: '+919876543210',
      email: 'vikram@growth.in',
      city: 'Delhi',
      persona: 'GROUND_HUSTLER',
      password: rawPassword,
    });
    partnerId = p.id;
    // Approve for login testing
    await partnerRepo.updatePartnerStatus(partnerId, 'ACTIVE');
  });

  it('T6.1: should authenticate successfully using 10-digit mobile phone and password', async () => {
    const res = await partnerRepo.authenticatePartner({
      identifier: '+919876543210',
      password: rawPassword,
    });
    expect(res.success).toBe(true);
    expect(res.partner?.id).toBe(partnerId);
  });

  it('T6.2: should authenticate successfully using email address and password', async () => {
    const res = await partnerRepo.authenticatePartner({
      identifier: 'vikram@growth.in',
      password: rawPassword,
    });
    expect(res.success).toBe(true);
    expect(res.partner?.id).toBe(partnerId);
  });

  it('T6.3: should reject authentication when attempting to log in using referral code (security policy)', async () => {
    const partner = await partnerRepo.getPartnerById(partnerId);
    expect(
      partnerRepo.authenticatePartner({
        identifier: partner!.referralCode,
        password: rawPassword,
      })
    ).rejects.toThrow(/Invalid credentials/i);
  });

  it('T6.4: should reject login when password is incorrect', async () => {
    expect(async () => {
      await partnerRepo.authenticatePartner({
        identifier: 'vikram@growth.in',
        password: 'WrongPassword',
      });
    }).toThrow('Invalid credentials');
  });

  it('T6.5: should reject login if partner account is still in PENDING_REVIEW', async () => {
    const pendingP = await partnerRepo.createPartnerApplication({
      password: 'Test@1234',
      fullName: 'Pending Applicant',
      phone: '+919876543299',
      email: 'pending@growth.in',
      city: 'Pune',
      persona: 'CREATOR',
      password: rawPassword,
    });

    expect(async () => {
      await partnerRepo.authenticatePartner({
        identifier: 'pending@growth.in',
        password: rawPassword,
      });
    }).toThrow('Account is pending Super Admin review');
  });

  it('T6.6: should throw specific error when partner account has NO password configured', async () => {
    const noPasswordP = await partnerRepo.createPartnerApplication({
      fullName: 'No Password User',
      phone: '+919811122233',
      email: 'nopassword@example.com',
      city: 'Jaipur',
      persona: 'GROUND_HUSTLER',
    });
    await partnerRepo.updatePartnerStatus(noPasswordP.id, 'ACTIVE');

    expect(async () => {
      await partnerRepo.authenticatePartner({
        identifier: '+919811122233',
        password: 'AnyPassword@123',
      });
    }).toThrow('NO_PASSWORD_SET');
  });

  it('T6.7: should allow Super Admin to set password for a partner and allow login thereafter', async () => {
    const partnerWithoutPwd = await partnerRepo.createPartnerApplication({
      fullName: 'Ramesh Patel',
      phone: '+919822233344',
      email: 'ramesh.auth@example.com',
      city: 'Ahmedabad',
      persona: 'GROUND_HUSTLER',
    });
    await partnerRepo.updatePartnerStatus(partnerWithoutPwd.id, 'ACTIVE');

    // Admin sets password
    const newAdminSetPwd = 'NewSuperSecurePwd@2026';
    await partnerRepo.setPartnerPassword(partnerWithoutPwd.id, newAdminSetPwd);

    // Partner logs in with newly set password
    const res = await partnerRepo.authenticatePartner({
      identifier: '+919822233344',
      password: newAdminSetPwd,
    });
    expect(res.success).toBe(true);
    expect(res.partner.id).toBe(partnerWithoutPwd.id);
  });

  it('T6.8: should reject setting password with less than 8 characters', async () => {
    expect(async () => {
      await partnerRepo.setPartnerPassword(partnerId, 'short');
    }).toThrow('Password must be at least 8 characters long');
  });
});
