import { describe, it, expect, mock } from "bun:test";
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
  usePathname: () => "/partner",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: "part_test_123" }),
}));

import PartnerJoinPage from "../app/partner/join/page";
import PartnerLoginPage from "../app/partner/login/page";
import PartnerLayout from "../app/partner/layout";
import PartnerDashboard from "../app/partner/page";
import PartnerAssistedOnboardPage from "../app/partner/onboard/page";
import PartnerSalonsPage from "../app/partner/salons/page";
import PartnerWalletPage from "../app/partner/wallet/page";
import PartnerMarketingPage from "../app/partner/marketing/page";
import PartnerProfilePage from "../app/partner/profile/page";
import AdminPartnersPage from "../app/admin/partners/page";
import AdminPartnerPayoutsPage from "../app/admin/partners/payouts/page";
import { StepSalonIdentity } from "../components/admin/onboarding/step-salon-identity";
import { buildOnboardPayload, type OnboardingFormData } from "../lib/onboarding";
import { AuthContext } from "../lib/auth-context";

const mockAuthValue: any = {
  user: null,
  salon: null,
  staff: null,
  organization: null,
  branches: [],
  token: null,
  isLoading: false,
  login: async () => ({ token: "mock", user: {} as any }),
  pinLogin: async () => ({ token: "mock", user: {} as any }),
  logout: async () => {},
  refreshUser: async () => {},
  setSelectedSalon: () => {},
  demoLogin: async () => {},
};

describe("Partner Portal Frontend Verification", () => {
  it("renders /partner/join application form with persona selection and net-revenue info", () => {
    const html = renderToString(<PartnerJoinPage />);
    expect(html).toContain("Affiliate &amp; Growth Network");
    expect(html).toContain("Ground Hustler");
    expect(html).toContain("Online Creator");
    expect(html).toContain("Choose Your Partner Persona");
    expect(html).toContain("Net-Revenue Commission");
  });

  it("renders /partner/login dedicated to Field Partner & Affiliate Sign In", () => {
    const html = renderToString(
      React.createElement(
        AuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(PartnerLoginPage)
      )
    );
    expect(html).toContain("Field Partner &amp; Affiliate Sign In");
    expect(html).toContain("Partner Mobile Number");
    expect(html).toContain("Apply as Field Partner");
    expect(html).toContain("Salon Owner or Barber?");
  });

  it("renders /partner dashboard cockpit with KPI cards and referral tools", () => {
    const html = renderToString(<PartnerDashboard />);
    expect(html).toContain("Available Balance");
    expect(html).toContain("Pending Lock");
    expect(html).toContain("Referred Salons");
    expect(html).toContain("Lifetime Earnings");
    expect(html).toContain("Assisted Onboard");
  });

  it("renders /partner/onboard 2-minute assisted onboarding wizard", () => {
    const html = renderToString(<PartnerAssistedOnboardPage />);
    expect(html).toContain("Assisted In-Shop Onboarding");
    expect(html).toContain("Field Hustler Fast-Track");
    expect(html).toContain("Salon &amp; Owner Identity");
    expect(html).toContain("Starter Menu &amp; Pricing");
  });

  it("renders /partner/salons referred salons directory", () => {
    const html = renderToString(<PartnerSalonsPage />);
    expect(html).toContain("Referred Salons");
    expect(html).toContain("Your Affiliate Network");
  });

  it("renders /partner/wallet with UPI withdrawal request and passbook ledger", () => {
    const html = renderToString(<PartnerWalletPage />);
    expect(html).toContain("Partner Wallet &amp; Payouts");
    expect(html).toContain("Request UPI Withdrawal");
    expect(html).toContain("Earnings Ledger Passbook");
    expect(html).toContain("₹500");
  });

  it("renders /partner/marketing pitch script and printable standee preview", () => {
    const html = renderToString(<PartnerMarketingPage />);
    expect(html).toContain("Pitch Materials &amp; Standees");
    expect(html).toContain("60-Second In-Shop Pitch Script");
    expect(html).toContain("Printable Partner Standee Card");
  });

  it("renders /admin/partners super admin directory", () => {
    const html = renderToString(<AdminPartnersPage />);
    expect(html).toContain("Partner &amp; Affiliate Directory");
    expect(html).toContain("Super Admin Governance");
    expect(html).toContain("Withdrawal Requests");
  });

  it("renders /admin/partners/payouts treasury settlement queue", () => {
    const html = renderToString(<AdminPartnerPayoutsPage />);
    expect(html).toContain("Partner Payout Processing");
    expect(html).toContain("Treasury Settlement");
    expect(html).toContain("Pending Action");
  });

  it("propagates partnerCode in buildOnboardPayload when provided", () => {
    const mockFormData: OnboardingFormData = {
      name: "The Royal Cut",
      slug: "the-royal-cut",
      phone: "+919876543210",
      tier: "PRO",
      partnerCode: "PROMO2026",
      ownerUser: { username: "royal_owner", password: "password123" },
      stylists: [{ name: "Stylist 1" }],
      services: [{ name: "Cut", basePrice: 150, estimatedDurationMinutes: 20 }],
    };

    const payload = buildOnboardPayload(mockFormData);
    expect(payload.partnerCode).toBe("PROMO2026");
    expect(payload.name).toBe("The Royal Cut");
  });

  it("renders StepSalonIdentity with partner / referral code input and badge", () => {
    const mockFormData: OnboardingFormData = {
      name: "Heritage Barber",
      slug: "heritage-barber",
      phone: "+919876543210",
      tier: "STARTER",
      partnerCode: "AFFILIATE99",
      ownerUser: { username: "heritage", password: "password123" },
      stylists: [],
      services: [],
    };

    const html = renderToString(
      <StepSalonIdentity
        formData={mockFormData}
        setFormData={() => {}}
        stepErrors={{}}
        setStepErrors={() => {}}
        handleNameChange={() => {}}
        setIsSlugManual={() => {}}
        onNext={() => {}}
      />
    );

    expect(html).toContain("Partner / Referral Code (Optional)");
    expect(html).toContain("AFFILIATE99");
    expect(html).toContain("Partner Attribution Active");
  });

  it("renders PartnerLayout enterprise sidebar, 3-line hamburger menu, and profile button", () => {
    const html = renderToString(
      <PartnerLayout>
        <div id="test-child-content">Child Dashboard Content</div>
      </PartnerLayout>
    );

    // Desktop permanent sidebar verification
    expect(html).toContain("EngineQue");
    expect(html).toContain("Growth &amp; Affiliate HQ");
    expect(html).toContain("Available Balance");
    expect(html).toContain("Assisted Onboard");
    expect(html).toContain("Pitch Kit CMS");

    // Mobile navbar verification
    expect(html).toContain("Open partner navigation menu"); // 3-line hamburger aria-label
    expect(html).toContain("Profile &amp; Bank Settings"); // Mobile profile button title
    expect(html).toContain("test-child-content");
  });

  it("renders /partner/profile with verified Indian banking form and registered identity cards", () => {
    const html = renderToString(<PartnerProfilePage />);
    expect(html).toContain("Partner Profile &amp; Settings");
    expect(html).toContain("Registered Partner Identity &amp; Login Credentials");
    expect(html).toContain("Primary Login Email");
    expect(html).toContain("Registered Mobile Number");
    expect(html).toContain("Personalized Referral Code");
    expect(html).toContain("Verified Payout Destinations");
    expect(html).toContain("Instant UPI Settlement (VPA)");
    expect(html).toContain("Direct Indian Bank Account");
    expect(html).toContain("Account Security &amp; Login Password");
  });
});
