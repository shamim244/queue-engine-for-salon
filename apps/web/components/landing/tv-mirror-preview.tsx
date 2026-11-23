"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Tv, Sparkles, ExternalLink, ShieldCheck, Volume2, MonitorPlay } from "lucide-react";
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
    <section className="py-20 bg-slate-950 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-600/10 blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Ambient Lounge Hardware
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Turn Any TV Into an Airport Departure Mirror
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Mount any affordable smart TV or firestick in your waiting area. High-contrast airport departure display keeps customers calm and informed without interrupting your barbers.
          </p>
        </div>

        {/* Ambient Backlight Behind TV */}
        <div className="max-w-5xl mx-auto relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-cyan-600/20 rounded-[2.5rem] blur-2xl opacity-60 group-hover:opacity-80 transition-opacity" />

          {/* TV Mockup Frame */}
          <div className="relative rounded-3xl bg-slate-900 border-4 border-slate-700/80 p-2 sm:p-3 shadow-2xl">
            {/* TV Outer Bezel */}
            <div className="rounded-2xl bg-black p-4 sm:p-7 overflow-hidden border border-slate-800">
              {/* TV Screen Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider uppercase flex items-center gap-2">
                    Aura Luxury Lounge · Live Departure Board
                    <span className="hidden md:inline-block text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-normal">
                      Kiosk Mode
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-emerald-400">
                  <span className="bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                    {timeStr}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">· 4 Chairs Active</span>
                </div>
              </div>

              {/* Flight Board Columns */}
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
                  <p className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                    Please Step In (3m window)
                  </p>
                </div>

                {/* Chair 3 */}
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span className="font-bold text-slate-300">CHAIR #3</span>
                    <span className="text-amber-400 font-bold">NEXT UP</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black text-white">#104</span>
                    <span className="text-xs text-slate-400 font-mono">+91 97*** 44556</span>
                  </div>
                  <p className="text-xs text-slate-300">Est. Wait: ~8 mins (Amit Sharma)</p>
                </div>
              </div>

              {/* TV Screen Footer */}
              <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Phone Masking Protocol Active (Customer Privacy Safe)
                </span>
                <span className="text-slate-500">
                  100% Client-Side Rendered · Zero Cloudflare Streaming Waste
                </span>
              </div>
            </div>

            {/* TV Stand Base Accent */}
            <div className="w-24 h-2 bg-slate-700 mx-auto rounded-b-md mt-1" />
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/s/aura-salon/tv">
            <Button
              size="lg"
              variant="outline"
              className="border-slate-800 bg-slate-900/80 text-slate-200 hover:text-white hover:bg-slate-800 gap-2 text-xs sm:text-sm h-11 px-6 shadow-lg shadow-black/40"
            >
              <MonitorPlay className="h-4 w-4 text-emerald-400" />
              Launch Live Fullscreen TV Kiosk Display &rarr;
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
