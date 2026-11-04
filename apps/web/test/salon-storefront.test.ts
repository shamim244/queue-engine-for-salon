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
  it("should render full digital storefront layout with hero, wait time, service menu, about us, and contact sections", async () => {
    const PageModule = await import("../app/s/[slug]/page");
    const CustomerDoorPage = PageModule.default;

    // React 19 synchronous thenable for use() in SSR
    const paramsPromise = Promise.resolve({ slug: "ramesh-barber" });
    (paramsPromise as any).status = "fulfilled";
    (paramsPromise as any).value = { slug: "ramesh-barber" };

    const html = renderToString(React.createElement(CustomerDoorPage, { params: paramsPromise }));

    // 1. Navigation Menu & Brand Header
    expect(html).toContain("Digital Storefront");
    expect(html).toContain("Live Queue");
    expect(html).toContain("Lobby TV");
    expect(html).toContain('href="#hero"');
    expect(html).toContain('href="#queue"');
    expect(html).toContain('href="#services"');
    expect(html).toContain('href="#team"');
    expect(html).toContain('href="#about"');
    expect(html).toContain('href="#contact"');

    // 2. Hero Section & Live Wait Telemetry
    expect(html).toContain('id="hero"');
    expect(html).toContain("Accepting Walk-ins");
    expect(html).toContain("Live Queue Wait Time");
    expect(html).toContain("Join Live Queue Now");

    // 3. Queue Departure Board
    expect(html).toContain('id="queue"');
    expect(html).toContain("Live Queue Flow &amp; Chair Floor");

    // 4. Service Menu Section
    expect(html).toContain('id="services"');
    expect(html).toContain("Service Menu &amp; Transparent Pricing");

    // 5. Rich About Us & Craft Section
    expect(html).toContain('id="about"');
    expect(html).toContain("Our Story &amp; Craft");
    expect(html).toContain("UV Sterilization");
    expect(html).toContain("Studio Amenities &amp; Guest Comforts");

    // 6. Contact, Location & Operating Hours Section
    expect(html).toContain('id="contact"');
    expect(html).toContain("Contact Us, Hours &amp; Location");
    expect(html).toContain("Operating Hours");
    expect(html).toContain("Salon Location");
    expect(html).toContain("Direct Contact");

    // 7. Footer & Owner Administration Links
    expect(html).toContain("Quick Navigation");
    expect(html).toContain("Customize Storefront");
    expect(html).toContain("/owner/storefront");
  });
});
