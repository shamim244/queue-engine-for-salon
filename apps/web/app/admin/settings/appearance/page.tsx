"use client";

import React, { Suspense, useState, useEffect } from "react";
import { SettingsNav } from "@/components/admin/settings-nav";
import { api } from "@/lib/api";
import type { PlatformSettings } from "@/lib/api";
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
} from "lucide-react";

interface AppearanceFormState {
  themeAccent: string;
  whiteLabelEnabled: boolean;
  customCssEnabled: boolean;
  tvDisplayMode: string;
}

const defaultAppearanceState: AppearanceFormState = {
  themeAccent: "blue",
  whiteLabelEnabled: false,
  customCssEnabled: false,
  tvDisplayMode: "AIRPORT_DEPARTURE",
};

const themeAccents = [
  {
    id: "blue",
    name: "Corporate Blue",
    desc: "Tech & SaaS styling with crisp sapphire accents",
    gradient: "from-blue-600 to-indigo-600",
    border: "border-blue-500",
    previewBg: "bg-blue-500/20",
    dot: "bg-blue-500",
  },
  {
    id: "obsidian",
    name: "Deep Obsidian",
    desc: "Dark luxury styling for high-end boutique lounges",
    gradient: "from-neutral-900 to-neutral-700",
    border: "border-slate-500",
    previewBg: "bg-slate-700/30",
    dot: "bg-slate-300",
  },
  {
    id: "emerald",
    name: "Emerald Pro",
    desc: "Wellness & Salon aesthetic with calming botanical hues",
    gradient: "from-emerald-600 to-teal-600",
    border: "border-emerald-500",
    previewBg: "bg-emerald-500/20",
    dot: "bg-emerald-400",
  },
  {
    id: "amber",
    name: "Barber Amber",
    desc: "Classic Vintage Salon with warm heritage leather tones",
    gradient: "from-amber-600 to-orange-600",
    border: "border-amber-500",
    previewBg: "bg-amber-500/20",
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
        if (data && data.appearance && isMounted) {
          setForm({
            themeAccent: data.appearance.themeAccent || defaultAppearanceState.themeAccent,
            whiteLabelEnabled: Boolean(data.appearance.whiteLabelEnabled),
            customCssEnabled: Boolean(data.appearance.customCssEnabled),
            tvDisplayMode: data.appearance.tvDisplayMode || defaultAppearanceState.tvDisplayMode,
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
      });

      if (response && response.success) {
        setSuccessMessage("Appearance & theme preferences updated successfully.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage("Failed to persist appearance settings.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Appearance & Themes</h1>
            <p className="text-sm text-slate-400">Visual Accents, White-Labeling, & Public TV Display Layouts</p>
          </div>
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
            Saved
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
        {/* Theme Accent Section */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Theme Accent
            </CardTitle>
            <CardDescription className="text-slate-400">
              Select the primary UI tone applied across administrator dashboards, tenant manager consoles, and public check-in interfaces.
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
                      ? `bg-slate-800/90 ${accent.border} ring-2 ring-blue-500/30 shadow-lg`
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${accent.gradient} shadow-inner flex items-center justify-center`}>
                        <span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} />
                      </div>
                      {isSelected && (
                        <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100 text-sm">{accent.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{accent.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono uppercase text-slate-400">Key:</span>
                      <span className="text-[11px] font-mono text-slate-300 font-semibold">{accent.id}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Branding & White-Labeling */}
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
            {/* White labeling toggle */}
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
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
              />
            </div>

            {/* Custom CSS toggle */}
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
                className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Public TV Display Mode */}
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
                      ? "bg-slate-800/90 border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h4 className="font-semibold text-slate-100 text-base">{mode.name}</h4>
                      </div>
                      {isSelected && (
                        <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
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
          <CardFooter className="border-t border-slate-800/80 pt-5 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2 font-medium"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
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
