import { Elysia, t } from 'elysia';
import { authService } from '../auth/auth-service';
import { repository } from '../db/repository';
import { isMySqlConnected, getDb } from '../db/mysql';

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  // 1. User Login (Super Admin, Owner, Staff via Username, Phone, or Email)
  .post('/login', async ({ body, set, cookie: { engine_session } }) => {
    const b = body as { identifier?: string; username?: string; password: string };
    const identifier = b.identifier || b.username;
    if (!identifier) {
      set.status = 400;
      return { message: 'Username, phone number, or email is required' };
    }

    const authContext = await authService.authenticateUser(identifier, b.password);
    if (!authContext) {
      set.status = 401;
      return { message: 'Invalid credentials' };
    }

    // Set HTTP-Only 30-Day Session Cookie
    engine_session.value = authContext.session.token;
    engine_session.httpOnly = true;
    engine_session.sameSite = 'lax';
    engine_session.path = '/';
    engine_session.maxAge = 30 * 24 * 60 * 60; // 30 days

    return {
      success: true,
      token: authContext.session.token,
      user: {
        id: authContext.id,
        username: authContext.username,
        role: authContext.role,
        organizationId: authContext.organizationId,
        salonId: authContext.salonId,
        staffId: authContext.staffId,
        phone: authContext.phone,
        email: authContext.email,
        status: authContext.status,
      },
      organization: authContext.organization,
      salon: authContext.salon,
      staff: authContext.staff,
      branches: authContext.branches,
    };
  }, {
    body: t.Object({
      identifier: t.Optional(t.String()),
      username: t.Optional(t.String()),
      password: t.String(),
    }),
  })

  // 2. Rapid 4-Digit PIN Switch (Shared Mirror Tablet)
  .post('/pin-switch', async ({ body, set, cookie: { engine_session } }) => {
    const { salonId, staffId, pin } = body as { salonId: string; staffId: string; pin: string };
    const authContext = await authService.authenticateByPin(salonId, staffId, pin);
    if (!authContext) {
      set.status = 401;
      return { message: 'Invalid 4-digit PIN for this stylist' };
    }

    engine_session.value = authContext.session.token;
    engine_session.httpOnly = true;
    engine_session.sameSite = 'lax';
    engine_session.path = '/';
    engine_session.maxAge = 30 * 24 * 60 * 60;

    return {
      success: true,
      token: authContext.session.token,
      user: {
        id: authContext.id,
        username: authContext.username,
        role: authContext.role,
        staffId: authContext.staffId,
        salonId: authContext.salonId,
      },
      staff: authContext.staff,
    };
  }, {
    body: t.Object({
      salonId: t.String(),
      staffId: t.String(),
      pin: t.String(),
    }),
  })

  // 3. Inspect Current Session (Zero-Trust Validation)
  .get('/me', async ({ headers, cookie: { engine_session }, set }) => {
    const token =
      headers.authorization?.replace(/^Bearer\s+/i, '') ||
      (engine_session ? engine_session.value : null);

    if (!token) {
      set.status = 401;
      return { message: 'No active session token provided' };
    }

    const authContext = await authService.validateSession(token);
    if (!authContext) {
      set.status = 401;
      return { message: 'Session expired or invalidated' };
    }

    return {
      success: true,
      user: {
        id: authContext.id,
        username: authContext.username,
        role: authContext.role,
        organizationId: authContext.organizationId,
        salonId: authContext.salonId,
        staffId: authContext.staffId,
        phone: authContext.phone,
        email: authContext.email,
        status: authContext.status,
      },
      organization: authContext.organization,
      salon: authContext.salon,
      staff: authContext.staff,
      branches: authContext.branches,
    };
  })

  // 4. Session Revocation / Logout
  .post('/logout', async ({ headers, cookie: { engine_session } }) => {
    const token =
      headers.authorization?.replace(/^Bearer\s+/i, '') ||
      (engine_session ? engine_session.value : null);

    if (token) {
      await authService.revokeSession(token);
    }
    if (engine_session) {
      engine_session.value = '';
      engine_session.maxAge = 0;
    }

    return { success: true, message: 'Logged out successfully' };
  })

  // 5. Set or Update 4-Digit Quick PIN
  .post('/set-pin', async ({ body, set }) => {
    const { userId, pin } = body as { userId: string; pin: string };
    try {
      await authService.setStaffPin(userId, pin);
      return { success: true, message: 'PIN updated successfully' };
    } catch (err: any) {
      set.status = 400;
      return { message: err.message };
    }
  }, {
    body: t.Object({
      userId: t.String(),
      pin: t.String(),
    }),
  })

  // 6. Owner Kill Switch: Revoke all sessions for a staff member
  .post('/staff/revoke-all', async ({ body }) => {
    const { userId } = body as { userId: string };
    await authService.revokeAllUserSessions(userId);
    return { success: true, message: 'All active sessions for user revoked' };
  }, {
    body: t.Object({
      userId: t.String(),
    }),
  })

  // 7. Change Password (Staff preference panel)
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

  // 8. Create Staff User ID & Password (Owner Panel)
  .post('/staff/create', async ({ body, set }) => {
    try {
      const { salonId, staffId, username, password, phone, pin } = body as {
        salonId: string;
        staffId: string;
        username: string;
        password: string;
        phone?: string;
        pin?: string;
      };

      const salon = await repository.getSalonBySlug(salonId) || (await repository.getAllSalons()).find(s => s.id === salonId);

      const user = await authService.createUser({
        username,
        password,
        role: 'STAFF',
        organizationId: salon?.organizationId || null,
        salonId,
        staffId,
        phone,
        pin,
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          staffId: user.staffId,
          phone: user.phone,
        },
      };
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
      phone: t.Optional(t.String()),
      pin: t.Optional(t.String()),
    }),
  })

  // 9. List Staff Logins for a Salon
  .get('/staff/:salonId', async ({ params }) => {
    const staffUsers = await authService.listStaffUsersBySalon(params.salonId);
    return { staffUsers };
  })

  // 10. Staff Preference Update (Calibrate personal speed or status)
  .post('/staff/preference', async ({ body }) => {
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
    }),
  })

  // 11. Optional Customer Account Registration from Live Ticket Screen
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
    }),
  })

  // 12. Platform Metrics (Super Admin)
  .get('/platform/metrics', async () => {
    return await repository.getPlatformMetrics();
  });
