import { describe, it, expect, beforeEach } from 'bun:test';
import { repository, seedDemoData } from '../src/db/repository';
import { queueEngine } from '../src/engine/queue-engine';
import { authService } from '../src/auth/auth-service';

describe('Engine Que System - Core Queue State Machine Tests', () => {
  beforeEach(() => {
    seedDemoData();
  });

  it('should seed default rural and modern demo salons', async () => {
    const salons = await repository.getAllSalons();
    expect(salons.length).toBeGreaterThanOrEqual(2);

    const rural = await repository.getSalonBySlug('ramesh-barber');
    expect(rural).not.toBeNull();
    expect(rural?.operatingMode).toBe('RURAL_SOLO');
    expect(rural?.stylists.length).toBe(1);

    const modern = await repository.getSalonBySlug('aura-salon');
    expect(modern).not.toBeNull();
    expect(modern?.operatingMode).toBe('MODERN_MULTI');
    expect(modern?.stylists.length).toBe(4);
  });

  it('should process customer QR check-in and calculate wait time', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Amit Sharma',
      customerPhone: '9876543210',
      serviceId: 'srv-r-1', // Haircut ₹80, 20m
      addOnIds: ['srv-r-4'], // Beard styling +₹30, 10m
    });

    expect(ticket).toBeDefined();
    expect(ticket.ticketNumber).toBeGreaterThanOrEqual(101);
    expect(ticket.customerName).toBe('Amit Sharma');
    expect(ticket.totalPrice).toBe(110); // 80 + 30
    expect(ticket.totalDurationMinutes).toBe(30); // 20 + 10
    expect(ticket.status).toBe('WAITING');
    expect(ticket.positionInQueue).toBe(1);
  });

  it('should handle rapid concurrent check-ins without duplicate ticket numbers', async () => {
    const promises = [
      queueEngine.checkIn({ salonSlug: 'ramesh-barber', customerName: 'Client 1', customerPhone: '111', serviceId: 'srv-r-1' }),
      queueEngine.checkIn({ salonSlug: 'ramesh-barber', customerName: 'Client 2', customerPhone: '222', serviceId: 'srv-r-1' }),
      queueEngine.checkIn({ salonSlug: 'ramesh-barber', customerName: 'Client 3', customerPhone: '333', serviceId: 'srv-r-1' }),
      queueEngine.checkIn({ salonSlug: 'ramesh-barber', customerName: 'Client 4', customerPhone: '444', serviceId: 'srv-r-1' }),
    ];

    const results = await Promise.all(promises);
    const ticketNumbers = results.map(t => t.ticketNumber);
    const uniqueNumbers = new Set(ticketNumbers);

    // Verify all ticket numbers are distinct and non-overlapping
    expect(uniqueNumbers.size).toBe(4);
  });

  it('should support 1-tap quick add for non-smartphone clients', async () => {
    const quickTicket = await queueEngine.barberQuickAdd({
      salonSlug: 'ramesh-barber',
      customerName: 'Elderly Uncle Ji',
    });

    expect(quickTicket.customerName).toBe('Elderly Uncle Ji');
    expect(quickTicket.source).toBe('BARBER_QUICK_ADD');
    expect(quickTicket.status).toBe('WAITING');
  });

  it('should progress through complete queue lifecycle (Summon -> Seat -> Finish & Pay)', async () => {
    // 1. Check in
    const ticket = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Deepak Verma',
      customerPhone: '9998887776',
      serviceId: 'srv-r-3', // Combo ₹110
    });

    const salon = await repository.getSalonBySlug('ramesh-barber');
    expect(salon).not.toBeNull();

    // 2. Call Next
    const summoned = await queueEngine.callNext(salon!.id);
    expect(summoned).not.toBeNull();
    expect(summoned?.status).toBe('SUMMONED');
    expect(summoned?.summonedTime).toBeDefined();

    // 3. Seat customer
    const seated = await queueEngine.seatCustomer(summoned!.id);
    expect(seated?.status).toBe('IN_CHAIR');
    expect(seated?.startedTime).toBeDefined();

    // 4. Finish & Cash Checkout
    const completed = await queueEngine.finishService(seated!.id, 'CASH_PAID', 110);
    expect(completed?.status).toBe('COMPLETED');
    expect(completed?.completedTime).toBeDefined();
    expect(completed?.paymentStatus).toBe('CASH_PAID');
    expect(completed?.paymentAmount).toBe(110);
  });

  it('should execute 3-minute soft bump protocol when summoned client is not present', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Late Arrival',
      customerPhone: '9870000000',
      serviceId: 'srv-r-1',
    });

    const salon = await repository.getSalonBySlug('ramesh-barber');
    await queueEngine.callNext(salon!.id);

    // Trigger soft bump
    const bumped = await queueEngine.softBump(ticket.id);
    expect(bumped?.status).toBe('SOFT_BUMPED');

    // Verify soft-bumped client is prioritized when chair opens up again
    const reSummoned = await queueEngine.callNext(salon!.id);
    expect(reSummoned?.id).toBe(ticket.id);
    expect(reSummoned?.status).toBe('SUMMONED');
  });

  it('should authenticate Super Admin, Owner, and Staff with bcrypt', async () => {
    await authService.seedDefaultUsers();

    // 1. Super Admin login
    const admin = await authService.authenticateUser('admin', 'Admin@123');
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe('SUPER_ADMIN');

    // 2. Rural Barber staff login
    const ramesh = await authService.authenticateUser('ramesh', 'Ramesh@123');
    expect(ramesh).not.toBeNull();
    expect(ramesh?.role).toBe('STAFF');
    expect(ramesh?.staffId).toBe('stylist-ramesh-01');

    // 3. Modern Salon Owner login
    const owner = await authService.authenticateUser('aura_owner', 'Aura@123');
    expect(owner).not.toBeNull();
    expect(owner?.role).toBe('SALON_OWNER');

    // 4. Invalid password rejection
    const invalid = await authService.authenticateUser('admin', 'WrongPassword');
    expect(invalid).toBeNull();
  });

  it('should support flexible rural pricing checkout with custom cash amount', async () => {
    const ticket = await queueEngine.checkIn({
      salonSlug: 'ramesh-barber',
      customerName: 'Suresh Kumar',
      customerPhone: '9871112223',
      serviceId: 'srv-r-1', // Default base price ₹80
    });

    const salon = await repository.getSalonBySlug('ramesh-barber');
    const summoned = await queueEngine.callNext(salon!.id);
    const seated = await queueEngine.seatCustomer(summoned!.id);

    // In chair, barber decides to charge ₹100 instead of standard ₹80
    const finished = await queueEngine.finishService(seated!.id, 'CASH_PAID', 100);
    expect(finished?.status).toBe('COMPLETED');
    expect(finished?.paymentStatus).toBe('CASH_PAID');
    expect(finished?.paymentAmount).toBe(100); // Confirmed flexible custom amount
  });

  it('should update stylist speed calibration in repository', async () => {
    const updated = await repository.updateStylistPreference('stylist-ramesh-01', {
      customAvgDurationMinutes: 15,
    });
    expect(updated).toBe(true);

    const salon = await repository.getSalonBySlug('ramesh-barber');
    const ramesh = salon?.stylists.find(s => s.id === 'stylist-ramesh-01');
    expect(ramesh?.customAvgDurationMinutes).toBe(15);
  });

  it('should support enterprise multi-identifier login (phone, email, username)', async () => {
    await authService.seedDefaultUsers();

    // 1. Phone number login
    const byPhone = await authService.authenticateUser('9876543210', 'Ramesh@123');
    expect(byPhone).not.toBeNull();
    expect(byPhone?.username).toBe('ramesh');
    expect(byPhone?.session).toBeDefined();
    expect(byPhone?.session.token.length).toBeGreaterThanOrEqual(32);

    // 2. Email login
    const byEmail = await authService.authenticateUser('owner@aurasalon.com', 'Aura@123');
    expect(byEmail).not.toBeNull();
    expect(byEmail?.username).toBe('aura_owner');
    expect(byEmail?.organization).not.toBeNull();
    expect(byEmail?.organization?.tier).toBe('PRO');

    // 3. Session validation
    const validated = await authService.validateSession(byPhone!.session.token);
    expect(validated).not.toBeNull();
    expect(validated?.user.id).toBe(byPhone!.id);
  });

  it('should authenticate stylists on shared mirror tablets via 4-digit PIN', async () => {
    await authService.seedDefaultUsers();

    // 1. Valid 4-digit PIN for Ramesh (1234)
    const staffLogin = await authService.authenticateByPin('salon-rural-01', 'stylist-ramesh-01', '1234');
    expect(staffLogin).not.toBeNull();
    expect(staffLogin?.username).toBe('ramesh');
    expect(staffLogin?.session.token).toBeDefined();

    // 2. Invalid PIN rejection
    const invalidPin = await authService.authenticateByPin('salon-rural-01', 'stylist-ramesh-01', '9999');
    expect(invalidPin).toBeNull();
  });

  it('should support zero-trust session revocation (logout & owner kill switch)', async () => {
    await authService.seedDefaultUsers();

    const login = await authService.authenticateUser('admin', 'Admin@123');
    const token = login!.session.token;

    // Validate active session
    const active = await authService.validateSession(token);
    expect(active).not.toBeNull();

    // Revoke session
    await authService.revokeSession(token);
    const revoked = await authService.validateSession(token);
    expect(revoked).toBeNull();
  });

  it('should enforce tier quota gating when adding branches or stylists', async () => {
    // 1. Check Ramesh organization (SOLO tier: max 1 branch, max 1 stylist)
    const rameshOrg = await repository.getOrganizationById('org-ramesh');
    expect(rameshOrg).not.toBeNull();
    expect(rameshOrg?.tier).toBe('SOLO');
    expect(rameshOrg?.maxBranches).toBe(1);
    expect(rameshOrg?.maxStylistsPerBranch).toBe(1);

    // 2. Branch quota check for SOLO (already has 1 branch salon-rural-01)
    const branchQuota = await repository.checkOrganizationBranchQuota('org-ramesh');
    expect(branchQuota.allowed).toBe(false);
    expect(branchQuota.current).toBe(1);

    // Attempting to create 2nd branch under SOLO tier throws error
    expect(
      repository.createSalon({
        name: 'Ramesh Branch 2',
        phone: '9876543211',
        operatingMode: 'RURAL_SOLO',
        organizationId: 'org-ramesh',
      })
    ).rejects.toThrow(/Branch quota limit/);

    // 3. Stylist quota check for rural salon (already has 1 stylist)
    const stylistQuota = await repository.checkSalonStylistQuota('salon-rural-01');
    expect(stylistQuota.allowed).toBe(false);

    // Attempting to add 2nd stylist to SOLO tier salon throws error
    expect(
      repository.addStylist('salon-rural-01', {
        name: 'Assistant Barber',
        phone: '9876543299',
      })
    ).rejects.toThrow(/Stylist quota limit/);
  });

  it('should dynamically upgrade organization tier and adjust quotas', async () => {
    // 1. Upgrade Ramesh Org from SOLO to PRO (maxBranches: 3, maxStylists: 10)
    const upgraded = await repository.updateOrganizationTier('org-ramesh', 'PRO');
    expect(upgraded).not.toBeNull();
    expect(upgraded?.tier).toBe('PRO');
    expect(upgraded?.maxBranches).toBe(3);
    expect(upgraded?.maxStylistsPerBranch).toBe(10);

    // 2. Now branch quota allows adding a new branch
    const branchQuota = await repository.checkOrganizationBranchQuota('org-ramesh');
    expect(branchQuota.allowed).toBe(true);

    const newBranch = await repository.createSalon({
      name: 'Ramesh Express Branch 2',
      phone: '9876543212',
      operatingMode: 'RURAL_SOLO',
      organizationId: 'org-ramesh',
    });
    expect(newBranch).toBeDefined();
    expect(newBranch.organizationId).toBe('org-ramesh');

    // 3. Stylist quota now allows adding another stylist
    const stylistQuota = await repository.checkSalonStylistQuota('salon-rural-01');
    expect(stylistQuota.allowed).toBe(true);

    const newStylist = await repository.addStylist('salon-rural-01', {
      name: 'Assistant Barber Sanjay',
      phone: '9876543299',
    });
    expect(newStylist).toBeDefined();
    expect(newStylist.name).toBe('Assistant Barber Sanjay');
  });
});
