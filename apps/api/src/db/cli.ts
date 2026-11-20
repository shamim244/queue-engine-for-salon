import { initDatabase, getDb } from './mysql';
import * as migrator from './migrator';

async function runCli() {
  const command = process.argv[2] || 'status';
  const hasSeedFlag = process.argv.includes('--seed');

  const connected = await initDatabase({ skipAutoMigrate: true });
  if (!connected) {
    console.error('❌ Could not connect to MySQL database.');
    process.exit(1);
  }

  const db = getDb();

  try {
    switch (command) {
      case 'migrate':
        await migrator.migrate(db);
        break;

      case 'status':
        await migrator.status(db);
        break;

      case 'fresh':
        await migrator.fresh(db, { seed: hasSeedFlag });
        break;

      case 'reset':
        await migrator.fresh(db, { seed: true });
        break;

      case 'rollback':
        const steps = parseInt(process.argv[3] || '1', 10);
        await migrator.rollback(db, steps);
        break;

      case 'seed':
        await migrator.seed(db);
        break;

      default:
        console.log(`
Unknown command: "${command}"

Available commands (similar to Laravel artisan):
  bun src/db/cli.ts migrate          Run pending database migrations
  bun src/db/cli.ts status           Show status of each migration
  bun src/db/cli.ts fresh            Drop all tables and run all migrations
  bun src/db/cli.ts fresh --seed     Drop all tables, re-run all migrations, and seed initial data
  bun src/db/cli.ts reset            Alias for fresh --seed
  bun src/db/cli.ts rollback [steps] Rollback the last migration batch (or specified steps)
  bun src/db/cli.ts seed             Run database seeders (Admin, Salon demo catalog, plans)
`);
        break;
    }
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Database CLI command failed:', err.message || err);
    process.exit(1);
  }
}

runCli();
