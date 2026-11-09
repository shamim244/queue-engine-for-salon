"use client";

import React, { useEffect, useState } from "react";
import { api, type PayoutRecord } from "@/lib/api";
import {
  Banknote,
  ShieldCheck,
  CreditCard,
  Percent,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Send,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [summary, setSummary] = useState({
    grossTotal: 0,
    netDisbursed: 0,
    pendingDisbursal: 0,
    platformRevenue: 0,
    gatewayFees: 0,
    totalBatches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchAdminPayouts = async () => {
    try {
      const res = await api.appointments.getAdminPayouts();
      if (res.success) {
        setPayouts(res.payouts || []);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error("[AdminPayouts] Failed to fetch payouts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminPayouts();
  }, []);

  const handleTriggerSettlement = async () => {
    setSettling(true);
    setFeedback(null);
    try {
      const res = await api.appointments.settleDaily();
      if (res.success) {
        setFeedback(`Settlement complete: ${res.settledBatchesCount} batches created.`);
        await fetchAdminPayouts();
      }
    } catch (err: any) {
      setFeedback(err.message || "Failed to trigger settlement.");
    } finally {
      setSettling(false);
    }
  };

  const handleReleasePayout = async (id: string) => {
    setReleasingId(id);
    try {
      const res = await api.appointments.releasePayout(id);
      if (res.success) {
        setFeedback("Payout marked settled.");
        await fetchAdminPayouts();
      }
    } catch (err: any) {
      setFeedback(err.message || "Failed to release payout.");
    } finally {
      setReleasingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-20 space-y-6 max-w-7xl mx-auto">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Platform Escrow & Payout Control
            </h1>
            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs">
              Super Admin
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Oversee platform prepaid escrow holdings, 1% platform revenue, and daily automated bank disbursals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            onClick={fetchAdminPayouts}
            variant="outline"
            className="min-h-[44px] rounded-2xl border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            onClick={handleTriggerSettlement}
            disabled={settling}
            className="min-h-[44px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            <span>{settling ? "Settling Batches..." : "Run Midnight Settlement Now"}</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs font-semibold text-amber-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-800 bg-slate-900/80 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-amber-400" />
            Total GMV (Gross)
          </span>
          <div className="text-2xl font-black font-mono text-white">
            ₹{summary.grossTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/80 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Disbursed to Salons (97%)
          </span>
          <div className="text-2xl font-black font-mono text-emerald-400">
            ₹{summary.netDisbursed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/80 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-amber-400" />
            Platform Margin (1%)
          </span>
          <div className="text-2xl font-black font-mono text-amber-400">
            ₹{summary.platformRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>

        <Card className="border border-slate-800 bg-slate-900/80 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-blue-400" />
            Gateway Processing (2%)
          </span>
          <div className="text-2xl font-black font-mono text-blue-400">
            ₹{summary.gatewayFees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
      </div>

      {/* Disbursal Ledger Table */}
      <Card className="border border-slate-800 bg-slate-900/90 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-slate-800/80 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-white">Disbursal Batches</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Audit trail of all T+1 salon bank settlements
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs text-slate-400">
            {payouts.length} Total
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {payouts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Banknote className="h-10 w-10 mx-auto text-slate-700" />
              <p className="text-sm font-medium">No payout records in platform ledger.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Salon ID</th>
                    <th className="py-3 px-4">Period</th>
                    <th className="py-3 px-4">Gross</th>
                    <th className="py-3 px-4">Platform (1%)</th>
                    <th className="py-3 px-4">Net Payout (97%)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {payouts.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-white">{record.id}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">{record.salonId}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">{record.periodStart}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        ₹{record.grossAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                        ₹{record.platformFee.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        ₹{record.netPayout.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        {record.status === "SETTLED" ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]">
                            Settled
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px]">
                            {record.status}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {record.status !== "SETTLED" && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={releasingId === record.id}
                            onClick={() => handleReleasePayout(record.id)}
                            className="min-h-[36px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
                          >
                            Release
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
