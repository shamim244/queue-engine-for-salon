"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { Stylist } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  Users,
  Clock,
  Coins,
  Scissors,
  X,
  RefreshCw,
  Plus,
  CheckCircle2,
  WifiOff,
  Sparkles,
  TrendingUp,
  Receipt,
  Printer,
} from "lucide-react";

export interface CompletedTicketLog {
  id: string;
  ticketNumber: number;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  totalPrice: number;
  paymentAmount?: number;
  paymentStatus?: string;
  startedTime?: string;
  completedTime?: string;
  tipAmount?: number;
  durationMinutes?: number;
}

export interface StaffDailyReportData {
  success: boolean;
  salonId: string;
  stylistId?: string;
  totalServedToday: number;
  totalRevenueToday: number;
  avgActualMinutes: number;
  servicesCountMap: Record<string, number>;
  completedTickets: CompletedTicketLog[];
  totalTipsToday?: number;
  manualCashTips?: number;
}

interface StationEarningsSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  activeStylist: Stylist | null;
  salonId: string;
  slug: string;
  report: StaffDailyReportData | null;
  isLoading?: boolean;
  isOffline?: boolean;
  onRefresh?: () => void;
  onAddCashTip?: (amount: number) => void;
}

export function StationEarningsSummary({
  isOpen,
  onClose,
  activeStylist,
  salonId,
  slug,
  report,
  isLoading = false,
  isOffline = false,
  onRefresh,
  onAddCashTip,
}: StationEarningsSummaryProps) {
  const [customTipInput, setCustomTipInput] = useState("");
  const [tipSuccessToast, setTipSuccessToast] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalServed = report?.totalServedToday ?? 0;
  const totalRevenue = report?.totalRevenueToday ?? 0;
  const avgPace = report?.avgActualMinutes ?? (activeStylist?.avgDurationMinutes || 25);
  const totalTips = report?.totalTipsToday ?? 0;
  const manualTips = report?.manualCashTips ?? 0;
  const servicesMap = report?.servicesCountMap || {};
  const completedTickets = report?.completedTickets || [];

  const handleQuickTip = (amount: number) => {
    if (onAddCashTip) {
      onAddCashTip(amount);
      setTipSuccessToast(`Added ₹${amount} cash tip to shift ledger!`);
      setTimeout(() => setTipSuccessToast(null), 2500);
    }
  };

  const handleCustomTipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(customTipInput);
    if (!isNaN(val) && val > 0 && onAddCashTip) {
      onAddCashTip(val);
      setCustomTipInput("");
      setTipSuccessToast(`Added ₹${val} cash tip to shift ledger!`);
      setTimeout(() => setTipSuccessToast(null), 2500);
    }
  };

  const handlePrintSummary = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Format today's date nicely
  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative z-50 w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800/80 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black">
                <IndianRupee className="h-4 w-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Barber Daily Shift & Earnings
              </h2>
              {isOffline && (
                <Badge
                  variant="outline"
                  className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] gap-1 py-0.5"
                >
                  <WifiOff className="h-3 w-3 text-slate-400" />
                  <span>Offline Cache</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{activeStylist?.name || "Stylist Chair"}</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{todayFormatted}</span>
              <span>•</span>
              <span className="text-slate-500">दैनिक कमाई व टिप समरी</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8 text-slate-400 hover:text-white rounded-lg"
                title="Refresh Daily Stats"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-amber-400" : ""}`} />
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Success toast notification */}
        {tipSuccessToast && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-600/50 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{tipSuccessToast}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-1">
          {/* 4 Highlight KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Clients Served */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span className="font-semibold">Clients</span>
                <Users className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">{totalServed}</div>
              <span className="text-[10px] text-slate-400">Completed today</span>
            </div>

            {/* 2. Gross Shift Revenue */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900/90 border border-emerald-500/30 relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-400 text-xs mb-1.5">
                <span className="font-semibold">Gross Billing</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-300 font-mono">
                ₹{totalRevenue}
              </div>
              <span className="text-[10px] text-emerald-400/80">Services revenue</span>
            </div>

            {/* 3. Tips Collected */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900/90 border border-amber-500/30 relative overflow-hidden">
              <div className="flex items-center justify-between text-amber-400 text-xs mb-1.5">
                <span className="font-semibold">Tips Earned</span>
                <Coins className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">
                ₹{totalTips}
              </div>
              <span className="text-[10px] text-amber-400/80">
                {manualTips > 0 ? `₹${manualTips} cash tip incl.` : "Direct & digital tips"}
              </span>
            </div>

            {/* 4. Speed Pace */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1.5">
                <span className="font-semibold">Avg Pace</span>
                <Clock className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono">
                {avgPace}m
              </div>
              <span className="text-[10px] text-slate-400">Pace per client</span>
            </div>
          </div>

          {/* Quick Cash Tip Logging (For barbers receiving cash at chair) */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span>Quick Log Cash Tip (हैंड-टू-हैंड कैश टिप)</span>
              </div>
              <span className="text-[10px] text-slate-400">Shift Tip Ledger</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[20, 50, 100].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickTip(amt)}
                  className="px-3.5 py-2 min-h-[44px] rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs hover:bg-amber-500/20 active:scale-95 transition-all flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>₹{amt} Tip</span>
                </button>
              ))}

              <form onSubmit={handleCustomTipSubmit} className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    placeholder="Custom"
                    value={customTipInput}
                    onChange={(e) => setCustomTipInput(e.target.value)}
                    className="w-full pl-6 pr-2 py-2 min-h-[44px] rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!customTipInput || Number(customTipInput) <= 0}
                  className="min-h-[44px] px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shrink-0"
                >
                  Add
                </Button>
              </form>
            </div>
          </div>

          {/* Services Count Breakdown */}
          {Object.keys(servicesMap).length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-amber-400" />
                  <span>Today&apos;s Services Breakdown</span>
                </div>
                <span className="text-[10px] text-slate-400">Distribution</span>
              </div>

              <div className="space-y-2 pt-1">
                {Object.entries(servicesMap).map(([serviceName, count]) => {
                  const percent = totalServed > 0 ? Math.round((count / totalServed) * 100) : 0;
                  return (
                    <div key={serviceName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium truncate max-w-[200px]">
                          {serviceName}
                        </span>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                          <span className="font-bold text-white">{count} clients</span>
                          <span>({percent}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Clients Log Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                <span>Completed Tickets Ledger ({completedTickets.length})</span>
              </div>
              <span className="text-[10px] text-slate-400">Shift History</span>
            </div>

            {completedTickets.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center text-slate-400 text-xs">
                No completed tickets logged for today yet. Finish your first service to see details here!
              </div>
            ) : (
              <div className="space-y-1.5">
                {completedTickets.map((ticket) => {
                  const compTime = ticket.completedTime
                    ? new Date(ticket.completedTime).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  const paid = ticket.paymentAmount || ticket.totalPrice;
                  const isCash = ticket.paymentStatus === "CASH_PAID";

                  return (
                    <div
                      key={ticket.id || ticket.ticketNumber}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-amber-400 shrink-0">
                          #{ticket.ticketNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{ticket.customerName}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {ticket.serviceName}
                            {compTime ? ` • ${compTime}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-bold text-emerald-300 font-mono">₹{paid}</div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            isCash
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {isCash ? "Cash" : "UPI"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintSummary}
            className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs gap-1.5 h-11 rounded-xl px-4"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Print / Reconcile Shift</span>
            <span className="sm:hidden">Print</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-11 px-6 rounded-xl shadow-md transition-all active:scale-95"
          >
            Done (वापस स्टेशन)
          </Button>
        </div>
      </div>
    </div>
  );
}
