import mysql from 'mysql2/promise';
import { config } from '../config';

let pool: mysql.Pool | null = null;
export let isMySqlConnected = false;

export async function initDatabase(): Promise<boolean> {
  try {
    // 1. Initial connection to verify server & create database
    const tempConnection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
    });

    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await tempConnection.end();

    // 2. Create the real connection pool
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: 'Z',
    });

    // 3. Ensure tables exist
    await runMigrations();

    isMySqlConnected = true;
    console.log(`[MySQL 8.0] Successfully connected to '${config.db.database}' at ${config.db.host}:${config.db.port}`);
    return true;
  } catch (err: any) {
    console.warn(`[MySQL 8.0 Warning] Could not connect to MySQL: ${err.message}`);
    console.warn(`[Engine Que System] Operating with resilient In-Memory Store. (Update DB_PASSWORD in .env when ready).`);
    isMySqlConnected = false;
    return false;
  }
}

async function runMigrations() {
  if (!pool) return;
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS salons (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        country_code VARCHAR(5) DEFAULT '+91',
        currency VARCHAR(10) DEFAULT 'INR',
        address VARCHAR(255) NULL,
        upi_payment_id VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS stylists (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        historical_avg_duration_minutes INT DEFAULT 25,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_salon_active (salon_id, is_active)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS services (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        base_price DECIMAL(10, 2) NOT NULL,
        estimated_duration_minutes INT NOT NULL,
        is_add_on BOOLEAN DEFAULT FALSE,
        icon VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_salon_addon (salon_id, is_add_on)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS queue_tickets (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        stylist_id VARCHAR(36) NULL,
        ticket_number INT NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        service_id VARCHAR(36) NOT NULL,
        service_name VARCHAR(100) NOT NULL,
        selected_add_ons JSON NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        total_duration_minutes INT NOT NULL,
        status ENUM('WAITING', 'SUMMONED', 'IN_CHAIR', 'COMPLETED', 'SOFT_BUMPED', 'CANCELLED', 'NO_SHOW', 'PAUSED') DEFAULT 'WAITING',
        source ENUM('QR_SCAN', 'BARBER_QUICK_ADD', 'RECEPTIONIST', 'REMOTE_WEB') DEFAULT 'QR_SCAN',
        estimated_wait_minutes INT DEFAULT 0,
        check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        summoned_time TIMESTAMP NULL,
        started_time TIMESTAMP NULL,
        completed_time TIMESTAMP NULL,
        payment_status ENUM('PENDING', 'CASH_PAID', 'ONLINE_PAID') DEFAULT 'PENDING',
        payment_amount DECIMAL(10, 2) NULL,
        INDEX idx_salon_status_time (salon_id, status, check_in_time),
        INDEX idx_stylist_status (stylist_id, status)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS service_logs (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NOT NULL,
        stylist_id VARCHAR(36) NOT NULL,
        service_id VARCHAR(36) NOT NULL,
        actual_duration_minutes INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        salon_id VARCHAR(36) NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        staff_id VARCHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_salon (salon_id)
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

    `CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        tier ENUM('STARTER', 'PRO', 'ENTERPRISE') DEFAULT 'STARTER',
        owner_id VARCHAR(36) NULL,
        max_branches INT DEFAULT 1,
        max_stylists_per_branch INT DEFAULT 2,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;`,

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
    ) ENGINE=InnoDB;`,

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
    ) ENGINE=InnoDB;`,

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
    ) ENGINE=InnoDB;`,
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
    ) ENGINE=InnoDB;`
  ];

  for (const sql of tables) {
    await pool.query(sql);
  }

  // Safe Column additions for existing installations
  const safeColumns = [
    `UPDATE organizations SET tier = 'STARTER' WHERE tier = 'SOLO';`,
    `ALTER TABLE organizations MODIFY COLUMN tier ENUM('STARTER', 'PRO', 'ENTERPRISE') DEFAULT 'STARTER';`,
    `ALTER TABLE salons ADD COLUMN organization_id VARCHAR(36) NULL;`,
    `ALTER TABLE salons MODIFY COLUMN operating_mode VARCHAR(50) NULL DEFAULT NULL;`,
    `ALTER TABLE salons ADD COLUMN tagline VARCHAR(255) NULL;`,
    `ALTER TABLE salons ADD COLUMN about TEXT NULL;`,
    `ALTER TABLE salons ADD COLUMN email VARCHAR(150) NULL;`,
    `ALTER TABLE salons ADD COLUMN whatsapp_phone VARCHAR(25) NULL;`,
    `ALTER TABLE salons ADD COLUMN google_maps_url VARCHAR(500) NULL;`,
    `ALTER TABLE salons ADD COLUMN instagram_handle VARCHAR(100) NULL;`,
    `ALTER TABLE salons ADD COLUMN operating_hours VARCHAR(255) NULL;`,
    `ALTER TABLE salons ADD COLUMN amenities JSON NULL;`,
    `ALTER TABLE salons ADD COLUMN announcement VARCHAR(255) NULL;`,
    `ALTER TABLE salons ADD COLUMN announcement_active BOOLEAN DEFAULT FALSE;`,
    `ALTER TABLE services ADD COLUMN pricing_type ENUM('FIXED', 'STARTING_AT', 'FLEXIBLE_CHAIR') DEFAULT 'FIXED';`,
    `ALTER TABLE queue_tickets ADD COLUMN routing_preference ENUM('AUTO_FASTEST', 'SPECIFIC_STYLIST') DEFAULT 'AUTO_FASTEST';`,
    `ALTER TABLE queue_tickets MODIFY COLUMN status ENUM('WAITING', 'SUMMONED', 'IN_CHAIR', 'COMPLETED', 'SOFT_BUMPED', 'CANCELLED', 'NO_SHOW', 'PAUSED') DEFAULT 'WAITING';`,
    `ALTER TABLE queue_tickets ADD COLUMN customer_id VARCHAR(36) NULL;`,
    `ALTER TABLE queue_tickets ADD COLUMN notes TEXT NULL;`,
    `ALTER TABLE queue_tickets ADD COLUMN grooming_tags JSON NULL;`,
    `ALTER TABLE stylists ADD COLUMN username VARCHAR(100) NULL;`,
    `ALTER TABLE stylists ADD COLUMN email VARCHAR(100) NULL;`,
    `ALTER TABLE stylists ADD COLUMN user_id VARCHAR(36) NULL;`,
    `ALTER TABLE stylists ADD COLUMN pin VARCHAR(20) NULL;`,
    `ALTER TABLE stylists ADD COLUMN custom_avg_duration_minutes INT NULL;`,
    `ALTER TABLE users ADD COLUMN full_name VARCHAR(150) NULL;`,
    `ALTER TABLE users ADD COLUMN organization_id VARCHAR(36) NULL;`,
    `ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL;`,
    `ALTER TABLE users ADD COLUMN email VARCHAR(100) NULL;`,
    `ALTER TABLE users ADD COLUMN pin_hash VARCHAR(255) NULL;`,
    `ALTER TABLE users ADD COLUMN status VARCHAR(30) DEFAULT 'ACTIVE';`,
    `ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL;`,
    `ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL;`,
    `ALTER TABLE users MODIFY COLUMN status VARCHAR(30) DEFAULT 'ACTIVE';`
  ];

  for (const colSql of safeColumns) {
    try {
      await pool.query(colSql);
    } catch (e) {
      // Column already exists, ignore
    }
  }
}

export function getDb(): mysql.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized.');
  }
  return pool;
}
