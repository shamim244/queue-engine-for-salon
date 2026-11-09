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
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
}));

import AdminLayout from "../app/admin/layout";
import { ServiceWorkerRegister } from "../components/sw-register";
import { AuthContext } from "../lib/auth-context";

const mockAuthAdmin: any = {
  user: {
    id: "admin-1",
    username: "superadmin",
    name: "Super Administrator",
    role: "SUPER_ADMIN",
    email: "admin@engineque.com",
  },
  salon: null,
  staff: null,
  organization: null,
  branches: [],
  token: "mock-admin-token",
  isLoading: false,
  login: async () => ({ token: "mock", user: {} as any }),
  pinLogin: async () => ({ token: "mock", user: {} as any }),
  logout: async () => {},
  refreshUser: async () => {},
  setSelectedSalon: () => {},
  demoLogin: async () => {},
};

describe("Admin Layout & Lucide Module Resolution", () => {
  it("imports and exports AdminLayout without module factory errors", () => {
    expect(AdminLayout).toBeDefined();
    expect(typeof AdminLayout).toBe("function");
  });

  it("renders AdminLayout cleanly with navigation items, headers, and Lucide Chevron icons", () => {
    const html = renderToString(
      <AuthContext.Provider value={mockAuthAdmin}>
        <AdminLayout>
          <div data-testid="child-content">Admin Dashboard Content</div>
        </AdminLayout>
      </AuthContext.Provider>
    );

    expect(html).toContain("Admin Dashboard Content");
    expect(html).toContain("SaaS Admin");
    expect(html).toContain("Core Operations");
    expect(html).toContain("Finance &amp; Gateways");
    expect(html).toContain("Tenant Salons");
    // Lucide ChevronDown rendered on accordion headers
    expect(html).toContain("lucide-chevron-down");
    // Lucide ChevronRight rendered on active route indicator (/admin is active)
    expect(html).toContain("lucide-chevron-right");
  });

  it("renders ServiceWorkerRegister safely in test/dev environment without crashing", () => {
    const html = renderToString(<ServiceWorkerRegister />);
    expect(html).toBe("");
  });

  it("ensures public/sw.js enforces eq-pwa-v9 cache invalidation and dev host protection", async () => {
    const swContent = await Bun.file("public/sw.js").text();
    expect(swContent).toContain("eq-pwa-v9");
    expect(swContent).toContain("isDevHost");
    expect(swContent).toContain("localhost");
    expect(swContent).toContain("127.0.0.1");
    expect(swContent).toContain("no-store");
    expect(swContent).toContain("no-cache");
  });

  it("ensures app/layout.tsx contains synchronous dev service worker cleanup in <head>", async () => {
    const layoutContent = await Bun.file("app/layout.tsx").text();
    expect(layoutContent).toContain("dev-sw-cleanup");
    expect(layoutContent).toContain("navigator.serviceWorker.getRegistrations");
    expect(layoutContent).toContain("caches.delete");
  });
});
