"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Scissors, Sparkles, Tv, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionProps } from "./types";

export const LandingNavbar: React.FC<SectionProps> = ({ config }) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#080c0a]/90 border-b border-slate-800/80 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo with Salon Icon */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 via-emerald-600 to-teal-500 flex items-center justify-center font-black text-white shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform border border-amber-400/30">
            <Scissors className="h-5 w-5 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-amber-200 transition-colors">
                {config.brandName}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Salon OS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {config.tagline || "Real-Time Engine for High-Volume Salons"}
            </p>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-300">
          <a href="#services" className="hover:text-amber-300 transition-colors">
            Services
          </a>
          <a href="#circuit" className="hover:text-amber-300 transition-colors">
            Pipeline
          </a>
          <a href="#simulator" className="hover:text-amber-300 transition-colors">
            Chair Simulator
          </a>
          <a href="#tv-mirror" className="hover:text-amber-300 transition-colors">
            Lounge TV
          </a>
          <a href="#upi" className="hover:text-amber-300 transition-colors">
            0% UPI
          </a>
          <a href="#roi" className="hover:text-amber-300 transition-colors">
            ROI Calculator
          </a>
          <a href="#pricing" className="hover:text-amber-300 transition-colors">
            Pricing
          </a>
          <Link
            href="/partners"
            className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold hover:bg-amber-500/20 transition-all flex items-center gap-1 text-xs"
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            <span>Partner ({config.partnerCommissionPct}%)</span>
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/dev"
            className="hidden sm:flex px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-amber-500/40 text-slate-300 hover:text-white text-xs font-semibold items-center gap-1.5 transition-all shadow-sm"
            title="Open Developer & QA Multi-Panel Launcher"
          >
            <span>🧪 Dev</span>
          </Link>

          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>

          <Link href="/register">
            <Button
              size="sm"
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 gap-1.5 h-10 px-4 min-h-[40px]"
            >
              <span>{config.heroCtaText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
};
