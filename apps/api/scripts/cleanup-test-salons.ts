import { getDb, initDatabase } from '../src/db/mysql';
import { cacheService } from '../src/cache/cache.service';
import { memoryStore, salonCache } from '../src/db/repositories/store';

async function cleanup() {
  console.log('🚀 Starting permanent database cleanup of test salons...');
  await initDatabase();
  const db = getDb();

  // 1. Identify salons to keep (Royal salons)
  const [keepRows]: any = await db.query(
    `SELECT id, name, slug FROM salons WHERE LOWER(name) LIKE '%royal%' OR LOWER(slug) LIKE '%royal%'`
  );
  const keepIds: string[] = keepRows.map((r: any) => r.id);
  console.log(`🛡️ Keeping ${keepIds.length} Royal salons:`, keepRows);

  if (keepIds.length === 0) {
    console.error('❌ Aborting: No Royal salons found to protect!');
    process.exit(1);
  }

  // 2. Identify test salons to permanently delete
  const [deleteRows]: any = await db.query(
    `SELECT id, name, slug FROM salons WHERE id NOT IN (${keepIds.map(() => '?').join(',')})`,
    keepIds
  );
  const deleteIds: string[] = deleteRows.map((r: any) => r.id);
  console.log(`🗑️ Found ${deleteIds.length} test salons to permanently delete.`);

  if (deleteIds.length === 0) {
    console.log('✅ No test salons to delete. Database is already clean.');
    await cacheService.clear();
    salonCache.clear();
    process.exit(0);
  }

  // Chunk deletion to prevent SQL query size limits
  const chunkSize = 50;
  for (let i = 0; i < deleteIds.length; i += chunkSize) {
    const chunk = deleteIds.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');

    // Delete child records first
    const tablesToClean = [
      'queue_tickets',
      'appointments',
      'service_logs',
      'services',
      'staff_leaves',
      'stylist_service_durations',
      'stylists',
      'coupons',
      'partner_salon_attributions',
      'partner_wallet_ledger',
      'payment_orders',
      'queue_jobs',
      'referral_attributions',
      'salon_payout_records',
      'wallet_transactions',
      'wallets',
    ];

    for (const table of tablesToClean) {
      try {
        await db.query(`DELETE FROM ${table} WHERE salon_id IN (${placeholders})`, chunk);
      } catch (err: any) {
        // Table might not have records or slightly different schema; log and continue
      }
    }

    // Delete linked non-admin users
    try {
      await db.query(
        `DELETE FROM users WHERE salon_id IN (${placeholders}) AND role != 'SUPER_ADMIN'`,
        chunk
      );
    } catch (err) {}

    // Delete the salons themselves
    await db.query(`DELETE FROM salons WHERE id IN (${placeholders})`, chunk);
    console.log(`   Deleted chunk ${i / chunkSize + 1} (${chunk.length} salons)`);
  }

  // 3. Clear all caches (Redis + In-Memory)
  console.log('🧹 Purging Redis and In-Memory cache...');
  await cacheService.clear();
  salonCache.clear();

  // 4. Verify final state
  const [remainingSalons]: any = await db.query('SELECT id, name, slug FROM salons');
  const [remainingUsers]: any = await db.query('SELECT id, username, role, salon_id FROM users');
  console.log(`\n======================================================`);
  console.log(`🎉 CLEANUP COMPLETE!`);
  console.log(`Remaining Salons (${remainingSalons.length}):`, remainingSalons);
  console.log(`Remaining Users (${remainingUsers.length}):`, remainingUsers);
  console.log(`======================================================\n`);

  await cacheService.disconnect();
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
