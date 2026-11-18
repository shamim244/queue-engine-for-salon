import { initDatabase, getDb } from "../src/db/mysql";

async function runReset() {
  console.log("=== RESETTING DATABASE (PRESERVING ADMIN & ROYAL SALON ONLY) ===");
  await initDatabase();
  const db = getDb();

  // 1. Ensure Royal Salon Organization exists on FREE tier
  const [existingOrg]: any = await db.query("SELECT id FROM organizations WHERE id = 'org-royal' OR slug = 'royal'");
  if (existingOrg.length === 0) {
    await db.query(`
      INSERT INTO organizations (id, name, slug, tier, plan_id, max_branches, max_stylists_per_branch, created_at)
      VALUES ('org-royal', 'Royal Salon', 'royal', 'FREE', NULL, 1, 2, NOW())
    `);
    console.log("✓ Created org-royal on FREE tier");
  } else {
    await db.query(`
      UPDATE organizations 
      SET tier = 'FREE', plan_id = NULL, max_branches = 1, max_stylists_per_branch = 2 
      WHERE id = ?
    `, [existingOrg[0].id]);
    console.log("✓ Reset org-royal to FREE tier");
  }

  // 2. Link Royal Salon to org-royal
  await db.query(`
    UPDATE salons 
    SET organization_id = 'org-royal' 
    WHERE id = 'salon-eagzbsy' OR slug = 'royal'
  `);
  console.log("✓ Linked salon-eagzbsy to org-royal");

  // 3. Link Royal Salon users to org-royal
  await db.query(`
    UPDATE users 
    SET organization_id = 'org-royal' 
    WHERE salon_id = 'salon-eagzbsy'
  `);
  console.log("✓ Linked Royal Salon staff/owner users to org-royal");

  // 4. Delete all other salons except Royal Salon
  const [salonsDeleted]: any = await db.query(`
    DELETE FROM salons 
    WHERE id != 'salon-eagzbsy' AND slug != 'royal'
  `);
  console.log(`✓ Deleted ${salonsDeleted.affectedRows} other test salons`);

  // 5. Delete all other stylists and services except Royal Salon
  const [stylistsDeleted]: any = await db.query(`
    DELETE FROM stylists 
    WHERE salon_id != 'salon-eagzbsy'
  `);
  console.log(`✓ Deleted ${stylistsDeleted.affectedRows} other stylists`);

  const [servicesDeleted]: any = await db.query(`
    DELETE FROM services 
    WHERE salon_id != 'salon-eagzbsy'
  `);
  console.log(`✓ Deleted ${servicesDeleted.affectedRows} other services`);

  await db.query(`
    DELETE FROM stylist_service_durations 
    WHERE stylist_id NOT IN ('stylist-jk1657b', 'stylist-salon-eagzbsy-1')
  `);

  // 6. Delete all other organizations except org-royal
  const [orgsDeleted]: any = await db.query(`
    DELETE FROM organizations 
    WHERE id != 'org-royal' AND slug != 'royal'
  `);
  console.log(`✓ Deleted ${orgsDeleted.affectedRows} test organizations`);

  // 7. Delete all users except admin and Royal Salon users
  const [usersDeleted]: any = await db.query(`
    DELETE FROM users 
    WHERE username != 'admin' AND salon_id != 'salon-eagzbsy' AND id != 'usr-bkljo6o'
  `);
  console.log(`✓ Deleted ${usersDeleted.affectedRows} test users`);

  // 8. Truncate all subscription, billing, and transactional tables
  const tablesToTruncate = [
    "organization_subscriptions",
    "payment_orders",
    "partners",
    "partner_salon_attributions",
    "partner_wallet_ledger",
    "partner_payout_requests",
    "partner_notifications",
    "referral_attributions",
    "coupons",
    "coupon_redemptions",
    "queue_tickets",
    "queue_jobs",
    "appointments",
    "service_logs",
    "staff_leaves",
    "salon_payout_records",
    "sessions",
    "wallet_transactions",
    "wallets",
  ];

  for (const table of tablesToTruncate) {
    try {
      await db.query(`DELETE FROM ${table}`);
      console.log(`✓ Purged table: ${table}`);
    } catch (err: any) {
      console.warn(`! Warning purging ${table}:`, err.message);
    }
  }

  // 9. Reset Subscription Plans to Canonical 3 Standard Tiers
  await db.query("DELETE FROM subscription_plans");
  const canonicalPlans = [
    {
      id: "plan-starter-01",
      name: "Solo Traditional Barber",
      slug: "solo-barber",
      badge: "Starter",
      description: "Perfect for single-chair barbers and independent grooming stations.",
      price_1m: 499.00,
      price_3m: 1347.00,
      price_6m: 2515.00,
      price_1y: 4192.00,
      discount_pct_3m: 10,
      discount_pct_6m: 16,
      discount_pct_1y: 30,
      cycle_1m_enabled: 1,
      cycle_3m_enabled: 1,
      cycle_6m_enabled: 1,
      cycle_1y_enabled: 1,
      max_branches: 1,
      max_stylists_per_branch: 1,
      features: JSON.stringify([
        "station_chair_transfers",
        "station_soft_bump",
        "station_hold_pause",
        "digital_storefront"
      ]),
      status: "ACTIVE",
      is_featured: 0,
      sort_order: 1
    },
    {
      id: "plan-pro-01",
      name: "Growth Studio Pro",
      slug: "growth-studio-pro",
      badge: "Most Popular",
      description: "Ideal for fast-paced multi-chair barbershops with TV departure mirrors and speed calibration.",
      price_1m: 1499.00,
      price_3m: 4047.00,
      price_6m: 7555.00,
      price_1y: 12592.00,
      discount_pct_3m: 10,
      discount_pct_6m: 16,
      discount_pct_1y: 30,
      cycle_1m_enabled: 1,
      cycle_3m_enabled: 1,
      cycle_6m_enabled: 1,
      cycle_1y_enabled: 1,
      max_branches: 3,
      max_stylists_per_branch: 10,
      features: JSON.stringify([
        "station_chair_transfers",
        "station_soft_bump",
        "station_hold_pause",
        "tv_departure_mirror",
        "whatsapp_sms_notifications",
        "staff_shift_analytics",
        "stylist_duration_overrides",
        "digital_storefront",
        "custom_coupons"
      ]),
      status: "ACTIVE",
      is_featured: 1,
      sort_order: 2
    },
    {
      id: "plan-enterprise-01",
      name: "Franchise Scale",
      slug: "franchise-scale",
      badge: "Enterprise",
      description: "Full-featured suite for luxury salon chains, franchises, and regional grooming centers.",
      price_1m: 4999.00,
      price_3m: 13497.00,
      price_6m: 25195.00,
      price_1y: 41992.00,
      discount_pct_3m: 10,
      discount_pct_6m: 16,
      discount_pct_1y: 30,
      cycle_1m_enabled: 1,
      cycle_3m_enabled: 1,
      cycle_6m_enabled: 1,
      cycle_1y_enabled: 1,
      max_branches: 10,
      max_stylists_per_branch: 20,
      features: JSON.stringify([
        "station_chair_transfers",
        "station_soft_bump",
        "station_hold_pause",
        "tv_departure_mirror",
        "whatsapp_sms_notifications",
        "staff_shift_analytics",
        "stylist_duration_overrides",
        "staff_leave_recovery",
        "customer_loyalty_stamps",
        "consumer_referrals",
        "digital_storefront",
        "custom_coupons"
      ]),
      status: "ACTIVE",
      is_featured: 0,
      sort_order: 3
    }
  ];

  for (const p of canonicalPlans) {
    await db.query(`
      INSERT INTO subscription_plans (
        id, name, slug, badge, description, price_1m, price_3m, price_6m, price_1y,
        discount_pct_3m, discount_pct_6m, discount_pct_1y,
        cycle_1m_enabled, cycle_3m_enabled, cycle_6m_enabled, cycle_1y_enabled,
        max_branches, max_stylists_per_branch, features, status, is_featured, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      p.id, p.name, p.slug, p.badge, p.description, p.price_1m, p.price_3m, p.price_6m, p.price_1y,
      p.discount_pct_3m, p.discount_pct_6m, p.discount_pct_1y,
      p.cycle_1m_enabled, p.cycle_3m_enabled, p.cycle_6m_enabled, p.cycle_1y_enabled,
      p.max_branches, p.max_stylists_per_branch, p.features, p.status, p.is_featured, p.sort_order
    ]);
  }
  console.log("✓ Reset subscription_plans to 3 canonical tiers (Solo, Pro, Enterprise)");

  console.log("\n=== SUMMARY OF PRESERVED STATE ===");
  const [remainingUsers]: any = await db.query("SELECT id, username, role, phone, email, organization_id, salon_id FROM users");
  console.log("Users:", remainingUsers);

  const [remainingSalons]: any = await db.query("SELECT id, name, slug, phone, organization_id FROM salons");
  console.log("Salons:", remainingSalons);

  const [remainingOrgs]: any = await db.query("SELECT id, name, slug, tier, plan_id FROM organizations");
  console.log("Organizations:", remainingOrgs);

  const [remainingPlans]: any = await db.query("SELECT id, name, slug, price_1m FROM subscription_plans");
  console.log("Subscription Plans:", remainingPlans);

  console.log("\n✅ DATABASE RESET COMPLETE: All test data purged cleanly.");
  process.exit(0);
}

runReset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
