"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, Salon, Organization } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Activity,
  Layers,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminOverviewPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [salonData, orgData] = await Promise.all([
        api.salons.getAll(),
        api.salons.getOrganizations(),
      ]);
      setSalons(salonData || []);
      setOrganizations(orgData.organizations || []);
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

  const totalStylists = salons.reduce((acc, s) => acc + (s.stylists?.length || 0), 0);
  const ruralCount = salons.filter((s) => s.operatingMode === "RURAL_SOLO").length;
  const multiCount = salons.filter((s) => s.operatingMode === "MODERN_MULTI").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Platform Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Nationwide multi-tenant queue operations, tenant clustering, and real-time engine telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            Refresh Telemetry
          </Button>
          <Link href="/admin/tenants">
            <Button size="sm" className="gap-2">
              Manage Tenants
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Registered Salons</CardTitle>
            <Building2 className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{loading ? "..." : salons.length}</div>
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
            <div className="text-3xl font-black text-white">{loading ? "..." : totalStylists}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              Across all rural & multi-station chairs
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Dual-Mode Split</CardTitle>
            <SlidersHorizontal className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-2xl font-black text-white">
              <span className="text-amber-400">{ruralCount}</span>
              <span className="text-slate-600 text-lg">/</span>
              <span className="text-blue-400">{multiCount}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-amber-400 font-semibold">{ruralCount} Solo Rural</span> ·{" "}
              <span className="text-blue-400 font-semibold">{multiCount} Multi-Station</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Engine Socket Latency</CardTitle>
            <Activity className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-400">&lt; 15 ms</div>
            <p className="text-xs text-slate-400 mt-1">Bun native WebSocket broadcast</p>
          </CardContent>
        </Card>
      </div>

      {/* Registered Salon Tenants Quick Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Active Salon Tenants</CardTitle>
            <CardDescription>Live deployment nodes running on the Bun engine cluster</CardDescription>
          </div>
          <Link href="/admin/tenants">
            <Button variant="outline" size="sm" className="text-xs">
              View Full Table
            </Button>
          </Link>
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
                        variant={salon.operatingMode === "RURAL_SOLO" ? "warning" : "default"}
                        className="text-[11px]"
                      >
                        {salon.operatingMode === "RURAL_SOLO" ? "Rural Solo" : "Multi-Station"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Slug: <code className="text-blue-400 bg-blue-950/60 px-1 py-0.5 rounded">/s/{salon.slug}</code> · {salon.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Chairs / Stylists</span>
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
  );
}
