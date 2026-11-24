"use client";

import React from "react";
import Link from "next/link";
import { Scissors, Flame, ArrowUpRight } from "lucide-react";
import type { SectionProps } from "./types";

export const LandingFooter: React.FC<SectionProps> = ({ config }) => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#060907] py-14 text-slate-400 text-xs relative overflow-hidden">
      {/* Top Trim */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-emerald-500/40 to-teal-500/40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pb-10 border-b border-slate-800/80">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 via-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs border border-amber-400/40 shadow-lg shadow-amber-500/20">
              <Scissors className="h-5 w-5 text-white transform -rotate-45" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight">{config.brandName}</span>
              <p className="text-[11px] text-slate-400">{config.tagline || "The Real-Time Engine for High-Volume Salons"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-300">
            <Link href="/" className="hover:text-amber-300 transition-colors">
              Home
            </Link>
            <Link href="/partners" className="hover:text-amber-300 transition-colors">
              Partner Franchise
            </Link>
            <Link href="/login" className="hover:text-amber-300 transition-colors">
              Consumer Lounge
            </Link>
            <Link href="/salon/login" className="hover:text-amber-300 transition-colors">
              Salon Owner Portal
            </Link>
            <Link href="/partner/login" className="hover:text-amber-300 transition-colors">
              Distributor Login
            </Link>
            <Link href="/hq/login" className="hover:text-amber-300 transition-colors">
              HQ Super Admin
            </Link>
            <Link href="/register" className="hover:text-amber-300 transition-colors font-semibold text-emerald-400">
              Register Salon &rarr;
            </Link>
            <Link href="/dev" className="hover:text-amber-300 transition-colors text-slate-400">
              Dev Sandbox
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500">
          <div>
            {config.brandName} &copy; 2026. Built with Client-Compute Architecture &amp; Zero Server Waste. All rights reserved.
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Bun Core Engine &middot; Sub-15ms WebSocket Broadcast</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
