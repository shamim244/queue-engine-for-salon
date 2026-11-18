"use client";

import React, { Suspense, useState, useEffect } from "react";
import { SettingsNav } from "@/components/admin/settings-nav";
import { api } from "@/lib/api";
import type { AuditLog, SecuritySettings } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  AlertTriangle,
  RefreshCw,
  Search,
  Key,
  Users,
  Power,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  Globe,
  Plus,
  Trash2,
  Cloud,
  Smartphone,
  Save,
  Activity,
  Check,
  ExternalLink,
} from "lucide-react";

const initialSampleLogs: AuditLog[] = [
  {
    id: "audit-001",
    timestamp: "2026-11-05T08:00:00.000Z",
    action: "SYSTEM_BOOTSTRAP",
    actor: "SYSTEM",
    details: "Engine Que enterprise core initialized with multi-tenant schema.",
    category: "SYSTEM",
  },
  {
    id: "audit-002",
    timestamp: "2026-11-05T07:00:00.000Z",
    action: "TENANT_SEEDED",
    actor: "SYSTEM",
    details: "Seeded default tenants: Ramesh Traditional Barber and Aura Luxury Wellness.",
    category: "TENANT",
  },
];

const categoryPills = ["ALL", "AUTH", "TENANT", "BILLING", "SECURITY", "SYSTEM"] as const;

const AVAILABLE_COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
];

function SecurityContent() {
  const [logs, setLogs] = useState<AuditLog[]>(initialSampleLogs);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Dynamic Security Settings State
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    pinMaxAttempts: 5,
    pinWindowSeconds: 900,
    loginMaxAttempts: 10,
    loginWindowSeconds: 900,
    checkinMaxAttempts: 10,
    checkinWindowSeconds: 300,
    allowedCustomOrigins: [],
    defaultCountryCode: "+91",
    allowedCountryCodes: ["+91", "+1", "+44", "+971", "+65", "+61"],
  });
  const [loadingSettings, setLoadingSettings] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [newOriginInput, setNewOriginInput] = useState<string>("");

  // Kill Switch state
  const [isMaintenanceActive, setIsMaintenanceActive] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    "Scheduled platform maintenance in progress. Non-admin operations paused."
  );
  const [togglingKillSwitch, setTogglingKillSwitch] = useState<boolean>(false);
  const [killSwitchFeedback, setKillSwitchFeedback] = useState<string | null>(null);
  const [killSwitchError, setKillSwitchError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await api.admin.getAuditLogs();
      if (Array.isArray(data) && data.length > 0) {
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchSecuritySettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await api.admin.getSecuritySettings();
      if (res && res.success && res.settings) {
        setSecuritySettings({
          ...res.settings,
          allowedCustomOrigins: res.settings.allowedCustomOrigins || [],
          allowedCountryCodes: res.settings.allowedCountryCodes || ["+91", "+1", "+44", "+971", "+65", "+61"],
        });
      }
    } catch (err) {
      console.error("Failed to load security settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSecuritySettings();
  }, []);

  const handleToggleKillSwitch = async (nextState: boolean) => {
    setTogglingKillSwitch(true);
    setKillSwitchFeedback(null);
    setKillSwitchError(null);
    try {
      const res = await api.admin.toggleKillSwitch(nextState, maintenanceMessage);
      if (res && res.success) {
        setIsMaintenanceActive(res.active);
        setKillSwitchFeedback(
          res.active
            ? "Maintenance Mode ENGAGED. Platform is now locked down."
            : "Maintenance Mode DISENGAGED. Normal customer check-in restored."
        );
        await fetchLogs();
        setTimeout(() => setKillSwitchFeedback(null), 5000);
      }
    } catch (err: any) {
      setKillSwitchError("Failed to toggle kill-switch: " + (err.message || "Unknown error"));
      setTimeout(() => setKillSwitchError(null), 6000);
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsFeedback(null);
    setSettingsError(null);

    try {
      const res = await api.admin.updateSecuritySettings(securitySettings);
      if (res && res.success && res.settings) {
        setSecuritySettings({
          ...res.settings,
          allowedCustomOrigins: res.settings.allowedCustomOrigins || [],
          allowedCountryCodes: res.settings.allowedCountryCodes || ["+91", "+1", "+44", "+971", "+65", "+61"],
        });
        setSettingsFeedback("Security settings saved and actively enforced across server cluster.");
        setTimeout(() => setSettingsFeedback(null), 5000);
      } else {
        setSettingsError("Failed to save security settings. Please verify parameters.");
      }
    } catch (err: any) {
      setSettingsError(err?.message || "Failed to update security settings.");
      setTimeout(() => setSettingsError(null), 6000);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddOrigin = () => {
    const trimmed = newOriginInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setSettingsError("Origin must start with http:// or https:// (e.g. https://portal.nexgentech.site)");
      return;
    }
    if (securitySettings.allowedCustomOrigins.includes(trimmed)) {
      setSettingsError("Origin already exists in the allowed list.");
      return;
    }
    setSecuritySettings((prev) => ({
      ...prev,
      allowedCustomOrigins: [...prev.allowedCustomOrigins, trimmed],
    }));
    setNewOriginInput("");
    setSettingsError(null);
  };

  const handleRemoveOrigin = (origin: string) => {
    setSecuritySettings((prev) => ({
      ...prev,
      allowedCustomOrigins: prev.allowedCustomOrigins.filter((o) => o !== origin),
    }));
  };

  const handleToggleCountryCode = (code: string) => {
    const current = securitySettings.allowedCountryCodes || [];
    if (current.includes(code)) {
      if (current.length <= 1) {
        setSettingsError("At least one country code must remain enabled.");
        return;
      }
      setSecuritySettings((prev) => ({
        ...prev,
        allowedCountryCodes: prev.allowedCountryCodes.filter((c) => c !== code),
      }));
    } else {
      setSecuritySettings((prev) => ({
        ...prev,
        allowedCountryCodes: [...prev.allowedCountryCodes, code],
      }));
    }
  };

  const formatSeconds = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const mins = Math.floor(sec / 60);
    return `${sec}s (${mins}m)`;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesCategory =
      selectedCategory === "ALL" ||
      log.category?.toUpperCase() === selectedCategory.toUpperCase();
    const matchesSearch =
      searchQuery.trim() === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Security &amp; Audit Center</h1>
            <p className="text-sm text-slate-400">
              Zero-Trust Enforcement, Administrative Event Trail, &amp; Platform Kill-Switch
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <SettingsNav />

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Authentication Guard</span>
              <Key className="h-4 w-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-base text-white">Zero-Trust Session Revocation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-emerald-600 text-xs">Active</Badge>
              <span className="text-xs text-slate-400">Bcrypt rounds: 10</span>
            </div>
            <p className="text-xs text-slate-400 pt-1">
              Deterministic bearer token invalidation upon PIN or password reset.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Concurrent State</span>
              <Users className="h-4 w-4 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-base text-white">Global Sessions Active</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white font-mono">1</span>
              <Badge variant="outline" className="text-blue-400 border-blue-500/30 text-xs">SuperAdmin HQ</Badge>
            </div>
            <p className="text-xs text-slate-400 pt-1">
              Real-time socket-authenticated admin and operator sessions.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Protection Mode</span>
              <Power className={`h-4 w-4 ${isMaintenanceActive ? "text-red-400" : "text-emerald-400"}`} />
            </CardDescription>
            <CardTitle className="text-base text-white">Platform Lockdown Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2">
              {isMaintenanceActive ? (
                <Badge variant="destructive" className="text-xs">Maintenance Mode Active</Badge>
              ) : (
                <Badge variant="default" className="bg-emerald-600 text-xs">Normal Operations</Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 pt-1">
              {isMaintenanceActive
                ? "Customer check-ins locked; admin access restricted."
                : "All salon QR check-in portals operating without restriction."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 1. DYNAMIC RATE LIMITING & ORIGIN CONTROLS (SUPER ADMIN COCKPIT) */}
      {/* ========================================================================= */}
      <Card className="bg-slate-900/80 border-slate-800 shadow-2xl">
        <CardHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Sliders className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  Dynamic Rate Limiting &amp; Abuse Prevention
                  <Badge variant="secondary" className="bg-blue-950 text-blue-300 border-blue-800 text-[10px]">
                    Hot-Reloaded
                  </Badge>
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs mt-0.5">
                  Adjust attempt thresholds, sliding timeouts, and allowed origins in real time without server restarts.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-950/20 text-xs gap-1.5 py-1 px-2.5">
                <Cloud className="w-3.5 h-3.5" />
                <span>Cloudflare cf-connecting-ip Active</span>
              </Badge>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSaveSecuritySettings}>
          <CardContent className="space-y-6 pt-6">
            {/* Feedback Notifications */}
            {settingsFeedback && (
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{settingsFeedback}</span>
              </div>
            )}
            {settingsError && (
              <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            {/* Rate Limiting Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Login Rate Limit */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                    <Key className="w-4 h-4 text-blue-400" />
                    <span>Login Brute-Force Guard</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-blue-300 border-blue-500/30">
                    /api/auth/login
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="loginMaxAttempts" className="text-xs text-slate-400 font-medium">
                      Max Attempts: <strong className="text-white font-mono">{securitySettings.loginMaxAttempts}</strong>
                    </label>
                    <span className="text-[10px] text-slate-500">1 - 50</span>
                  </div>
                  <Input
                    id="loginMaxAttempts"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={50}
                    value={securitySettings.loginMaxAttempts}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        loginMaxAttempts: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                      })
                    }
                    className="bg-slate-900 border-slate-800 text-white font-mono text-sm h-11"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="loginWindowSeconds" className="text-xs text-slate-400 font-medium">
                      Sliding Window: <strong className="text-white font-mono">{formatSeconds(securitySettings.loginWindowSeconds)}</strong>
                    </label>
                    <span className="text-[10px] text-slate-500">10s - 86400s</span>
                  </div>
                  <Input
                    id="loginWindowSeconds"
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={86400}
                    value={securitySettings.loginWindowSeconds}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        loginWindowSeconds: Math.max(10, Math.min(86400, Number(e.target.value) || 10)),
                      })
                    }
                    className="bg-slate-900 border-slate-800 text-white font-mono text-sm h-11"
                    required
                  />
                </div>
              </div>

              {/* Mirror PIN Switch Rate Limit */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <span>Mirror PIN Switch Guard</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/30">
                    /api/auth/pin-switch
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pinMaxAttempts" className="text-xs text-slate-400 font-medium">
                      Max Attempts: <strong className="text-white font-mono">{securitySettings.pinMaxAttempts}</strong>
                    </label>
                    <span className="text-[10px] text-slate-500">1 - 50</span>
                  </div>
                  <Input
                    id="pinMaxAttempts"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={50}
                    value={securitySettings.pinMaxAttempts}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        pinMaxAttempts: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                      })
                    }
                    className="bg-slate-900 border-slate-800 text-white font-mono text-sm h-11"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pinWindowSeconds" className="text-xs text-slate-400 font-medium">
                      Sliding Window: <strong className="text-white font-mono">{formatSeconds(securitySettings.pinWindowSeconds)}</strong>
                    </label>
                    <span className="text-[10px] text-slate-500">10s - 86400s</span>
                  </div>
                  <Input
                    id="pinWindowSeconds"
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={86400}
                    value={securitySettings.pinWindowSeconds}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        pinWindowSeconds: Math.max(10, Math.min(86400, Number(e.target.value) || 10)),
                      })
                    }
                    className="bg-slate-900 border-slate-800 text-white font-mono text-sm h-11"
                    required
                  />
                </div>
              </div>

              {/* Public Door QR Check-in Rate Limit */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs uppercase tracking-wider">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Public Queue Check-in Guard</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/30">
                    /api/queue/checkin
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="checkinMaxAttempts" className="text-xs text-slate-400 font-medium">
                      Max Checkins: <strong className="text-white font-mono">{securitySettings.checkinMaxAttempts}</strong>
                    </label>
                    <span className="text-[10px] text-slate-500">1 - 100</span>
                  </div>
                  <Input
                    id="checkinMaxAttempts"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={securitySettings.checkinMaxAttempts}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        checkinMaxAttempts: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                      })
                    }
                    className="bg-slate-900 border-slate-800 text-white font-mono text-sm h-11"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="checkinWindowSeconds" className="text-xs text-slate-400 font-medium">
                      Sliding Window: <strong className="text-white font-mono">{formatSeconds(securitySettings.checkinWindowSeconds)}</strong>
                    </label>
                    <span className="text-[10px] text-slate-500">10s - 86400s</span>
                  </div>
                  <Input
                    id="checkinWindowSeconds"
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={86400}
                    value={securitySettings.checkinWindowSeconds}
                    onChange={(e) =>
                      setSecuritySettings({
                        ...securitySettings,
                        checkinWindowSeconds: Math.max(10, Math.min(86400, Number(e.target.value) || 10)),
                      })
                    }
                    className="bg-slate-900 border-slate-800 text-white font-mono text-sm h-11"
                    required
                  />
                </div>
              </div>
            </div>

            {/* CORS Allowed Origins & Cloudflare Tunnel Subdomains */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    CORS Allowed Origins &amp; Cloudflare Tunnel Subdomains
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controls which hostnames can dispatch cross-origin requests. Subdomains of <code className="text-blue-300 font-mono">nexgentech.site</code> are validated dynamically.
                  </p>
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-[11px] self-start sm:self-auto">
                  Wildcard *.nexgentech.site Allowed
                </Badge>
              </div>

              {/* Core Default Pattern */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-xs text-slate-400 font-semibold mr-1">Protected Apex &amp; Subdomains:</span>
                <Badge className="bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono text-xs">
                  https://nexgentech.site
                </Badge>
                <Badge className="bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono text-xs">
                  https://*.nexgentech.site
                </Badge>
                <Badge className="bg-slate-900 text-slate-300 border border-slate-700 font-mono text-xs">
                  http://localhost:3000
                </Badge>
              </div>

              {/* Custom Origins List */}
              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold">Custom Allowed External Origins</label>
                {securitySettings.allowedCustomOrigins && securitySettings.allowedCustomOrigins.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {securitySettings.allowedCustomOrigins.map((origin) => (
                      <div
                        key={origin}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                      >
                        <span>{origin}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOrigin(origin)}
                          className="text-slate-400 hover:text-rose-400 ml-1 p-0.5 rounded transition-colors"
                          aria-label={`Remove origin ${origin}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No custom extra origins configured. Default nexgentech.site wildcard pattern active.</p>
                )}

                {/* Add Origin Input */}
                <div className="flex items-center gap-2 pt-1 max-w-md">
                  <Input
                    type="url"
                    placeholder="https://custom-partner.nexgentech.site"
                    value={newOriginInput}
                    onChange={(e) => setNewOriginInput(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-white font-mono text-xs h-10"
                  />
                  <Button
                    type="button"
                    onClick={handleAddOrigin}
                    size="sm"
                    variant="outline"
                    className="border-slate-700 text-white hover:bg-slate-800 gap-1.5 h-10 px-4 shrink-0 text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Origin
                  </Button>
                </div>
              </div>
            </div>

            {/* Regional Country Codes & Mobile Validation Policy */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Regional Country Codes &amp; Mobile Policy
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Governs allowed international prefixes for the 10-digit mobile phone validator and client onboarding.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">Default Country Code:</span>
                  <select
                    value={securitySettings.defaultCountryCode}
                    onChange={(e) =>
                      setSecuritySettings({ ...securitySettings, defaultCountryCode: e.target.value })
                    }
                    className="bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {AVAILABLE_COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                        {c.flag} {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-300 font-semibold">Enabled International Prefixes</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {AVAILABLE_COUNTRY_CODES.map((c) => {
                    const isEnabled = (securitySettings.allowedCountryCodes || []).includes(c.code);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleToggleCountryCode(c.code)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all min-h-[44px] ${
                          isEnabled
                            ? "bg-emerald-950/40 border-emerald-500/60 text-white shadow-sm"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <span>{c.flag}</span>
                          <span className="font-mono">{c.code}</span>
                        </span>
                        {isEnabled ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                        ) : (
                          <span className="text-[10px] text-slate-500">Off</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Settings persist in <code className="text-blue-300 font-mono">security_settings</code> MySQL table.
            </span>
            <Button
              type="submit"
              disabled={savingSettings || loadingSettings}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-2 min-h-[44px] px-6 shadow-lg shadow-blue-600/20"
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Applying Live Security Policy...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save &amp; Enforce Security Policy
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* ========================================================================= */}
      {/* 2. EMERGENCY PLATFORM KILL-SWITCH */}
      {/* ========================================================================= */}
      <Card className={`border-2 transition-all ${
        isMaintenanceActive
          ? "bg-red-950/40 border-red-600 shadow-xl shadow-red-950/50"
          : "bg-slate-900/60 border-red-900/60"
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  Emergency Platform Kill-Switch
                  {isMaintenanceActive && (
                    <Badge variant="destructive" className="text-xs animate-pulse">LOCKED DOWN</Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-red-300/80 text-xs mt-0.5">
                  High-severity administrative intervention. Disables queue check-ins across all salons.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Activating Maintenance Mode instantly blocks all customer check-ins across every salon branch.
            Existing waiting queues will freeze. Super admin telemetry and database migrations remain accessible.
          </p>

          <div className="space-y-2">
            <label htmlFor="maintenanceAnnouncementInput" className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Maintenance Mode Banner Announcement
            </label>
            <Input
              id="maintenanceAnnouncementInput"
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Scheduled platform maintenance in progress. Non-admin operations paused."
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
              maxLength={255}
            />
          </div>

          {killSwitchFeedback && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              isMaintenanceActive
                ? "bg-red-950 border-red-700 text-red-200"
                : "bg-emerald-950 border-emerald-700 text-emerald-200"
            }`}>
              {isMaintenanceActive ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {killSwitchFeedback}
            </div>
          )}

          {killSwitchError && (
            <div className="p-3 rounded-xl border border-red-700 bg-red-950/80 text-red-200 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              {killSwitchError}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Current State:{" "}
            <strong className={isMaintenanceActive ? "text-red-400" : "text-emerald-400"}>
              {isMaintenanceActive ? "Maintenance Mode" : "Normal Mode"}
            </strong>
          </span>
          <Button
            type="button"
            disabled={togglingKillSwitch}
            onClick={() => handleToggleKillSwitch(!isMaintenanceActive)}
            className={`font-semibold text-xs gap-2 min-h-[44px] ${
              isMaintenanceActive
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-red-600 hover:bg-red-500 text-white"
            }`}
          >
            {togglingKillSwitch ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {isMaintenanceActive ? "Deactivate Lockdown" : "Engage Emergency Kill-Switch"}
          </Button>
        </CardFooter>
      </Card>

      {/* ========================================================================= */}
      {/* 3. ADMINISTRATIVE AUDIT LOG TABLE */}
      {/* ========================================================================= */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Administrative Audit Log
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Immutable chronological log of configuration changes, onboarding events, and security actions.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="border-slate-700 text-slate-300 hover:text-white shrink-0 gap-1.5 min-h-[40px]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Category Filter Pills */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search audit trail by actor, action, or details..."
                className="pl-9 bg-slate-950 border-slate-800 text-slate-200 text-xs h-10"
                maxLength={100}
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categoryPills.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setSelectedCategory(pill)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 min-h-[36px] ${
                    selectedCategory === pill
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-white">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-blue-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{log.actor}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] border-slate-700">
                          {log.category}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-400 font-sans max-w-xs sm:max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                      No administrative audit events match your current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading security center...</div>}>
      <SecurityContent />
    </Suspense>
  );
}
