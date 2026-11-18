"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Gift,
  Star,
  Users,
  ShieldCheck,
  RefreshCw,
  Clock,
  Store,
} from "lucide-react";

export default function AdminLoyaltyPage() {
  const [stats, setStats] = useState({
    totalCards: 0,
    totalStamps: 0,
    activeVouchers: 0,
    redeemedVouchers: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.loyalty.getAdminStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.warn("Failed to fetch admin loyalty stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-pink-400 font-medium">Growth &amp; Marketing</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">Loyalty Stamp Cards</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            🏆 Platform Loyalty Engine &amp; Milestone Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic, multi-tenant isolated loyalty cards with catalog-linked milestone reward vouchers.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="border-slate-700 text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {/* Live System KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-400" />
                Active Cards
              </span>
              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                Nationwide
              </Badge>
            </div>
            <CardTitle className="text-2xl font-black text-white mt-1">
              {stats.totalCards.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Salon-customer pairs tracked</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-400" />
                Stamps Awarded
              </span>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                Lifetime
              </Badge>
            </div>
            <CardTitle className="text-2xl font-black text-amber-400 mt-1">
              {stats.totalStamps.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Atomic stamps on queue finish</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Gift className="h-4 w-4 text-emerald-400" />
                Active Vouchers
              </span>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                Unclaimed
              </Badge>
            </div>
            <CardTitle className="text-2xl font-black text-emerald-400 mt-1">
              {stats.activeVouchers.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Unlocked milestone coupons</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                Redeemed Vouchers
              </span>
              <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
                Completed
              </Badge>
            </div>
            <CardTitle className="text-2xl font-black text-purple-400 mt-1">
              {stats.redeemedVouchers.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[11px] text-slate-500">Burned at chair checkout</p>
          </CardContent>
        </Card>
      </div>

      {/* Architectural Guarantees & Enforcement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs gap-1">
                <Store className="h-3 w-3 fill-amber-400" />
                Multi-Tenant Isolated
              </Badge>
              <span className="text-xs text-slate-400 font-mono">Zero Cross-Salon Leak</span>
            </div>
            <CardTitle className="text-lg font-bold text-white mt-2">
              Isolated Salon Stamp Pools
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Unique compound key <code className="text-amber-300 font-mono">uq_salon_customer_phone</code> guarantees cards belong strictly to each salon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400 leading-relaxed">
              When a consumer visits Salon A, only Salon A&apos;s card gains stamps. Vouchers unlocked at Salon A cannot be redeemed at Salon B.
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-slate-900/60 to-slate-900/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs gap-1">
                <Clock className="h-3 w-3" />
                Anti-Farming Guard
              </Badge>
              <span className="text-xs text-slate-400 font-mono">Configurable Cooldown</span>
            </div>
            <CardTitle className="text-lg font-bold text-white mt-2">
              Rate-Limited Stamp Awards
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Prevents staff or collusion from punching rapid fake tickets to generate free vouchers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400 leading-relaxed">
              Each salon sets a cooldown window (default 4 hours). Rapid multiple checkouts within this timeframe are recorded as visits without farming extra stamps.
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-900/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs gap-1">
                <ShieldCheck className="h-3 w-3" />
                Catalog-Linked
              </Badge>
              <span className="text-xs text-slate-400 font-mono">Deterministic ₹0</span>
            </div>
            <CardTitle className="text-lg font-bold text-white mt-2">
              Exact Service Bound
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Rewards are tied to real catalog service IDs with known prices, not ambiguous text promises.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400 leading-relaxed">
              Upon reaching milestone goal (e.g. 6 cuts), the engine mints a unique voucher code linked to the selected catalog service with automatic 100% line item deduction.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
