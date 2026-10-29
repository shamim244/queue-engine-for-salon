import { isMySqlConnected, getDb } from '../db/mysql';
import { repository } from '../db/repository';
import type { User, UserRole, UserStatus, Customer, Session, Organization, Salon, Stylist } from '../engine/types';

// In-Memory user & session storage fallback
const memoryUsers = new Map<string, User>();
const memorySessions = new Map<string, Session>();
const memoryCustomers = new Map<string, Customer>();

export interface AuthenticatedUser extends User {
  user: User;
  session: Session;
  organization: Organization | null;
  salon: Salon | null;
  staff: Stylist | null;
  branches: Salon[];
}

export const authService = {
  // 1. Password Hashing (Bun Native bcrypt)
  async hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password, {
      algorithm: 'bcrypt',
      cost: 10,
    });
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
  },

  // 2. 4-Digit Mirror Tablet PIN Hashing
  async hashPin(pin: string): Promise<string> {
    return await Bun.password.hash(pin.trim(), {
      algorithm: 'bcrypt',
      cost: 10,
    });
  },

  async verifyPin(pin: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(pin.trim(), hash);
  },

  // 3. User Creation (Multi-Identifier & Additive RBAC)
  async createUser(params: {
    username: string;
    password: string;
    role: UserRole;
    organizationId?: string | null;
    salonId?: string | null;
    staffId?: string | null;
    phone?: string | null;
    email?: string | null;
    pin?: string | null;
    status?: UserStatus;
  }): Promise<User> {
    const cleanUsername = params.username.trim().toLowerCase();
    const existing = await this.getUserByUsername(cleanUsername);
    if (existing) {
      throw new Error(`Username '${cleanUsername}' is already taken.`);
    }

    const id = 'usr-' + Math.random().toString(36).substring(2, 9);
    const passwordHash = await this.hashPassword(params.password);
    const pinHash = params.pin ? await this.hashPin(params.pin) : null;

    const user: User = {
      id,
      organizationId: params.organizationId || null,
      salonId: params.salonId || null,
      username: cleanUsername,
      phone: params.phone ? params.phone.trim() : null,
      email: params.email ? params.email.trim().toLowerCase() : null,
      passwordHash,
      pinHash,
      role: params.role,
      staffId: params.staffId || null,
      status: params.status || 'ACTIVE',
      lastLoginAt: null,
      createdAt: new Date().toISOString(),
    };

    memoryUsers.set(user.username, user);
    memoryUsers.set(user.id, user);
    if (user.phone) memoryUsers.set(`phone:${user.phone}`, user);
    if (user.email) memoryUsers.set(`email:${user.email}`, user);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO users (id, organization_id, salon_id, username, phone, email, password_hash, pin_hash, role, staff_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.organizationId,
          user.salonId,
          user.username,
          user.phone,
          user.email,
          user.passwordHash,
          user.pinHash,
          user.role,
          user.staffId,
          user.status,
        ]
      );
    }

    return user;
  },

  // 4. Multi-Identifier Lookup (Username, Phone, or Email)
  async getUserByIdentifier(identifier: string): Promise<User | null> {
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.trim().replace(/[^0-9+]/g, '');

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        'SELECT * FROM users WHERE username = ? OR phone = ? OR email = ? LIMIT 1',
        [clean, cleanPhone, clean]
      );
      if (rows.length === 0) return null;
      return this.mapUserRow(rows[0]);
    }

    // Check memory maps
    return (
      memoryUsers.get(clean) ||
      memoryUsers.get(`phone:${cleanPhone}`) ||
      memoryUsers.get(`email:${clean}`) ||
      Array.from(memoryUsers.values()).find(
        (u) => u.username === clean || u.phone === cleanPhone || u.email === clean
      ) ||
      null
    );
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase();
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM users WHERE username = ? LIMIT 1', [clean]);
      if (rows.length === 0) return null;
      return this.mapUserRow(rows[0]);
    }
    return memoryUsers.get(clean) || null;
  },

  async getUserById(id: string): Promise<User | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      if (rows.length === 0) return null;
      return this.mapUserRow(rows[0]);
    }
    return memoryUsers.get(id) || null;
  },

  mapUserRow(r: any): User {
    return {
      id: r.id,
      organizationId: r.organization_id || null,
      salonId: r.salon_id || null,
      username: r.username,
      phone: r.phone || null,
      email: r.email || null,
      passwordHash: r.password_hash,
      pinHash: r.pin_hash || null,
      role: r.role,
      staffId: r.staff_id || null,
      status: r.status || 'ACTIVE',
      lastLoginAt: r.last_login_at || null,
      createdAt: r.created_at,
    };
  },

  // 5. Stateful Session Management (Zero-Trust Session Tokens)
  async createSession(userId: string, metadata?: { ip?: string; userAgent?: string }): Promise<Session> {
    const id = 'sess-' + Math.random().toString(36).substring(2, 9);
    // 64-character crypto token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day session

    const session: Session = {
      id,
      userId,
      token,
      ipAddress: metadata?.ip || null,
      userAgent: metadata?.userAgent || null,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    memorySessions.set(token, session);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [session.id, session.userId, session.token, session.ipAddress, session.userAgent, expiresAt]
      );
    }

    return session;
  },

  async validateSession(token: string): Promise<AuthenticatedUser | null> {
    let session: Session | null = null;

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW() LIMIT 1',
        [token]
      );
      if (rows.length > 0) {
        const r = rows[0];
        session = {
          id: r.id,
          userId: r.user_id,
          token: r.token,
          ipAddress: r.ip_address,
          userAgent: r.user_agent,
          expiresAt: r.expires_at,
          createdAt: r.created_at,
        };
      }
    } else {
      const found = memorySessions.get(token);
      if (found && new Date(found.expiresAt).getTime() > Date.now()) {
        session = found;
      }
    }

    if (!session) return null;

    const user = await this.getUserById(session.userId);
    if (!user || user.status !== 'ACTIVE') return null;

    return await this.buildAuthContext(user, session);
  },

  async revokeSession(token: string): Promise<boolean> {
    memorySessions.delete(token);
    if (isMySqlConnected) {
      const db = getDb();
      await db.query('DELETE FROM sessions WHERE token = ?', [token]);
    }
    return true;
  },

  async revokeAllUserSessions(userId: string): Promise<boolean> {
    for (const [t, s] of memorySessions.entries()) {
      if (s.userId === userId) memorySessions.delete(t);
    }
    if (isMySqlConnected) {
      const db = getDb();
      await db.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    }
    return true;
  },

  // 6. User Authentication with Session Issuance
  async authenticateUser(
    identifier: string,
    password: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<AuthenticatedUser | null> {
    const user = await this.getUserByIdentifier(identifier);
    if (!user || user.status !== 'ACTIVE') return null;

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) return null;

    // Update last login
    const now = new Date().toISOString();
    user.lastLoginAt = now;
    if (isMySqlConnected) {
      const db = getDb();
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    }

    const session = await this.createSession(user.id, metadata);
    return await this.buildAuthContext(user, session);
  },

  // 7. 4-Digit PIN Authentication (Shared Mirror Tablet Switcher)
  async authenticateByPin(
    salonId: string,
    staffId: string,
    pin: string,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<AuthenticatedUser | null> {
    let user: User | null = null;

    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        'SELECT * FROM users WHERE staff_id = ? AND salon_id = ? LIMIT 1',
        [staffId, salonId]
      );
      if (rows.length > 0) user = this.mapUserRow(rows[0]);
    } else {
      user = Array.from(memoryUsers.values()).find(
        (u) => u.staffId === staffId && u.salonId === salonId
      ) || null;
    }

    if (!user || !user.pinHash || user.status !== 'ACTIVE') return null;

    const isPinValid = await this.verifyPin(pin, user.pinHash);
    if (!isPinValid) return null;

    const session = await this.createSession(user.id, metadata);
    return await this.buildAuthContext(user, session);
  },

  async setStaffPin(userId: string, pin: string): Promise<boolean> {
    if (!/^\d{4}$/.test(pin.trim())) {
      throw new Error('PIN must be exactly 4 digits');
    }
    const pinHash = await this.hashPin(pin);
    const user = await this.getUserById(userId);
    if (user) {
      user.pinHash = pinHash;
      memoryUsers.set(user.username, user);
      memoryUsers.set(user.id, user);
    }
    if (isMySqlConnected) {
      const db = getDb();
      await db.query('UPDATE users SET pin_hash = ? WHERE id = ?', [pinHash, userId]);
    }
    return true;
  },

  // 8. Password Management
  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(newPassword);
    const user = await this.getUserById(userId);
    if (user) {
      user.passwordHash = passwordHash;
      memoryUsers.set(user.username, user);
      memoryUsers.set(user.id, user);
    }

    if (isMySqlConnected) {
      const db = getDb();
      await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    }
    return true;
  },

  async listStaffUsersBySalon(salonId: string): Promise<User[]> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        'SELECT * FROM users WHERE salon_id = ? AND role = "STAFF"',
        [salonId]
      );
      return rows.map((r: any) => this.mapUserRow(r));
    }
    return Array.from(memoryUsers.values()).filter((u) => u.salonId === salonId && u.role === 'STAFF');
  },

  // Context builder for multi-branch organizations
  async buildAuthContext(user: User, session: Session): Promise<AuthenticatedUser> {
    let salon: Salon | null = null;
    let staff: Stylist | null = null;
    let organization: Organization | null = null;
    let branches: Salon[] = [];

    if (user.organizationId) {
      organization = await repository.getOrganizationById(user.organizationId);
      branches = await repository.getSalonsByOrganizationId(user.organizationId);
    }

    if (user.salonId) {
      const allSalons = await repository.getAllSalons();
      salon = allSalons.find((s) => s.id === user.salonId) || null;
      if (user.staffId && salon) {
        staff = salon.stylists.find((st) => st.id === user.staffId) || null;
      }
    } else if (branches.length > 0) {
      salon = branches[0];
    }

    return {
      ...user,
      user,
      session,
      organization,
      salon,
      staff,
      branches,
    };
  },

  // 9. Seed Default System Organizations & Users
  async seedDefaultUsers() {
    // 1. Super Admin
    if (!(await this.getUserByUsername('admin'))) {
      await this.createUser({
        username: 'admin',
        password: 'Admin@123',
        email: 'admin@engineque.com',
        role: 'SUPER_ADMIN',
      });
      console.log('[Auth] Seeded SuperAdmin: admin / Admin@123');
    }

    // 2. Ramesh Barber (Solo Barber & Owner with 4-Digit PIN 1234)
    if (!(await this.getUserByUsername('ramesh'))) {
      await this.createUser({
        username: 'ramesh',
        password: 'Ramesh@123',
        pin: '1234',
        phone: '9876543210',
        role: 'STAFF',
        organizationId: 'org-ramesh',
        salonId: 'salon-rural-01',
        staffId: 'stylist-ramesh-01',
      });
      console.log('[Auth] Seeded Staff: ramesh / Ramesh@123 (PIN: 1234)');
    }

    // 3. Aura Modern Salon Owner
    if (!(await this.getUserByUsername('aura_owner'))) {
      await this.createUser({
        username: 'aura_owner',
        password: 'Aura@123',
        email: 'owner@aurasalon.com',
        phone: '9988776655',
        role: 'SALON_OWNER',
        organizationId: 'org-aura',
        salonId: 'salon-modern-01',
      });
      console.log('[Auth] Seeded Salon Owner: aura_owner / Aura@123');
    }

    // 4. Aura Modern Staff: Leo (Master Stylist with PIN 4321)
    if (!(await this.getUserByUsername('leo'))) {
      await this.createUser({
        username: 'leo',
        password: 'Leo@123',
        pin: '4321',
        phone: '9988776651',
        role: 'STAFF',
        organizationId: 'org-aura',
        salonId: 'salon-modern-01',
        staffId: 'stylist-m-1',
      });
      console.log('[Auth] Seeded Staff: leo / Leo@123 (PIN: 4321)');
    }
  },
};
