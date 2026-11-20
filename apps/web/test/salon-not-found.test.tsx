import { describe, it, expect, mock, beforeEach } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { SalonNotFound } from "../components/salon/salon-not-found";
import { isSalonNotFoundError } from "../lib/api";

// Mock next/navigation
mock.module("next/navigation", () => ({
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/s/non-existent-salon",
  redirect: (url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`);
    (error as any).digest = `NEXT_REDIRECT;${url}`;
    throw error;
  },
}));

describe("Salon Not Found & Slug Guard Architecture", () => {
  describe("1. isSalonNotFoundError Utility", () => {
    it("should return true for HTTP 404 status", () => {
      expect(isSalonNotFoundError({ status: 404, message: "Not Found" })).toBe(true);
      expect(isSalonNotFoundError({ status: 404 })).toBe(true);
    });

    it("should return true for 'Salon not found' messages", () => {
      expect(isSalonNotFoundError(new Error("Salon not found"))).toBe(true);
      expect(isSalonNotFoundError({ message: "Salon not found" })).toBe(true);
      expect(isSalonNotFoundError(new Error("Failed to join queue: Salon not found"))).toBe(true);
    });

    it("should return true for general 404 messages", () => {
      expect(isSalonNotFoundError(new Error("HTTP 404 Not Found"))).toBe(true);
      expect(isSalonNotFoundError(new Error("Resource not found"))).toBe(true);
    });

    it("should return false for unrelated errors", () => {
      expect(isSalonNotFoundError(new Error("Database connection timed out"))).toBe(false);
      expect(isSalonNotFoundError({ status: 500, message: "Internal Server Error" })).toBe(false);
      expect(isSalonNotFoundError({ status: 400, message: "Bad Request" })).toBe(false);
      expect(isSalonNotFoundError(null)).toBe(false);
      expect(isSalonNotFoundError(undefined)).toBe(false);
    });
  });

  describe("2. SalonNotFound Component Visual & Interactive Contract", () => {
    it("should render 404 badges, requested handle, and explanatory message", () => {
      const html = renderToString(React.createElement(SalonNotFound, { slug: "mystic-cuts" }));

      // Brand & Navigation
      expect(html).toContain("CutQueue");
      expect(html).toContain("Salon Engine");

      // 404 and handle indication
      expect(html).toContain("404 • Salon Not Found");
      expect(html).toContain("Unregistered Link");
      expect(html).toContain("No Salon at this Handle");
      expect(html).toContain("@mystic-cuts");

      // Helpful explanation
      expect(html).toContain("We searched the network but could not locate an active salon registered under");
    });

    it("should render both primary customer CTA and secondary owner CTA", () => {
      const html = renderToString(React.createElement(SalonNotFound, { slug: "random-barber-shop" }));

      // Primary Customer CTA -> / (Explore Salons)
      expect(html).toContain('href="/"');
      expect(html).toContain("Explore Registered Salons");

      // Secondary Owner CTA -> /onboarding?slug=...
      expect(html).toContain('href="/onboarding?slug=random-barber-shop"');
      expect(html).toContain("Are you the owner? Register your salon");
    });

    it("should render handle search form and helpful tips", () => {
      const html = renderToString(React.createElement(SalonNotFound, { slug: "xyz" }));

      expect(html).toContain("Looking for a specific salon?");
      expect(html).toContain("enter-salon-handle");
      expect(html).toContain("Check the Spelling");
      expect(html).toContain("Own this Handle?");
    });
  });

  describe("3. Onboarding Redirect Route (/onboarding)", () => {
    it("should redirect to /register?type=owner with preserved query parameters", async () => {
      const OnboardingModule = await import("../app/onboarding/page");
      const OnboardingPage = OnboardingModule.default;

      // When called without params
      try {
        await OnboardingPage({});
        expect(false).toBe(true); // Should throw redirect
      } catch (err: any) {
        expect(err.message).toContain("NEXT_REDIRECT: /register?type=owner");
      }

      // When called with custom slug param
      try {
        await OnboardingPage({
          searchParams: Promise.resolve({ slug: "barber-bliss", ref: "PARTNER99" }),
        });
        expect(false).toBe(true);
      } catch (err: any) {
        expect(err.message).toContain("/register?type=owner");
        expect(err.message).toContain("slug=barber-bliss");
        expect(err.message).toContain("ref=PARTNER99");
      }
    });
  });

  describe("4. Synthetic Fake Salon Removal from TV Client", () => {
    it("should not contain hardcoded synthetic fake phone +91 98765 00000 in tv-client source", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const tvClientPath = path.resolve(process.cwd(), "apps/web/app/s/[slug]/tv/tv-client.tsx");
      const source = fs.readFileSync(tvClientPath, "utf-8");

      expect(source).not.toContain("+91 98765 00000");
      expect(source).not.toContain("Fallback for demo or custom slugs");
      expect(source).toContain("isSalonNotFoundError");
      expect(source).toContain("SalonNotFound");
    });
  });

  describe("5. Route Guards for Non-Existent Salons", () => {
    it("Storefront (/s/[slug]/page.tsx) must guard with SalonNotFound on 404", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const pagePath = path.resolve(process.cwd(), "apps/web/app/s/[slug]/page.tsx");
      const source = fs.readFileSync(pagePath, "utf-8");

      expect(source).toContain("isSalonNotFoundError");
      expect(source).toContain("SalonNotFound");
      expect(source).toContain("if (isNotFound)");
      expect(source).toContain("<SalonNotFound slug={slug} />");
      expect(source).toContain("localStorage.removeItem(`salon_cache_${slug}`)");
    });

    it("Queue page (/s/[slug]/queue/page.tsx) must guard with SalonNotFound on 404", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const pagePath = path.resolve(process.cwd(), "apps/web/app/s/[slug]/queue/page.tsx");
      const source = fs.readFileSync(pagePath, "utf-8");

      expect(source).toContain("isSalonNotFoundError");
      expect(source).toContain("SalonNotFound");
      expect(source).toContain("if (isNotFound)");
      expect(source).toContain("<SalonNotFound slug={slug} />");
      expect(source).toContain("localStorage.removeItem(`salon_cache_${slug}`)");
    });

    it("Services page (/s/[slug]/services/page.tsx) must guard with SalonNotFound on 404", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const pagePath = path.resolve(process.cwd(), "apps/web/app/s/[slug]/services/page.tsx");
      const source = fs.readFileSync(pagePath, "utf-8");

      expect(source).toContain("isSalonNotFoundError");
      expect(source).toContain("SalonNotFound");
      expect(source).toContain("if (isNotFound)");
      expect(source).toContain("<SalonNotFound slug={slug} />");
      expect(source).toContain("localStorage.removeItem(`salon_cache_${slug}`)");
    });

    it("Booking page (/s/[slug]/book/page.tsx) must guard with SalonNotFound on 404", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const pagePath = path.resolve(process.cwd(), "apps/web/app/s/[slug]/book/page.tsx");
      const source = fs.readFileSync(pagePath, "utf-8");

      expect(source).toContain("isSalonNotFoundError");
      expect(source).toContain("SalonNotFound");
      expect(source).toContain("if (isNotFound)");
      expect(source).toContain("<SalonNotFound slug={slug} />");
      expect(source).toContain("localStorage.removeItem(`salon_cache_${slug}`)");
    });

    it("Staff Station (/s/[slug]/station/page.tsx) must guard with SalonNotFound on 404", async () => {
      const fs = await import("fs");
      const path = await import("path");
      const pagePath = path.resolve(process.cwd(), "apps/web/app/s/[slug]/station/page.tsx");
      const source = fs.readFileSync(pagePath, "utf-8");

      expect(source).toContain("isSalonNotFoundError");
      expect(source).toContain("SalonNotFound");
      expect(source).toContain("if (isNotFound)");
      expect(source).toContain("<SalonNotFound slug={slug} />");
      expect(source).toContain("localStorage.removeItem(`station_offline_cache_${slug}`)");
    });
  });
});
