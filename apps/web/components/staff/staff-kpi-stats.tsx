"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";

interface StaffKpiStatsProps {
  isChairOccupied: boolean;
  waitingCount: number;
  totalServedToday: number;
  totalRevenueToday: number;
}

export function StaffKpiStats({
  isChairOccupied,
  waitingCount,
  totalServedToday,
  totalRevenueToday,
}: StaffKpiStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Chair Status */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 block">Chair Status</span>
        <p className="text-xl font-black text-white flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isChairOccupied ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
            }`}
          />
          <span>{isChairOccupied ? "Occupied" : "Open"}</span>
        </p>
      </div>

      {/* 2. Waiting in Queue */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 block">Waiting in Queue</span>
        <p className="text-xl font-black text-amber-400">{waitingCount} Clients</p>
      </div>

      {/* 3. Served Today */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 block">Served Today</span>
        <p className="text-xl font-black text-emerald-400">{totalServedToday} Cuts</p>
      </div>

      {/* 4. Today's Revenue */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 block">Today's Revenue</span>
        <p className="text-xl font-black text-amber-400">{formatCurrency(totalRevenueToday)}</p>
      </div>
    </div>
  );
}
