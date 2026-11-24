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
  it("should render SalonBackgroundPattern with illustrated vector wallpaper motifs", async () => {
    const { SalonBackgroundPattern, SalonStationIsometricIllustration, ScissorsShearsVector, BarberChairVector } =
      await import("../components/landing/salon-vector-art");

    const patternHtml = renderToString(<SalonBackgroundPattern opacity={0.14} />);
    expect(patternHtml).toContain("salon-artisan-pattern");
    expect(patternHtml).toContain("<pattern");

    const stationHtml = renderToString(
      <SalonStationIsometricIllustration activeTicket="#103" liveBill="₹140" />
    );
    expect(stationHtml).toContain("#103");
    expect(stationHtml).toContain("₹140");
    expect(stationHtml).toContain("CHAIR #1");
    expect(stationHtml).toContain("TOKEN #104");
    expect(stationHtml).toContain("Amit Sharma");
    expect(stationHtml).toContain("SCAN QR");

    const shearsHtml = renderToString(<ScissorsShearsVector size={48} />);
    expect(shearsHtml).toContain("<svg");

    const chairHtml = renderToString(<BarberChairVector size={56} />);
    expect(chairHtml).toContain("<svg");
  });

  it("should render SalonWorkflowCircuit with the 5 physical salon touchpoint nodes and animated pipeline", async () => {
    const { SalonWorkflowCircuit } = await import("../components/landing/salon-workflow-circuit");

    const html = renderToString(
      <SalonWorkflowCircuit config={DEFAULT_LANDING_CONFIG} />
    );

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

  it("should render Hero2Point5D with authentic barbershop tokens, live station tablet, 2.5D scroll unfolding and architectural illustration", async () => {
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
    expect(html).toContain("2.5D Architectural Salon Station Diagram");
    expect(html).toContain("Simulate 1-Tap Barber Call Next");
    expect(html).toContain("Quick Focus:");
    expect(html).toContain("Zero Wash-Hand Friction");
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

  it("should render QueueSimulator with interactive barber chair controls and Web Audio chime triggers", async () => {
    const { QueueSimulator } = await import("../components/landing/queue-simulator.tsx");

    const html = renderToString(
      <QueueSimulator config={DEFAULT_LANDING_CONFIG} />
    );

    expect(html).toContain("Barber Cutting Station Chair #1");
    expect(html).toContain("Call Next Customer");
    expect(html).toContain("Station Touch Panel");
    expect(html).toContain("Next Customer Telemetry");
  });

  it("should render TvMirrorPreview with lounge departure board and chair columns", async () => {
    const { TvMirrorPreview } = await import("../components/landing/tv-mirror-preview.tsx");

    const html = renderToString(
      <TvMirrorPreview config={DEFAULT_LANDING_CONFIG} />
    );

    expect(html).toContain("Live Departure Board");
    expect(html).toContain("CHAIR #1");
    expect(html).toContain("CHAIR #2");
    expect(html).toContain("SUMMONED");
    expect(html).toContain("Kiosk Mode");
  });

  it("should render UpiShowcase with dynamic NPCI UPI QR code and 0% gateway fee guarantee", async () => {
    const { UpiShowcase } = await import("../components/landing/upi-showcase.tsx");

    const html = renderToString(
      <UpiShowcase config={DEFAULT_LANDING_CONFIG} />
    );

    expect(html).toContain("Dynamic Salon Bill QR");
    expect(html).toContain("Stylist Chair Billing");
    expect(html).toContain("Direct-To-Bank Credit");
    expect(html).toContain("Ramesh Traditional Barber");
  });

  it("should render PricingSection with clear salon tiering and chair allocations", async () => {
    const { PricingSection } = await import("../components/landing/pricing-section.tsx");

    const html = renderToString(
      <PricingSection config={DEFAULT_LANDING_CONFIG} />
    );

    expect(html).toContain("Starter Edition");
    expect(html).toContain("Pro Edition");
    expect(html).toContain("Elite Enterprise");
    expect(html).toContain("Neighborhood Tier");
    expect(html).toContain("Busy Studio Tier");
  });

  it("should render LandingNavbar and LandingFooter with salon branding and navigation links", async () => {
    const { LandingNavbar } = await import("../components/landing/navbar.tsx");
    const { LandingFooter } = await import("../components/landing/footer.tsx");

    const navHtml = renderToString(
      <LandingNavbar config={DEFAULT_LANDING_CONFIG} />
    );
    expect(navHtml).toContain("Salon OS");
    expect(navHtml).toContain("Chair Simulator");

    const footerHtml = renderToString(
      <LandingFooter config={DEFAULT_LANDING_CONFIG} />
    );
    expect(footerHtml).toContain("Bun Core Engine");
    expect(footerHtml).toContain("Partner Franchise");
  });
});
