import { describe, it, expect, beforeEach } from "bun:test";
import { memoryStore, seedDemoData } from "../src/db/repositories/store";
import { salonRepo } from "../src/db/repositories/salon.repo";
import { organizationRepo } from "../src/db/repositories/organization.repo";
import { paymentRepo } from "../src/db/repositories/payment.repo";
import { paymentService } from "../src/payment/payment.service";
import { partnerRepo } from "../src/db/repositories/partner.repo";

describe("Point 1 & Point 2: Free Testing Tier & Manual Payment Approval Workflow", () => {
  beforeEach(() => {
    seedDemoData();
  });

  it("T1: should onboard salon directly onto FREE plan with ₹0 due and 1 station capacity", async () => {
    const onboardRes = await salonRepo.onboardSalon({
      salonName: "Ganesh Grooming Corner",
      slug: `ganesh-corner-${Date.now()}`,
      phone: "+919876543210",
      tier: "FREE",
      organizationName: "Ganesh Grooming Corner",
      ownerUser: {
        username: `ganesh_owner_${Date.now()}`,
        password: "OwnerPassword123!",
        phone: "+919876543210",
        email: `ganesh_${Date.now()}@testsalon.com`,
      },
      stylists: [{ name: "Master Ganesh", phone: "+919876543210" }],
      services: [{ name: "Haircut", basePrice: 100, estimatedDurationMinutes: 20 }],
    });

    expect(onboardRes.success).toBe(true);
    expect(onboardRes.salon).toBeDefined();

    const orgId = onboardRes.salon.organizationId!;
    const org = await organizationRepo.getOrganizationById(orgId);
    expect(org).toBeDefined();
    expect(org?.tier).toBe("FREE");
    expect(org?.maxBranches).toBe(1);
    expect(org?.maxStylistsPerBranch).toBe(1);
  });

  it("T2: should preserve partner referral attribution even when onboarded on FREE testing plan", async () => {
    // 1. Create active partner via adminOnboardPartner
    const partner = await partnerRepo.adminOnboardPartner({
      fullName: "Rohan Verma",
      phone: "+919811122233",
      email: "rohan.verma@partner.com",
      city: "Indore",
      persona: "SALON_SUPPLIER",
      referralCode: "ROHAN10",
      commissionRate: 10,
    });
    expect(partner.status).toBe("ACTIVE");

    // 2. Onboard salon on FREE plan with partner code
    const slug = `rohan-referred-${Date.now()}`;
    const onboardRes = await salonRepo.onboardSalon({
      salonName: "Rohan Partner Salon",
      slug,
      phone: "+919822233344",
      tier: "FREE",
      partnerCode: "ROHAN10",
      organizationName: "Rohan Partner Org",
      ownerUser: {
        username: `rohan_sal_${Date.now()}`,
        password: "Password123!",
        phone: "+919822233344",
        email: `rohan_sal_${Date.now()}@example.com`,
      },
      stylists: [{ name: "Barber", phone: "+919822233344" }],
      services: [{ name: "Trim", basePrice: 50, estimatedDurationMinutes: 15 }],
    });

    expect(onboardRes.success).toBe(true);

    // Verify attribution is saved
    const attr = await partnerRepo.getAttributionBySalonId(onboardRes.salon.id);
    expect(attr).toBeDefined();
    expect(attr?.partnerId).toBe(partner.id);
    expect(attr?.salonId).toBe(onboardRes.salon.id);
    expect(attr?.source).toBe("PROMO_CODE");
  });

  it("T3: should provision salon on FREE tier while paid plan order is PENDING_APPROVAL with UTR", async () => {
    const slug = `rapid-cut-${Date.now()}`;
    const onboardRes = await salonRepo.onboardSalon({
      salonName: "Rapid Cut Studio",
      slug,
      phone: "+919833344455",
      tier: "FREE", // Provisioned on FREE initially for immediate login
      organizationName: "Rapid Cut Studio",
      ownerUser: {
        username: `rapid_owner_${Date.now()}`,
        password: "Password123!",
        phone: "+919833344455",
        email: `rapid_${Date.now()}@example.com`,
      },
      stylists: [{ name: "Barber Rapid", phone: "+919833344455" }],
      services: [{ name: "Fade", basePrice: 150, estimatedDurationMinutes: 25 }],
    });

    const orgId = onboardRes.salon.organizationId!;
    const orgBefore = await organizationRepo.getOrganizationById(orgId);
    expect(orgBefore?.tier).toBe("FREE");

    // Create payment order for PRO subscription
    const orderRes = await paymentService.createPaymentOrder({
      targetType: "SUBSCRIPTION",
      targetId: "plan-pro-01",
      amount: 899,
      provider: "UPI_QR",
      currency: "INR",
      organizationId: orgId,
      salonId: onboardRes.salon.id,
      metadata: {
        planTier: "PRO",
        basePrice: 999,
        discountApplied: 100,
        utrNumber: "412389472910",
      },
    });

    expect(orderRes.orderId).toBeDefined();

    const orderObj = await paymentRepo.getOrderById(orderRes.orderId);
    expect(orderObj?.status).toBe("PENDING");

    // Submit manual payment with UTR
    const manualRes = await paymentService.submitManualPayment({
      orderId: orderRes.orderId,
      provider: "UPI_QR",
      utrNumber: "412389472910",
      notes: "Submitted during onboarding with UTR 412389472910",
    });

    expect(manualRes.success).toBe(true);
    expect(manualRes.status).toBe("PENDING_APPROVAL");
    expect(manualRes.utrNumber).toBe("412389472910");

    // Salon is still active on FREE tier so owner has zero friction
    const currentOrg = await organizationRepo.getOrganizationById(orgId);
    expect(currentOrg?.tier).toBe("FREE");

    // Admin approves payment
    const approveRes = await paymentService.approvePaymentOrder({
      orderId: orderRes.orderId,
      adminId: "super_admin_1",
    });

    expect(approveRes.success).toBe(true);
    expect(approveRes.status).toBe("COMPLETED");

    // Org should now be upgraded to PRO!
    const upgradedOrg = await organizationRepo.getOrganizationById(orgId);
    expect(upgradedOrg?.tier).toBe("PRO");
    expect(upgradedOrg?.planId).toBe("plan-pro-01");
    expect(upgradedOrg?.maxStylistsPerBranch).toBe(10);
  });

  it("T4: should keep salon on FREE tier with zero data loss when payment is REJECTED", async () => {
    const slug = `modern-fade-${Date.now()}`;
    const onboardRes = await salonRepo.onboardSalon({
      salonName: "Modern Fade",
      slug,
      phone: "+919844455566",
      tier: "FREE",
      organizationName: "Modern Fade Org",
      ownerUser: {
        username: `modern_owner_${Date.now()}`,
        password: "Password123!",
        phone: "+919844455566",
        email: `modern_${Date.now()}@example.com`,
      },
      stylists: [{ name: "Barber Modern", phone: "+919844455566" }],
      services: [{ name: "Beard Trim", basePrice: 80, estimatedDurationMinutes: 15 }],
    });

    const orgId = onboardRes.salon.organizationId!;

    // Create payment order
    const orderRes = await paymentService.createPaymentOrder({
      targetType: "SUBSCRIPTION",
      targetId: "plan-starter-01",
      amount: 499,
      provider: "UPI_QR",
      organizationId: orgId,
      salonId: onboardRes.salon.id,
    });

    // Submit manual UTR
    await paymentService.submitManualPayment({
      orderId: orderRes.orderId,
      provider: "UPI_QR",
      utrNumber: "000000FAKEUTR",
    });

    // Admin rejects payment
    const rejectRes = await paymentService.rejectPaymentOrder({
      orderId: orderRes.orderId,
      reason: "Bank UTR could not be verified on UPI settlement report.",
      adminId: "super_admin_1",
    });

    expect(rejectRes.success).toBe(true);
    expect(rejectRes.status).toBe("REJECTED");

    // Query order to verify rejectionReason
    const orderAfter = await paymentRepo.getOrderById(orderRes.orderId);
    expect(orderAfter?.status).toBe("REJECTED");
    expect(orderAfter?.rejectionReason).toBe("Bank UTR could not be verified on UPI settlement report.");

    // Salon and organization remain 100% active on FREE tier with zero data loss
    const orgAfter = await organizationRepo.getOrganizationById(orgId);
    expect(orgAfter?.tier).toBe("FREE");

    const salonAfter = await salonRepo.getSalonById(onboardRes.salon.id);
    expect(salonAfter).toBeDefined();
    expect(salonAfter?.name).toBe("Modern Fade");
  });
});
