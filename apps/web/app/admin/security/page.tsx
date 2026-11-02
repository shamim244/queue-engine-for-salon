"use client";

import React, { Suspense, useState, useEffect } from "react";
import { SettingsNav } from "@/components/admin/settings-nav";
import { api, type AuditLog } from "@/lib/api";
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
} from "lucide-react";

const initialSampleLogs: AuditLog[] = [
  {
    id: "audit-001",
    timestamp: new Date().toISOString(),
    action: "SYSTEM_BOOTSTRAP",
    actor: "SYSTEM",
    details: "Engine Que enterprise core initialized with multi-tenant schema.",
    category: "SYSTEM",
  },
  {
    id: "audit-002",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: "TENANT_SEEDED",
    actor: "SYSTEM",
    details: "Seeded default tenants: Ramesh Traditional Barber and Aura Luxury Wellness.",
    category: "TENANT",
  },
];

const categoryPills = ["ALL", "AUTH", "TENANT", "BILLING", "SECURITY", "SYSTEM"] as const;

function SecurityContent() {
  const [logs, setLogs] = useState<AuditLog[]>(initialSampleLogs);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

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

  useEffect(() => {
    fetchLogs();
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
            <h1 className="text-2xl font-bold tracking-tight text-white">Security & Audit Center</h1>
            <p className="text-sm text-slate-400">
              Zero-Trust Enforcement, Administrative Event Trail, & Platform Kill-Switch
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

      {/* Emergency Platform Kill-Switch Card */}
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
            <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Maintenance Mode Banner Announcement
            </label>
            <Input
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Scheduled platform maintenance in progress. Non-admin operations paused."
              className="bg-slate-950 border-slate-800 text-slate-200 text-sm"
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
            className={`font-semibold text-xs gap-2 ${
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

      {/* Administrative Audit Log Table */}
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
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="border-slate-700 text-slate-300 hover:text-white shrink-0 gap-1.5"
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
                className="pl-9 bg-slate-950 border-slate-800 text-slate-200 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categoryPills.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setSelectedCategory(pill)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
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
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-semibold text-slate-200">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-blue-400">
                          {log.actor}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            log.category === "SECURITY"
                              ? "border-red-600 text-red-400"
                              : log.category === "SYSTEM"
                              ? "border-cyan-600 text-cyan-400"
                              : log.category === "TENANT" || log.category === "ONBOARDING"
                              ? "border-emerald-600 text-emerald-400"
                              : "border-slate-700 text-slate-400"
                          }`}
                        >
                          {log.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300 leading-relaxed min-w-[280px]">
                        {log.details}
                      </td>
                    </tr>
                  ))
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
