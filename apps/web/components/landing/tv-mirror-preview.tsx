"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tv, Sparkles, ExternalLink, ShieldCheck, Volume2, MonitorPlay, Scissors, Armchair } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SectionProps } from "./types";

export const TvMirrorPreview: React.FC<SectionProps> = ({ config }) => {
  const [timeStr, setTimeStr] = useState("16:42:10 IST");

  // Client-side ticking clock (Zero server loops)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")} IST`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="tv-mirror" className="py-24 bg-[#0a0f0d] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-r from-teal-600/10 via-emerald-600/15 to-transparent blur-[160px] pointer-events-none rounded-full" />
      <div className="absolute top-10 left-10 w-[300px] h-[300px] bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40"
          >
            💈 Waiting Lounge Display · Zero App Hardware
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Turn Any TV Into an Airport Departure Mirror
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            Mount any affordable smart TV or firestick in your waiting lounge. High-contrast airport departure display keeps waiting clients calm, eliminates crowded front desks, and protects customer privacy.
          </p>
        </div>

        {/* Ambient Backlight Behind TV */}
        <div className="max-w-5xl mx-auto relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-600/20 via-emerald-600/20 to-teal-600/20 rounded-[3rem] blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* TV Mockup Frame with Walnut Bezel */}
          <div className="relative rounded-[2.5rem] bg-gradient-to-b from-slate-900 via-slate-950 to-[#080d0a] border-4 border-slate-700/80 p-3 sm:p-4 shadow-2xl">
            {/* TV Outer Bezel */}
            <div className="rounded-2xl bg-black p-4 sm:p-7 overflow-hidden border border-slate-800/80">
              {/* TV Screen Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
                    <span>Aura Luxury Lounge &middot; Live Departure Board</span>
                    <span className="hidden md:inline-block text-[10px] font-sans px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-semibold">
                      Kiosk Mode
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-emerald-400">
                  <span className="bg-slate-900 px-3 py-1 rounded border border-slate-800 text-amber-300 font-semibold">
                    {timeStr}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">&middot; 4 Chairs Active</span>
                </div>
              </div>

              {/* Departure Board Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Chair 1 */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span className="font-bold text-slate-300">CHAIR #1</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      SERVING NOW
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black text-white">#102</span>
                    <span className="text-xs text-slate-400 font-mono">+91 98*** 12345</span>
                  </div>
                  <p className="text-xs text-slate-300">Stylist: Rahul V. (Beard Trim)</p>
                </div>

                {/* Chair 2: Actively Summoned */}
                <div className="rounded-xl bg-emerald-950/40 border-2 border-emerald-500 p-4 space-y-2 animate-pulse shadow-lg shadow-emerald-950/60">
                  <div className="flex justify-between items-center text-xs text-emerald-400 font-mono font-bold">
                    <span>CHAIR #2</span>
                    <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black tracking-wider animate-bounce">
                      SUMMONED
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black text-white">#103</span>
                    <span className="text-xs text-emerald-300 font-mono">+91 99*** 67890</span>
                  </div>
                  <p className="text-xs text-emerald-200">Stylist: Ramesh Kumar (Haircut Combo)</p>
                </div>

                {/* Chair 3: Up Next */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span className="font-bold text-slate-300">CHAIR #3</span>
                    <span className="text-amber-400 font-bold">EST. 8 MINS</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black text-white">#104</span>
                    <span className="text-xs text-slate-400 font-mono">+91 97*** 45678</span>
                  </div>
                  <p className="text-xs text-slate-300">Stylist: Suresh P. (Head Massage)</p>
                </div>
              </div>

              {/* TV Screen Footer Bar */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-mono gap-2">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Scissors className="h-3.5 w-3.5 text-amber-400" />
                  <span>Scan entrance QR for real-time live pocket ticket on your phone</span>
                </span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sub-15ms WebSocket Broadcast
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TV Mode Launch CTA */}
        <div className="mt-8 text-center">
          <Link href="/s/aura-salon/tv" target="_blank">
            <Button
              size="lg"
              variant="outline"
              className="border-amber-500/40 bg-slate-900/90 hover:bg-slate-850 text-amber-200 font-semibold gap-2 h-12 px-6 text-xs sm:text-sm shadow-lg shadow-black/40 min-h-[48px]"
            >
              <Tv className="h-4 w-4 text-amber-400" />
              <span>Launch Full-Screen TV Departure Kiosk</span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
