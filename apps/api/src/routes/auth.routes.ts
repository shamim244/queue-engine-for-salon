import { Elysia, t } from 'elysia';
import { authService } from '../auth/auth-service';
import { repository } from '../db/repository';
import { isMySqlConnected, getDb } from '../db/mysql';
import { queueEngine } from '../engine/queue-engine';
import { websocketHub } from '../websocket/hub';

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
  .post('/set-pin', async ({ body, headers, cookie: { engine_session }, set }) => {
    const { userId, pin } = body as { userId: string; pin: string };
    if (!/^\d{4}$/.test(pin)) {
      set.status = 400;
      return { success: false, message: 'PIN must be exactly 4 numeric digits' };
    }

    const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
    if (token) {
      const auth = await authService.validateSession(token);
      if (auth) {
        if (auth.role === 'CUSTOMER') {
          set.status = 403;
          return { success: false, message: 'Forbidden: Customers cannot configure mirror PINs' };
        }
        if (auth.role === 'STAFF' && auth.id !== userId) {
          set.status = 403;
          return { success: false, message: 'Forbidden: Stylists can only modify their own mirror PIN' };
        }
      }
    }

    try {
      await authService.setStaffPin(userId, pin);
      return { success: true, message: 'PIN updated successfully' };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      userId: t.String(),
      pin: t.String(),
    }),
  })

  // 6. Owner Kill Switch: Revoke all sessions for a staff member
  .post('/staff/revoke-all', async ({ body, headers, cookie: { engine_session }, set }) => {
    const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
    if (token) {
      const auth = await authService.validateSession(token);
      if (auth && (auth.role === 'CUSTOMER' || auth.role === 'STAFF')) {
        set.status = 403;
        return { success: false, message: 'Forbidden: Only owners and admins can revoke staff sessions' };
      }
    }
    const { userId } = body as { userId: string };
    await authService.revokeAllUserSessions(userId);
    return { success: true, message: 'All active sessions for user revoked' };
  }, {
    body: t.Object({
      userId: t.String(),
    }),
  })

  // 7. Change Password (Staff preference panel)
  .post('/change-password', async ({ body, headers, cookie: { engine_session }, set }) => {
    const { userId, newPassword } = body as { userId: string; newPassword: string };
    if (!newPassword || newPassword.length < 6) {
      set.status = 400;
      return { success: false, message: 'Password must be at least 6 characters long' };
    }

    const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
    if (token) {
      const auth = await authService.validateSession(token);
      if (auth) {
        if (auth.id !== userId && auth.role !== 'SUPER_ADMIN') {
          set.status = 403;
          return { success: false, message: 'Forbidden: You cannot modify credentials for another user' };
        }
      }
    }

    const updated = await authService.updatePassword(userId, newPassword);
    return { success: updated };
  }, {
    body: t.Object({
      userId: t.String(),
      newPassword: t.String(),
    }),
  })

  // 8. Create Staff User Account with Unified Credentials & Station (Owner Panel)
  .post('/staff/create', async ({ body, set }) => {
    try {
      const { salonId, staffId, fullName, username, password, email, phone, pin, avgDurationMinutes } = body as {
        salonId: string;
        staffId?: string;
        fullName?: string;
        username: string;
        password: string;
        email?: string;
        phone?: string;
        pin?: string;
        avgDurationMinutes?: number;
      };

      const salon = await repository.getSalonBySlug(salonId) || (await repository.getAllSalons()).find(s => s.id === salonId);
      if (!salon) {
        set.status = 404;
        return { success: false, message: 'Salon branch not found' };
      }

      let finalStaffId = staffId;
      if (!finalStaffId) {
        const createdStylist = await repository.addStylist(salon.id, {
          name: fullName || username,
          phone: phone || '',
          avgDurationMinutes: Number(avgDurationMinutes) || 25,
        });
        finalStaffId = createdStylist.id;
      }

      const user = await authService.createUser({
        username,
        password,
        role: 'STAFF',
        fullName: fullName || username,
        email: email || undefined,
        organizationId: salon.organizationId || null,
        salonId: salon.id,
        staffId: finalStaffId,
        phone,
        pin,
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          staffId: user.staffId,
          phone: user.phone,
          status: user.status,
          role: user.role,
        },
      };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      salonId: t.String(),
      staffId: t.Optional(t.String()),
      fullName: t.Optional(t.String()),
      username: t.String(),
      password: t.String(),
      email: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      pin: t.Optional(t.String()),
      avgDurationMinutes: t.Optional(t.Number()),
    }),
  })

  // 9. List Staff Logins for a Salon
  .get('/staff/:salonId', async ({ params }) => {
    const salon = await repository.getSalonBySlug(params.salonId) || (await repository.getAllSalons()).find(s => s.id === params.salonId);
    const targetSalonId = salon ? salon.id : params.salonId;
    const staffUsers = await authService.listStaffUsersBySalon(targetSalonId);
    return { staffUsers };
  })

  // 9b. Update Staff Member Account (Owner Panel)
  .patch('/staff/:userId', async ({ params, body, set }) => {
    try {
      const { fullName, email, phone, pin, avgDurationMinutes, status } = body as {
        fullName?: string;
        email?: string;
        phone?: string;
        pin?: string;
        avgDurationMinutes?: number;
        status?: 'ACTIVE' | 'SUSPENDED';
      };

      const updatedUser = await authService.updateUser(params.userId, {
        fullName,
        email,
        phone,
        status,
      });

      if (!updatedUser) {
        set.status = 404;
        return { success: false, message: 'Staff user not found' };
      }

      if (pin && /^\d{4}$/.test(pin)) {
        await authService.setStaffPin(params.userId, pin);
      }

      if (updatedUser.staffId && avgDurationMinutes) {
        await repository.updateStylistPreference(updatedUser.staffId, {
          customAvgDurationMinutes: avgDurationMinutes,
        });
      }

      return { success: true, user: updatedUser };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      fullName: t.Optional(t.String()),
      email: t.Optional(t.String()),
      phone: t.Optional(t.String()),
      pin: t.Optional(t.String()),
      avgDurationMinutes: t.Optional(t.Number()),
      status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('SUSPENDED')])),
    }),
  })

  // 9c. Reset Staff Password (Owner Panel)
  .post('/staff/:userId/reset-password', async ({ params, body, set }) => {
    try {
      const { newPassword } = body as { newPassword: string };
      if (!newPassword || newPassword.length < 6) {
        set.status = 400;
        return { success: false, message: 'Password must be at least 6 characters long' };
      }
      await authService.updatePassword(params.userId, newPassword);
      await authService.revokeAllUserSessions(params.userId);
      return { success: true, message: 'Password updated successfully' };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      newPassword: t.String(),
    }),
  })

  // 9d. Delete Staff Member Account (Owner Panel)
  .delete('/staff/:userId', async ({ params, set }) => {
    try {
      const user = await authService.getUserById(params.userId);
      if (!user) {
        set.status = 404;
        return { success: false, message: 'Staff user not found' };
      }
      await authService.revokeAllUserSessions(params.userId);
      await authService.deleteUser(params.userId);
      return { success: true, message: 'Staff member removed successfully' };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  })

  // 10. Staff Preference Update (Calibrate personal speed or status)
  .post('/staff/preference', async ({ body, headers, cookie: { engine_session }, set }) => {
    const { staffId, customAvgDurationMinutes, isActive } = body as {
      staffId: string;
      customAvgDurationMinutes?: number;
      isActive?: boolean;
    };

    if (customAvgDurationMinutes !== undefined) {
      if (typeof customAvgDurationMinutes !== 'number' || customAvgDurationMinutes < 5 || customAvgDurationMinutes > 120) {
        set.status = 400;
        return { success: false, message: 'Speed calibration pace must be between 5 and 120 minutes' };
      }
    }

    const token = headers.authorization?.replace(/^Bearer\s+/i, '') || (engine_session ? engine_session.value : null);
    if (token) {
      const auth = await authService.validateSession(token);
      if (auth && auth.role === 'CUSTOMER') {
        set.status = 403;
        return { success: false, message: 'Forbidden: Customers cannot calibrate staff speed pace or shifts' };
      }
    }

    await repository.updateStylistPreference(staffId, { customAvgDurationMinutes, isActive });

    // Recalculate queue and broadcast to all connected surfaces
    const allSalons = await repository.getAllSalons();
    const salon = allSalons.find((s) => s.stylists.some((st) => st.id === staffId));
    if (salon) {
      await queueEngine.recalculateQueue(salon.id);
      const activeTickets = await repository.getActiveTickets(salon.id);
      websocketHub.broadcastToSalon(salon.id, {
        type: 'QUEUE_UPDATED',
        salonId: salon.id,
        activeQueueCount: activeTickets.length,
        timestamp: new Date().toISOString(),
      }, salon.slug);
    }

    return { success: true };
  }, {
    body: t.Object({
      staffId: t.String(),
      customAvgDurationMinutes: t.Optional(t.Number()),
      isActive: t.Optional(t.Boolean()),
    }),
  })

  // 11. Customer Account Registration & Session Issuance (From Door QR, Live Ticket, or Register Page)
  .post('/customer/register', async ({ body, set, cookie: { engine_session } }) => {
    const { name, phone, username, email, password } = body as {
      name: string;
      phone?: string;
      username?: string;
      email?: string;
      password?: string;
    };

    if (!name?.trim() || name.trim().length < 2) {
      set.status = 400;
      return { success: false, message: 'Valid name is required (minimum 2 characters)' };
    }

    const cleanEmail = email?.trim().toLowerCase() || null;
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      set.status = 400;
      return { success: false, message: 'Valid email address format is required' };
    }

    let cleanPhone: string | null = null;
    const hasPhoneProvided = phone !== undefined && phone !== null && phone.trim().length > 0;
    if (hasPhoneProvided) {
      const sanitized = phone.trim().replace(/[^0-9+]/g, '');
      const rawDigits = sanitized.replace(/[^0-9]/g, '');
      if (!rawDigits || rawDigits.length < 7 || rawDigits.length > 15) {
        set.status = 400;
        return { success: false, message: 'Valid phone number with 7-15 digits is required' };
      }
      cleanPhone = sanitized;
    }

    if (!cleanPhone && !cleanEmail && !username?.trim()) {
      set.status = 400;
      return { success: false, message: 'Valid email, username, or phone number is required' };
    }

    const cleanName = name.trim();
    const cleanUsername = (
      username?.trim() ||
      (cleanEmail ? cleanEmail.split('@')[0] : null) ||
      (cleanPhone ? `cust_${cleanPhone.replace(/[^0-9]/g, '').slice(-6)}` : null) ||
      `user_${Math.random().toString(36).substring(2, 7)}`
    ).toLowerCase();

    const finalPassword = password && password.length >= 6 ? password : 'Customer@123';

    try {
      // 1. Create User account with role 'CUSTOMER' (or retrieve if already exists)
      let user = null;
      if (cleanEmail) user = await authService.getUserByIdentifier(cleanEmail);
      if (!user && cleanPhone) user = await authService.getUserByIdentifier(cleanPhone);
      if (!user && cleanUsername) user = await authService.getUserByUsername(cleanUsername);

      if (!user) {
        user = await authService.createUser({
          username: cleanUsername,
          password: finalPassword,
          fullName: cleanName,
          phone: cleanPhone || '',
          email: cleanEmail,
          role: 'CUSTOMER',
        });
      }

      // 2. Insert or update customers table
      const custId = 'cust-' + Math.random().toString(36).substring(2, 9);
      const custPhone = cleanPhone || (cleanEmail ? cleanEmail.replace(/[@.]/g, '_').slice(0, 20) : `c_${custId.slice(-10)}`);
      if (isMySqlConnected) {
        const db = getDb();
        await db.query(
          `INSERT INTO customers (id, name, phone, password_hash)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = COALESCE(VALUES(password_hash), password_hash)`,
          [custId, cleanName, custPhone, user.passwordHash]
        );
      }

      // 3. Issue zero-trust 30-day session token
      const session = await authService.createSession(user.id);
      engine_session.value = session.token;
      engine_session.httpOnly = true;
      engine_session.sameSite = 'lax';
      engine_session.path = '/';
      engine_session.maxAge = 30 * 24 * 60 * 60;

      return {
        success: true,
        token: session.token,
        customer: { id: custId, name: cleanName, phone: cleanPhone || custPhone },
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      };
    } catch (err: any) {
      set.status = 400;
      return { success: false, message: err.message };
    }
  }, {
    body: t.Object({
      name: t.String(),
      phone: t.Optional(t.String()),
      username: t.Optional(t.String()),
      email: t.Optional(t.String()),
      password: t.Optional(t.String()),
    }),
  })

  // 12. Platform Metrics (Super Admin)
  .get('/platform/metrics', async () => {
    return await repository.getPlatformMetrics();
  });

