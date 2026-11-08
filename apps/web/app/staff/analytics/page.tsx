"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Calendar,
  Users,
  IndianRupee,
  Banknote,
  QrCode,
  Clock,
  ArrowLeft,
  Scissors,
  TrendingUp,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";

export default function StaffAnalyticsPage() {
  return (
    <AuthGuard requiredRole={["STAFF", "SALON_OWNER", "SUPER_ADMIN"]}>
      <StaffAnalyticsContent />
    </AuthGuard>
  );
}

type Timeframe = "day" | "week" | "month" | "date";

interface AnalyticsData {
  timeframe: string;
  selectedDate?: string;
  totalServedToday: number;
  totalRevenueToday: number;
  cashRevenue: number;
  onlineRevenue: number;
  avgActualMinutes: number;
  servicesCountMap: Record<string, number>;
  dailyTrends: Array<{ date: string; served: number; revenue: number; cash: number; online: number }>;
  completedTickets: any[];
}

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHumanDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function StaffAnalyticsContent() {
  const { user, staff, salon } = useAuth();
  const todayStr = useMemo(() => getLocalDateString(), []);
  const [timeframe, setTimeframe] = useState<Timeframe>("day");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const effectiveSalonId = salon?.id || "salon-rural-01";
  const stylistId = staff?.id || (user as any)?.staffId;

  const fetchAnalytics = useCallback(async (selectedTimeframe: Timeframe, dateParam?: string) => {
    setLoading(true);
    try {
      const isDateMode = selectedTimeframe === "date";
      const targetDate = isDateMode ? (dateParam || selectedDate) : undefined;
      const rep = await api.queue.getStaffReport(
        effectiveSalonId,
        stylistId,
        isDateMode ? "day" : selectedTimeframe,
        targetDate ? { date: targetDate } : undefined
      );
      if (rep && rep.success) {
        setData({
          timeframe: selectedTimeframe,
          selectedDate: rep.selectedDate || targetDate,
          totalServedToday: rep.totalServedToday || 0,
          totalRevenueToday: rep.totalRevenueToday || 0,
          cashRevenue: rep.cashRevenue || 0,
          onlineRevenue: rep.onlineRevenue || 0,
          avgActualMinutes: rep.avgActualMinutes || 20,
          servicesCountMap: rep.servicesCountMap || {},
          dailyTrends: rep.dailyTrends || [],
          completedTickets: rep.completedTickets || [],
        });
      }
    } catch (err) {
      console.error("Failed to load staff analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveSalonId, stylistId, selectedDate]);

  useEffect(() => {
    if (timeframe === "date") {
      fetchAnalytics("date", selectedDate);
    } else {
      fetchAnalytics(timeframe);
    }
  }, [fetchAnalytics, timeframe, selectedDate]);

  const handleSelectTimeframe = (tf: Timeframe) => {
    triggerHaptic("tap");
    setTimeframe(tf);
    if (tf === "date") {
      fetchAnalytics("date", selectedDate);
    } else {
      fetchAnalytics(tf);
    }
  };

  const handlePrevDay = () => {
    triggerHaptic("tap");
    const [y, m, d] = selectedDate.split("-").map(Number);
    const prev = new Date(y, m - 1, d - 1);
    const prevStr = getLocalDateString(prev);
    setSelectedDate(prevStr);
    fetchAnalytics("date", prevStr);
  };

  const handleNextDay = () => {
    triggerHaptic("tap");
    const [y, m, d] = selectedDate.split("-").map(Number);
    const next = new Date(y, m - 1, d + 1);
    const nextStr = getLocalDateString(next);
    if (nextStr <= todayStr) {
      setSelectedDate(nextStr);
      fetchAnalytics("date", nextStr);
    }
  };

  const totalRev = data?.totalRevenueToday || 0;
  const cashRev = data?.cashRevenue || 0;
  const onlineRev = data?.onlineRevenue || 0;
  const cashPct = totalRev > 0 ? Math.round((cashRev / totalRev) * 100) : 50;
  const onlinePct = totalRev > 0 ? 100 - cashPct : 50;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <Link
          href="/staff"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Chair &amp; Queue Cockpit</span>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            triggerHaptic("tap");
            if (timeframe === "date") {
              fetchAnalytics("date", selectedDate);
            } else {
              fetchAnalytics(timeframe);
            }
          }}
          disabled={loading}
          className="text-xs border-slate-700 bg-slate-900 text-slate-300 hover:text-white gap-1.5 h-8 self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* 2. Page Title & Timeframe Selector (English Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-amber-400" />
            <span>Work &amp; Shift Analytics</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Detailed breakdown of customers served, gross revenue, and cash vs UPI collections.
          </p>
        </div>

        {/* Timeframe Switcher Tabs - English Only */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-inner shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTimeframe("day")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === "day"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleSelectTimeframe("week")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === "week"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => handleSelectTimeframe("month")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === "month"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => handleSelectTimeframe("date")}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              timeframe === "date"
                ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Specific Date</span>
          </button>
        </div>
      </div>

      {/* 2b. Specific Date Picker Control (Active when Specific Date tab is selected) */}
      {timeframe === "date" && (
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>Selected Date:</span>
                <span className="text-amber-400 font-mono font-black">{formatHumanDate(selectedDate)}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Viewing shift statistics and ledger for this specific business day
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={handlePrevDay}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors flex items-center gap-1 active:scale-95"
              title="Previous Day"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Prev</span>
            </button>

            <input
              type="date"
              value={selectedDate}
              max={todayStr}
              onChange={(e) => {
                if (e.target.value) {
                  triggerHaptic("tap");
                  const newDate = e.target.value;
                  setSelectedDate(newDate);
                  fetchAnalytics("date", newDate);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono font-medium focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
            />

            <button
              type="button"
              onClick={handleNextDay}
              disabled={selectedDate >= todayStr}
              className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              title="Next Day"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("tap");
                  setSelectedDate(todayStr);
                  fetchAnalytics("date", todayStr);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-colors active:scale-95"
              >
                Today
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Core Metric Tiles (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Clients Served</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {data ? data.totalServedToday : 0}
          </div>
          <p className="text-[11px] text-slate-400">
            {timeframe === "day"
              ? "Completed today"
              : timeframe === "week"
              ? "Last 7 days total"
              : timeframe === "month"
              ? "Last 30 days total"
              : `Completed on ${selectedDate}`}
          </p>
        </div>

        {/* Total Gross Revenue */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Gross Billing</span>
            <IndianRupee className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            ₹{data ? data.totalRevenueToday : 0}
          </div>
          <p className="text-[11px] text-slate-400">
            {timeframe === "date" ? `Total for ${selectedDate}` : "Total service amount"}
          </p>
        </div>

        {/* Cash in Hand */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Physical Cash</span>
            <Banknote className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ₹{data ? data.cashRevenue : 0}
          </div>
          <p className="text-[11px] text-slate-400">Tender in register/pocket</p>
        </div>

        {/* Online / UPI Paid */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold tracking-wider">Online / UPI</span>
            <QrCode className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
            ₹{data ? data.onlineRevenue : 0}
          </div>
          <p className="text-[11px] text-slate-400">Salon QR &amp; digital payments</p>
        </div>
      </div>

      {/* 4. Payment Mode Split Bar */}
      <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-400" />
              <span>Payment Mode Distribution</span>
            </CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Cash: {cashPct}% (₹{cashRev})
              </span>
              <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                UPI: {onlinePct}% (₹{onlineRev})
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-3">
          {/* Visual Percentage Bar */}
          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
            <div
              style={{ width: `${cashPct}%` }}
              className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
              title={`Cash: ₹${cashRev} (${cashPct}%)`}
            />
            <div
              style={{ width: `${onlinePct}%` }}
              className="bg-purple-500 h-full rounded-r-full transition-all duration-500"
              title={`UPI: ₹${onlineRev} (${onlinePct}%)`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Physical Cash Tender</span>
            <span>Online UPI / Digital QR</span>
          </div>
        </CardContent>
      </Card>

      {/* 5. Daily Trend Breakdown (Active when viewing Week or Month) */}
      {(timeframe === "week" || timeframe === "month") && data && data.dailyTrends.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
          <CardHeader className="pb-3 border-b border-slate-800">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <span>Day-by-Day Performance History</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5">
              Daily customer counts and earnings over the selected period
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden">
              {data.dailyTrends.map((d) => (
                <div
                  key={d.date}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-900/50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                      {d.date}
                    </span>
                    <div>
                      <p className="font-bold text-white">{d.served} Clients Served</p>
                      <p className="text-[11px] text-slate-400">
                        Cash: ₹{d.cash} • UPI: ₹{d.online}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-base font-black text-emerald-400">
                      ₹{d.revenue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. Service Popularity Breakdown */}
      <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Scissors className="h-4 w-4 text-amber-400" />
              <span>Services Breakdown</span>
            </CardTitle>
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 bg-amber-500/10 font-bold">
              Avg Pace: ~{data?.avgActualMinutes || 20}m / cut
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {(!data || Object.keys(data.servicesCountMap).length === 0) ? (
            <p className="text-xs text-slate-500 italic p-4 text-center">
              No services completed for this selection.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(data.servicesCountMap).map(([srvName, count]) => (
                <div
                  key={srvName}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 shadow-sm"
                >
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{srvName}</p>
                    <p className="text-[11px] text-emerald-400 font-semibold">{count} Completed</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7. Completed Clients Audit Ledger */}
      <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Completed Tickets Ledger ({data?.completedTickets?.length || 0})</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Audit list of recent services completed and payment status
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {(!data || data.completedTickets.length === 0) ? (
            <p className="text-xs text-slate-500 italic p-6 text-center">
              {timeframe === "date"
                ? `No completed tickets found for ${formatHumanDate(selectedDate)}.`
                : "No completed tickets recorded for this period."}
            </p>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden">
              {data.completedTickets.map((t: any) => (
                <div
                  key={t.id}
                  className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono font-bold text-amber-400 shrink-0">#{t.ticketNumber}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{t.customerName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{t.serviceName}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-white block">
                      {formatCurrency(t.paymentAmount || t.totalPrice)}
                    </span>
                    <Badge
                      className={`text-[9px] px-1.5 py-0 font-bold uppercase ${
                        t.paymentStatus === "CASH_PAID"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      }`}
                    >
                      {t.paymentStatus === "CASH_PAID" ? "Cash" : "UPI Paid"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
