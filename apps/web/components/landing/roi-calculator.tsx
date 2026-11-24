"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, IndianRupee, TrendingUp, Sparkles, Check, Building2, Store, Crown, Scissors, Armchair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SlidingNumber } from "@/components/ui/sliding-number";
import type { SectionProps } from "./types";

export const RoiCalculator: React.FC<SectionProps> = ({ config }) => {
  const [chairs, setChairs] = useState(3);
  const [walkoutsPerDay, setWalkoutsPerDay] = useState(5);
  const [avgTicket, setAvgTicket] = useState(250);

  // Presets
  const applyPreset = (c: number, w: number, t: number) => {
    setChairs(c);
    setWalkoutsPerDay(w);
    setAvgTicket(t);
  };

  // Math: 8 weekend peak days per month
  const monthlyLostCustomers = walkoutsPerDay * 8;
  const monthlyRecoverableCash = monthlyLostCustomers * avgTicket;
  const platformCost = config.pricingStarterMonthly || 699;
  const netProfitGain = monthlyRecoverableCash - platformCost;
  const roiMultiplier = Math.round((monthlyRecoverableCash / platformCost) * 10) / 10;
  const daysToBreakEven = Math.max(1, Math.ceil(platformCost / (walkoutsPerDay * avgTicket)));

  return (
    <section id="roi" className="py-24 bg-[#0a0f0d] relative overflow-hidden">
      {/* Warm Ambient Salon Lighting Halos */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-b from-amber-600/10 via-emerald-600/15 to-transparent blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40"
          >
            💈 Proven Salon Economics · Real Walk-Out Retention
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            How Much Cash Are You Losing to Waiting Benches?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            During Saturday &amp; Sunday peak rush, walk-in clients peek inside, see all chairs occupied, and leave for the salon across the street. Step through your numbers below to see what you recover with live pocket tickets.
          </p>

          {/* Quick Preset Buttons */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <button
              onClick={() => applyPreset(2, 4, 180)}
              className="px-3.5 py-2 rounded-full border border-slate-800 bg-slate-900/90 hover:border-amber-500/50 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2 shadow-md hover:bg-slate-800"
            >
              <Store className="h-3.5 w-3.5 text-amber-400" />
              <span>Neighborhood Barber (2 Chairs · ₹180)</span>
            </button>
            <button
              onClick={() => applyPreset(4, 7, 300)}
              className="px-3.5 py-2 rounded-full border border-slate-800 bg-slate-900/90 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2 shadow-md hover:bg-slate-800"
            >
              <Armchair className="h-3.5 w-3.5 text-emerald-400" />
              <span>Busy Urban Studio (4 Chairs · ₹300)</span>
            </button>
            <button
              onClick={() => applyPreset(8, 12, 500)}
              className="px-3.5 py-2 rounded-full border border-slate-800 bg-slate-900/90 hover:border-amber-500/50 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2 shadow-md hover:bg-slate-800"
            >
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              <span>Luxury Grooming Lounge (8 Chairs · ₹500)</span>
            </button>
          </div>
        </div>

        {/* Polished Salon Station Dark Granite / Leather Container */}
        <div className="max-w-5xl mx-auto rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#080c0a] border-2 border-slate-800/80 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle Leather Stitching & Brass Glow Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-emerald-500/40 to-amber-500/40" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left: Tactile Sliders */}
            <div className="space-y-6">
              {/* Slider 1: Chairs */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-amber-400" />
                    Active Styling Chairs:
                  </label>
                  <span className="text-sm font-bold text-amber-400 font-mono">
                    <SlidingNumber value={chairs} suffix={chairs === 1 ? " Chair" : " Chairs"} />
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={chairs}
                  onChange={(e) => setChairs(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Slider 2: Walk-outs per peak weekend day */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200">
                    Lost Walk-Outs on Saturday / Sunday:
                  </label>
                  <span className="text-sm font-bold text-rose-400 font-mono">
                    <SlidingNumber value={walkoutsPerDay} suffix=" Clients / Day" />
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={25}
                  value={walkoutsPerDay}
                  onChange={(e) => setWalkoutsPerDay(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Clients who open the door, see a crowd, and immediately leave.
                </p>
              </div>

              {/* Slider 3: Average Service Ticket */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200">
                    Average Bill Per Client:
                  </label>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    <SlidingNumber value={avgTicket} prefix="₹" />
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Recovery Progress Bar with Sliding Number */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-950/60 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">Monthly Retention Potential:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ~<SlidingNumber value={monthlyLostCustomers} suffix=" Customers Retained" />
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (monthlyLostCustomers / 120) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Net Recovered Revenue Result Box with Motion Primitives Rolling Tally */}
            <div className="rounded-3xl bg-gradient-to-b from-emerald-950/60 via-slate-950 to-[#080d0a] border-2 border-emerald-500/50 p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0">
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl shadow tracking-wider">
                  Breakeven: Day {daysToBreakEven}
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest font-mono text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Estimated Monthly Cash Recovered
                </span>
                <div className="text-4xl sm:text-6xl font-black text-white mt-3 flex items-center justify-center gap-1 tracking-tight">
                  <span className="text-emerald-400">₹</span>
                  <SlidingNumber
                    value={monthlyRecoverableCash}
                    className="text-white font-mono tracking-tight"
                  />
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  From retaining ~<SlidingNumber value={monthlyLostCustomers} /> weekend clients who normally walk out.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{config.brandName} Starter Cost:</span>
                  <span className="font-mono text-slate-200">₹{platformCost} / mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Net Monthly Gain:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm flex items-center gap-0.5">
                    +<SlidingNumber value={netProfitGain} prefix="₹" suffix=" / mo" />
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Return on Investment (ROI):</span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800">
                    {roiMultiplier}x ROI
                  </span>
                </div>
              </div>

              <Link href="/register" className="block pt-2">
                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-12 text-xs sm:text-sm gap-2 shadow-lg shadow-emerald-600/30">
                  Claim Your 14-Day Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
