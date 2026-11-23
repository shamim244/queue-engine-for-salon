"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { SettingsNav } from "@/components/admin/settings-nav";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Check,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Tv,
  Layers,
  Code2,
  Sparkles,
  ExternalLink,
  LayoutTemplate,
  Sliders,
  DollarSign,
  Share2,
  Phone,
  HelpCircle,
} from "lucide-react";
import { TEMPLATE_DEFINITIONS, type TemplateId, type SectionId } from "@/components/landing/registry";

interface AppearanceFormState {
  themeAccent: string;
  whiteLabelEnabled: boolean;
  customCssEnabled: boolean;
  tvDisplayMode: string;
  // Landing Page Template & CMS State
  landingPageConfig: {
    activeTemplate: TemplateId;
    enabledSections: string[];
    brandName: string;
    tagline: string;
    heroBadge: string;
    heroHeadline: string;
    heroSubheadline: string;
    heroCtaText: string;
    pricingStarterMonthly: number;
    pricingProMonthly: number;
    pricingEliteMonthly: number;
    partnerCommissionPct: number;
    supportWhatsapp: string;
    supportEmail: string;
    socialInstagram: string;
    socialTwitter: string;
    socialLinkedin: string;
  };
}

const defaultAppearanceState: AppearanceFormState = {
  themeAccent: "emerald",
  whiteLabelEnabled: false,
  customCssEnabled: false,
  tvDisplayMode: "AIRPORT_DEPARTURE",
  landingPageConfig: {
    activeTemplate: "2_5D_SCROLL",
    enabledSections: [
      "simulator",
      "tv_mirror",
      "upi_showcase",
      "roi_calculator",
      "pricing",
      "partner_banner",
      "faq",
    ],
    brandName: "SalonView",
    tagline: "Total Clarity. Effortless Operations.",
    heroBadge: "💈 The Real-Time Salon Operating Engine",
    heroHeadline: "Turn Weekend Walk-Outs Into Daily Cash.",
    heroSubheadline:
      "Zero-app QR waitlists, live TV lounge mirrors, and instant 0% fee UPI payouts. Built to scale from local barbershops to luxury multi-chair chains.",
    heroCtaText: "Start Free 14-Day Trial",
    pricingStarterMonthly: 699,
    pricingProMonthly: 1499,
    pricingEliteMonthly: 3499,
    partnerCommissionPct: 30,
    supportWhatsapp: "+91 98765 43210",
    supportEmail: "support@salonview.in",
    socialInstagram: "salonviewapp",
    socialTwitter: "salonviewapp",
    socialLinkedin: "salonviewapp",
  },
};

const themeAccents = [
  {
    id: "emerald",
    name: "Emerald Pro",
    desc: "Wellness, luxury & salon aesthetic with calming botanical hues",
    gradient: "from-emerald-600 to-teal-600",
    border: "border-emerald-500",
    dot: "bg-emerald-400",
  },
  {
    id: "obsidian",
    name: "Deep Obsidian",
    desc: "Dark luxury styling for high-end boutique lounges",
    gradient: "from-neutral-900 to-neutral-700",
    border: "border-slate-500",
    dot: "bg-slate-300",
  },
  {
    id: "blue",
    name: "Corporate Blue",
    desc: "Tech & SaaS styling with crisp sapphire accents",
    gradient: "from-blue-600 to-indigo-600",
    border: "border-blue-500",
    dot: "bg-blue-500",
  },
  {
    id: "amber",
    name: "Barber Amber",
    desc: "Classic Vintage Salon with warm heritage leather tones",
    gradient: "from-amber-600 to-orange-600",
    border: "border-amber-500",
    dot: "bg-amber-400",
  },
];

const tvModes = [
  {
    id: "AIRPORT_DEPARTURE",
    name: "Airport Departure Board",
    desc: "High-contrast flight board with bold ticket numbers, flashing summon indicators, and ETA countdowns for wall-mounted TV monitors.",
    icon: Tv,
  },
  {
    id: "COMPACT_GRID",
    name: "Compact Grid",
    desc: "Multi-column layout optimized for tablets and smaller counter displays, grouping waiting tickets by assigned stylist chair.",
    icon: Layers,
  },
];

const availableSections: Array<{ id: string; label: string; desc: string }> = [
  { id: "simulator", label: "Queue Simulator", desc: "Interactive 'Call Next' simulator widget" },
  { id: "tv_mirror", label: "TV Mirror Preview", desc: "Airport departure board lounge showcase" },
  { id: "upi_showcase", label: "0% UPI Checkout", desc: "Client-side dynamic NPCI QR payment demo" },
  { id: "roi_calculator", label: "ROI Walk-Out Calculator", desc: "Interactive lost client cash slider" },
  { id: "pricing", label: "Pricing Tables", desc: "Starter, Pro, and Elite tier cards" },
  { id: "partner_banner", label: "Partner Callout Banner", desc: "Pre-footer 30% affiliate recruitment" },
  { id: "faq", label: "Owner FAQ Accordion", desc: "Collapsible questions addressing objections" },
];

function AppearanceSettingsContent() {
  const [form, setForm] = useState<AppearanceFormState>(defaultAppearanceState);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const data = await api.admin.getSettings();
        if (data && isMounted) {
          setForm({
            themeAccent: data.appearance?.themeAccent || defaultAppearanceState.themeAccent,
            whiteLabelEnabled: Boolean(data.appearance?.whiteLabelEnabled),
            customCssEnabled: Boolean(data.appearance?.customCssEnabled),
            tvDisplayMode: data.appearance?.tvDisplayMode || defaultAppearanceState.tvDisplayMode,
            landingPageConfig: {
              ...defaultAppearanceState.landingPageConfig,
              ...(data.landingPageConfig || {}),
            },
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch appearance settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await api.admin.updateSettings({
        appearance: {
          themeAccent: form.themeAccent,
          whiteLabelEnabled: form.whiteLabelEnabled,
          customCssEnabled: form.customCssEnabled,
          tvDisplayMode: form.tvDisplayMode,
        },
        landingPageConfig: form.landingPageConfig,
      });

      if (response && response.success) {
        setSuccessMessage("Landing page configuration & appearance saved successfully. Cache evicted.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage("Failed to persist settings.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const current = new Set(form.landingPageConfig.enabledSections || []);
    if (current.has(sectionId)) {
      current.delete(sectionId);
    } else {
      current.add(sectionId);
    }
    setForm({
      ...form,
      landingPageConfig: {
        ...form.landingPageConfig,
        enabledSections: Array.from(current),
      },
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Appearance &amp; Themes</h1>
              <p className="text-sm text-slate-400">
                Template Switcher, Modular Section Toggles & Dynamic Headless Copy
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/" target="_blank">
            <Button variant="outline" size="sm" className="border-slate-800 text-slate-300 hover:text-white gap-2">
              <ExternalLink className="h-4 w-4" />
              Live Preview
            </Button>
          </Link>
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 shadow-lg shadow-emerald-600/25"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publish Live Changes
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <SettingsNav />

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
          <Badge variant="outline" className="ml-auto border-emerald-700 text-emerald-300 text-xs">
            Published
          </Badge>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* 1. Multi-Template Switcher */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-emerald-400" />
              Active Landing Page Template
            </CardTitle>
            <CardDescription className="text-slate-400">
              Select the active presentation design for the root homepage (`salonview.in`). Changes take effect in &lt;1 second.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(TEMPLATE_DEFINITIONS).map((def) => {
              const tId = def.id;
              const isSelected = form.landingPageConfig.activeTemplate === tId;
              return (
                <div
                  key={tId}
                  onClick={() =>
                    setForm({
                      ...form,
                      landingPageConfig: {
                        ...form.landingPageConfig,
                        activeTemplate: tId,
                      },
                    })
                  }
                  className={`cursor-pointer rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={
                          isSelected
                            ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 font-bold"
                            : "border-slate-800 text-slate-400"
                        }
                      >
                        {tId}
                      </Badge>
                      {isSelected && (
                        <span className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shadow">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{def.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {def.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                    {def.defaultSections.length} Modular Sections Included
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 2. Modular Section Visibility Toggles */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-teal-400" />
              Modular Section Manager
            </CardTitle>
            <CardDescription className="text-slate-400">
              Toggle specific sections ON or OFF across the active landing page template.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availableSections.map((sec) => {
              const isEnabled = (form.landingPageConfig.enabledSections || []).includes(sec.id);
              return (
                <div
                  key={sec.id}
                  onClick={() => toggleSection(sec.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start justify-between gap-3 ${
                    isEnabled
                      ? "bg-slate-900/90 border-emerald-500/50"
                      : "bg-slate-950/40 border-slate-800 opacity-60"
                  }`}
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{sec.label}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{sec.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => {}} // handled by parent onClick
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 3. Dynamic Headless CMS Editor */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Headless Content Management (Zero Hardcoded Copy)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Update marketing copy, headlines, pricing rates, and contact endpoints directly in memory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Identity & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Platform Brand Name:
                </label>
                <input
                  type="text"
                  value={form.landingPageConfig.brandName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      landingPageConfig: {
                        ...form.landingPageConfig,
                        brandName: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Brand Tagline:
                </label>
                <input
                  type="text"
                  value={form.landingPageConfig.tagline}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      landingPageConfig: {
                        ...form.landingPageConfig,
                        tagline: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Hero Copy */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Hero Badge Text:
                </label>
                <input
                  type="text"
                  value={form.landingPageConfig.heroBadge}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      landingPageConfig: {
                        ...form.landingPageConfig,
                        heroBadge: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Main Headline:
                </label>
                <input
                  type="text"
                  value={form.landingPageConfig.heroHeadline}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      landingPageConfig: {
                        ...form.landingPageConfig,
                        heroHeadline: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Subheadline / Body Copy:
                </label>
                <textarea
                  rows={2}
                  value={form.landingPageConfig.heroSubheadline}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      landingPageConfig: {
                        ...form.landingPageConfig,
                        heroSubheadline: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    CTA Button Text:
                  </label>
                  <input
                    type="text"
                    value={form.landingPageConfig.heroCtaText}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        landingPageConfig: {
                          ...form.landingPageConfig,
                          heroCtaText: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Partner Commission (%):
                  </label>
                  <input
                    type="number"
                    value={form.landingPageConfig.partnerCommissionPct}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        landingPageConfig: {
                          ...form.landingPageConfig,
                          partnerCommissionPct: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Editor */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 block">
                Monthly Pricing Tiers (INR):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Starter Tier:</span>
                  <input
                    type="number"
                    value={form.landingPageConfig.pricingStarterMonthly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        landingPageConfig: {
                          ...form.landingPageConfig,
                          pricingStarterMonthly: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Pro Growth Tier:</span>
                  <input
                    type="number"
                    value={form.landingPageConfig.pricingProMonthly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        landingPageConfig: {
                          ...form.landingPageConfig,
                          pricingProMonthly: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Elite Chain Tier:</span>
                  <input
                    type="number"
                    value={form.landingPageConfig.pricingEliteMonthly}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        landingPageConfig: {
                          ...form.landingPageConfig,
                          pricingEliteMonthly: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Support & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Support WhatsApp Number:
                </label>
                <input
                  type="text"
                  value={form.landingPageConfig.supportWhatsapp}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      landingPageConfig: {
                        ...form.landingPageConfig,
                        supportWhatsapp: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Support Email Address:
                </label>
                <input
                  type="email"
                  value={form.landingPageConfig.supportEmail}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      landingPageConfig: {
                        ...form.landingPageConfig,
                        supportEmail: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-800/80 pt-5 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs shadow-lg shadow-emerald-600/30"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Publish Live Changes
            </Button>
          </CardFooter>
        </Card>

        {/* 4. Theme Accents & TV Layout */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-400" />
              Theme Accent
            </CardTitle>
            <CardDescription className="text-slate-400">
              Primary color scheme for dashboard controls and client station desks.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {themeAccents.map((accent) => {
              const isSelected = form.themeAccent === accent.id;
              return (
                <div
                  key={accent.id}
                  onClick={() => setForm({ ...form, themeAccent: accent.id })}
                  className={`cursor-pointer rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? `bg-slate-800/90 ${accent.border} ring-2 ring-emerald-500/30 shadow-lg`
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${accent.gradient} shadow-inner flex items-center justify-center`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                      </div>
                      {isSelected && (
                        <span className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100 text-sm">{accent.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{accent.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* 5. White-Labeling & Custom Styling Policies */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-400" />
              White-Labeling & Custom Styling Policies
            </CardTitle>
            <CardDescription className="text-slate-400">
              Govern platform attribution and client-side styling injections across enterprise tenant instances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-200 text-sm">White-Labeling Policy</h4>
                  {form.whiteLabelEnabled ? (
                    <Badge variant="default" className="text-[10px] bg-emerald-600">Enabled</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Standard</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Remove &quot;Powered by Engine Que&quot; footer across salons for enterprise whitelabel compliance.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.whiteLabelEnabled}
                onChange={(e) => setForm({ ...form, whiteLabelEnabled: e.target.checked })}
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-1"
              />
            </div>

            <div className="flex items-start justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-200 text-sm">Custom CSS Injection</h4>
                  <Code2 className="h-4 w-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400">
                  Allow verified enterprise tenants to link custom CSS override sheets on their customer QR check-in pages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.customCssEnabled}
                onChange={(e) => setForm({ ...form, customCssEnabled: e.target.checked })}
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* 6. Public TV Display Mode */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Tv className="h-5 w-5 text-amber-400" />
              TV Display Mode
            </CardTitle>
            <CardDescription className="text-slate-400">
              Select default visual rendering format for public lobby departure screens.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tvModes.map((mode) => {
              const isSelected = form.tvDisplayMode === mode.id;
              const Icon = mode.icon;
              return (
                <div
                  key={mode.id}
                  onClick={() => setForm({ ...form, tvDisplayMode: mode.id })}
                  className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h4 className="font-semibold text-slate-100 text-base">{mode.name}</h4>
                      </div>
                      {isSelected && (
                        <span className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{mode.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default function AppearanceSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading appearance settings...</div>}>
      <AppearanceSettingsContent />
    </Suspense>
  );
}
