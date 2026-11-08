"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Armchair, ExternalLink } from "lucide-react";

interface StaffGreetingBannerProps {
  salonName?: string;
  stylistName?: string;
  effectiveSlug: string;
}

export function StaffGreetingBanner({
  salonName = "Ramesh Traditional Barber",
  stylistName = "Stylist",
  effectiveSlug,
}: StaffGreetingBannerProps) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-[10px] px-2.5 py-0.5 font-bold">
            ACTIVE STATION
          </Badge>
          <span className="text-xs text-slate-400">
            Salon: <strong className="text-white">{salonName}</strong>
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Welcome, {stylistName}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Control your mirror chair, calibrate service durations, and track your daily shift earnings.
        </p>
      </div>

      {/* Quick Link to Mirror Tablet Station */}
      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href={`/s/${effectiveSlug}/station`}
          className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Armchair className="h-4 w-4" />
          <span>Full Mirror Terminal</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
