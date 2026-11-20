import type mysql from 'mysql2/promise';
import type { Migration } from './types';

export const migration_001_core_salons_and_queues: Migration = {
  name: '001_core_salons_and_queues',
  async up(db: mysql.Pool) {
    const statements = [
      `CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        tier ENUM('FREE', 'STARTER', 'PRO', 'ENTERPRISE') DEFAULT 'FREE',
        plan_id VARCHAR(36) NULL,
        owner_id VARCHAR(36) NULL,
        max_branches INT DEFAULT 1,
        max_stylists_per_branch INT DEFAULT 2,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS salons (
        id VARCHAR(36) PRIMARY KEY,
        organization_id VARCHAR(36) NULL,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        operating_mode VARCHAR(50) NULL DEFAULT NULL,
        country_code VARCHAR(5) DEFAULT '+91',
        currency VARCHAR(10) DEFAULT 'INR',
        address VARCHAR(255) NULL,
        upi_payment_id VARCHAR(100) NULL,
        tagline VARCHAR(255) NULL,
        about TEXT NULL,
        email VARCHAR(150) NULL,
        whatsapp_phone VARCHAR(25) NULL,
        google_maps_url VARCHAR(500) NULL,
        instagram_handle VARCHAR(100) NULL,
        operating_hours VARCHAR(255) NULL,
        amenities JSON NULL,
        announcement VARCHAR(255) NULL,
        announcement_active BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS stylists (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        username VARCHAR(100) NULL,
        email VARCHAR(100) NULL,
        user_id VARCHAR(36) NULL,
        pin VARCHAR(20) NULL,
        custom_avg_duration_minutes INT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        historical_avg_duration_minutes INT DEFAULT 25,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_salon_active (salon_id, is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        base_price DECIMAL(10, 2) NOT NULL,
        estimated_duration_minutes INT NOT NULL,
        is_add_on BOOLEAN DEFAULT FALSE,
        pricing_type ENUM('FIXED', 'STARTING_AT', 'FLEXIBLE_CHAIR') DEFAULT 'FIXED',
        icon VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_salon_addon (salon_id, is_add_on)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS queue_tickets (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        stylist_id VARCHAR(36) NULL,
        ticket_number INT NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_id VARCHAR(36) NULL,
        service_id VARCHAR(36) NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        selected_add_ons JSON NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        total_duration_minutes INT NOT NULL,
        status ENUM('WAITING', 'SUMMONED', 'IN_CHAIR', 'COMPLETED', 'SOFT_BUMPED', 'CANCELLED', 'NO_SHOW', 'PAUSED') DEFAULT 'WAITING',
        source ENUM('QR_SCAN', 'BARBER_QUICK_ADD', 'RECEPTIONIST', 'REMOTE_WEB') DEFAULT 'QR_SCAN',
        routing_preference ENUM('AUTO_FASTEST', 'SPECIFIC_STYLIST') DEFAULT 'AUTO_FASTEST',
        notes TEXT NULL,
        grooming_tags JSON NULL,
        estimated_wait_minutes INT DEFAULT 0,
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        summoned_time TIMESTAMP NULL,
        started_time TIMESTAMP NULL,
        completed_time TIMESTAMP NULL,
        payment_status ENUM('PENDING', 'CASH_PAID', 'ONLINE_PAID') DEFAULT 'PENDING',
        payment_amount DECIMAL(10, 2) NULL,
        coupon_code VARCHAR(50) NULL,
        coupon_discount DECIMAL(10, 2) DEFAULT 0.00,
        coupon_id VARCHAR(36) NULL,
        coupon_discount_type VARCHAR(20) NULL,
        coupon_discount_value DECIMAL(10, 2) NULL,
        coupon_max_discount DECIMAL(10, 2) NULL,
        INDEX idx_salon_status_time (salon_id, status, check_in_time),
        INDEX idx_stylist_status (stylist_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS service_logs (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        stylist_id VARCHAR(36) NOT NULL,
        service_id VARCHAR(36) NOT NULL,
        actual_duration_minutes INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NULL,
        organization_id VARCHAR(36) NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(150) NULL,
        phone VARCHAR(20) NULL,
        email VARCHAR(100) NULL,
        role VARCHAR(50) NOT NULL,
        staff_id VARCHAR(36) NULL,
        pin_hash VARCHAR(255) NULL,
        status VARCHAR(30) DEFAULT 'ACTIVE',
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_salon (salon_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token VARCHAR(128) UNIQUE NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(255) NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_token (token),
        INDEX idx_session_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS queue_jobs (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NULL,
        type VARCHAR(50) NOT NULL,
        payload JSON NOT NULL,
        status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') DEFAULT 'PENDING',
        attempts INT DEFAULT 0,
        max_attempts INT DEFAULT 3,
        last_error TEXT NULL,
        scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_job_status_sched (status, scheduled_for),
        INDEX idx_job_salon (salon_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS stylist_service_durations (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        stylist_id VARCHAR(36) NOT NULL,
        service_id VARCHAR(36) NOT NULL,
        duration_minutes INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_stylist_service (stylist_id, service_id),
        INDEX idx_salon_stylist (salon_id, stylist_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS staff_leaves (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        stylist_id VARCHAR(36) NOT NULL,
        leave_date DATE NOT NULL,
        end_date DATE NULL,
        reason VARCHAR(255) NULL,
        status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'APPROVED',
        applied_by VARCHAR(50) DEFAULT 'OWNER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_salon_date (salon_id, leave_date),
        INDEX idx_stylist_date (stylist_id, leave_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    ];

    for (const sql of statements) {
      await db.query(sql);
    }
  },

  async down(db: mysql.Pool) {
    const tables = [
      'staff_leaves', 'stylist_service_durations', 'queue_jobs', 'sessions',
      'customers', 'users', 'service_logs', 'queue_tickets', 'services',
      'stylists', 'salons', 'organizations'
    ];
    for (const t of tables) {
      await db.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
};
