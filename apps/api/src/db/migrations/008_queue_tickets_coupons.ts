import type { Migration } from './types';
import type mysql from 'mysql2/promise';

export const migration_008_queue_tickets_coupons: Migration = {
  name: '008_queue_tickets_coupons',
  up: async (db: mysql.Pool) => {
    const columns = [
      `ALTER TABLE queue_tickets ADD COLUMN coupon_code VARCHAR(50) NULL;`,
      `ALTER TABLE queue_tickets ADD COLUMN coupon_discount DECIMAL(10, 2) DEFAULT 0.00;`,
      `ALTER TABLE queue_tickets ADD COLUMN coupon_id VARCHAR(36) NULL;`,
      `ALTER TABLE queue_tickets ADD COLUMN coupon_discount_type VARCHAR(20) NULL;`,
      `ALTER TABLE queue_tickets ADD COLUMN coupon_discount_value DECIMAL(10, 2) NULL;`,
      `ALTER TABLE queue_tickets ADD COLUMN coupon_max_discount DECIMAL(10, 2) NULL;`,
    ];
    for (const sql of columns) {
      try {
        await db.query(sql);
      } catch (err: any) {
        if (!err.message?.includes('Duplicate column')) {
          throw err;
        }
      }
    }
  },
  down: async (db: mysql.Pool) => {
    const columns = [
      'coupon_code',
      'coupon_discount',
      'coupon_id',
      'coupon_discount_type',
      'coupon_discount_value',
      'coupon_max_discount',
    ];
    for (const col of columns) {
      try {
        await db.query(`ALTER TABLE queue_tickets DROP COLUMN \`${col}\`;`);
      } catch (err: any) {
        // ignore
      }
    }
  },
};
