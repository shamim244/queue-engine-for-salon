import { describe, it, expect, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { DEFAULT_LANDING_CONFIG } from "../lib/landing-config";

// Mock next/navigation
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: mock((_url: string) => {}),
    replace: mock((_url: string) => {}),
    prefetch: mock(() => {}),
    back: mock(() => {}),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(""),
}));

describe("Modern 2026 Salon UI Suite (TDD - 21st.dev & Magic UI Inspired)", () => {
  it("should render SalonCrowdHero with live walk-in crowd signals, queue pulses, and customer avatars", async () => {
    const { SalonCrowdHero } = await import("../components/landing/salon-crowd-hero");

    const html = renderToString(
      <SalonCrowdHero config={DEFAULT_LANDING_CONFIG} />
    );

    // Assert live crowd simulation features
    expect(html).toContain("Live Weekend Walk-In Stream");
    expect(html).toContain("Amit Sharma");
    expect(html).toContain("Ticket #104");
    expect(html).toContain("Stepping out for Chai");
    expect(html).toContain("Ramesh Kumar");
    expect(html).toContain("Chair #1 Active");
    expect(html).toContain("Vikram");
  });

  it("should render SalonGlassFolders with frosted glassmorphism, interactive tabs, and fanned-out services", async () => {
    const { SalonGlassFolders } = await import("../components/landing/salon-glass-folders");

    const html = renderToString(
      <SalonGlassFolders config={DEFAULT_LANDING_CONFIG} />
    );

    // Assert glass folder categories and services
    expect(html).toContain("Signature Cuts &amp; Fades");
    expect(html).toContain("Spa &amp; Skin Rituals");
    expect(html).toContain("Royal VIP Grooming");
    expect(html).toContain("Classic Fade");
    expect(html).toContain("Beard Sculpting");
    expect(html).toContain("Keratin Hair Spa");
    expect(html).toContain("₹");
    expect(html).toContain("Frosted Glass Vault");
  });

  it("should render SalonProductRail with tactile sliding rail, station hardware, and 1D physics", async () => {
    const { SalonProductRail } = await import("../components/landing/salon-product-rail");

    const html = renderToString(
      <SalonProductRail config={DEFAULT_LANDING_CONFIG} />
    );

    // Assert rail gallery items and salon equipment
    expect(html).toContain("Salon Hardware &amp; Station Rail");
    expect(html).toContain("Hydraulic Chair Bay");
    expect(html).toContain("Mirror Stylist Touchpad");
    expect(html).toContain("Acrylic Door QR Stand");
    expect(html).toContain("Waiting Lounge 65″ OLED Departure TV");
    expect(html).toContain("0% Fee NPCI Soundbox Counter");
    expect(html).toContain("Interactive Rail Gallery");
  });
});
