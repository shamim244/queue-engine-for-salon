import { describe, it, expect, mock, beforeEach } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock next/navigation
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock((_url: string) => {}),
    replace: mock((_url: string) => {}),
    prefetch: mock(() => {}),
    back: mock(() => {}),
  }),
  usePathname: () => "/admin/onboarding",
  useSearchParams: () => new URLSearchParams(""),
}));

import {
  slugify,
  validateOnboardingForm,
  getRuralSoloPreset,
  getModernMultiPreset,
  buildOnboardPayload,
  submitOnboarding,
  type OnboardingFormData,
} from "../lib/onboarding";
import { api } from "../lib/api";
import OnboardingPage from "../app/admin/onboarding/page";

describe("Tenant Onboarding Wizard Logic & Validation", () => {
  describe("Slugification Logic", () => {
    it("should handle lowercase and clean hyphens for standard salon names", () => {
      expect(slugify("Royal Crown Barbers")).toBe("royal-crown-barbers");
      expect(slugify("Aura Modern Spa")).toBe("aura-modern-spa");
    });

    it("should handle special characters, punctuation, and symbols", () => {
      expect(slugify("Ramesh & Sons' Barber Salon!")).toBe("ramesh-sons-barber-salon");
      expect(slugify("Hair@Style #1 (VIP Lounge)")).toBe("hair-style-1-vip-lounge");
      expect(slugify("Scissors & Combs: Premium 100%")).toBe("scissors-combs-premium-100");
    });

    it("should handle accents and diacritics cleanly", () => {
      expect(slugify("Café de Paris")).toBe("cafe-de-paris");
      expect(slugify("München Barber & Spa")).toBe("munchen-barber-spa");
      expect(slugify("El Niño Coiffure")).toBe("el-nino-coiffure");
    });

    it("should collapse multiple consecutive spaces, underscores, and hyphens", () => {
      expect(slugify("   Urban   __   Look  --  Studio   ")).toBe("urban-look-studio");
      expect(slugify("---test---slug---")).toBe("test-slug");
    });

    it("should fallback gracefully if empty string or symbols only", () => {
      expect(slugify("")).toBe("");
      expect(slugify("!@#$%^&*()")).toBe("");
    });
  });

  describe("Preset Catalog Generators", () => {
    it("should generate Rural Solo Barber template with rural services and 1 owner-stylist", () => {
      const preset = getRuralSoloPreset("Ramesh Traditional Barber", "Ramesh Kumar");

      // Verify Operating Mode
      expect(preset.operatingMode).toBe("RURAL_SOLO");

      // Verify Rural Services (Haircut, Shave, Beard Trim, Head Massage)
      expect(preset.services.length).toBeGreaterThanOrEqual(4);
      const serviceNames = preset.services.map((s) => s.name);
      expect(serviceNames).toContain("Haircut");
      expect(serviceNames).toContain("Shave");
      expect(serviceNames).toContain("Beard Trim");
      expect(serviceNames).toContain("Head Massage");

      // Verify Service details
      const haircut = preset.services.find((s) => s.name === "Haircut");
      expect(haircut).toBeDefined();
      expect(haircut?.basePrice).toBeGreaterThan(0);
      expect(haircut?.estimatedDurationMinutes).toBeGreaterThan(0);
      expect(haircut?.isAddOn).toBe(false);

      // Verify 1 Owner-Stylist
      expect(preset.stylists.length).toBe(1);
      expect(preset.stylists[0].name).toBe("Ramesh Kumar");
      expect(preset.stylists[0].avgDurationMinutes).toBeDefined();
      expect(preset.stylists[0].pin).toBeDefined();
      expect(preset.stylists[0].pin?.length).toBe(4);
    });

    it("should generate Modern Multi-Station template with multi-station services and multiple stylists", () => {
      const preset = getModernMultiPreset("Aura Luxury Grooming Lounge");

      // Verify Operating Mode
      expect(preset.operatingMode).toBe("MODERN_MULTI");

      // Verify Multi-station Services (Signature Cut, Beard Trim, Hair Spa, Hair Wash)
      expect(preset.services.length).toBeGreaterThanOrEqual(4);
      const serviceNames = preset.services.map((s) => s.name);
      expect(serviceNames).toContain("Signature Cut");
      expect(serviceNames).toContain("Beard Trim");
      expect(serviceNames).toContain("Hair Spa");
      expect(serviceNames).toContain("Hair Wash");

      // Verify Multiple Stylists
      expect(preset.stylists.length).toBeGreaterThanOrEqual(2);
      for (const st of preset.stylists) {
        expect(st.name.length).toBeGreaterThan(0);
        expect(st.pin).toBeDefined();
        expect(st.pin?.length).toBe(4);
        expect(st.avgDurationMinutes).toBeGreaterThan(0);
      }
    });
  });

  describe("Onboarding Form Validation", () => {
    const validFormData: OnboardingFormData = {
      name: "Elite Men's Salon",
      slug: "elite-mens-salon",
      phone: "+91 98765 43210",
      address: "123 High Street, Mumbai",
      currency: "INR",
      countryCode: "+91",
      operatingMode: "MODERN_MULTI",
      organizationName: "Elite Salons Group",
      tier: "PRO",
      ownerUser: {
        username: "elite_boss",
        password: "SecretPassword123",
        fullName: "Vikram Malhotra",
        phone: "+91 98765 43210",
        email: "boss@elitesalons.com",
      },
      stylists: [
        { name: "Vikram (Master)", phone: "+91 98765 43211", avgDurationMinutes: 30, pin: "1122" },
        { name: "Priya (Stylist)", phone: "+91 98765 43212", avgDurationMinutes: 25, pin: "3344" },
      ],
      services: [
        { name: "Signature Cut", basePrice: 350, estimatedDurationMinutes: 30, isAddOn: false },
        { name: "Beard Trim", basePrice: 150, estimatedDurationMinutes: 15, isAddOn: false },
        { name: "Hair Spa", basePrice: 500, estimatedDurationMinutes: 40, isAddOn: true },
        { name: "Hair Wash", basePrice: 120, estimatedDurationMinutes: 15, isAddOn: true },
      ],
    };

    it("should pass validation for a complete valid form", () => {
      const result = validateOnboardingForm(validFormData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it("should require salon name", () => {
      const invalid = { ...validFormData, name: "   " };
      const result = validateOnboardingForm(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeDefined();
    });

    it("should require salon phone number", () => {
      const invalid = { ...validFormData, phone: "" };
      const result = validateOnboardingForm(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.phone).toBeDefined();
    });

    it("should require owner username", () => {
      const invalid = {
        ...validFormData,
        ownerUser: { ...validFormData.ownerUser, username: "" },
      };
      const result = validateOnboardingForm(invalid);
      expect(result.isValid).toBe(false);
      expect(result.errors.ownerUsername).toBeDefined();
    });

    it("should enforce owner password minimum length of 6 characters", () => {
      const invalidShort = {
        ...validFormData,
        ownerUser: { ...validFormData.ownerUser, password: "12345" },
      };
      const shortResult = validateOnboardingForm(invalidShort);
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors.ownerPassword).toBeDefined();

      const validExact = {
        ...validFormData,
        ownerUser: { ...validFormData.ownerUser, password: "123456" },
      };
      const exactResult = validateOnboardingForm(validExact);
      expect(exactResult.errors.ownerPassword).toBeUndefined();
    });

    it("should require at least 1 stylist in the roster", () => {
      const noStylists = { ...validFormData, stylists: [] };
      const result = validateOnboardingForm(noStylists);
      expect(result.isValid).toBe(false);
      expect(result.errors.stylists).toBeDefined();
    });

    it("should require at least 1 service in the catalog", () => {
      const noServices = { ...validFormData, services: [] };
      const result = validateOnboardingForm(noServices);
      expect(result.isValid).toBe(false);
      expect(result.errors.services).toBeDefined();
    });
  });

  describe("Form Payload Building & Submission Handler", () => {
    beforeEach(() => {
      (globalThis as any).window = globalThis;
    });

    it("should construct clean OnboardSalonPayload conforming to API specification", () => {
      const formData: OnboardingFormData = {
        name: "Metro Glow Salon",
        slug: "metro-glow-salon",
        phone: "+91 99999 11111",
        address: "7th Avenue, Bangalore",
        currency: "INR",
        countryCode: "+91",
        operatingMode: "MODERN_MULTI",
        organizationName: "Glow Enterprises",
        tier: "ENTERPRISE",
        ownerUser: {
          username: "metro_owner",
          password: "password456",
          fullName: "Deepak Verma",
          phone: "+91 99999 11111",
          email: "deepak@metroglow.in",
        },
        stylists: [
          { name: "Deepak", phone: "+91 99999 11111", avgDurationMinutes: 30, pin: "5678" },
        ],
        services: [
          { name: "Signature Cut", basePrice: 300, estimatedDurationMinutes: 30, isAddOn: false },
        ],
      };

      const payload = buildOnboardPayload(formData);
      expect(payload.salonName).toBe("Metro Glow Salon");
      expect(payload.name).toBe("Metro Glow Salon");
      expect(payload.slug).toBe("metro-glow-salon");
      expect(payload.phone).toBe("+91 99999 11111");
      expect(payload.operatingMode).toBe("MODERN_MULTI");
      expect(payload.organizationName).toBe("Glow Enterprises");
      expect(payload.tier).toBe("ENTERPRISE");
      expect(payload.ownerUser?.username).toBe("metro_owner");
      expect(payload.ownerUser?.password).toBe("password456");
      expect(payload.stylists?.length).toBe(1);
      expect(payload.stylists?.[0].pin).toBe("5678");
      expect(payload.services?.length).toBe(1);
    });

    it("should call api.admin.onboard() with matching payload and return provisioned salon", async () => {
      const formData: OnboardingFormData = {
        name: "Ramesh Traditional Barber",
        slug: "ramesh-barber",
        phone: "+91 98765 00000",
        currency: "INR",
        countryCode: "+91",
        operatingMode: "RURAL_SOLO",
        ownerUser: {
          username: "ramesh_owner",
          password: "RameshPassword123",
        },
        stylists: [
          { name: "Ramesh Kumar", avgDurationMinutes: 20, pin: "1234" },
        ],
        services: [
          { name: "Haircut", basePrice: 70, estimatedDurationMinutes: 20, isAddOn: false },
        ],
      };

      // Mock api.admin.onboard
      const mockResult = {
        success: true,
        salon: {
          id: "salon-ramesh-123",
          name: "Ramesh Traditional Barber",
          slug: "ramesh-barber",
          phone: "+91 98765 00000",
          operatingMode: "RURAL_SOLO" as const,
          currency: "INR",
          countryCode: "+91",
          stylists: [
            { id: "st-1", salonId: "salon-ramesh-123", name: "Ramesh Kumar", isAvailable: true, pin: "1234" },
          ],
          services: [
            { id: "srv-1", salonId: "salon-ramesh-123", name: "Haircut", basePrice: 70, estimatedDurationMinutes: 20, pricingType: "FIXED" as const, isAddOn: false },
          ],
        },
      };

      const originalOnboard = api.admin.onboard;
      const onboardMock = mock(async (_payload: any) => mockResult);
      api.admin.onboard = onboardMock as any;

      try {
        const response = await submitOnboarding(formData, api);
        expect(onboardMock).toHaveBeenCalledTimes(1);
        const calledArg = onboardMock.mock.calls[0][0];
        expect(calledArg.slug).toBe("ramesh-barber");
        expect(calledArg.ownerUser.username).toBe("ramesh_owner");
        expect(response.success).toBe(true);
        expect(response.salon.id).toBe("salon-ramesh-123");
        expect(response.salon.slug).toBe("ramesh-barber");
      } finally {
        api.admin.onboard = originalOnboard;
      }
    });
  });

  describe("Onboarding Page Component UI Rendering", () => {
    it("should render the multi-step onboarding wizard layout and step progression indicator", () => {
      const html = renderToString(React.createElement(OnboardingPage));

      // Title & Header
      expect(html).toContain("Multi-Step Salon Onboarding Wizard");
      expect(html).toContain("Guided Tenant Provisioning");

      // Step indicators
      expect(html).toContain("Identity &amp; Location");
      expect(html).toContain("Architecture Model");
      expect(html).toContain("Owner Account");
      expect(html).toContain("Stylist Roster");
      expect(html).toContain("Service Catalog");

      // Step 1 Form Fields
      expect(html).toContain("Salon Name");
      expect(html).toContain("Tenant Slug");
      expect(html).toContain("Contact Phone");
      expect(html).toContain("Currency");
      expect(html).toContain("Continue to Architecture Model");
    });
  });
});
