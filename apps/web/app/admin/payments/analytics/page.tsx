"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PaymentOrder } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  CreditCard,
  QrCode,
  Banknote,
  Zap,
  ChevronRight,
  ArrowUpRight,
  Calendar,
  Percent,
  DollarSign,
  BarChart3,
  RefreshCw,
} from "lucide-react";

export default function RevenueAnalyticsPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getAllTransactions({ limit: 100 });
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const completed = orders.filter((o) => o.status === "COMPLETED");
  const totalGMV = completed.reduce((sum, o) => sum + o.amount, 0);
  const upiOrders = completed.filter((o) => o.provider === "UPI_QR");
  const cashOrders = completed.filter((o) => o.provider === "CASH");
  const razorpayOrders = completed.filter((o) => o.provider === "RAZORPAY");

  const upiVolume = upiOrders.reduce((sum, o) => sum + o.amount, 0);
  const cashVolume = cashOrders.reduce((sum, o) => sum + o.amount, 0);
  const razorpayVolume = razorpayOrders.reduce((sum, o) => sum + o.amount, 0);

  const aov = completed.length > 0 ? Math.round(totalGMV / completed.length) : 0;
  const conversionRate = orders.length > 0 ? Math.round((completed.length / orders.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/admin/payments" className="hover:text-slate-200">Payments & Gateway</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-emerald-400 font-medium">Revenue Analytics</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            📊 Revenue & Settlement Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time insights into SaaS gross merchandise value, payment gateway mix, and conversion throughput.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
          <Link href="/admin/payments/transactions">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9"
            >
              Transactions Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">All-Time GMV</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2">
              {formatCurrency(totalGMV)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-medium">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>{completed.length} paid subscriptions</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Average Order Value</span>
              <BarChart3 className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-3xl font-black text-blue-400 mt-2">
              {formatCurrency(aov)}
            </div>
            <p className="text-xs text-slate-500 mt-2">Per subscription settlement</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Settlement Conversion</span>
              <Percent className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-purple-400 mt-2">
              {conversionRate}%
            </div>
            <p className="text-xs text-slate-500 mt-2">Approvals vs checkout starts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Gateway Fee Saved</span>
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-amber-400 mt-2">
              {formatCurrency(Math.round((upiVolume + cashVolume) * 0.02))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Via 0% UPI & Direct Cash</p>
          </CardContent>
        </Card>
      </div>

      {/* Gateway Breakdown & Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <QrCode className="h-4 w-4 text-purple-400" />
                UPI Direct QR
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/30">
                {upiOrders.length} orders
              </Badge>
            </div>
            <CardDescription className="text-xs">NPCI Dynamic UPI + Manual 12-digit UTR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{formatCurrency(upiVolume)}</div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all"
                style={{ width: `${totalGMV > 0 ? (upiVolume / totalGMV) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {totalGMV > 0 ? Math.round((upiVolume / totalGMV) * 100) : 0}% of all platform revenue
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-400" />
                Cash & Bank Desk
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                {cashOrders.length} orders
              </Badge>
            </div>
            <CardDescription className="text-xs">Counter settlement & offline bank receipt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{formatCurrency(cashVolume)}</div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${totalGMV > 0 ? (cashVolume / totalGMV) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {totalGMV > 0 ? Math.round((cashVolume / totalGMV) * 100) : 0}% of all platform revenue
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                Razorpay Automated PG
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-300 border-blue-500/30">
                {razorpayOrders.length} orders
              </Badge>
            </div>
            <CardDescription className="text-xs">Cards, NetBanking & instant webhooks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-white">{formatCurrency(razorpayVolume)}</div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all"
                style={{ width: `${totalGMV > 0 ? (razorpayVolume / totalGMV) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {totalGMV > 0 ? Math.round((razorpayVolume / totalGMV) * 100) : 0}% of all platform revenue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}