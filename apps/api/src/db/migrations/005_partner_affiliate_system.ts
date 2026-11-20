import type mysql from 'mysql2/promise';
import type { Migration } from './types';

export const migration_005_partner_affiliate_system: Migration = {
  name: '005_partner_affiliate_system',
  async up(db: mysql.Pool) {
    const statements = [
      `CREATE TABLE IF NOT EXISTS partners (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NULL,
        full_name VARCHAR(128) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(128) NULL,
        password_hash VARCHAR(255) NULL,
        city VARCHAR(64) NOT NULL,
        persona ENUM('CREATOR', 'GROUND_HUSTLER', 'SALON_OWNER', 'DEDICATED') NOT NULL DEFAULT 'GROUND_HUSTLER',
        referral_code VARCHAR(32) NOT NULL UNIQUE,
        status ENUM('PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED') NOT NULL DEFAULT 'PENDING_REVIEW',
        commission_model ENUM('RECURRING_PERCENT', 'FLAT_BOUNTY', 'HYBRID') NOT NULL DEFAULT 'RECURRING_PERCENT',
        commission_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
        bounty_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        duration_type ENUM('LIFETIME', '3_MONTHS', '6_MONTHS', '12_MONTHS') NOT NULL DEFAULT '6_MONTHS',
        duration_end_date DATETIME NULL,
        is_commission_paused BOOLEAN NOT NULL DEFAULT FALSE,
        payout_upi_id VARCHAR(128) NULL,
        payout_holder_name VARCHAR(128) NULL,
        payout_bank_name VARCHAR(128) NULL,
        payout_bank_account VARCHAR(64) NULL,
        payout_bank_ifsc VARCHAR(32) NULL,
        payout_account_type ENUM('SAVINGS', 'CURRENT') NOT NULL DEFAULT 'SAVINGS',
        pitch_notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_partner_phone (phone),
        INDEX idx_partner_code (referral_code),
        INDEX idx_partner_status (status),
        INDEX idx_partner_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS partner_salon_attributions (
        id VARCHAR(64) PRIMARY KEY,
        partner_id VARCHAR(64) NOT NULL,
        salon_id VARCHAR(64) NOT NULL UNIQUE,
        source ENUM('LINK', 'PROMO_CODE', 'ASSISTED_ONBOARDING', 'ADMIN_ASSIGNED') NOT NULL DEFAULT 'LINK',
        qualification_status ENUM('UNQUALIFIED', 'QUALIFIED') NOT NULL DEFAULT 'UNQUALIFIED',
        tickets_completed_count INT NOT NULL DEFAULT 0,
        first_paid_plan_at DATETIME NULL,
        commission_expires_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_attr_partner (partner_id),
        INDEX idx_attr_salon (salon_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS partner_wallet_ledger (
        id VARCHAR(64) PRIMARY KEY,
        partner_id VARCHAR(64) NOT NULL,
        salon_id VARCHAR(64) NULL,
        transaction_type ENUM('COMMISSION_CREDIT', 'BOUNTY_CREDIT', 'WITHDRAWAL_DEBIT', 'ADJUSTMENT') NOT NULL,
        gross_plan_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        net_paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        commission_amount DECIMAL(10,2) NOT NULL,
        balance_type ENUM('PENDING_LOCK', 'AVAILABLE') NOT NULL DEFAULT 'PENDING_LOCK',
        description VARCHAR(255) NOT NULL,
        reference_id VARCHAR(128) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ledger_partner (partner_id),
        INDEX idx_ledger_salon (salon_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS partner_payout_requests (
        id VARCHAR(64) PRIMARY KEY,
        partner_id VARCHAR(64) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payout_method ENUM('UPI', 'BANK_TRANSFER') NOT NULL DEFAULT 'UPI',
        payout_target VARCHAR(128) NOT NULL,
        status ENUM('REQUESTED', 'APPROVED', 'PAID', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
        utr_reference VARCHAR(128) NULL,
        admin_notes TEXT NULL,
        requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        settled_at DATETIME NULL,
        INDEX idx_payout_partner (partner_id),
        INDEX idx_payout_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS partner_notifications (
        id VARCHAR(64) PRIMARY KEY,
        partner_id VARCHAR(64) NOT NULL,
        title VARCHAR(128) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('SALON_JOINED', 'EARNING_CREDITED', 'QUALIFIED', 'PAYOUT_STATUS', 'SYSTEM') NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_partner (partner_id, is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];

    for (const sql of statements) {
      await db.query(sql);
    }
  },

  async down(db: mysql.Pool) {
    const tables = [
      'partner_notifications', 'partner_payout_requests', 'partner_wallet_ledger',
      'partner_salon_attributions', 'partners'
    ];
    for (const t of tables) {
      await db.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
};
