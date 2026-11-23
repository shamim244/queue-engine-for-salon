"use client";

import React from "react";
import Link from "next/link";
import { Tv, Sparkles, ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SectionProps } from "./types";

export const TvMirrorPreview: React.FC<SectionProps> = ({ config }) => {
  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Ambient Lounge Hardware
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Turn Any TV Into an Airport Departure Mirror
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Mount a smart TV in your waiting area. Our high-contrast display keeps customers informed without constantly disturbing your barbers.
          </p>
        </div>

        {/* TV Mockup Frame */}
        <div className="max-w-5xl mx-auto rounded-3xl bg-slate-900 border-4 border-slate-800 p-2 shadow-2xl relative">
          {/* TV Outer Bezel */}
          <div className="rounded-2xl bg-black p-4 sm:p-6 overflow-hidden">
            {/* TV Screen Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider uppercase">
                  Aura Luxury Lounge · Real-Time Departure Board
                </span>
              </div>
              <div className="text-xs font-mono text-emerald-400">
                16:42 IST · 4 Chairs Active
              </div>
            </div>

            {/* Flight Board Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Chair 1 */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>CHAIR #1</span>
                  <span className="text-emerald-400 font-bold">SERVING NOW</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">#102</span>
                  <span className="text-xs text-slate-400 font-mono">+91 98*** 12345</span>
                </div>
                <p className="text-xs text-slate-300">Stylist: Rahul V. (Beard Trim)</p>
              </div>

              {/* Chair 2 */}
              <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/50 p-4 space-y-2 animate-pulse">
                <div className="flex justify-between items-center text-xs text-emerald-400 font-mono font-bold">
                  <span>CHAIR #2</span>
                  <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black">
                    SUMMONED
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">#103</span>
                  <span className="text-xs text-slate-400 font-mono">+91 99*** 67890</span>
                </div>
                <p className="text-xs text-emerald-300 font-medium">Please Step In (3m window)</p>
              </div>

              {/* Chair 3 */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>CHAIR #3</span>
                  <span className="text-amber-400 font-bold">NEXT UP</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">#104</span>
                  <span className="text-xs text-slate-400 font-mono">+91 97*** 44556</span>
                </div>
                <p className="text-xs text-slate-300">Est. Wait: ~8 mins</p>
              </div>
            </div>

            {/* TV Screen Footer */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Phone Masking Protocol Active (Customer Privacy Safe)
              </span>
              <span>100% Client-Side Rendered · Zero Cloudflare Streaming Waste</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/s/aura-salon/tv">
            <Button variant="outline" className="border-slate-800 text-slate-300 hover:text-white gap-2 text-xs">
              <Tv className="h-4 w-4 text-emerald-400" />
              Launch Live Fullscreen TV Kiosk Display &rarr;
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
