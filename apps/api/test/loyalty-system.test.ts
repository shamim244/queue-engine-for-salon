import { describe, it, expect, beforeEach } from "bun:test";
import { loyaltyService } from "../src/loyalty/loyalty.service";
import { loyaltyRepo } from "../src/db/repositories/loyalty.repo";
import { salonRepo } from "../src/db/repositories/salon.repo";
import { repository } from "../src/db/repository";
import { couponService } from "../src/coupon/coupon.service";
import { queueEngine } from "../src/engine/queue-engine";
import { app } from "../index";
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
    // Reset test memory store with fresh object copies so mutations in prior tests don't leak
    memoryStore.loyaltyCards.clear();
    memoryStore.loyaltyVouchers.clear();
    memoryStore.customerProfiles.clear();
    memoryStore.tickets.clear();
    memoryStore.salons.set(salonA.id, { ...salonA, services: [...salonA.services], stylists: [...salonA.stylists] } as any);
    memoryStore.salons.set(salonB.id, { ...salonB, services: [...salonB.services], stylists: [...salonB.stylists] } as any);
    await salonRepo.updateSalon(salonA.id, { loyaltyStampGoal: 3 });
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

    // A: Valid application at Salon A with customer's phone (Full match: ₹250 order)
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
    expect(validRes.coupon?.discountValue).toBe(250);

    // A2: Seamless Downgrade (₹80 order) -> capped at orderAmount, preserves face value 250
    const downgradeRes = await couponService.validateAndApplyCoupon({
      code: "REW_ALPHA_TEST123",
      targetType: "SALON_SERVICE",
      orderAmount: 80,
      salonId: salonA.id,
      userId: customerPhone,
    });
    expect(downgradeRes.valid).toBe(true);
    expect(downgradeRes.discountAmount).toBe(80);
    expect(downgradeRes.netPayable).toBe(0);
    expect(downgradeRes.coupon?.discountValue).toBe(250);

    // A3: Seamless Upgrade (₹400 order) -> deducts ₹250 face value, customer pays remaining ₹150
    const upgradeRes = await couponService.validateAndApplyCoupon({
      code: "REW_ALPHA_TEST123",
      targetType: "SALON_SERVICE",
      orderAmount: 400,
      salonId: salonA.id,
      userId: customerPhone,
    });
    expect(upgradeRes.valid).toBe(true);
    expect(upgradeRes.discountAmount).toBe(250);
    expect(upgradeRes.netPayable).toBe(150);
    expect(upgradeRes.coupon?.discountValue).toBe(250);

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

    // D: Reject anonymous application without customer mobile number
    const missingUserRes = await couponService.validateAndApplyCoupon({
      code: "REW_ALPHA_TEST123",
      targetType: "SALON_SERVICE",
      orderAmount: 250,
      salonId: salonA.id,
    });
    expect(missingUserRes.valid).toBe(false);
    expect(missingUserRes.message).toContain("mobile phone number is required");
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

  it("7. Salon Loyalty & Wi-Fi Settings: updates salon loyalty configuration without SQL column errors", async () => {
    const updated = await salonRepo.updateSalon(salonA.id, {
      loyaltyEnabled: true,
      loyaltyStampGoal: 5,
      loyaltyReferrerBonus: 75,
      loyaltyRefereeDiscount: 25,
      loyaltyRewardDescription: "Free Beard Trim",
      loyaltyRewardServiceId: "srv_alpha_shave",
      loyaltyRewardServiceName: "Royal Shave",
      loyaltyCooldownHours: 3,
      loyaltyVoucherValidityDays: 45,
      wifiSsid: "AlphaGuestWiFi",
      wifiPassword: "SecretPassword123",
      enableLoungeWifi: true,
      enableScreenWakeLock: true,
    });

    expect(updated).not.toBeNull();
    expect(updated!.loyaltyStampGoal).toBe(5);
    expect(updated!.loyaltyReferrerBonus).toBe(75);
    expect(updated!.loyaltyRefereeDiscount).toBe(25);
    expect(updated!.loyaltyRewardDescription).toBe("Free Beard Trim");
    expect(updated!.wifiSsid).toBe("AlphaGuestWiFi");
    expect(updated!.enableLoungeWifi).toBe(true);
  });

  it("8. Real-Time Cache Invalidation: customer hub immediately reflects updated stamp goal with zero lag", async () => {
    // Award initial stamp so card exists
    await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_test_8",
      finalPrice: 200,
    });

    // 1. Owner updates stamp goal to 8
    await salonRepo.updateSalon(salonA.id, { loyaltyStampGoal: 8 });
    const hub1 = await loyaltyService.getCustomerLoyaltyHub(customerPhone);
    const card1 = hub1.cards.find((c) => c.salonId === salonA.id);
    expect(card1).toBeDefined();
    expect(card1!.stampGoal).toBe(8);

    // 2. Owner updates stamp goal to 7
    await salonRepo.updateSalon(salonA.id, { loyaltyStampGoal: 7 });
    const hub2 = await loyaltyService.getCustomerLoyaltyHub(customerPhone);
    const card2 = hub2.cards.find((c) => c.salonId === salonA.id);
    expect(card2).toBeDefined();
    expect(card2!.stampGoal).toBe(7);

    // 3. Owner updates stamp goal to 9
    await salonRepo.updateSalon(salonA.id, { loyaltyStampGoal: 9 });
    const hub3 = await loyaltyService.getCustomerLoyaltyHub(customerPhone);
    const card3 = hub3.cards.find((c) => c.salonId === salonA.id);
    expect(card3).toBeDefined();
    expect(card3!.stampGoal).toBe(9);
  });

  it("9. Zero-Stamp Redemption Guard: free milestone redemptions and ₹0 visits do not increment next cycle stamps", async () => {
    // Seed 2 paid stamps, then complete 3rd paid visit to unlock voucher
    await loyaltyRepo.upsertCard({
      id: "card_zero_guard",
      salonId: salonA.id,
      customerPhone,
      customerName,
      currentStamps: 2,
      totalLifetimeStamps: 2,
      completedMilestones: 0,
      lastStampAwardedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const milestoneRes = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_paid_3",
      finalPrice: 250,
    });
    expect(milestoneRes.stampAwarded).toBe(true);
    expect(milestoneRes.card?.currentStamps).toBe(0);
    expect(milestoneRes.card?.completedMilestones).toBe(1);
    expect(milestoneRes.card?.totalLifetimeStamps).toBe(3);
    const voucher = milestoneRes.voucherUnlocked!;
    expect(voucher).toBeDefined();

    // Ensure cooldown doesn't mask the guard: rewind lastStampAwardedAt > 2h ago
    milestoneRes.card!.lastStampAwardedAt = new Date(Date.now() - 10 * 60 * 60 * 1000);
    await loyaltyRepo.upsertCard(milestoneRes.card!);

    // Check-in & complete Visit #4 using the free milestone voucher via queueEngine
    const ticket4 = await queueEngine.checkIn({
      salonSlug: salonA.slug,
      customerName,
      customerPhone,
      serviceId: "srv_alpha_cut",
      couponCode: voucher.voucherCode,
    });
    expect(ticket4.couponCode).toBe(voucher.voucherCode);
    expect(ticket4.couponDiscount).toBe(250);

    // Prevent concurrent double-spend check-in with same active voucher
    await expect(
      queueEngine.checkIn({
        salonSlug: salonA.slug,
        customerName,
        customerPhone,
        serviceId: "srv_alpha_cut",
        couponCode: voucher.voucherCode,
      })
    ).rejects.toThrow("already attached");

    await queueEngine.summonTicket(salonA.id, ticket4.id);
    await queueEngine.seatCustomer(ticket4.id, "sty_alpha_1");
    const completed4 = await queueEngine.finishService(ticket4.id, "CASH_PAID", 0);
    expect(completed4?.status).toBe("COMPLETED");

    // Voucher must be REDEEMED and card MUST remain at 0 of 3 (NOT 1 of 3)
    const redeemedCheck = await loyaltyRepo.getVoucherByCode(voucher.voucherCode, salonA.id);
    expect(redeemedCheck?.status).toBe("REDEEMED");
    const cardAfterFree = await loyaltyRepo.getCard(salonA.id, customerPhone);
    expect(cardAfterFree?.currentStamps).toBe(0);
    expect(cardAfterFree?.totalLifetimeStamps).toBe(3);
    expect(cardAfterFree?.completedMilestones).toBe(1);

    // Upgraded voucher visit (paid extra cash out-of-pocket) also earns 0 stamps
    const upgradedVoucherRes = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_upgraded_voucher",
      finalPrice: 150,
      isRewardRedemption: true,
      couponCode: voucher.voucherCode,
    });
    expect(upgradedVoucherRes.stampAwarded).toBe(false);
    expect(upgradedVoucherRes.card?.currentStamps).toBe(0);

    // ₹0 complimentary visit (e.g. 100% promo coupon) earns 0 stamps
    const zeroRupeeRes = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_zero_promo",
      finalPrice: 0,
    });
    expect(zeroRupeeRes.stampAwarded).toBe(false);
    expect(zeroRupeeRes.card?.currentStamps).toBe(0);

    // Regular subsequent paid visit without voucher starts cycle #2 cleanly at 1 of 3
    const paidNextRes = await loyaltyService.awardStamp({
      salonId: salonA.id,
      customerPhone,
      customerName,
      ticketId: "tkt_paid_next",
      finalPrice: 250,
    });
    expect(paidNextRes.stampAwarded).toBe(true);
    expect(paidNextRes.card?.currentStamps).toBe(1);
    expect(paidNextRes.card?.totalLifetimeStamps).toBe(4);
  });

  it("10. Appointment Voucher Flow: booking with milestone voucher burns voucher and completion awards 0 stamps", async () => {
    // Prepare card at 0 of 3 after 1 completed milestone and an active voucher
    await loyaltyRepo.upsertCard({
      id: "card_appt_guard",
      salonId: salonA.id,
      customerPhone,
      customerName,
      currentStamps: 0,
      totalLifetimeStamps: 3,
      completedMilestones: 1,
      lastStampAwardedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await loyaltyRepo.createVoucher({
      id: "vouch_appt_1",
      voucherCode: "REW_ALPHAGRO_APPT1",
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

    // Enable online appointments cleanly in salon policy
    await repository.updateSalonAppointmentPolicy(salonA.id, {
      enabled: true,
      policyType: "FIXED_TOKEN",
      tokenAmount: 50,
      convenienceFee: 0,
      allowFreeBooking: true,
      cancellationCutoffHours: 2,
      isCustomized: true,
    });

    // Pick tomorrow's date so slot is future-safe
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const initRes = await app.handle(
      new Request("http://localhost/api/v1/appointments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonSlug: salonA.slug,
          serviceId: "srv_alpha_cut",
          stylistId: "sty_alpha_1",
          date: tomorrow,
          slotTime: "11:00",
          customerName,
          customerPhone,
          advanceType: "PARTIAL",
          couponCode: "REW_ALPHAGRO_APPT1",
        }),
      })
    );
    expect(initRes.status).toBe(200);
    const initJson = await initRes.json();
    expect(initJson.success).toBe(true);
    expect(initJson.isFree).toBe(true);
    expect(initJson.appointment.status).toBe("CONFIRMED");

    // Voucher must already be REDEEMED upon free booking confirmation (cannot be double-spent)
    const redeemed = await loyaltyRepo.getVoucherByCode("REW_ALPHAGRO_APPT1", salonA.id);
    expect(redeemed?.status).toBe("REDEEMED");

    // Complete the appointment -> must award 0 stamps
    const completeRes = await app.handle(
      new Request(`http://localhost/api/v1/appointments/${initJson.appointmentId}/complete`, {
        method: "POST",
      })
    );
    expect(completeRes.status).toBe(200);
    const cardAfter = await loyaltyRepo.getCard(salonA.id, customerPhone);
    expect(cardAfter?.currentStamps).toBe(0);
    expect(cardAfter?.totalLifetimeStamps).toBe(3);
  });
});
