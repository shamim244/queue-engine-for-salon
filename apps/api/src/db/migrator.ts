import type mysql from 'mysql2/promise';
import type { Migration } from './migrations/types';
import { migration_001_core_salons_and_queues } from './migrations/001_core_salons_and_queues';
import { migration_002_plans_and_billing } from './migrations/002_plans_and_billing';
import { migration_003_coupons_and_wallets } from './migrations/003_coupons_and_wallets';
import { migration_004_appointments_and_escrow } from './migrations/004_appointments_and_escrow';
import { migration_005_partner_affiliate_system } from './migrations/005_partner_affiliate_system';
import { migration_006_security_settings } from './migrations/006_security_settings';
import { migration_007_milestone_loyalty_and_specs } from './migrations/007_milestone_loyalty_and_specs';
import { migration_008_queue_tickets_coupons } from './migrations/008_queue_tickets_coupons';
import { migration_009_salon_wifi_and_loyalty_settings } from './migrations/009_salon_wifi_and_loyalty_settings';
import { migration_010_platform_settings_and_landing_config } from './migrations/010_platform_settings_and_landing_config';

import { seedDemoData, syncDemoToMySql, memoryStore } from './repository';
import { authService } from '../auth/auth-service';

export const allMigrations: Migration[] = [
  migration_001_core_salons_and_queues,
  migration_002_plans_and_billing,
  migration_003_coupons_and_wallets,
  migration_004_appointments_and_escrow,
  migration_005_partner_affiliate_system,
  migration_006_security_settings,
  migration_007_milestone_loyalty_and_specs,
  migration_008_queue_tickets_coupons,
  migration_009_salon_wifi_and_loyalty_settings,
  migration_010_platform_settings_and_landing_config,
];

export async function ensureMigrationsTable(db: mysql.Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      batch INT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

export async function getAppliedMigrations(db: mysql.Pool): Promise<Array<{ id: number; name: string; batch: number; applied_at: Date }>> {
  await ensureMigrationsTable(db);
  const [rows]: any = await db.query(`SELECT id, name, batch, applied_at FROM migrations ORDER BY id ASC`);
  return rows || [];
}

export async function migrate(db: mysql.Pool): Promise<number> {
  await ensureMigrationsTable(db);
  const applied = await getAppliedMigrations(db);
  const appliedNames = new Set(applied.map(m => m.name));

  const [batchRow]: any = await db.query(`SELECT COALESCE(MAX(batch), 0) as max_batch FROM migrations`);
  const nextBatch = (batchRow?.[0]?.max_batch || 0) + 1;

  const pending = allMigrations.filter(m => !appliedNames.has(m.name));

  if (pending.length === 0) {
    console.log('✅ Nothing to migrate. Database schema is already up to date.');
    return 0;
  }

  console.log(`🚀 Running ${pending.length} pending migration(s) [Batch ${nextBatch}]...`);

  for (const migration of pending) {
    console.log(`  ⏳ Migrating: ${migration.name}...`);
    const start = Date.now();
    try {
      await migration.up(db);
      await db.query(`INSERT INTO migrations (name, batch) VALUES (?, ?)`, [migration.name, nextBatch]);
      const elapsed = Date.now() - start;
      console.log(`  ✓ Migrated:  ${migration.name} (${elapsed}ms)`);
    } catch (err: any) {
      console.error(`  ❌ Failed migrating ${migration.name}:`, err.message);
      throw err;
    }
  }

  console.log(`🎉 Successfully applied ${pending.length} migration(s).`);
  return pending.length;
}

export async function rollback(db: mysql.Pool, steps: number = 1): Promise<number> {
  await ensureMigrationsTable(db);
  const [batchRows]: any = await db.query(`SELECT DISTINCT batch FROM migrations ORDER BY batch DESC LIMIT ?`, [steps]);
  if (!batchRows || batchRows.length === 0) {
    console.log('ℹ️ No migrations found to rollback.');
    return 0;
  }

  const batchesToRollback = batchRows.map((r: any) => r.batch);
  const [records]: any = await db.query(
    `SELECT name, batch FROM migrations WHERE batch IN (?) ORDER BY id DESC`,
    [batchesToRollback]
  );

  console.log(`⏪ Rolling back batch(es): ${batchesToRollback.join(', ')} (${records.length} migrations)...`);

  let count = 0;
  for (const record of records) {
    const migration = allMigrations.find(m => m.name === record.name);
    if (migration) {
      console.log(`  ⏳ Rolling back: ${migration.name}...`);
      const start = Date.now();
      try {
        await migration.down(db);
        await db.query(`DELETE FROM migrations WHERE name = ?`, [record.name]);
        const elapsed = Date.now() - start;
        console.log(`  ✓ Rolled back: ${migration.name} (${elapsed}ms)`);
        count++;
      } catch (err: any) {
        console.error(`  ❌ Error rolling back ${migration.name}:`, err.message);
        throw err;
      }
    } else {
      console.warn(`  ⚠️ Migration definition not found for ${record.name}. Removing entry from ledger.`);
      await db.query(`DELETE FROM migrations WHERE name = ?`, [record.name]);
    }
  }

  console.log(`🎉 Successfully rolled back ${count} migration(s).`);
  return count;
}

export async function status(db: mysql.Pool): Promise<void> {
  await ensureMigrationsTable(db);
  const applied = await getAppliedMigrations(db);
  const appliedMap = new Map(applied.map(m => [m.name, m]));

  console.log('\n========================================================================================');
  console.log('📊 DATABASE MIGRATION STATUS');
  console.log('========================================================================================');
  console.log(
    'Migration'.padEnd(42) +
    'Status'.padEnd(16) +
    'Batch'.padEnd(10) +
    'Applied At'
  );
  console.log('----------------------------------------------------------------------------------------');

  for (const m of allMigrations) {
    const record = appliedMap.get(m.name);
    if (record) {
      const dateStr = record.applied_at ? new Date(record.applied_at).toISOString().replace('T', ' ').substring(0, 19) : '-';
      console.log(
        m.name.padEnd(42) +
        '\x1b[32mRan\x1b[0m'.padEnd(25) +
        String(record.batch).padEnd(10) +
        dateStr
      );
    } else {
      console.log(
        m.name.padEnd(42) +
        '\x1b[33mPending\x1b[0m'.padEnd(25) +
        '-'.padEnd(10) +
        '-'
      );
    }
  }
  console.log('========================================================================================\n');
}

export async function fresh(db: mysql.Pool, options: { seed?: boolean } = {}): Promise<void> {
  console.log('\n======================================================');
  console.log('⚠️  DATABASE FRESH: DROPPING ALL TABLES & RE-MIGRATING');
  console.log('======================================================\n');

  console.log('🔒 Disabling foreign key checks...');
  await db.query('SET FOREIGN_KEY_CHECKS = 0');

  const [tables]: any = await db.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
  `);

  if (tables && tables.length > 0) {
    console.log(`🗑️  Dropping ${tables.length} existing tables...`);
    for (const row of tables) {
      const tableName = row.TABLE_NAME || row.table_name;
      await db.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`   ✓ Dropped table \`${tableName}\``);
    }
  } else {
    console.log('ℹ️ No existing tables found.');
  }

  console.log('🔓 Re-enabling foreign key checks...');
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('\n🚀 Running fresh migrations...');
  await migrate(db);

  if (options.seed) {
    console.log('\n🌱 Running database seeders...');
    await seed(db);
  }

  console.log('\n✨ Database is fresh and fully synchronized!\n');
}

export async function seed(db: mysql.Pool): Promise<void> {
  console.log('🌱 Seeding demo catalog, plans, organizations, and default users...');
  seedDemoData();
  const salons = Array.from(memoryStore.salons.values());
  await syncDemoToMySql(salons);
  await authService.seedDefaultUsers();

  const [salonsCount]: any = await db.query('SELECT COUNT(*) as count FROM salons');
  const [usersCount]: any = await db.query('SELECT COUNT(*) as count FROM users');
  const [plansCount]: any = await db.query('SELECT COUNT(*) as count FROM subscription_plans');

  console.log(`✅ Seeding complete:`);
  console.log(`   - Salons: ${salonsCount[0].count}`);
  console.log(`   - Users:  ${usersCount[0].count}`);
  console.log(`   - Plans:  ${plansCount[0].count}`);
  console.log('\n🔑 Default Super Admin:');
  console.log('   Username: admin');
  console.log('   Password: Admin@123\n');
}
