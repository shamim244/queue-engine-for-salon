import { Elysia, t } from 'elysia';
import { authService } from '../auth/auth-service';
import { repository } from '../db/repository';
import { isMySqlConnected, getDb } from '../db/mysql';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  // 1. User Login (Super Admin, Owner, Staff)
  .post('/login', async ({ body, set }) => {
    const { username, password } = body as { username: string; password: string };
    const user = await authService.authenticateUser(username, password);
    if (!user) {
      set.status = 401;
      return { message: 'Invalid username or password' };
    }

    let salon = null;
    let staff = null;
    if (user.salonId) {
      const allSalons = await repository.getAllSalons();
      salon = allSalons.find((s) => s.id === user.salonId) || null;
      if (user.staffId && salon) {
        staff = salon.stylists.find((st) => st.id === user.staffId) || null;
      }
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        salonId: user.salonId,
        staffId: user.staffId,
      },
      salon,
      staff,
    };
  }, {
    body: t.Object({
      username: t.String(),
      password: t.String(),
    }),
  })

  // 2. Change Password (Staff preference panel)
  .post('/change-password', async ({ body, set }) => {
    const { userId, newPassword } = body as { userId: string; newPassword: string };
    if (!newPassword || newPassword.length < 6) {
      set.status = 400;
      return { message: 'Password must be at least 6 characters long' };
    }
    const updated = await authService.updatePassword(userId, newPassword);
    return { success: updated };
  }, {
    body: t.Object({
      userId: t.String(),
      newPassword: t.String(),
    }),
  })

  // 3. Create Staff User ID & Password (Owner Panel)
  .post('/staff/create', async ({ body, set }) => {
    try {
      const { salonId, staffId, username, password } = body as {
        salonId: string;
        staffId: string;
        username: string;
        password: string;
      };

      const user = await authService.createUser({
        username,
        password,
        role: 'STAFF',
        salonId,
        staffId,
      });

      return { success: true, user: { id: user.id, username: user.username, staffId: user.staffId } };
    } catch (err: any) {
      set.status = 400;
      return { message: err.message };
    }
  }, {
    body: t.Object({
      salonId: t.String(),
      staffId: t.String(),
      username: t.String(),
      password: t.String(),
    }),
  })

  // 4. List Staff Logins for a Salon
  .get('/staff/:salonId', async ({ params }) => {
    const staffUsers = await authService.listStaffUsersBySalon(params.salonId);
    return { staffUsers };
  })

  // 5. Staff Preference Update (Calibrate personal speed or status)
  .post('/staff/preference', async ({ body, error }) => {
    const { staffId, customAvgDurationMinutes, isActive } = body as {
      staffId: string;
      customAvgDurationMinutes?: number;
      isActive?: boolean;
    };
    await repository.updateStylistPreference(staffId, { customAvgDurationMinutes, isActive });
    return { success: true };
  }, {
    body: t.Object({
      staffId: t.String(),
      customAvgDurationMinutes: t.Optional(t.Number()),
      isActive: t.Optional(t.Boolean()),
    })
  })

  // 6. Optional Customer Account Registration from Live Ticket Screen
  .post('/customer/register', async ({ body, set }) => {
    const { name, phone, password } = body as { name: string; phone: string; password?: string };
    const id = 'cust-' + Math.random().toString(36).substring(2, 9);
    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await authService.hashPassword(password);
    }

    try {
      if (isMySqlConnected) {
        const db = getDb();
        await db.query(
          `INSERT INTO customers (id, name, phone, password_hash)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = COALESCE(VALUES(password_hash), password_hash)`,
          [id, name.trim(), phone.trim(), passwordHash]
        );
      }
      return { success: true, customer: { id, name, phone } };
    } catch (err: any) {
      set.status = 400;
      return { message: err.message };
    }
  }, {
    body: t.Object({
      name: t.String(),
      phone: t.String(),
      password: t.Optional(t.String()),
    })
  })

  // 7. Platform Metrics (Super Admin)
  .get('/platform/metrics', async () => {
    return await repository.getPlatformMetrics();
  });
