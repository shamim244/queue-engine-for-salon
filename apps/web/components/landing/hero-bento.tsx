"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Armchair, QrCode, Tv, Zap, MessageSquare, ShieldCheck, ChevronRight, Activity, Smartphone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const HeroBento: React.FC<SectionProps> = ({ config }) => {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-32 bg-slate-950">
      {/* Dark Obsidian Bento Background Ambient Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[480px] bg-emerald-500/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-1/4 right-10 w-[350px] h-[350px] bg-teal-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Subtle Grid Backdrop */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Intro */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 shadow-xl shadow-emerald-950/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{config.heroBadge}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">Obsidian Bento Edition</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
            {config.heroHeadline}
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {config.heroSubheadline}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-12 px-7 gap-2 shadow-lg shadow-emerald-600/30 text-xs sm:text-sm"
              >
                {config.heroCtaText}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/s/ramesh-barber/station" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-semibold h-12 px-6 gap-2 text-xs sm:text-sm"
              >
                <Armchair className="h-4 w-4 text-emerald-400" />
                Live Cutting Desk
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento Grid Layout (High-Contrast Obsidian Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {/* Bento Item 1: Main Feature Card (Span 2 Cols) */}
          <div className="md:col-span-2 rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 flex flex-col justify-between hover:border-emerald-500/50 transition-all shadow-xl group relative overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                  Zero App Install · Instant QR
                </span>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10 text-[10px]">
                  &lt;1 Second Check-In
                </Badge>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                1-Scan Entrance QR Check-in
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                Customers scan your salon door poster with any Android or iPhone camera. Instant digital ticket issued with live wait-time countdown and automated WhatsApp summon alerts.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Door QR Station</p>
                  <p className="text-[11px] text-slate-400">Printed A4 acrylic stand or sticker</p>
                </div>
              </div>
              <Link href="/s/ramesh-barber" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group-hover:underline">
                <span>View &rarr;</span>
              </Link>
            </div>
          </div>

          {/* Bento Item 2: Live TV Departure Board */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between hover:border-blue-500/40 transition-all shadow-xl backdrop-blur-xl">
            <div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                <Tv className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Lobby TV Mirror</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Airport departure screen displays current chairs, summon alerts, and masked phone numbers for customer privacy.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">1080p / 4K Kiosk</span>
              <Link href="/s/aura-salon/tv" className="text-emerald-400 font-semibold hover:underline">
                Open TV &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Item 3: Direct UPI Settlements */}
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between hover:border-amber-500/40 transition-all shadow-xl backdrop-blur-xl">
            <div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">0% Gateway UPI</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Render dynamic NPCI-compliant UPI QR codes client-side. Funds deposit directly to your bank account with zero fees.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">Instant Bank Credit</span>
              <span className="text-emerald-400 font-semibold">0% Fee</span>
            </div>
          </div>

          {/* Bento Item 4: Telemetry Stats Ribbon (Span 4 Cols) */}
          <div className="md:col-span-3 lg:col-span-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-slate-800 p-5 flex flex-wrap items-center justify-around gap-4 text-center shadow-lg">
            <div>
              <p className="text-xl sm:text-2xl font-black text-white">&lt; 15 ms</p>
              <p className="text-[11px] text-slate-400">WebSocket Dispatch</p>
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">99.98%</p>
              <p className="text-[11px] text-slate-400">Uptime SLA</p>
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div>
              <p className="text-xl sm:text-2xl font-black text-teal-400">0 App</p>
              <p className="text-[11px] text-slate-400">Friction For Guests</p>
            </div>
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div>
              <p className="text-xl sm:text-2xl font-black text-amber-400">30% Lifetime</p>
              <p className="text-[11px] text-slate-400">Partner Commission</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
