"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Salon, Organization, AdminStats, AuditLog } from "@/lib/api";
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
  Search,
  List,
  LayoutGrid,
  QrCode,
  Tv,
  Armchair,
  ArrowRight,
} from "lucide-react";

export default function AdminOverviewPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenantSearch, setTenantSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

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

  const getPlanBadge = (salon: Salon) => {
    const tier = (salon as any).tier || (salon.organizationId === "org-aura" ? "PRO" : "STARTER");
    if (tier === "ENTERPRISE") {
      return (
        <Badge variant="warning" className="text-[10px] font-bold uppercase tracking-wider">
          Enterprise
        </Badge>
      );
    }
    if (tier === "PRO") {
      return (
        <Badge variant="purple" className="text-[10px] font-bold uppercase tracking-wider">
          Pro Plan
        </Badge>
      );
    }
    if (tier === "FREE") {
      return (
        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
          Free Tier
        </Badge>
      );
    }
    return (
      <Badge variant="blue" className="text-[10px] font-bold uppercase tracking-wider">
        Starter
      </Badge>
    );
  };

  const filteredSalons = useMemo(() => {
    if (!tenantSearch.trim()) return salons;
    const q = tenantSearch.toLowerCase().trim();
    return salons.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    );
  }, [salons, tenantSearch]);

  const displayedSalons = filteredSalons.slice(0, 5);

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
          href="/admin/settings/compression"
          className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Compression</p>
              <p className="text-[11px] text-slate-400">Zstd, Brotli, Gzip</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-amber-400/60 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
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
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-400" />
                      Salon Fleet Overview
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                      {salons.length} Total Registered
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Live operational deployment nodes running on the Bun engine cluster
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "table"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Compact Table View"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "grid"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Cards View"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Link href="/admin/onboarding">
                    <Button size="sm" className="text-xs gap-1 bg-blue-600 hover:bg-blue-500 h-8">
                      <Sparkles className="h-3 w-3" />
                      + Onboard
                    </Button>
                  </Link>
                  <Link href="/admin/tenants">
                    <Button variant="outline" size="sm" className="text-xs h-8 border-slate-700 hover:border-slate-600">
                      View All
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Inline Quick Search */}
              <div className="pt-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    placeholder="Search fleet by salon name, slug handle, or phone..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  {tenantSearch && (
                    <button
                      type="button"
                      onClick={() => setTenantSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white bg-slate-800 px-1.5 py-0.5 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Loading salon fleet nodes...
                </div>
              ) : displayedSalons.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-sm font-semibold text-slate-300">
                    {tenantSearch ? `No salons matching "${tenantSearch}"` : "No salons registered yet"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {tenantSearch
                      ? "Try searching with a different keyword or slug name."
                      : "Start by onboarding your first salon branch into the engine cluster."}
                  </p>
                  {tenantSearch && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTenantSearch("")}
                      className="text-xs mt-2"
                    >
                      Reset Filter
                    </Button>
                  )}
                </div>
              ) : viewMode === "table" ? (
                /* Compact Executive Table View */
                <div className="overflow-x-auto rounded-xl border border-slate-800/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Salon & Handle</th>
                        <th className="py-2.5 px-3">Plan Tier</th>
                        <th className="py-2.5 px-3">Stations</th>
                        <th className="py-2.5 px-3">Node Status</th>
                        <th className="py-2.5 px-3 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayedSalons.map((salon) => (
                        <tr
                          key={salon.id}
                          className="hover:bg-slate-850/50 transition-colors group"
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                              {salon.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <code className="text-[11px] font-mono text-blue-400">
                                /s/{salon.slug}
                              </code>
                              {salon.phone && (
                                <span className="text-[11px] text-slate-500">
                                  • {salon.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {getPlanBadge(salon)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-200">
                              {salon.stylists?.length || 1} {(salon.stylists?.length || 1) === 1 ? "Station" : "Stations"}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {salon.stylists && salon.stylists.length > 0
                                ? salon.stylists.map((s) => s.name).slice(0, 2).join(", ") + (salon.stylists.length > 2 ? ` +${salon.stylists.length - 2}` : "")
                                : "Default Chair"}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active Node
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/s/${salon.slug}`}
                                target="_blank"
                                title="Open Door QR Storefront"
                                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              >
                                <QrCode className="h-3.5 w-3.5" />
                              </Link>
                              <Link
                                href={`/s/${salon.slug}/tv`}
                                target="_blank"
                                title="Open Lobby TV Mirror"
                                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              >
                                <Tv className="h-3.5 w-3.5" />
                              </Link>
                              <Link
                                href={`/s/${salon.slug}/station`}
                                target="_blank"
                                title="Open Station Chair View"
                                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              >
                                <Armchair className="h-3.5 w-3.5" />
                              </Link>
                              <Link
                                href={`/owner?salon=${salon.slug}`}
                                className="ml-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-semibold text-xs flex items-center gap-1 transition-colors"
                              >
                                <span>Owner Hub</span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Compact Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {displayedSalons.map((salon) => (
                    <div
                      key={salon.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm truncate">{salon.name}</h4>
                            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" title="Online Node" />
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            <code className="text-blue-400 font-mono">/s/{salon.slug}</code>
                            {salon.phone && ` · ${salon.phone}`}
                          </p>
                        </div>
                        {getPlanBadge(salon)}
                      </div>

                      <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-900/80 border border-slate-800/60 text-slate-300">
                        <span className="text-[11px] text-slate-400">Capacity</span>
                        <span className="font-bold text-white text-xs">
                          {salon.stylists?.length || 1} {(salon.stylists?.length || 1) === 1 ? "Station" : "Stations"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80 text-xs">
                        <Link
                          href={`/s/${salon.slug}`}
                          target="_blank"
                          className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <QrCode className="h-3 w-3" />
                          <span>QR</span>
                        </Link>
                        <Link
                          href={`/s/${salon.slug}/tv`}
                          target="_blank"
                          className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <Tv className="h-3 w-3" />
                          <span>TV</span>
                        </Link>
                        <Link
                          href={`/s/${salon.slug}/station`}
                          target="_blank"
                          className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                        >
                          <Armchair className="h-3 w-3" />
                          <span>Chair</span>
                        </Link>
                        <Link
                          href={`/owner?salon=${salon.slug}`}
                          className="ml-auto px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sleek Forwarding Footer */}
              {salons.length > 5 && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">
                    Showing {displayedSalons.length} of {filteredSalons.length} {tenantSearch ? "filtered" : "active"} salons.
                  </span>
                  <Link
                    href="/admin/tenants"
                    className="font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                  >
                    <span>Open Full Tenant Hub ({salons.length} total)</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
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

          {/* Adaptive Compression & Caching Telemetry */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Adaptive Compression Engine
              </CardTitle>
              <Badge variant="success" className="text-[10px]">
                ACTIVE
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Waterfall Priority</span>
                <span className="text-sky-300 font-mono font-medium">Zstd &rarr; Brotli &rarr; Gzip</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Brotli (br) Ratio</span>
                <span className="text-emerald-400 font-mono font-bold">-91.2% Bandwidth</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Gzip (gzip) Fallback</span>
                <span className="text-indigo-400 font-mono font-medium">Universal Ready</span>
              </div>
              <Link
                href="/admin/settings/compression"
                className="mt-2 block w-full text-center py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-medium text-xs border border-blue-500/20 transition-all"
              >
                Open Compression Console &rarr;
              </Link>
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
                        <span suppressHydrationWarning className="text-[10px] text-slate-500 font-mono">
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
