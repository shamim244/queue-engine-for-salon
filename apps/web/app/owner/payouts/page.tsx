"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type PayoutRecord, type Salon } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PayoutSummaryCard } from "@/components/payout/payout-summary-card";
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  CreditCard,
  RefreshCw,
  ArrowDownToLine,
  History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OwnerPayoutsPage() {
  const searchParams = useSearchParams();
  const { salon: authSalon } = useAuth();
  const currentSlug = searchParams.get("salon") || authSalon?.slug || "ramesh-barber";

  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [summary, setSummary] = useState({
    grossTotal: 0,
    netTotal: 0,
    gatewayTotal: 0,
    platformTotal: 0,
    payoutCount: 0,
  });
  const [payoutVpa, setPayoutVpa] = useState<string>("salonpayments@icici");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayouts = async () => {
    try {
      const res = await api.appointments.getPayouts(currentSlug);
      if (res.success) {
        setPayouts(res.payouts || []);
        setSummary(res.summary);
        if (res.payoutVpa) setPayoutVpa(res.payoutVpa);
      }
    } catch (err) {
      console.error("[OwnerPayouts] Failed to load payouts:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [currentSlug]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayouts();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Daily Bank Payouts</h1>
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs">
              97.0% Net Settlement
            </Badge>
          </div>
          <p className="text-xs text-slate-400">
            Automated T+1 daily settlement ledger for advance prepaid appointment bookings.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="min-h-[44px] rounded-2xl border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh Ledger</span>
        </Button>
      </div>

      {/* Payout Summary KPI Card */}
      <PayoutSummaryCard
        grossTotal={summary.grossTotal}
        netTotal={summary.netTotal}
        gatewayTotal={summary.gatewayTotal}
        platformTotal={summary.platformTotal}
        payoutVpa={payoutVpa}
        title="Salon Earnings Ledger (Net 97%)"
        description="Daily midnight batch disbursal directly into your registered UPI ID or Bank Account."
      />

      {/* Payout Settlement History Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Settlement Batch History</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{payouts.length} Batches</span>
        </div>

        {payouts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Banknote className="h-10 w-10 mx-auto text-slate-700" />
            <p className="text-sm font-medium">No payout batches generated yet.</p>
            <p className="text-xs text-slate-600">
              Completed appointments from today will automatically be settled at midnight (00:05 AM).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Gross Collected</th>
                  <th className="py-3 px-4">Gateway Fee (2%)</th>
                  <th className="py-3 px-4">Platform Fee (1%)</th>
                  <th className="py-3 px-4">Net Payout (97%)</th>
                  <th className="py-3 px-4">Reference / VPA</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {payouts.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-white">
                      {record.periodStart}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      ₹{record.grossAmount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-400">
                      -₹{record.gatewayFee.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-400">
                      -₹{record.platformFee.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                      ₹{record.netPayout.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {record.payoutReferenceId || record.payoutVpa || "N/A"}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
