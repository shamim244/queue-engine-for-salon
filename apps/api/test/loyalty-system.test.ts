import { describe, it, expect, beforeEach } from "bun:test";
import { loyaltyService } from "../src/loyalty/loyalty.service";
import { loyaltyRepo } from "../src/db/repositories/loyalty.repo";
import { salonRepo } from "../src/db/repositories/salon.repo";
import { couponService } from "../src/coupon/coupon.service";
import { queueEngine } from "../src/engine/queue-engine";
import { memoryStore } from "../src/db/repositories/store";

describe("Deterministic Multi-Tenant Milestone Loyalty Engine", () => {
  const salonA = {
    id: "salon_loyalty_alpha",
    name: "Alpha Grooming Studio",
    slug: "alpha-grooming",
    phone: "9111111111",
    currency: "INR",
    countryCode: "IN",
    operatingMode: "STATION_BASED",
    status: "ACTIVE",
    loyaltyEnabled: true,
    loyaltyStampGoal: 3,
    loyaltyRewardServiceId: "srv_alpha_cut",
    loyaltyRewardServiceName: "Executive Fade Cut",
    loyaltyCooldownHours: 2,
    loyaltyVoucherValidityDays: 30,
    services: [
      { id: "srv_alpha_cut", name: "Executive Fade Cut", basePrice: 250, estimatedDurationMinutes: 30, isAddOn: false },
      { id: "srv_alpha_shave", name: "Royal Shave", basePrice: 150, estimatedDurationMinutes: 20, isAddOn: false },
    ],
    stylists: [
      { id: "sty_alpha_1", name: "Master Barber Ramesh", phone: "9111111112", isActive: true },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const salonB = {
    id: "salon_loyalty_beta",
    name: "Beta Luxury Parlour",
    slug: "beta-luxury",
    phone: "9222222222",
    currency: "INR",
    countryCode: "IN",
    operatingMode: "STATION_BASED",
    status: "ACTIVE",
    loyaltyEnabled: true,
    loyaltyStampGoal: 4,
    loyaltyRewardServiceId: "srv_beta_spa",
    loyaltyRewardServiceName: "Head Spa Therapy",
    loyaltyCooldownHours: 4,
    loyaltyVoucherValidityDays: 60,
    services: [
      { id: "srv_beta_spa", name: "Head Spa Therapy", basePrice: 500, estimatedDurationMinutes: 45, isAddOn: false },
    ],
    stylists: [
      { id: "sty_beta_1", name: "Senior Stylist Leo", phone: "9222222223", isActive: true },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const customerPhone = "9988776655";
  const customerName = "Sonu Groomer";

  beforeEach(async () => {
    // Reset test memory store
    memoryStore.loyaltyCards.clear();
    memoryStore.loyaltyVouchers.clear();
    memoryStore.customerProfiles.clear();
    memoryStore.salons.set(salonA.id, salonA as any);
    memoryStore.salons.set(salonB.id, salonB as any);
  });

  it("1. Multi-Salon Isolation: visits to Salon A do not leak into Salon B", async () => {
    // Award 2 stamps at Salon A
    const resA1 = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_a_1",
      finalPrice: 250,
    });
    expect(resA1.stampAwarded).toBe(true);
    expect(resA1.card?.currentStamps).toBe(1);

    // Simulate cooldown bypass by adjusting timestamp
    const cardA = await loyaltyRepo.getCard(salonA.id, customerPhone);
    if (cardA) {
      cardA.lastStampAwardedAt = new Date(Date.now() - 3 * 3600 * 1000);
      await loyaltyRepo.upsertCard(cardA);
    }

    const resA2 = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_a_2",
      finalPrice: 250,
    });
    expect(resA2.stampAwarded).toBe(true);
    expect(resA2.card?.currentStamps).toBe(2);

    // Now award 1 stamp at Salon B
    const resB1 = await loyaltyService.awardStamp({
      salonId: salonB.id,
      customerPhone,
      customerName,
      ticketId: "tkt_b_1",
      finalPrice: 500,
    });
    expect(resB1.stampAwarded).toBe(true);
    expect(resB1.card?.currentStamps).toBe(1);

    // Verify Customer Loyalty Hub shows 2 distinct isolated cards
    const hub = await loyaltyService.getCustomerLoyaltyHub(customerPhone);
    expect(hub.success).toBe(true);
    expect(hub.totalSalonsVisited).toBe(2);
    expect(hub.cards.length).toBe(2);

    const cardAlpha = hub.cards.find((c) => c.salonId === salonA.id);
    const cardBeta = hub.cards.find((c) => c.salonId === salonB.id);

    expect(cardAlpha).toBeDefined();
    expect(cardAlpha!.currentStamps).toBe(2);
    expect(cardAlpha!.stampGoal).toBe(3);
    expect(cardAlpha!.rewardServiceName).toBe("Executive Fade Cut");

    expect(cardBeta).toBeDefined();
    expect(cardBeta!.currentStamps).toBe(1);
    expect(cardBeta!.stampGoal).toBe(4);
    expect(cardBeta!.rewardServiceName).toBe("Head Spa Therapy");
  });

  it("2. Anti-Farming Cooldown: prevents rapid duplicate stamps within configured window", async () => {
    // Award first stamp
    const res1 = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_farm_1",
      finalPrice: 250,
    });
    expect(res1.stampAwarded).toBe(true);
    expect(res1.card?.currentStamps).toBe(1);

    // Immediate second attempt within 2-hour cooldown must be blocked
    const res2 = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_farm_2",
      finalPrice: 250,
    });
    expect(res2.stampAwarded).toBe(false);
    expect(res2.message).toContain("cooldown");
    expect(res2.card?.currentStamps).toBe(1);
  });

  it("3. Milestone Completion: mints catalog-linked voucher with status ACTIVE and resets stamp counter", async () => {
    // Give 2 stamps
    await loyaltyRepo.upsertCard({
      id: "card_pre_milestone",
      salonId: salonA.id,
      customerPhone,
      customerName,
      currentStamps: 2,
      totalLifetimeStamps: 2,
      completedMilestones: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3rd stamp reaches milestone goal of 3!
    const res3 = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_milestone_hit",
      finalPrice: 250,
    });

    expect(res3.stampAwarded).toBe(true);
    expect(res3.voucherUnlocked).toBeDefined();
    expect(res3.voucherUnlocked!.status).toBe("ACTIVE");
    expect(res3.voucherUnlocked!.voucherCode).toContain("REW_ALPHAGRO_");
    expect(res3.voucherUnlocked!.rewardServiceName).toBe("Executive Fade Cut");
    expect(res3.voucherUnlocked!.rewardServicePrice).toBe(250);

    // Check card rollover
    const updatedCard = await loyaltyRepo.getCard(salonA.id, customerPhone);
    expect(updatedCard!.currentStamps).toBe(0);
    expect(updatedCard!.totalLifetimeStamps).toBe(3);
    expect(updatedCard!.completedMilestones).toBe(1);
  });

  it("4. Voucher Validation: 100% deduction on target salon, rejected at foreign salon or mismatched phone", async () => {
    // Create an active milestone voucher for Salon A
    await loyaltyRepo.createVoucher({
      id: "vouch_test_1",
      voucherCode: "REW_ALPHA_TEST123",
      salonId: salonA.id,
      customerPhone,
      rewardServiceId: "srv_alpha_cut",
      rewardServiceName: "Executive Fade Cut",
      rewardServicePrice: 250,
      status: "ACTIVE",
      unlockedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // A: Valid application at Salon A with customer's phone
    const validRes = await couponService.validateAndApplyCoupon({
      code: "REW_ALPHA_TEST123",
      targetType: "SALON_SERVICE",
      orderAmount: 250,
      salonId: salonA.id,
      userId: customerPhone,
    });
    expect(validRes.valid).toBe(true);
    expect(validRes.discountAmount).toBe(250);
    expect(validRes.netPayable).toBe(0);

    // B: Invalid application at Salon B (Cross-Salon isolation)
    const foreignRes = await couponService.validateAndApplyCoupon({
      code: "REW_ALPHA_TEST123",
      targetType: "SALON_SERVICE",
      orderAmount: 500,
      salonId: salonB.id,
      userId: customerPhone,
    });
    expect(foreignRes.valid).toBe(false);
    expect(foreignRes.message).toContain("locked to the salon");

    // C: Invalid application with different customer phone
    const wrongUserRes = await couponService.validateAndApplyCoupon({
      code: "REW_ALPHA_TEST123",
      targetType: "SALON_SERVICE",
      orderAmount: 250,
      salonId: salonA.id,
      userId: "9123456780",
    });
    expect(wrongUserRes.valid).toBe(false);
    expect(wrongUserRes.message).toContain("locked to another customer phone");
  });

  it("5. Atomic Burning: voucher status transitions to REDEEMED upon checkout", async () => {
    await loyaltyRepo.createVoucher({
      id: "vouch_burn_1",
      voucherCode: "REW_ALPHA_BURN1",
      salonId: salonA.id,
      customerPhone,
      rewardServiceId: "srv_alpha_cut",
      rewardServiceName: "Executive Fade Cut",
      rewardServicePrice: 250,
      status: "ACTIVE",
      unlockedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Redeem voucher
    const redeemed = await loyaltyRepo.redeemVoucher("REW_ALPHA_BURN1", salonA.id, "tkt_completed_99");
    expect(redeemed).not.toBeNull();
    expect(redeemed!.status).toBe("REDEEMED");
    expect(redeemed!.redeemedTicketId).toBe("tkt_completed_99");

    // Re-check applying burned voucher fails
    const reapplyRes = await couponService.validateAndApplyCoupon({
      code: "REW_ALPHA_BURN1",
      targetType: "SALON_SERVICE",
      orderAmount: 250,
      salonId: salonA.id,
      userId: customerPhone,
    });
    expect(reapplyRes.valid).toBe(false);
    expect(reapplyRes.message).toContain("already been redeemed");
  });

  it("6. Customer Grooming Profile: persists fade specs and preferred barber", async () => {
    const updated = await loyaltyRepo.updateCustomerGroomingProfile({
      phone: customerPhone,
      preferredBarberName: "Master Barber Ramesh",
      groomingSpecs: "Skin fade #1 on sides, scissor cut texture on top, beard lined up sharp.",
    });

    expect(updated).not.toBeNull();
    expect(updated!.preferredBarberName).toBe("Master Barber Ramesh");
    expect(updated!.groomingSpecs).toContain("Skin fade #1");

    const fetched = await loyaltyRepo.getCustomerGroomingProfile(customerPhone);
    expect(fetched).not.toBeNull();
    expect(fetched!.preferredBarberName).toBe("Master Barber Ramesh");
  });
});
