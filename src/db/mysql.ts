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
        operating_mode ENUM('RURAL_SOLO', 'MODERN_MULTI') DEFAULT 'RURAL_SOLO',
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
        status ENUM('WAITING', 'SUMMONED', 'IN_CHAIR', 'COMPLETED', 'SOFT_BUMPED', 'CANCELLED', 'NO_SHOW') DEFAULT 'WAITING',
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
        role ENUM('SUPER_ADMIN', 'SALON_OWNER', 'STAFF') NOT NULL,
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
    ) ENGINE=InnoDB;`
  ];

  for (const sql of tables) {
    await pool.query(sql);
  }

  // Safe Column additions for existing installations
  const safeColumns = [
    `ALTER TABLE services ADD COLUMN pricing_type ENUM('FIXED', 'STARTING_AT', 'FLEXIBLE_CHAIR') DEFAULT 'FIXED';`,
    `ALTER TABLE queue_tickets ADD COLUMN routing_preference ENUM('AUTO_FASTEST', 'SPECIFIC_STYLIST') DEFAULT 'AUTO_FASTEST';`,
    `ALTER TABLE queue_tickets ADD COLUMN customer_id VARCHAR(36) NULL;`,
    `ALTER TABLE stylists ADD COLUMN username VARCHAR(100) NULL;`,
    `ALTER TABLE stylists ADD COLUMN custom_avg_duration_minutes INT NULL;`
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
