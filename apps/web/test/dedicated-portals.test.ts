import { describe, it, expect, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock next/navigation before importing components
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock((_url: string) => {}),
    replace: mock((_url: string) => {}),
    prefetch: mock(() => {}),
    back: mock(() => {}),
  }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

import { getLoginRedirectForPath, getRoleDestination } from "../components/auth-guard";
import AdminLoginPage from "../app/admin/login/page";
import PartnerLoginPage from "../app/partner/login/page";
import ConsumerLoginPage from "../app/login/page";
import SalonLoginPage from "../app/salon/login/page";
import DevLauncherPage from "../app/dev/page";
import { StepLaunchSuccess } from "../components/onboarding/step-launch-success";
import { AuthContext } from "../lib/auth-context";

// Mock AuthContext for server rendering
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

describe("Dedicated Portals: getLoginRedirectForPath", () => {
  it("routes /admin routes to /hq/login", () => {
    expect(getLoginRedirectForPath("/admin")).toBe("/hq/login?redirect=%2Fadmin");
    expect(getLoginRedirectForPath("/admin/tenants")).toBe("/hq/login?redirect=%2Fadmin%2Ftenants");
  });

  it("routes /owner routes to /salon/login", () => {
    expect(getLoginRedirectForPath("/owner")).toBe("/salon/login?redirect=%2Fowner");
    expect(getLoginRedirectForPath("/owner/services")).toBe("/salon/login?redirect=%2Fowner%2Fservices");
  });

  it("routes /staff and chair station routes to /salon/login?tab=staff", () => {
    expect(getLoginRedirectForPath("/staff")).toBe("/salon/login?tab=staff&redirect=%2Fstaff");
    expect(getLoginRedirectForPath("/s/ramesh/station")).toBe(
      "/salon/login?tab=staff&redirect=%2Fs%2Framesh%2Fstation"
    );
  });

  it("routes /partner routes to /partner/login", () => {
    expect(getLoginRedirectForPath("/partner")).toBe("/partner/login?redirect=%2Fpartner");
    expect(getLoginRedirectForPath("/partner/wallet")).toBe("/partner/login?redirect=%2Fpartner%2Fwallet");
  });

  it("routes customer routes (/me, /s/queue) to /login", () => {
    expect(getLoginRedirectForPath("/me")).toBe("/login?redirect=%2Fme");
    expect(getLoginRedirectForPath("/s/ramesh/queue")).toBe("/login?redirect=%2Fs%2Framesh%2Fqueue");
    expect(getLoginRedirectForPath("/")).toBe("/login?redirect=%2F");
  });
});

describe("Dedicated Portals: SSR Markup Verification", () => {
  it("renders AdminLoginPage cleanly with governance branding and zero salon presets", () => {
    const html = renderToString(
      React.createElement(
        AuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(AdminLoginPage)
      )
    );

    expect(html).toContain("Admin Portal");
    expect(html).toContain("Platform Governance");
    expect(html).toContain("Administrator Identifier");
    expect(html).toContain("Master Security Password");
    // Must NOT contain public presets or customer registration
    expect(html).not.toContain("New Customer");
    expect(html).not.toContain("SuperAdmin Preset");
  });

  it("renders PartnerLoginPage dedicated to Field Partner & Affiliate Sign In", () => {
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
    expect(html).toContain("/salon/login");
    expect(html).toContain("Salon Owner or Barber?");
  });

  it("renders ConsumerLoginPage with Customer Sign In and New Customer tabs", () => {
    const html = renderToString(
      React.createElement(
        AuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(ConsumerLoginPage)
      )
    );

    expect(html).toContain("Customer Sign In");
    expect(html).toContain("New Customer");
    expect(html).toContain("Email or Username");
    expect(html).toContain("Go to Partner Portal");
    expect(html).toContain("/partner/login");
    expect(html).toContain("/salon/login");
    expect(html).toContain("/hq/login");
    // Must NOT contain admin presets
    expect(html).not.toContain("SuperAdmin");
  });

  it("renders SalonLoginPage with Salon Owner and Staff tabs and cross-portal links", () => {
    const html = renderToString(
      React.createElement(
        AuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(SalonLoginPage)
      )
    );

    expect(html).toContain("Salon Business Sign In");
    expect(html).toContain("Salon Owner");
    expect(html).toContain("Staff / Barber");
    expect(html).toContain("/login");
    expect(html).toContain("/partner/login");
    expect(html).toContain("/hq/login");
  });

  it("renders StepLaunchSuccess with interactive username redirection link and icon", () => {
    const launchResult = {
      salon: { name: "Royal Haircuts", slug: "royal-haircuts" },
      storeUrl: "https://queue.salon/s/royal-haircuts",
      queueUrl: "https://queue.salon/s/royal-haircuts/queue",
      tvUrl: "https://queue.salon/s/royal-haircuts/tv",
      ownerLoginUrl: "https://queue.salon/salon/login?tab=owner&identifier=royal_owner&username=royal_owner",
      chosenTier: "FREE",
    };

    const canvasRef = { current: null };
    const html = renderToString(
      React.createElement(StepLaunchSuccess, {
        launchResult: launchResult as any,
        currentPlan: { id: "p1", name: "Free Starter" } as any,
        netPayable: 0,
        isFreePlan: true,
        canvasRef,
        downloadQrCode: () => {},
        shareOnWhatsApp: () => {},
        copiedKey: null,
        copyToClipboard: async () => {},
        ownerUsername: "royal_owner",
        mode: "PUBLIC",
        handlePostLaunchProceed: () => {},
      })
    );

    expect(html).toContain("royal_owner");
    expect(html).toContain("@royal_owner");
    expect(html).toContain("/salon/login?tab=owner&amp;identifier=royal_owner&amp;username=royal_owner");
    expect(html).toContain("Owner Login");
    expect(html).toContain("Sign In");
  });

  it("renders DevLauncherPage with synchronized salon owner login link and QA header", () => {
    const html = renderToString(React.createElement(DevLauncherPage));

    // Must correctly link Salon Owner Command Hub to /salon/login, NOT /partner/login
    expect(html).toContain("/salon/login");
    expect(html).toContain("Salon Login");
    expect(html).toContain("Salon Portal");
    expect(html).toContain("Partner Login");
    expect(html).toContain("HQ Admin");
  });
});
