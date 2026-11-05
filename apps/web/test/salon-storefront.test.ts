import { describe, it, expect, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock next/navigation
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/s/ramesh-barber",
}));

// Mock socket hook
mock.module("@/lib/socket", () => ({
  useSalonSocket: () => ({
    isConnected: true,
    status: "CONNECTED",
    reconnectAttempts: 0,
  }),
}));

// Mock auth hook
mock.module("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: null,
    salon: null,
    staff: null,
    organization: null,
    branches: [],
    token: null,
    isLoading: false,
    login: async () => {},
    pinLogin: async () => {},
    logout: async () => {},
  }),
}));

describe("Salon Digital Storefront & Decoupled Architecture (/s/[slug])", () => {
  it("should render full digital storefront layout with hero, wait time, service menu, about us, and contact sections", async () => {
    const PageModule = await import("../app/s/[slug]/page");
    const CustomerDoorPage = PageModule.default;

    const paramsPromise = Promise.resolve({ slug: "ramesh-barber" });
    (paramsPromise as any).status = "fulfilled";
    (paramsPromise as any).value = { slug: "ramesh-barber" };

    const html = renderToString(React.createElement(CustomerDoorPage, { params: paramsPromise }));

    // 1. Navigation Menu & Brand Header
    expect(html).toContain("Live Queue");
    expect(html).toContain("Services");
    expect(html).toContain("Lobby TV");
    expect(html).toContain("/s/ramesh-barber/queue");
    expect(html).toContain("/s/ramesh-barber/services");

    // 2. Hero Section & Live Wait Telemetry
    expect(html).toContain('id="hero"');
    expect(html).toContain("Accepting Walk-ins");
    expect(html).toContain("Live Queue Wait Time");
    expect(html).toContain("Join Live Queue Now");

    // 3. Service Menu Section
    expect(html).toContain('id="services"');
    expect(html).toContain("Service Menu &amp; Transparent Pricing");

    // 4. Rich About Us & Craft Section
    expect(html).toContain('id="about"');
    expect(html).toContain("Our Story &amp; Craft");
    expect(html).toContain("UV Sterilization");
    expect(html).toContain("Studio Amenities &amp; Guest Comforts");

    // 5. Contact, Location & Operating Hours Section
    expect(html).toContain('id="contact"');
    expect(html).toContain("Contact Us, Hours &amp; Location");
    expect(html).toContain("Operating Hours");
    expect(html).toContain("Salon Location");

    // 6. Footer Links
    expect(html).toContain("/s/ramesh-barber/queue");
    expect(html).toContain("/s/ramesh-barber/services");
    expect(html).toContain("/s/ramesh-barber/tv");
  });

  it("should render dedicated queue operational page (/s/[slug]/queue)", async () => {
    const QueuePageModule = await import("../app/s/[slug]/queue/page");
    const DedicatedQueuePage = QueuePageModule.default;

    const paramsPromise = Promise.resolve({ slug: "ramesh-barber" });
    (paramsPromise as any).status = "fulfilled";
    (paramsPromise as any).value = { slug: "ramesh-barber" };

    const html = renderToString(React.createElement(DedicatedQueuePage, { params: paramsPromise }));

    expect(html).toContain("Instant Walk-In Check-In");
    expect(html).toContain("Your Full Name");
    expect(html).toContain("Join Live Queue Now");
    expect(html).toContain("Live Floor &amp; Waiting List");
  });

  it("should render dedicated services catalog page (/s/[slug]/services)", async () => {
    const ServicesPageModule = await import("../app/s/[slug]/services/page");
    const DedicatedServicesPage = ServicesPageModule.default;

    const paramsPromise = Promise.resolve({ slug: "ramesh-barber" });
    (paramsPromise as any).status = "fulfilled";
    (paramsPromise as any).value = { slug: "ramesh-barber" };

    const html = renderToString(React.createElement(DedicatedServicesPage, { params: paramsPromise }));

    expect(html).toContain("Full Service Catalog");
    expect(html).toContain("Transparent Pricing Guarantee");
    expect(html).toContain("Service Menu &amp; Transparent Pricing");
  });
});
