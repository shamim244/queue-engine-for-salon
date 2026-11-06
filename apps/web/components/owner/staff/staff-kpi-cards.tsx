import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Armchair, KeyRound, SlidersHorizontal } from "lucide-react";

interface StaffKpiCardsProps {
  totalStaff: number;
  activeStaffCount: number;
  stylistsCount: number;
  configuredPinsCount: number;
}

export function StaffKpiCards({
  totalStaff,
  activeStaffCount,
  stylistsCount,
  configuredPinsCount,
}: StaffKpiCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Staff Users</p>
            <p className="text-2xl font-bold text-white tracking-tight">{totalStaff}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Armchair className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Stations</p>
            <p className="text-2xl font-bold text-emerald-400 tracking-tight">
              {activeStaffCount} <span className="text-xs text-slate-400 font-normal">of {stylistsCount} chairs</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Mirror Tablet PINs</p>
            <p className="text-2xl font-bold text-purple-300 tracking-tight">
              {configuredPinsCount} <span className="text-xs text-slate-400 font-normal">configured</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Branch Capacity</p>
            <p className="text-sm font-semibold text-white tracking-tight">
              {stylistsCount} Active Stylists
            </p>
            <p className="text-[11px] text-slate-400">
              Stations: {stylistsCount} Active Mirrors
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
