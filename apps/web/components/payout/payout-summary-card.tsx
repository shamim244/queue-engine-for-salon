"use client";

import React from "react";
import {
  Banknote,
  Percent,
  CreditCard,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PayoutSummaryCardProps {
  grossTotal: number;
  netTotal: number;
  gatewayTotal: number;
  platformTotal: number;
  payoutVpa?: string | null;
  title?: string;
  description?: string;
  onSettleClick?: () => void;
  settling?: boolean;
}

export function PayoutSummaryCard({
  grossTotal,
  netTotal,
  gatewayTotal,
  platformTotal,
  payoutVpa,
  title = "Escrow Payout Settlement",
  description = "Automated daily T+1 settlement to your registered bank account or UPI VPA.",
  onSettleClick,
  settling = false,
}: PayoutSummaryCardProps) {
  return (
    <Card className="border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-400" />
              <span>{title}</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5">
              {description}
            </CardDescription>
          </div>
          {onSettleClick && (
            <Button
              type="button"
              onClick={onSettleClick}
              disabled={settling}
              className="min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              <span>{settling ? "Settling..." : "Trigger Settlement"}</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* KPI Banner: 97% Net Payout */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Net Bank Payout (97.0%)</span>
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
              ₹{netTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {payoutVpa && (
              <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <span>VPA:</span>
                <span className="text-slate-200">{payoutVpa}</span>
              </p>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-5 w-full sm:w-auto">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">Gross Collections</span>
            <div className="text-lg font-bold font-mono text-slate-200">
              ₹{grossTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Deductions Breakdown Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-blue-400" />
                <span>Gateway Processing Fee (2.0%)</span>
              </span>
              <span className="font-mono text-rose-400 font-semibold">
                -₹{gatewayTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Direct NPCI / Razorpay UPI payment gateway rails
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-amber-400" />
                <span>Platform Commission (1.0%)</span>
              </span>
              <span className="font-mono text-rose-400 font-semibold">
                -₹{platformTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Engine Que dynamic queue buffer & escrow guarantee
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
