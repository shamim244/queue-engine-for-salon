import type mysql from 'mysql2/promise';
import type { Migration } from './types';

export const migration_003_coupons_and_wallets: Migration = {
  name: '003_coupons_and_wallets',
  async up(db: mysql.Pool) {
    const statements = [
      `CREATE TABLE IF NOT EXISTS coupons (
        id VARCHAR(36) PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        target_type ENUM('SUBSCRIPTION', 'SALON_SERVICE') NOT NULL,
        organization_id VARCHAR(36) NULL,
        salon_id VARCHAR(36) NULL,
        discount_type ENUM('PERCENT', 'FLAT') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        max_discount_amount DECIMAL(10,2) NULL,
        min_order_amount DECIMAL(10,2) DEFAULT 0.00,
        max_uses INT NULL,
        used_count INT DEFAULT 0,
        max_uses_per_user INT DEFAULT 1,
        is_first_time_only TINYINT(1) DEFAULT 0,
        valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP NULL,
        status ENUM('ACTIVE', 'INACTIVE', 'EXPIRED') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_coupon_lookup (code, status),
        INDEX idx_coupon_org_salon (organization_id, salon_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS coupon_redemptions (
        id VARCHAR(36) PRIMARY KEY,
        coupon_id VARCHAR(36) NOT NULL,
        target_type ENUM('SUBSCRIPTION', 'SALON_SERVICE') NOT NULL,
        target_order_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NULL,
        discount_applied DECIMAL(10,2) NOT NULL,
        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_redemption_coupon_user (coupon_id, user_id),
        INDEX idx_redemption_order (target_order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS wallets (
        id VARCHAR(36) PRIMARY KEY,
        wallet_type ENUM('OWNER', 'CONSUMER') NOT NULL,
        owner_org_id VARCHAR(36) NULL,
        consumer_phone VARCHAR(20) NULL,
        salon_id VARCHAR(36) NULL,
        balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) DEFAULT 'INR',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_owner_wallet (owner_org_id),
        UNIQUE KEY uq_consumer_wallet (salon_id, consumer_phone),
        INDEX idx_wallet_type (wallet_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(36) PRIMARY KEY,
        wallet_id VARCHAR(36) NOT NULL,
        wallet_type ENUM('OWNER', 'CONSUMER') NOT NULL,
        owner_org_id VARCHAR(36) NULL,
        consumer_phone VARCHAR(20) NULL,
        salon_id VARCHAR(36) NULL,
        type ENUM('CREDIT', 'DEBIT') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        reference_id VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trans_wallet (wallet_id, created_at),
        INDEX idx_trans_owner (owner_org_id, created_at),
        INDEX idx_trans_consumer (salon_id, consumer_phone, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS referral_attributions (
        id VARCHAR(36) PRIMARY KEY,
        referral_type ENUM('B2B_OWNER', 'B2C_CONSUMER') NOT NULL,
        referrer_code VARCHAR(50) NOT NULL,
        referrer_org_id VARCHAR(36) NULL,
        referrer_phone VARCHAR(20) NULL,
        referred_org_id VARCHAR(36) NULL,
        referred_phone VARCHAR(20) NULL,
        salon_id VARCHAR(36) NULL,
        reward_amount DECIMAL(10,2) NOT NULL,
        status ENUM('PENDING', 'CONVERTED', 'EXPIRED') DEFAULT 'PENDING',
        conversion_reference_id VARCHAR(100) NULL,
        converted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ref_code (referrer_code),
        INDEX idx_ref_org (referrer_org_id, status),
        INDEX idx_referred_org (referred_org_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];

    for (const sql of statements) {
      await db.query(sql);
    }
  },

  async down(db: mysql.Pool) {
    const tables = ['referral_attributions', 'wallet_transactions', 'wallets', 'coupon_redemptions', 'coupons'];
    for (const t of tables) {
      await db.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
};
