import { describe, it, expect, beforeAll } from 'bun:test';
import { adminRoutes } from '../src/routes/admin.routes';
import { authRoutes } from '../src/routes/auth.routes';
import { authService } from '../src/auth/auth-service';
import { repository, seedDemoData } from '../src/db/repository';

describe('User Management & Staff Authentication API', () => {
  let createdUserId = '';
  let createdStaffUserId = '';
  let testSalonId = 'salon-rural-01';

  beforeAll(async () => {
    seedDemoData();
    await authService.seedDefaultUsers();
    const testSalon = await repository.createSalon({
      name: 'Modern Barbershop Test',
      slug: 'modern-test-salon',
      phone: '+91 99999 88888',
      stylists: [],
    });
    testSalonId = testSalon.id;
  });

  describe('Super Admin User Directory API', () => {
    it('GET /api/admin/users should list platform users', async () => {
      const res = await adminRoutes.handle(
        new Request('http://localhost:3001/api/admin/users')
      );
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.users)).toBe(true);
      expect(json.users.length).toBeGreaterThan(0);
    });

    it('POST /api/admin/users should create a user with full profile', async () => {
      const res = await adminRoutes.handle(
        new Request('http://localhost:3001/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: 'Rajesh Kumar Manager',
            email: 'rajesh@example.com',
            username: `rajesh_${Date.now()}`,
            password: 'Password@123',
            phone: '+91 98765 11111',
            role: 'STAFF',
            salonId: testSalonId,
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.id).toBeDefined();
      expect(json.user.fullName).toBe('Rajesh Kumar Manager');
      expect(json.user.email).toBe('rajesh@example.com');
      createdUserId = json.user.id;
    });

    it('PATCH /api/admin/users/:id should update user details and status', async () => {
      const res = await adminRoutes.handle(
        new Request(`http://localhost:3001/api/admin/users/${createdUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: 'Rajesh K. Senior Manager',
            status: 'SUSPENDED',
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.fullName).toBe('Rajesh K. Senior Manager');
      expect(json.user.status).toBe('SUSPENDED');
    });

    it('POST /api/admin/users/:id/reset-password should reset user password', async () => {
      const res = await adminRoutes.handle(
        new Request(`http://localhost:3001/api/admin/users/${createdUserId}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: 'NewSecurePassword@456',
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);

      // Verify that login works with the new password
      const user = await authService.getUserById(createdUserId);
      const isValid = await authService.verifyPassword('NewSecurePassword@456', user!.passwordHash);
      expect(isValid).toBe(true);
    });

    it('DELETE /api/admin/users/:id should delete user', async () => {
      const res = await adminRoutes.handle(
        new Request(`http://localhost:3001/api/admin/users/${createdUserId}`, {
          method: 'DELETE',
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);

      const deleted = await authService.getUserById(createdUserId);
      expect(deleted).toBeNull();
    });
  });

  describe('Salon Owner Staff Creation & Unified Credentials API', () => {
    it('POST /api/auth/staff/create should create staff user account, station, and mirror PIN', async () => {
      const res = await authRoutes.handle(
        new Request('http://localhost:3001/api/auth/staff/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salonId: testSalonId,
            fullName: 'Vikram Malhotra',
            email: 'vikram@barbershop.com',
            username: `vikram_${Date.now()}`,
            password: 'VikramSecret@789',
            phone: '+91 99988 77766',
            pin: '7890',
            avgDurationMinutes: 30,
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.id).toBeDefined();
      expect(json.user.fullName).toBe('Vikram Malhotra');
      expect(json.user.email).toBe('vikram@barbershop.com');
      expect(json.user.staffId).toBeDefined();

      createdStaffUserId = json.user.id;
    });

    it('PATCH /api/auth/staff/:userId should update staff credentials and speed calibration', async () => {
      const res = await authRoutes.handle(
        new Request(`http://localhost:3001/api/auth/staff/${createdStaffUserId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: 'Vikram Malhotra (Master Stylist)',
            avgDurationMinutes: 35,
            pin: '9988',
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.user.fullName).toBe('Vikram Malhotra (Master Stylist)');
    });

    it('POST /api/auth/staff/:userId/reset-password should allow owner to reset staff password', async () => {
      const res = await authRoutes.handle(
        new Request(`http://localhost:3001/api/auth/staff/${createdStaffUserId}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: 'BrandNewPassword@321',
          }),
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
    });

    it('DELETE /api/auth/staff/:userId should delete staff account', async () => {
      const res = await authRoutes.handle(
        new Request(`http://localhost:3001/api/auth/staff/${createdStaffUserId}`, {
          method: 'DELETE',
        })
      );

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
    });
  });
});
