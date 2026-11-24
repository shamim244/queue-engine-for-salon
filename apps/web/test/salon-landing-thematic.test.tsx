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

describe("Salon Thematic 2.5D Components Suite (TDD)", () => {
  it("should render SalonWorkflowCircuit with the 5 physical salon touchpoint nodes and animated pipeline", async () => {
    const { SalonWorkflowCircuit } = await import("../components/landing/salon-workflow-circuit");

    const html = renderToString(
      <SalonWorkflowCircuit config={DEFAULT_LANDING_CONFIG} />
    );

    // Verify the 5 nodes
    expect(html).toContain("Entrance Door QR");
    expect(html).toContain("Bun Queue Engine");
    expect(html).toContain("Barber Chair Station");
    expect(html).toContain("WhatsApp Summon");
    expect(html).toContain("Lobby Departure TV");
    expect(html).toContain("Sub-15ms");
    expect(html).toContain("Acrylic Door Stand");
  });

  it("should render SalonServicesMarquee with authentic grooming packages and pricing", async () => {
    const { SalonServicesMarquee } = await import("../components/landing/salon-services-marquee");

    const html = renderToString(
      <SalonServicesMarquee config={DEFAULT_LANDING_CONFIG} />
    );

    expect(html).toContain("Classic Fade");
    expect(html).toContain("Beard Sculpting");
    expect(html).toContain("De-Tan Facial");
    expect(html).toContain("Keratin");
    expect(html).toContain("₹");
    expect(html).toContain("Indiranagar, Bengaluru");
  });

  it("should render Hero2Point5D with authentic barbershop tokens, live station tablet and 2.5D scroll unfolding", async () => {
    const { Hero2Point5D } = await import("../components/landing/hero-2point5d.tsx");

    const html = renderToString(
      <Hero2Point5D config={DEFAULT_LANDING_CONFIG} />
    );

    expect(html).toContain("Ramesh Traditional Barber");
    expect(html).toContain("#104");
    expect(html).toContain("Haircut");
    expect(html).toContain("PIN: 1234");
    expect(html).toContain("Paper Token Stub");
    expect(html).toContain("WhatsApp Summon Pill");
    expect(html).toContain("Chair Mirror Touchpad");
  });

  it("should render RoiCalculator with sliding number tally and salon economics", async () => {
    const { RoiCalculator } = await import("../components/landing/roi-calculator.tsx");

    const html = renderToString(
      <RoiCalculator config={DEFAULT_LANDING_CONFIG} />
    );

    expect(html).toContain("How Much Cash Are You Losing to Waiting Benches?");
    expect(html).toContain("Active Styling Chairs");
    expect(html).toContain("Lost Walk-Outs on Saturday / Sunday");
    expect(html).toContain("Estimated Monthly Cash Recovered");
    expect(html).toContain("₹");
  });
});
