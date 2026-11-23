/**
 * Centralized Site & Brand Configuration for SalonView
 * Single source of truth for global branding, SEO metadata, and contact endpoints.
 * Updating this configuration globally updates all public-facing layouts.
 */

export const SITE_CONFIG = {
  // Brand Identity (Single edit point for instant global rebranding)
  name: "SalonView",
  legalName: "SalonView Technologies Private Limited",
  tagline: "Total Clarity. Effortless Operations.",
  shortTagline: "Smart Salon Operations & Live Queue Engine",
  description:
    "Real-time queue engine, ambient TV lounge mirrors, and dynamic 0% fee UPI payments for modern salons and barbershops. Built to eliminate walk-outs and double chair turnover.",

  // Operational & Marketing Domains
  domain: process.env.NEXT_PUBLIC_APP_DOMAIN || "salonview.in",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://salonview.in",
  marketingDomain: "getsalonview.com",

  // Support & Contact Channels
  support: {
    whatsapp: "+91 98765 43210",
    email: "support@salonview.in",
    partnerEmail: "partners@salonview.in",
  },

  // Social Media Handles
  social: {
    instagram: "salonviewapp",
    twitter: "salonviewapp",
    linkedin: "salonviewapp",
    youtube: "salonviewapp",
  },

  // Pricing Tiers Defaults (in INR)
  pricing: {
    starter: {
      monthly: 699,
      quarterly: 1899,
      annual: 6499,
      name: "Starter",
      idealFor: "Single-location local barbers (1-3 chairs)",
    },
    pro: {
      monthly: 1499,
      quarterly: 3999,
      annual: 13999,
      name: "Pro Growth",
      idealFor: "High-volume salons & studios (4-8 chairs)",
    },
    elite: {
      monthly: 3499,
      quarterly: 18999,
      annual: 34999,
      name: "Elite Chain",
      idealFor: "Multi-branch studios & franchises",
    },
  },

  // Partner Program Commission
  partner: {
    standardCommissionPct: 30,
    minPayoutThreshold: 1000,
  },

  // SEO & OpenGraph Defaults
  meta: {
    titleTemplate: "%s | SalonView",
    defaultTitle: "SalonView | Enterprise Salon Queue & Live Operations Engine",
    themeColor: "#0B0F17", // Obsidian Noir
    accentColor: "#10B981", // Hyper Emerald
  },
} as const;

export type SiteConfig = typeof SITE_CONFIG;
