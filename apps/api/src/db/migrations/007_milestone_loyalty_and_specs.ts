import type { Migration } from './types';
import type mysql from 'mysql2/promise';

export const migration_007_milestone_loyalty_and_specs: Migration = {
  name: '007_milestone_loyalty_and_specs',
  up: async (db: mysql.Pool) => {
    // 1. Loyalty Stamp Cards per Salon-Customer pair
    await db.query(`
      CREATE TABLE IF NOT EXISTS loyalty_cards (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_name VARCHAR(100) NULL,
        current_stamps INT NOT NULL DEFAULT 0,
        total_lifetime_stamps INT NOT NULL DEFAULT 0,
        completed_milestones INT NOT NULL DEFAULT 0,
        last_stamp_awarded_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_salon_customer_phone (salon_id, customer_phone),
        INDEX idx_salon_stamps (salon_id, current_stamps),
        INDEX idx_customer_phone (customer_phone)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Unlocked 100% Free Service Vouchers
    await db.query(`
      CREATE TABLE IF NOT EXISTS loyalty_vouchers (
        id VARCHAR(36) PRIMARY KEY,
        voucher_code VARCHAR(32) UNIQUE NOT NULL,
        salon_id VARCHAR(36) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        reward_service_id VARCHAR(36) NOT NULL,
        reward_service_name VARCHAR(100) NOT NULL,
        reward_service_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        status ENUM('ACTIVE', 'REDEEMED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        redeemed_at TIMESTAMP NULL,
        redeemed_ticket_id VARCHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_salon_phone_status (salon_id, customer_phone, status),
        INDEX idx_voucher_code (voucher_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Add loyalty settings columns to salons
    const salonLoyaltyColumns = [
      `ALTER TABLE salons ADD COLUMN loyalty_reward_service_id VARCHAR(36) NULL;`,
      `ALTER TABLE salons ADD COLUMN loyalty_reward_service_name VARCHAR(100) NULL;`,
      `ALTER TABLE salons ADD COLUMN loyalty_cooldown_hours INT NOT NULL DEFAULT 4;`,
      `ALTER TABLE salons ADD COLUMN loyalty_voucher_validity_days INT NOT NULL DEFAULT 90;`
    ];
    for (const colSql of salonLoyaltyColumns) {
      try {
        await db.query(colSql);
      } catch (err: any) {
        if (!err.message?.includes('Duplicate column')) {
          // ignore duplicate column error
        }
      }
    }

    // 4. Add grooming specs columns to customers
    const customerColumns = [
      `ALTER TABLE customers ADD COLUMN grooming_specs TEXT NULL;`,
      `ALTER TABLE customers ADD COLUMN preferred_barber_id VARCHAR(36) NULL;`,
      `ALTER TABLE customers ADD COLUMN preferred_barber_name VARCHAR(100) NULL;`,
      `ALTER TABLE customers ADD COLUMN notes TEXT NULL;`
    ];
    for (const colSql of customerColumns) {
      try {
        await db.query(colSql);
      } catch (err: any) {
        if (!err.message?.includes('Duplicate column')) {
          // ignore duplicate column error
        }
      }
    }
  },
  down: async (db: mysql.Pool) => {
    await db.query(`DROP TABLE IF EXISTS loyalty_vouchers;`);
    await db.query(`DROP TABLE IF EXISTS loyalty_cards;`);
  }
};
