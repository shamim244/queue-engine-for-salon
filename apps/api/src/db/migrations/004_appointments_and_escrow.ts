import type mysql from 'mysql2/promise';
import type { Migration } from './types';

export const migration_004_appointments_and_escrow: Migration = {
  name: '004_appointments_and_escrow',
  async up(db: mysql.Pool) {
    const statements = [
      `CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(64) PRIMARY KEY,
        salon_id VARCHAR(64) NOT NULL,
        stylist_id VARCHAR(64) NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        service_id VARCHAR(64) NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        scheduled_date DATE NOT NULL,
        slot_start_time VARCHAR(5) NOT NULL,
        slot_end_time VARCHAR(5) NOT NULL,
        duration_minutes INT NOT NULL DEFAULT 30,
        advance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        payment_method ENUM('RAZORPAY', 'UPI_QR', 'WALLET', 'PAY_AT_SALON') NOT NULL DEFAULT 'RAZORPAY',
        gateway_order_id VARCHAR(128) NULL,
        gateway_payment_id VARCHAR(128) NULL,
        escrow_status ENUM('HELD', 'RELEASED_TO_OWNER', 'REFUNDED_TO_CUSTOMER', 'PARTIAL_SPLIT') NOT NULL DEFAULT 'HELD',
        status ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'IN_CHAIR', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED') NOT NULL DEFAULT 'PENDING_PAYMENT',
        rescheduled_from_id VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_salon_slot (salon_id, scheduled_date, status),
        INDEX idx_customer (customer_phone),
        INDEX idx_stylist_slot (stylist_id, scheduled_date, slot_start_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS salon_payout_records (
        id VARCHAR(64) PRIMARY KEY,
        salon_id VARCHAR(64) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        gross_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        gateway_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        net_payout DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        payout_vpa VARCHAR(100) NULL,
        payout_reference_id VARCHAR(128) NULL,
        status ENUM('PENDING', 'PROCESSING', 'SETTLED', 'FAILED') NOT NULL DEFAULT 'PENDING',
        settled_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_salon_payout (salon_id, status, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];

    for (const sql of statements) {
      await db.query(sql);
    }
  },

  async down(db: mysql.Pool) {
    const tables = ['salon_payout_records', 'appointments'];
    for (const t of tables) {
      await db.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
};
