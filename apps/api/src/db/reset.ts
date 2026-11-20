import { initDatabase, getDb } from './mysql';
import { fresh } from './migrator';

async function resetDatabase() {
  const connected = await initDatabase({ skipAutoMigrate: true });
  if (!connected) {
    console.error('❌ Could not connect to MySQL database.');
    process.exit(1);
  }

  const db = getDb();
  await fresh(db, { seed: true });
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error('Fatal error during reset:', err);
  process.exit(1);
});
