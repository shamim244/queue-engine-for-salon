import type { Migration } from './types';
import type mysql from 'mysql2/promise';

export const migration_010_platform_settings_and_landing_config: Migration = {
  name: '010_platform_settings_and_landing_config',
  up: async (db: mysql.Pool) => {
    // 1. Create platform_settings table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id VARCHAR(64) PRIMARY KEY,
        settings JSON NOT NULL,
        landing_page_config JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Add landing_page_config column if table already existed without it
    try {
      await db.query(`ALTER TABLE platform_settings ADD COLUMN landing_page_config JSON NULL;`);
    } catch (err: any) {
      if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060 && !err.message?.includes('Duplicate column')) {
        // Ignored if column already exists
      }
    }
  },
  down: async (db: mysql.Pool) => {
    try {
      await db.query(`DROP TABLE IF EXISTS platform_settings;`);
    } catch {}
  },
};
