import type { Migration } from './types';
import type mysql from 'mysql2/promise';

export const migration_009_salon_wifi_and_loyalty_settings: Migration = {
  name: '009_salon_wifi_and_loyalty_settings',
  up: async (db: mysql.Pool) => {
    const columns = [
      `ALTER TABLE salons ADD COLUMN wifi_ssid VARCHAR(100) NULL;`,
      `ALTER TABLE salons ADD COLUMN wifi_password VARCHAR(100) NULL;`,
      `ALTER TABLE salons ADD COLUMN enable_lounge_wifi BOOLEAN NOT NULL DEFAULT TRUE;`,
      `ALTER TABLE salons ADD COLUMN enable_screen_wake_lock BOOLEAN NOT NULL DEFAULT TRUE;`,
      `ALTER TABLE salons ADD COLUMN loyalty_enabled BOOLEAN NOT NULL DEFAULT TRUE;`,
      `ALTER TABLE salons ADD COLUMN loyalty_stamp_goal INT NOT NULL DEFAULT 6;`,
      `ALTER TABLE salons ADD COLUMN loyalty_referrer_bonus DECIMAL(10, 2) NOT NULL DEFAULT 50.00;`,
      `ALTER TABLE salons ADD COLUMN loyalty_referee_discount DECIMAL(10, 2) NOT NULL DEFAULT 50.00;`,
      `ALTER TABLE salons ADD COLUMN loyalty_reward_description VARCHAR(255) NOT NULL DEFAULT 'Free Haircut or Beard Grooming';`,
      `ALTER TABLE salons ADD COLUMN loyalty_reward_service_id VARCHAR(36) NULL;`,
      `ALTER TABLE salons ADD COLUMN loyalty_reward_service_name VARCHAR(100) NULL;`,
      `ALTER TABLE salons ADD COLUMN loyalty_cooldown_hours INT NOT NULL DEFAULT 4;`,
      `ALTER TABLE salons ADD COLUMN loyalty_voucher_validity_days INT NOT NULL DEFAULT 90;`,
    ];

    for (const sql of columns) {
      try {
        await db.query(sql);
      } catch (err: any) {
        if (err.code !== 'ER_DUP_FIELDNAME' && err.errno !== 1060 && !err.message?.includes('Duplicate column')) {
          throw err;
        }
      }
    }
  },
  down: async (db: mysql.Pool) => {
    const columns = [
      'wifi_ssid',
      'wifi_password',
      'enable_lounge_wifi',
      'enable_screen_wake_lock',
      'loyalty_enabled',
      'loyalty_stamp_goal',
      'loyalty_referrer_bonus',
      'loyalty_referee_discount',
      'loyalty_reward_description',
    ];
    for (const col of columns) {
      try {
        await db.query(`ALTER TABLE salons DROP COLUMN \`${col}\`;`);
      } catch (err: any) {
        // ignore errors during rollback
      }
    }
  },
};
