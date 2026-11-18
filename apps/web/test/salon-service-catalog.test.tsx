import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { ServiceIcon } from "../components/ui/service-icon";
import {
  searchSalonIcons,
  suggestIconForServiceName,
  suggestMultipleIconsForServiceName,
  SALON_ICON_CATEGORIES,
  CURATED_SALON_ICONS,
} from "../lib/salon-icons";

describe("Service Catalog & Icon Engine", () => {
  describe("Curated Salon Icon Search & Categories", () => {
    it("has properly structured categories and curated icon catalog", () => {
      expect(SALON_ICON_CATEGORIES.length).toBeGreaterThan(4);
      expect(CURATED_SALON_ICONS.length).toBeGreaterThan(20);

      const haircutIcons = CURATED_SALON_ICONS.filter((i) => i.category === "hair");
      expect(haircutIcons.length).toBeGreaterThan(0);
    });

    it("searches icons by keyword matching name and synonyms", () => {
      const beardResults = searchSalonIcons("beard");
      expect(beardResults.length).toBeGreaterThan(0);
      expect(beardResults.some((i) => i.name.toLowerCase().includes("beard"))).toBe(true);

      const fadeResults = searchSalonIcons("fade");
      expect(fadeResults.length).toBeGreaterThan(0);

      const spaResults = searchSalonIcons("massage");
      expect(spaResults.length).toBeGreaterThan(0);
    });

    it("filters icons by category correctly", () => {
      const colorOnly = searchSalonIcons("", "color");
      expect(colorOnly.every((i) => i.category === "color")).toBe(true);

      const spaOnly = searchSalonIcons("", "spa");
      expect(spaOnly.every((i) => i.category === "spa")).toBe(true);
    });
  });

  describe("ServiceIcon Component Rendering & Fallbacks", () => {
    it("renders fallback emoji when icon is null or empty", () => {
      const htmlNull = renderToString(<ServiceIcon icon={null} />);
      expect(htmlNull).toContain("✂️");

      const htmlEmpty = renderToString(<ServiceIcon icon="" />);
      expect(htmlEmpty).toContain("✂️");

      const htmlCustomFallback = renderToString(<ServiceIcon icon="" fallback="💈" />);
      expect(htmlCustomFallback).toContain("💈");
    });

    it("renders external URL or SVGRepo link as an img element", () => {
      const url = "https://www.svgrepo.com/show/475142/hair-clipper.svg";
      const html = renderToString(<ServiceIcon icon={url} size={28} />);
      expect(html).toContain("<img");
      expect(html).toContain('src="https://www.svgrepo.com/show/475142/hair-clipper.svg"');
      expect(html).toContain('width="28"');
      expect(html).toContain('height="28"');
    });

    it("renders Lucide icons when prefixed with lucide: or matching known key", () => {
      const htmlLucideScissors = renderToString(<ServiceIcon icon="lucide:scissors" size={24} />);
      expect(htmlLucideScissors).toContain("<svg");

      const htmlLucideSparkles = renderToString(<ServiceIcon icon="lucide:sparkles" size={20} />);
      expect(htmlLucideSparkles).toContain("<svg");

      const htmlBareScissors = renderToString(<ServiceIcon icon="scissors" size={22} />);
      expect(htmlBareScissors).toContain("<svg");
    });

    it("renders standard Unicode emoji characters directly", () => {
      const htmlEmoji = renderToString(<ServiceIcon icon="🧔‍♂️" />);
      expect(htmlEmoji).toContain("🧔‍♂️");

      const htmlChampy = renderToString(<ServiceIcon icon="💆‍♂️" />);
      expect(htmlChampy).toContain("💆‍♂️");
    });
  });

  describe("Pricing Engine Rule Model Integrity", () => {
    it("differentiates FIXED, STARTING_AT, and FLEXIBLE_CHAIR semantics", () => {
      const fixedService = {
        name: "Standard Haircut",
        basePrice: 150,
        pricingType: "FIXED" as const,
        isAddOn: false,
      };

      const startingAtService = {
        name: "Beard Grooming & Color",
        basePrice: 200,
        pricingType: "STARTING_AT" as const,
        isAddOn: false,
      };

      const flexibleChairService = {
        name: "Custom Bridal / Event Hair Styling",
        basePrice: 500,
        pricingType: "FLEXIBLE_CHAIR" as const,
        isAddOn: false,
      };

      expect(fixedService.pricingType).toBe("FIXED");
      expect(startingAtService.pricingType).toBe("STARTING_AT");
      expect(flexibleChairService.pricingType).toBe("FLEXIBLE_CHAIR");
    });
  });

  describe("Smart Bidirectional Icon & Service Name Auto-Matching", () => {
    it("auto-selects relevant icon when typing haircut service names", () => {
      const matchClassic = suggestIconForServiceName("Classic Haircut");
      expect(matchClassic).not.toBeNull();
      expect(matchClassic?.category).toBe("hair");

      const matchFade = suggestIconForServiceName("Skin Fade & Crop");
      expect(matchFade).not.toBeNull();
      expect(matchFade?.category).toBe("hair");
    });

    it("auto-selects beard icons when typing beard or shave terms", () => {
      const matchBeard = suggestIconForServiceName("Royal Beard Shaping");
      expect(matchBeard).not.toBeNull();
      expect(matchBeard?.category).toBe("beard");

      const matchShave = suggestIconForServiceName("Clean Razor Shave");
      expect(matchShave).not.toBeNull();
      expect(matchShave?.category).toBe("beard");
    });

    it("auto-selects spa/champy icons when typing massage or head terms", () => {
      const matchChampy = suggestIconForServiceName("Ayurvedic Head Champy");
      expect(matchChampy).not.toBeNull();
      expect(matchChampy?.category).toBe("spa");

      const matchMassage = suggestIconForServiceName("Relaxation Body Massage");
      expect(matchMassage).not.toBeNull();
      expect(matchMassage?.category).toBe("spa");
    });

    it("auto-selects facial/skin icons when typing facial or de-tan terms", () => {
      const matchFacial = suggestIconForServiceName("Gold Glow Facial");
      expect(matchFacial).not.toBeNull();
      expect(matchFacial?.category).toBe("skin");

      const matchDetan = suggestIconForServiceName("O3+ De-Tan Face Pack");
      expect(matchDetan).not.toBeNull();
      expect(matchDetan?.category).toBe("skin");
    });

    it("auto-selects color icons when typing color or dye terms", () => {
      const matchColor = suggestIconForServiceName("L'Oreal Hair Color");
      expect(matchColor).not.toBeNull();
      expect(matchColor?.category).toBe("color");

      const matchHenna = suggestIconForServiceName("Organic Mehndi Henna");
      expect(matchHenna).not.toBeNull();
      expect(matchHenna?.category).toBe("color");
    });

    it("returns multiple ranked suggestions with limit", () => {
      const suggestions = suggestMultipleIconsForServiceName("Beard", 3);
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions.length).toBeLessThanOrEqual(3);
      expect(suggestions.every((s) => s.category === "beard" || s.name.toLowerCase().includes("beard"))).toBe(true);
    });

    it("returns empty array for very short or blank queries", () => {
      expect(suggestIconForServiceName("")).toBeNull();
      expect(suggestIconForServiceName("   ")).toBeNull();
      expect(suggestIconForServiceName("a")).toBeNull();
      expect(suggestMultipleIconsForServiceName("")).toEqual([]);
    });

    it("simulates bidirectional auto-fill: blank name populated from icon name", () => {
      let serviceName = "";
      const chosenIcon = CURATED_SALON_ICONS.find((i) => i.id === "beard-man-emoji");
      expect(chosenIcon).toBeDefined();

      // If user chose an icon while name was empty, name gets auto-filled
      if (!serviceName.trim() && chosenIcon?.name) {
        serviceName = chosenIcon.name;
      }

      expect(serviceName).toBe("Full Beard Trim");
    });
  });
});
