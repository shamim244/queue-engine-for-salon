import { initDatabase, getDb } from './mysql';
import { seedDemoData, repository } from './repository';
import { authService } from '../auth/auth-service';

async function resetDatabase() {
  console.log('\n======================================================');
  console.log('🧹 RESETTING DATABASE & SEEDING STANDARD SALON SYSTEM');
  console.log('======================================================\n');

  const connected = await initDatabase();
  if (!connected) {
    console.error('❌ Could not connect to MySQL database.');
    process.exit(1);
  }

  const db = getDb();

  console.log('🗑️  Wiping legacy salons, users, and ticket data...');
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  
  const tables = [
    'queue_jobs',
    'service_logs',
    'queue_tickets',
    'services',
    'stylists',
    'sessions',
    'users',
    'customers',
    'salons',
    'organizations'
  ];

  for (const table of tables) {
    try {
      await db.query(`TRUNCATE TABLE \`${table}\``);
      console.log(`  ✓ Truncated table \`${table}\``);
    } catch (err: any) {
      await db.query(`DELETE FROM \`${table}\``);
      console.log(`  ✓ Cleared rows from \`${table}\``);
    }
  }

  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('\n🌱 Seeding standard salon architecture and Super Admin...');
  seedDemoData();
  
  // Wait a moment for async syncDemoToMySql to persist
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await authService.seedDefaultUsers();

  // Verify contents
  const [salons]: any = await db.query('SELECT id, name, slug FROM salons');
  const [users]: any = await db.query('SELECT id, username, role, email FROM users');
  const [stylists]: any = await db.query('SELECT id, salon_id, name FROM stylists');
  const [services]: any = await db.query('SELECT id, salon_id, name, base_price FROM services');

  console.log('\n======================================================');
  console.log('✨ DATABASE RESET & INITIALIZATION COMPLETE');
  console.log('======================================================');
  console.log(`🏢 Active Salons (${salons.length}):`, salons.map((s: any) => `${s.name} (/${s.slug})`));
  console.log(`👥 Active Users (${users.length}):`, users.map((u: any) => `${u.username} [${u.role}]`));
  console.log(`✂️  Stylists (${stylists.length})`);
  console.log(`📋 Services (${services.length})`);
  console.log('\n🔑 Super Admin Login Credentials:');
  console.log('   Username: admin');
  console.log('   Password: Admin@123');
  console.log('   Email:    admin@engineque.com\n');

  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error('Fatal error during reset:', err);
  process.exit(1);
});
