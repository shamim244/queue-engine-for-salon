"use client";

import React from "react";
import Link from "next/link";
import type { SectionProps } from "./types";

export const LandingFooter: React.FC<SectionProps> = ({ config }) => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
              {config.brandName.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-white text-sm">{config.brandName}</span>
              <p className="text-[11px] text-slate-500">{config.tagline}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/partners" className="hover:text-white transition-colors">
              Partner Program
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Consumer Lounge
            </Link>
            <Link href="/salon/login" className="hover:text-white transition-colors">
              Salon Portal
            </Link>
            <Link href="/partner/login" className="hover:text-white transition-colors">
              Field Partner
            </Link>
            <Link href="/hq/login" className="hover:text-white transition-colors">
              HQ Super Admin
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Register Salon
            </Link>
            <Link href="/dev" className="hover:text-white transition-colors">
              Dev Launcher
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-slate-500">
          <div>
            {config.brandName} &copy; 2026. Enterprise Decoupled Monorepo Architecture. All rights reserved.
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bun Core 3001 Connected · WebSocket Live</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
