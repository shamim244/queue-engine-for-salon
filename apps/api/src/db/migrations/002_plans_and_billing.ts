import type mysql from 'mysql2/promise';
import type { Migration } from './types';

export const migration_002_plans_and_billing: Migration = {
  name: '002_plans_and_billing',
  async up(db: mysql.Pool) {
    const statements = [
      `CREATE TABLE IF NOT EXISTS subscription_plans (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        badge VARCHAR(50) NULL,
        description TEXT NULL,
        price_1m DECIMAL(10,2) NOT NULL,
        price_3m DECIMAL(10,2) NULL,
        price_6m DECIMAL(10,2) NULL,
        price_1y DECIMAL(10,2) NULL,
        discount_pct_3m DECIMAL(5,2) DEFAULT 10.00,
        discount_pct_6m DECIMAL(5,2) DEFAULT 16.00,
        discount_pct_1y DECIMAL(5,2) DEFAULT 30.00,
        cycle_1m_enabled BOOLEAN DEFAULT TRUE,
        cycle_3m_enabled BOOLEAN DEFAULT TRUE,
        cycle_6m_enabled BOOLEAN DEFAULT TRUE,
        cycle_1y_enabled BOOLEAN DEFAULT TRUE,
        max_branches INT NOT NULL DEFAULT 1,
        max_stylists_per_branch INT NOT NULL DEFAULT 2,
        features JSON NOT NULL,
        status ENUM('ACTIVE', 'DRAFT', 'ARCHIVED') DEFAULT 'ACTIVE',
        is_featured BOOLEAN DEFAULT FALSE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_plan_status (status, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS payment_orders (
        id VARCHAR(36) PRIMARY KEY,
        target_type ENUM('SUBSCRIPTION', 'QUEUE_TICKET', 'WALLET_TOPUP') NOT NULL,
        target_id VARCHAR(36) NOT NULL,
        organization_id VARCHAR(36) NULL,
        salon_id VARCHAR(36) NULL,
        customer_id VARCHAR(36) NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        provider ENUM('UPI_QR', 'CASH', 'RAZORPAY', 'WALLET') NOT NULL,
        provider_order_id VARCHAR(100) NULL,
        transaction_ref VARCHAR(100) NULL,
        utr_number VARCHAR(64) NULL,
        payment_proof_note TEXT NULL,
        reviewed_by VARCHAR(64) NULL,
        reviewed_at TIMESTAMP NULL,
        rejection_reason TEXT NULL,
        status ENUM('PENDING', 'PENDING_APPROVAL', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'REFUNDED', 'REJECTED') DEFAULT 'PENDING',
        payment_data JSON NULL,
        metadata JSON NULL,
        expires_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_status (status, target_type),
        INDEX idx_order_org (organization_id, created_at),
        INDEX idx_order_salon (salon_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS organization_subscriptions (
        id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NOT NULL,
        plan_id VARCHAR(36) NOT NULL,
        cycle ENUM('1m', '3m', '6m', '1y', 'custom') NOT NULL,
        starts_at TIMESTAMP NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        base_price DECIMAL(10,2) NOT NULL,
        coupon_id VARCHAR(36) NULL,
        coupon_discount DECIMAL(10,2) DEFAULT 0.00,
        wallet_deducted DECIMAL(10,2) DEFAULT 0.00,
        net_amount_paid DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        payment_order_id VARCHAR(36) NULL,
        transaction_ref VARCHAR(100) NULL,
        status ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'GRACE_PERIOD') DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_org_sub (organization_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS payment_gateway_settings (
        id VARCHAR(36) PRIMARY KEY,
        upi_manual_enabled BOOLEAN DEFAULT TRUE,
        upi_vpa VARCHAR(120) DEFAULT 'salonpayments@icici',
        upi_merchant_name VARCHAR(120) DEFAULT 'Salon Queue SaaS',
        cash_enabled BOOLEAN DEFAULT TRUE,
        cash_instructions TEXT NULL,
        razorpay_enabled BOOLEAN DEFAULT FALSE,
        razorpay_key_id VARCHAR(120) NULL,
        razorpay_key_secret VARCHAR(120) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `INSERT IGNORE INTO payment_gateway_settings (
        id, upi_manual_enabled, upi_vpa, upi_merchant_name, cash_enabled,
        cash_instructions, razorpay_enabled, razorpay_key_id, razorpay_key_secret
      ) VALUES (
        'default_gateway_settings', TRUE, 'salonpayments@icici', 'Salon Queue SaaS',
        TRUE, 'Pay at salon head office or deposit cash to our designated bank account.',
        FALSE, 'rzp_test_placeholder', ''
      );`
    ];

    for (const sql of statements) {
      await db.query(sql);
    }
  },

  async down(db: mysql.Pool) {
    const tables = ['payment_gateway_settings', 'organization_subscriptions', 'payment_orders', 'subscription_plans'];
    for (const t of tables) {
      await db.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
};
