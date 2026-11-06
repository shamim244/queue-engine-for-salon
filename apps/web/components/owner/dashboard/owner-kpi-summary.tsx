import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle2, Banknote, Users, Armchair } from "lucide-react";

interface OwnerKpiSummaryProps {
  metrics: {
    todayServedCount: number;
    todayRevenue: number;
    averageServiceDurationMinutes: number;
  };
  loading: boolean;
  waitingCount: number;
  summonedCount: number;
  inServiceCount: number;
  totalStylists: number;
}

export function OwnerKpiSummary({
  metrics,
  loading,
  waitingCount,
  summonedCount,
  inServiceCount,
  totalStylists,
}: OwnerKpiSummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs text-slate-400 uppercase font-semibold">
            Clients Served Today
          </CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-white">
            {loading ? "..." : metrics.todayServedCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">Completed checkouts today</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs text-slate-400 uppercase font-semibold">
            Today Revenue
          </CardTitle>
          <Banknote className="h-4 w-4 text-emerald-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-emerald-400">
            {loading ? "..." : formatCurrency(metrics.todayRevenue)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Cash & UPI collected</p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs text-slate-400 uppercase font-semibold">
            Currently Waiting
          </CardTitle>
          <Users className="h-4 w-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-amber-400">
            {loading ? "..." : waitingCount}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {summonedCount} summoned to chairs
          </p>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs text-slate-400 uppercase font-semibold">
            Chairs Active
          </CardTitle>
          <Armchair className="h-4 w-4 text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-white">
            {inServiceCount} / {totalStylists || 1}
          </div>
          <p className="text-xs text-slate-400 mt-1">Working stations occupied</p>
        </CardContent>
      </Card>
    </div>
  );
}
