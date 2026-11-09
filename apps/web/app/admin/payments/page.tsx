"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PaymentOrder, PaymentGatewayConfig } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  Sliders,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  QrCode,
  Banknote,
  Zap,
} from "lucide-react";

export default function PaymentsHubPage() {
  const [pendingOrders, setPendingOrders] = useState<PaymentOrder[]>([]);
  const [allOrders, setAllOrders] = useState<PaymentOrder[]>([]);
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [pendingRes, allRes, configRes] = await Promise.all([
          api.admin.getPendingPayments(),
          api.admin.getAllTransactions({ limit: 10 }),
          api.admin.getPaymentConfig(),
        ]);
        if (pendingRes.success) setPendingOrders(pendingRes.orders || []);
        if (allRes.success) setAllOrders(allRes.orders || []);
        if (configRes.success) setConfig(configRes.config || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalSettled = allOrders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + o.amount, 0);

  const sections = [
    {
      title: "Manual Payment Approvals",
      desc: "Verify 12-digit UPI UTRs and offline cash submissions before activating salon tiers.",
      href: "/admin/payments/approvals",
      badge: `${pendingOrders.length} Pending`,
      badgeColor: pendingOrders.length > 0 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      icon: Clock,
      color: "from-amber-600 to-orange-500",
    },
    {
      title: "All Transactions Ledger",
      desc: "Full universal payment ledger with search, filtering, UTR references, and export.",
      href: "/admin/payments/transactions",
      badge: "Universal Ledger",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
      icon: CreditCard,
      color: "from-blue-600 to-indigo-500",
    },
    {
      title: "Gateway Switchboard",
      desc: "Toggle UPI Direct QR, Cash Counter settlements, and Razorpay PG with VPA config.",
      href: "/admin/payments/settings",
      badge: "Config Engine",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      icon: Sliders,
      color: "from-purple-600 to-pink-500",
    },
    {
      title: "Revenue Analytics",
      desc: "GMV breakdown, average order value, conversion rates, and gateway distribution.",
      href: "/admin/payments/analytics",
      badge: "Insights",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      icon: TrendingUp,
      color: "from-emerald-600 to-teal-500",
    },
    {
      title: "Audit Trail",
      desc: "Complete history of administrative verification decisions, reviewer notes, and rejections.",
      href: "/admin/payments/audit",
      badge: "Compliance",
      badgeColor: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      icon: ShieldCheck,
      color: "from-slate-600 to-zinc-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">Payments & Gateway</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            💳 Payments & Gateway Switchboard HQ
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally manage manual payment approvals, universal transaction logs, gateway toggles, and revenue metrics.
          </p>
        </div>

        {/* Quick Active Gateway Pills */}
        {config && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.upiManualEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-500"}>
              UPI {config.upiManualEnabled ? "ON" : "OFF"}
            </Badge>
            <Badge variant="outline" className={config.cashEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-500"}>
              Cash {config.cashEnabled ? "ON" : "OFF"}
            </Badge>
            <Badge variant="outline" className={config.razorpayEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-500"}>
              Razorpay {config.razorpayEnabled ? "ON" : "OFF"}
            </Badge>
          </div>
        )}
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700 transition-all shadow-md group-hover:shadow-blue-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${section.color} flex items-center justify-center text-white shadow-md`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className={`text-xs ${section.badgeColor}`}>
                      {section.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base text-white mt-3 group-hover:text-blue-400 transition-colors flex items-center justify-between">
                    <span>{section.title}</span>
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs text-slate-400 leading-relaxed">
                    {section.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Activity Quick View */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm text-white">Recent Transactions Snapshot</CardTitle>
            <CardDescription className="text-xs text-slate-400">Latest 5 payment requests across all channels</CardDescription>
          </div>
          <Link href="/admin/payments/transactions">
            <Button variant="ghost" size="sm" className="text-xs text-blue-400 hover:text-blue-300 gap-1">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800/60">
            {allOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 text-xs">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-mono text-[10px]">
                    {order.provider === "UPI_QR" ? "UPI" : order.provider === "CASH" ? "CSH" : "RZP"}
                  </div>
                  <div>
                    <span className="font-semibold text-white block">{order.organizationName || "Direct Salon"}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{order.id}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold text-white font-mono block">{formatCurrency(order.amount)}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 ${
                      order.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : order.status === "PENDING_APPROVAL"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                    }`}
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}