"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, Salon, Organization, AdminStats, AuditLog } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Activity,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  Settings,
  ShieldAlert,
  Server,
  Zap,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [salonData, orgData, statsData, auditData] = await Promise.all([
        api.salons.getAll(),
        api.salons.getOrganizations(),
        api.admin.getStats().catch(() => null),
        api.admin.getAuditLogs().catch(() => []),
      ]);
      setSalons(salonData || []);
      setOrganizations(orgData.organizations || []);
      if (statsData) setStats(statsData);
      if (Array.isArray(auditData)) setRecentAudit(auditData.slice(0, 5));
    } catch (err) {
      console.error("Failed to load admin overview:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time synchronization for platform telemetry
  useSalonSocket("ADMIN", (event) => {
    console.log("[Admin Command Center] Received live event:", event.type);
    fetchData();
  });


  const totalStylists = salons.reduce((acc, s) => acc + (s.stylists?.length || 0), 0);
  const starterPlanCount = salons.filter((s) => (s as any).tier !== "PRO" && (s as any).tier !== "ENTERPRISE" && s.organizationId !== "org-aura").length;
  const proPlanCount = salons.filter((s) => (s as any).tier === "PRO" || s.organizationId === "org-aura").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform Command Center
            </h1>
            <Badge variant="success" className="text-xs">
              {stats?.systemHealth || "HEALTHY"}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Nationwide multi-tenant queue operations, cluster telemetry, and centralized configurations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin/onboarding">
            <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-600/25">
              <Sparkles className="h-4 w-4" />
              Onboard Salon
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/admin/onboarding"
          className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/40 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              🚀
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">Onboard Salon</p>
              <p className="text-[11px] text-slate-400">5-step guided wizard</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-blue-400/60 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/admin/settings"
          className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">Platform Config</p>
              <p className="text-[11px] text-slate-400">SLAs, timezones, currency</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-all" />
        </Link>

        <Link
          href="/admin/settings/appearance"
          className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              🎨
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">Appearance</p>
              <p className="text-[11px] text-slate-400">Themes & white-labeling</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-all" />
        </Link>

        <Link
          href="/admin/security"
          className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">Security Center</p>
              <p className="text-[11px] text-slate-400">Audit trail & kill-switch</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-all" />
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Registered Salons</CardTitle>
            <Building2 className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{loading ? "..." : (stats?.totalSalons ?? salons.length)}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{organizations.length}</span> parent enterprise orgs
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Stylists & Chairs Active</CardTitle>
            <Users className="h-5 w-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{loading ? "..." : (stats?.totalStylists ?? totalStylists)}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              Across all active platform chairs
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Subscription Plans</CardTitle>
            <SlidersHorizontal className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-2xl font-black text-white">
              <span className="text-blue-400">{starterPlanCount}</span>
              <span className="text-slate-600 text-lg">/</span>
              <span className="text-purple-400">{proPlanCount}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-blue-400 font-semibold">{starterPlanCount} Starter</span> ·{" "}
              <span className="text-purple-400 font-semibold">{proPlanCount} Pro Plan</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Engine Telemetry</CardTitle>
            <Activity className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-400">&lt; 15 ms</div>
            <p className="text-xs text-slate-400 mt-1">
              {stats?.socketClientsCount ?? 0} active live sockets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Section: Tenant Nodes + Recent Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tenant Nodes (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Active Salon Tenants</CardTitle>
                <CardDescription>Live deployment nodes running on the Bun engine cluster</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/admin/onboarding">
                  <Button size="sm" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3" />
                    + New Salon
                  </Button>
                </Link>
                <Link href="/admin/tenants">
                  <Button variant="outline" size="sm" className="text-xs">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {salons.map((salon) => (
                  <div
                    key={salon.id}
                    className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">{salon.name}</h4>
                          <Badge
                            variant="outline"
                            className="text-[11px] border-slate-700 bg-slate-800/60 text-slate-300"
                          >
                            {`${salon.stylists?.length || 1} ${(salon.stylists?.length || 1) === 1 ? "Station" : "Stations"}`}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Slug: <code className="text-blue-400 bg-blue-950/60 px-1 py-0.5 rounded">/s/{salon.slug}</code> · {salon.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Chairs</span>
                        <p className="text-base font-bold text-white">{salon.stylists?.length || 1}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <Link
                        href={`/s/${salon.slug}`}
                        target="_blank"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                      >
                        <span>📱 Door QR</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>

                      <Link
                        href={`/s/${salon.slug}/tv`}
                        target="_blank"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                      >
                        <span>📺 Lobby TV</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>

                      <Link
                        href={`/s/${salon.slug}/station`}
                        target="_blank"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                      >
                        <span>💺 Chair UI</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>

                      <Link
                        href={`/owner?salon=${salon.slug}`}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 flex items-center gap-1.5 transition-colors ml-auto font-medium"
                      >
                        <span>Owner Hub →</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Engine Health & Audit Feed */}
        <div className="space-y-4">
          {/* Cluster Health Pill */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" />
                Bun Engine Node Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Core Runtime</span>
                <span className="text-white font-mono font-medium">Bun v1.4.3</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">HTTP REST Port</span>
                <span className="text-emerald-400 font-mono font-medium">3001 (Active)</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">WebSocket Dispatch</span>
                <span className="text-emerald-400 font-mono font-medium">/ws (Room-based)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Storage Layer</span>
                <span className="text-blue-400 font-mono font-medium">MySQL + Memory Fallback</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Audit Activities */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                Recent Audit Trail
              </CardTitle>
              <Link href="/admin/security" className="text-xs text-blue-400 hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardContent>
              {recentAudit.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No recent events recorded</p>
              ) : (
                <div className="space-y-3">
                  {recentAudit.map((log) => (
                    <div key={log.id} className="text-xs space-y-1 pb-2 border-b border-slate-800/60 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{log.action}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
