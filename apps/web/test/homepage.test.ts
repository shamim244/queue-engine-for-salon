import { describe, it, expect, mock } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";

// Mock next/navigation for unit testing App Router components
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

describe("Home Page & Developer Launcher Routing", () => {
  describe("Task 1: Developer Testing Launcher (/dev)", () => {
    it("should export a valid component rendering all operational panels and demo accounts", async () => {
      // Dynamic import
      const DevModule = await import("../app/dev/page");
      const DevPage = DevModule.default;

      const html = renderToString(React.createElement(DevPage));

      // Brand & Launcher header
      expect(html).toContain("Engine Que System");
      expect(html).toContain("Developer");
      expect(html).toContain("Operational Frontend Panels");

      // Banner linking to Marketing Home
      expect(html).toContain('href="/"');

      // Key panel links
      expect(html).toContain("/admin");
      expect(html).toContain("/owner");
      expect(html).toContain("/staff/preferences");
      expect(html).toContain("/s/ramesh-barber/station");
      expect(html).toContain("/s/ramesh-barber");
      expect(html).toContain("/s/ramesh-barber/tv");
      expect(html).toContain("/me");

      // Demo credentials displayed for testers
      expect(html).toContain("admin / Admin@123");
      expect(html).toContain("aura_owner / Aura@123");
      expect(html).toContain("ramesh / Ramesh@123");
    });
  });

  describe("Task 2: Public Marketing Home Page (/)", () => {
    it("should export a dedicated high-conversion marketing page with hero, dual architecture, features, and pricing", async () => {
      const HomeModule = await import("../app/page");
      const HomePage = HomeModule.default;

      const html = renderToString(React.createElement(HomePage));

      // Brand & Hero
      expect(html).toContain("Engine Que");
      expect(html).toContain("Real-Time Queue Engine");

      // Navigation actions
      expect(html).toContain('href="/login"');
      expect(html).toContain('href="/register"');
      expect(html).toContain('href="/dev"');

      // 6-Pillar Features & Capabilities
      expect(html).toContain("QR");
      expect(html).toContain("WhatsApp");
      expect(html).toContain("PIN");
      expect(html).toContain("Departure Board");

      // Transparent SaaS Pricing Plans
      expect(html).toContain("Starter Plan");
      expect(html).toContain("Pro Plan");
      expect(html).toContain("Enterprise Plan");

      // Social Proof / Testimonials
      expect(html).toContain("Ramesh Kumar");
    });
  });

  describe("Task 3: Self-Service Salon Registration Page (/register)", () => {
    it("should export a client registration portal for onboarding new salons", async () => {
      const RegisterModule = await import("../app/register/page");
      const RegisterPage = RegisterModule.default;

      const html = renderToString(React.createElement(RegisterPage));

      expect(html).toContain("Register Your Salon");
      expect(html).toContain("Salon Name");
      expect(html).toContain("Phone");
      expect(html).toContain("Salon Owner Account Credentials");
      expect(html).toContain("Owner Account");
      expect(html).toContain("Password");
      expect(html).toContain("Autofill Demo Salon");
    });
  });
});
