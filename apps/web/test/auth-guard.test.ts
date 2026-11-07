import { describe, it, expect, beforeEach, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock next/navigation
const mockPush = mock((_url: string) => {});
let currentPathname = "/admin/tenants";

mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mock((_url: string) => {}),
    prefetch: mock(() => {}),
    back: mock(() => {}),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams("redirect=/admin/tenants"),
}));

import {
  AuthGuard,
  getRoleDestination,
  resolveAuthRedirect,
} from "../components/auth-guard";
import LoginPage from "../app/login/page";
import AdminLayout from "../app/admin/layout";
import { AuthContext, AuthContextType } from "../lib/auth-context";
import { getAuthToken, setAuthToken } from "../lib/api";

function createMockAuthContext(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: null,
    salon: null,
    staff: null,
    organization: null,
    branches: [],
    token: null,
    isLoading: false,
    login: mock(async () => ({} as any)),
    pinLogin: mock(async () => ({} as any)),
    logout: mock(async () => {}),
    refreshUser: mock(async () => {}),
    setSelectedSalon: mock(() => {}),
    demoLogin: mock(async () => {}),
    ...overrides,
  };
}

describe("Enterprise Unified Authentication & Protected Route Guard System", () => {
  beforeEach(() => {
    mockPush.mockClear();
    currentPathname = "/admin/tenants";

    // Setup global simulated storage & cookies
    (globalThis as any).window = globalThis;
    let store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        store = {};
      },
    };

    let cookieJar: Record<string, string> = {};
    (globalThis as any).document = {
      get cookie() {
        return Object.entries(cookieJar)
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");
      },
      set cookie(str: string) {
        if (!str) {
          cookieJar = {};
          return;
        }
        const parts = str.split(";");
        const [rawKey, rawVal] = parts[0].split("=");
        if (!rawKey) return;
        const key = rawKey.trim();
        const val = rawVal ? rawVal.trim() : "";
        if (str.includes("max-age=0")) {
          delete cookieJar[key];
        } else {
          cookieJar[key] = val;
        }
      },
    };
  });

  describe("Login Routing & Redirect Resolver", () => {
    it("should map user roles to their respective enterprise destinations", () => {
      expect(getRoleDestination("SUPER_ADMIN")).toBe("/admin");
      expect(getRoleDestination("SALON_OWNER")).toBe("/owner");
      expect(getRoleDestination("STAFF")).toBe("/staff");
      expect(getRoleDestination("CUSTOMER")).toBe("/me");
      expect(getRoleDestination(undefined)).toBe("/login");
    });

    it("should allow staff destination to point to dedicated staff panel", () => {
      expect(getRoleDestination("STAFF", "aura-unisex")).toBe("/staff");
    });

    it("should preserve custom redirect query if valid relative route", () => {
      expect(resolveAuthRedirect("/admin/tenants", "SUPER_ADMIN")).toBe("/admin/tenants");
      expect(resolveAuthRedirect("/owner/billing", "SALON_OWNER")).toBe("/owner/billing");
      expect(resolveAuthRedirect("/me?tab=history", "CUSTOMER")).toBe("/me?tab=history");
    });

    it("should fall back to role destination if redirect param is empty or malicious open redirect", () => {
      expect(resolveAuthRedirect(null, "SUPER_ADMIN")).toBe("/admin");
      expect(resolveAuthRedirect("", "SALON_OWNER")).toBe("/owner");
      // Block open redirect attempts starting with '//' or external scheme
      expect(resolveAuthRedirect("//evil.com", "SUPER_ADMIN")).toBe("/admin");
      expect(resolveAuthRedirect("https://attacker.com", "STAFF")).toBe("/staff");
    });

    it("should route appropriately across all 4 roles when logging in from customer side (/s/[slug])", () => {
      // 1. Super Admin logging in from customer side -> routed to platform admin HQ
      expect(resolveAuthRedirect("/s/ramesh-barber", "SUPER_ADMIN")).toBe("/admin");
      expect(resolveAuthRedirect("/s/aura-salon", "SUPER_ADMIN")).toBe("/admin");

      // 2. Salon Owner logging in from customer side -> routed to owner portal for that salon
      expect(resolveAuthRedirect("/s/ramesh-barber", "SALON_OWNER")).toBe("/owner?salon=ramesh-barber");
      expect(resolveAuthRedirect("/s/aura-salon", "SALON_OWNER")).toBe("/owner?salon=aura-salon");

      // 3. Staff / Barber logging in from customer side -> routed to dedicated staff panel
      expect(resolveAuthRedirect("/s/ramesh-barber", "STAFF")).toBe("/staff");
      expect(resolveAuthRedirect("/s/aura-salon", "STAFF")).toBe("/staff");

      // 4. Customer logging in from customer side -> returns to the customer storefront so they can book/queue
      expect(resolveAuthRedirect("/s/ramesh-barber", "CUSTOMER")).toBe("/s/ramesh-barber");
      expect(resolveAuthRedirect("/s/aura-salon", "CUSTOMER")).toBe("/s/aura-salon");
    });

    it("should protect against unauthorized cross-role redirects", () => {
      // Customer trying to access restricted admin or owner portals is redirected away safely
      expect(resolveAuthRedirect("/admin/billing", "CUSTOMER")).toBe("/me");
      expect(resolveAuthRedirect("/owner/staff", "CUSTOMER")).toBe("/me");

      // Staff trying to access admin is routed to dedicated staff panel
      expect(resolveAuthRedirect("/admin/settings", "STAFF")).toBe("/staff");

      // Salon owner trying to access platform admin is routed to owner portal
      expect(resolveAuthRedirect("/admin/security", "SALON_OWNER")).toBe("/owner");
    });
  });

  describe("AuthGuard Component", () => {
    it("should display a clean loading skeleton when authentication state is resolving", () => {
      const mockAuth = createMockAuthContext({
        isLoading: true,
        user: null,
      });

      const tree = React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(
          AuthGuard,
          { requiredRole: "SUPER_ADMIN" },
          React.createElement("div", { id: "protected-content" }, "Admin Secret Area")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("Verifying");
      expect(html).not.toContain("Admin Secret Area");
    });

    it("should render access denied card with direct login button when unauthenticated", () => {
      currentPathname = "/admin/tenants";
      const mockAuth = createMockAuthContext({
        isLoading: false,
        user: null,
      });

      const tree = React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(
          AuthGuard,
          { requiredRole: "SUPER_ADMIN" },
          React.createElement("div", { id: "protected-content" }, "Admin Secret Area")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("Access Denied");
      expect(html).toContain("Sign In to Access");
      expect(html).toContain(encodeURIComponent("/admin/tenants"));
      expect(html).not.toContain("Admin Secret Area");
    });

    it("should display authorization required banner with role mismatch info and switch account action", () => {
      currentPathname = "/admin/billing";
      const mockAuth = createMockAuthContext({
        isLoading: false,
        user: {
          id: "u-staff-01",
          username: "ramesh",
          role: "STAFF",
          status: "ACTIVE",
        },
      });

      const tree = React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(
          AuthGuard,
          { requiredRole: "SUPER_ADMIN" },
          React.createElement("div", { id: "protected-content" }, "Admin Billing Records")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("Access Restricted");
      expect(html).toContain("STAFF");
      expect(html).toContain("SUPER_ADMIN");
      expect(html).toContain("Switch Account");
      expect(html).not.toContain("Admin Billing Records");
    });

    it("should render children directly when user is authenticated with matching role", () => {
      const mockAuth = createMockAuthContext({
        isLoading: false,
        user: {
          id: "u-admin-01",
          username: "admin",
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });

      const tree = React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(
          AuthGuard,
          { requiredRole: "SUPER_ADMIN" },
          React.createElement("div", { id: "protected-content" }, "Admin Protected Data")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("Admin Protected Data");
      expect(html).not.toContain("Access Denied");
      expect(html).not.toContain("Access Restricted");
    });

    it("should render children when authenticated and no requiredRole is specified", () => {
      const mockAuth = createMockAuthContext({
        isLoading: false,
        user: {
          id: "u-cust-01",
          username: "customer_jane",
          role: "CUSTOMER",
          status: "ACTIVE",
        },
      });

      const tree = React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(
          AuthGuard,
          {},
          React.createElement("div", { id: "open-protected" }, "Any Authenticated User")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("Any Authenticated User");
    });

    it("should support an array of allowed roles (e.g. SUPER_ADMIN or SALON_OWNER)", () => {
      // 1. Salon Owner should pass
      const ownerAuth = createMockAuthContext({
        isLoading: false,
        user: {
          id: "u-owner-01",
          username: "aura_owner",
          role: "SALON_OWNER",
          status: "ACTIVE",
        },
      });

      const ownerTree = React.createElement(
        AuthContext.Provider,
        { value: ownerAuth },
        React.createElement(
          AuthGuard,
          { requiredRole: ["SUPER_ADMIN", "SALON_OWNER"] },
          React.createElement("div", { id: "owner-view" }, "Salon Owner Hub Content")
        )
      );
      expect(renderToString(ownerTree)).toContain("Salon Owner Hub Content");

      // 2. Super Admin should also pass
      const adminAuth = createMockAuthContext({
        isLoading: false,
        user: {
          id: "u-admin-01",
          username: "admin",
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });

      const adminTree = React.createElement(
        AuthContext.Provider,
        { value: adminAuth },
        React.createElement(
          AuthGuard,
          { requiredRole: ["SUPER_ADMIN", "SALON_OWNER"] },
          React.createElement("div", { id: "admin-view" }, "Salon Owner Hub Content")
        )
      );
      expect(renderToString(adminTree)).toContain("Salon Owner Hub Content");

      // 3. Staff member should be restricted
      const staffAuth = createMockAuthContext({
        isLoading: false,
        user: {
          id: "u-staff-01",
          username: "ramesh",
          role: "STAFF",
          status: "ACTIVE",
        },
      });

      const staffTree = React.createElement(
        AuthContext.Provider,
        { value: staffAuth },
        React.createElement(
          AuthGuard,
          { requiredRole: ["SUPER_ADMIN", "SALON_OWNER"] },
          React.createElement("div", { id: "staff-view" }, "Salon Owner Hub Content")
        )
      );
      const staffHtml = renderToString(staffTree);
      expect(staffHtml).toContain("Access Restricted");
      expect(staffHtml).not.toContain("Salon Owner Hub Content");
    });
  });

  describe("Dedicated Consumer Login View (LoginPage)", () => {
    it("should render clean dedicated consumer login page with phone entry and registration tab", () => {
      const mockAuth = createMockAuthContext({
        isLoading: false,
        user: null,
      });

      const tree = React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(LoginPage)
      );

      const html = renderToString(tree);
      expect(html).toContain("Customer Sign In");
      expect(html).toContain("Customer Lounge");
      expect(html).toContain("New Customer");
      expect(html).toContain("Email or Username");
      expect(html).toContain("Go to Partner Portal");
      expect(html).toContain("/partner/login");
      expect(html).toContain("/admin/login");
    });
  });

  describe("Admin Layout & Protected Route Integration", () => {
    it("should display authenticated SUPER_ADMIN profile with role badge in sidebar", () => {
      const mockAuth = createMockAuthContext({
        isLoading: false,
        user: {
          id: "u-admin-01",
          username: "admin_master",
          role: "SUPER_ADMIN",
          status: "ACTIVE",
        },
      });

      const tree = React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(
          AdminLayout,
          {},
          React.createElement("div", { id: "admin-view" }, "Admin Dashboard View")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("admin_master");
      expect(html).toContain("SUPER_ADMIN");
      expect(html).toContain("Admin Dashboard View");
    });

    it("should protect admin layout when an unauthorized role enters", () => {
      const mockAuth = createMockAuthContext({
        isLoading: false,
        user: {
          id: "u-staff-01",
          username: "ramesh",
          role: "STAFF",
          status: "ACTIVE",
        },
      });

      const tree = React.createElement(
        AuthContext.Provider,
        { value: mockAuth },
        React.createElement(
          AdminLayout,
          {},
          React.createElement("div", { id: "admin-view" }, "Admin Dashboard View")
        )
      );

      const html = renderToString(tree);
      expect(html).toContain("Access Restricted");
      expect(html).not.toContain("Admin Dashboard View");
    });
  });

  describe("Logout and Token Cleanup Protocol", () => {
    it("should clear localStorage and cookies when session ends", () => {
      setAuthToken("sample_jwt_999");
      expect(getAuthToken()).toBe("sample_jwt_999");
      expect(localStorage.getItem("engine_token")).toBe("sample_jwt_999");

      // Clear tokens
      setAuthToken(null);

      expect(getAuthToken()).toBeNull();
      expect(localStorage.getItem("engine_token")).toBeNull();
      expect(document.cookie).not.toContain("engine_token=sample_jwt_999");
    });
  });
});
