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
  usePathname: () => "/s/ramesh-barber",
  useSearchParams: () => new URLSearchParams(""),
}));

// Mock useAuth
mock.module("../lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    salon: null,
    login: mock(() => {}),
    logout: mock(() => {}),
    switchSalon: mock(() => {}),
  }),
  AuthProvider: ({ children }: any) => children,
}));

describe("Salon Digital Storefront & Homepage (/s/[slug])", () => {
  it("should render full digital storefront layout with hero, wait time, service menu, and queue actions", async () => {
    const PageModule = await import("../app/s/[slug]/page");
    const CustomerDoorPage = PageModule.default;

    // React 19 synchronous thenable for use() in SSR
    const paramsPromise = Promise.resolve({ slug: "ramesh-barber" });
    (paramsPromise as any).status = "fulfilled";
    (paramsPromise as any).value = { slug: "ramesh-barber" };

    const html = renderToString(React.createElement(CustomerDoorPage, { params: paramsPromise }));

    // 1. Navigation & Brand
    expect(html).toContain("Digital Storefront");
    expect(html).toContain("Live Queue");
    expect(html).toContain("Lobby TV");

    // 2. Hero Section & Live Wait Telemetry
    expect(html).toContain("Accepting Walk-ins");
    expect(html).toContain("Live Queue Wait Time");
    expect(html).toContain("Join Live Queue Now");

    // 3. Service Menu Section
    expect(html).toContain("Service Menu");
    expect(html).toContain("Transparent Pricing");

    // 4. Amenities & Reassurances
    expect(html).toContain("Zero App Download");
    expect(html).toContain("WhatsApp Summon Alerts");
    expect(html).toContain("Chai-Friendly");
  });
});
