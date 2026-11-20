import type { Migration } from './types';
import type mysql from 'mysql2/promise';

export const migration_006_security_settings: Migration = {
  name: '006_security_settings',
  up: async (db: mysql.Pool) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS security_settings (
        id VARCHAR(36) PRIMARY KEY,
        pin_max_attempts INT DEFAULT 5,
        pin_window_seconds INT DEFAULT 900,
        login_max_attempts INT DEFAULT 10,
        login_window_seconds INT DEFAULT 900,
        checkin_max_attempts INT DEFAULT 10,
        checkin_window_seconds INT DEFAULT 300,
        allowed_custom_origins JSON NULL,
        default_country_code VARCHAR(10) DEFAULT '+91',
        allowed_country_codes JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure default settings record exists
    await db.query(`
      INSERT IGNORE INTO security_settings (
        id, pin_max_attempts, pin_window_seconds, login_max_attempts, login_window_seconds, 
        checkin_max_attempts, checkin_window_seconds, default_country_code
      ) VALUES (
        'default_security_settings', 5, 900, 10, 900, 10, 300, '+91'
      );
    `);
  },
  down: async (db: mysql.Pool) => {
    await db.query(`DROP TABLE IF EXISTS security_settings;`);
  }
};
