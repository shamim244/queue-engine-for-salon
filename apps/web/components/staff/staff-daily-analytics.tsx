"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, Scissors } from "lucide-react";

interface StaffDailyAnalyticsProps {
  avgActualMinutes: number;
  totalRevenueToday: number;
  servicesCountMap: Record<string, number>;
  completedTickets: any[];
}

export function StaffDailyAnalytics({
  avgActualMinutes,
  totalRevenueToday,
  servicesCountMap,
  completedTickets,
}: StaffDailyAnalyticsProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-400" />
              <span>Daily Work Report &amp; Shift Analytics</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5">
              Real-time performance summary of services completed and revenue generated today
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400 bg-amber-500/10 font-bold">
              Pace: ~{avgActualMinutes}m avg
            </Badge>
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-bold">
              Total: {formatCurrency(totalRevenueToday)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Services Count Breakdown */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
            Today&apos;s Service Breakdown
          </span>

          {Object.keys(servicesCountMap).length === 0 ? (
            <p className="text-xs text-slate-500 italic">No services completed yet today.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(servicesCountMap).map(([srvName, count]) => (
                <div
                  key={srvName}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3 shadow-sm"
                >
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                    <Scissors className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{srvName}</p>
                    <p className="text-[11px] text-slate-400">{count} Completed</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Clients Log */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
            Recent Completed Clients Today ({completedTickets.length})
          </span>

          {completedTickets.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Completed clients will appear here automatically after service checkout.
            </p>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950/60 border border-slate-800 overflow-hidden">
              {completedTickets.slice(0, 8).map((t: any) => (
                <div key={t.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-emerald-400">#{t.ticketNumber}</span>
                    <div>
                      <p className="font-bold text-white">{t.customerName}</p>
                      <p className="text-[11px] text-slate-400">{t.serviceName}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-white block">
                      {formatCurrency(t.paymentAmount || t.totalPrice)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                      {t.paymentStatus === "CASH_PAID" ? "Cash" : "Paid"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
