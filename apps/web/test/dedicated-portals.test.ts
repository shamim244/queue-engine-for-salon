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
  it("routes /admin routes to /admin/login", () => {
    expect(getLoginRedirectForPath("/admin")).toBe("/admin/login?redirect=%2Fadmin");
    expect(getLoginRedirectForPath("/admin/tenants")).toBe("/admin/login?redirect=%2Fadmin%2Ftenants");
  });

  it("routes /owner routes to /partner/login", () => {
    expect(getLoginRedirectForPath("/owner")).toBe("/partner/login?redirect=%2Fowner");
    expect(getLoginRedirectForPath("/owner/services")).toBe("/partner/login?redirect=%2Fowner%2Fservices");
  });

  it("routes /staff and chair station routes to /partner/login?tab=staff", () => {
    expect(getLoginRedirectForPath("/staff")).toBe("/partner/login?tab=staff&redirect=%2Fstaff");
    expect(getLoginRedirectForPath("/s/ramesh/station")).toBe(
      "/partner/login?tab=staff&redirect=%2Fs%2Framesh%2Fstation"
    );
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

  it("renders PartnerLoginPage with Owner and Staff tabs and Salon Onboarding CTA", () => {
    const html = renderToString(
      React.createElement(
        AuthContext.Provider,
        { value: mockAuthValue },
        React.createElement(PartnerLoginPage)
      )
    );

    expect(html).toContain("Salon Partner Sign In");
    expect(html).toContain("Salon Owner");
    expect(html).toContain("Staff / Barber");
    expect(html).toContain("Register New Salon");
    expect(html).toContain("/register?role=owner");
    expect(html).toContain("Consumer Portal");
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
    expect(html).toContain("Mobile Phone or Username");
    expect(html).toContain("Go to Partner Portal");
    expect(html).toContain("/partner/login");
    // Must NOT contain admin presets
    expect(html).not.toContain("SuperAdmin");
  });
});
