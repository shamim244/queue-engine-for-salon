import { isMySqlConnected, getDb } from '../db/mysql';
import type { User, UserRole, Customer } from '../engine/types';

// In-Memory user storage fallback
const memoryUsers = new Map<string, User>();
const memoryCustomers = new Map<string, Customer>();

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password, {
      algorithm: 'bcrypt',
      cost: 10,
    });
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
  },

  async createUser(params: {
    username: string;
    password: string;
    role: UserRole;
    salonId?: string | null;
    staffId?: string | null;
  }): Promise<User> {
    const existing = await this.getUserByUsername(params.username);
    if (existing) {
      throw new Error(`Username '${params.username}' is already taken.`);
    }

    const id = 'usr-' + Math.random().toString(36).substring(2, 9);
    const passwordHash = await this.hashPassword(params.password);
    const user: User = {
      id,
      salonId: params.salonId || null,
      username: params.username.trim().toLowerCase(),
      passwordHash,
      role: params.role,
      staffId: params.staffId || null,
      createdAt: new Date().toISOString(),
    };

    memoryUsers.set(user.username, user);
    memoryUsers.set(user.id, user);

    if (isMySqlConnected) {
      const db = getDb();
      await db.query(
        `INSERT INTO users (id, salon_id, username, password_hash, role, staff_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, user.salonId, user.username, user.passwordHash, user.role, user.staffId]
      );
    }

    return user;
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const clean = username.trim().toLowerCase();
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        'SELECT * FROM users WHERE username = ? LIMIT 1',
        [clean]
      );
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        salonId: r.salon_id,
        username: r.username,
        passwordHash: r.password_hash,
        role: r.role,
        staffId: r.staff_id,
        createdAt: r.created_at,
      };
    }
    return memoryUsers.get(clean) || null;
  },

  async getUserById(id: string): Promise<User | null> {
    if (isMySqlConnected) {
      const db = getDb();
      const [rows]: any = await db.query(
        'SELECT * FROM users WHERE id = ? LIMIT 1',
        [id]
      );
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        salonId: r.salon_id,
        username: r.username,
        passwordHash: r.password_hash,
        role: r.role,
        staffId: r.staff_id,
        createdAt: r.created_at,
      };
    }
    return memoryUsers.get(id) || null;
  },

  async authenticateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  },

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
        'SELECT id, salon_id, username, role, staff_id, created_at FROM users WHERE salon_id = ? AND role = "STAFF"',
        [salonId]
      );
      return rows.map((r: any) => ({
        id: r.id,
        salonId: r.salon_id,
        username: r.username,
        passwordHash: '',
        role: r.role,
        staffId: r.staff_id,
        createdAt: r.created_at,
      }));
    }
    return Array.from(memoryUsers.values()).filter(u => u.salonId === salonId && u.role === 'STAFF');
  },

  // Seed default system users
  async seedDefaultUsers() {
    // 1. Super Admin
    if (!(await this.getUserByUsername('admin'))) {
      await this.createUser({
        username: 'admin',
        password: 'Admin@123',
        role: 'SUPER_ADMIN',
      });
      console.log('[Auth] Seeded SuperAdmin: admin / Admin@123');
    }

    // 2. Ramesh Barber Staff/Owner
    if (!(await this.getUserByUsername('ramesh'))) {
      await this.createUser({
        username: 'ramesh',
        password: 'Ramesh@123',
        role: 'STAFF',
        salonId: 'salon-rural-01',
        staffId: 'stylist-ramesh-01',
      });
      console.log('[Auth] Seeded Staff: ramesh / Ramesh@123');
    }

    // 3. Aura Modern Salon Owner
    if (!(await this.getUserByUsername('aura_owner'))) {
      await this.createUser({
        username: 'aura_owner',
        password: 'Aura@123',
        role: 'SALON_OWNER',
        salonId: 'salon-modern-01',
      });
      console.log('[Auth] Seeded Salon Owner: aura_owner / Aura@123');
    }

    // 4. Aura Modern Staff: Leo & Sarah
    if (!(await this.getUserByUsername('leo'))) {
      await this.createUser({
        username: 'leo',
        password: 'Leo@123',
        role: 'STAFF',
        salonId: 'salon-modern-01',
        staffId: 'stylist-m-1',
      });
      console.log('[Auth] Seeded Staff: leo / Leo@123');
    }
  },
};
