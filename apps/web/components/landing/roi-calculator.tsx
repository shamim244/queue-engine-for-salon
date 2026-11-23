"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, IndianRupee, TrendingUp, Sparkles, Check, Building2, Store, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <section id="roi" className="py-20 bg-slate-950 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Proven Owner Economics
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How Much Cash Are You Losing to Waiting Benches?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            When weekend walk-in customers see a crowded bench, they leave for the barbershop down the road. Adjust the sliders below or choose a preset to calculate your recovered revenue.
          </p>

          {/* Quick Preset Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => applyPreset(2, 4, 180)}
              className="px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/80 hover:border-emerald-500/50 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Store className="h-3.5 w-3.5 text-emerald-400" />
              <span>Neighborhood Barber (2 Chairs)</span>
            </button>
            <button
              onClick={() => applyPreset(4, 7, 300)}
              className="px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/80 hover:border-emerald-500/50 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5 text-teal-400" />
              <span>Busy Urban Salon (4 Chairs)</span>
            </button>
            <button
              onClick={() => applyPreset(8, 12, 500)}
              className="px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/80 hover:border-emerald-500/50 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              <span>Luxury Studio (8 Chairs)</span>
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left: Tactile Sliders */}
            <div className="space-y-6">
              {/* Slider 1: Chairs */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200">
                    Active Chairs in Your Salon:
                  </label>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {chairs} {chairs === 1 ? "Chair" : "Chairs"}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={chairs}
                  onChange={(e) => setChairs(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Slider 2: Walk-outs per peak weekend day */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200">
                    Lost Walk-Outs on Saturday / Sunday:
                  </label>
                  <span className="text-sm font-bold text-amber-400 font-mono">
                    {walkoutsPerDay} Clients / Day
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={25}
                  value={walkoutsPerDay}
                  onChange={(e) => setWalkoutsPerDay(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Clients who open the door, see a crowd, and immediately leave.
                </p>
              </div>

              {/* Slider 3: Average Service Ticket */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs sm:text-sm font-semibold text-slate-200">
                    Average Bill Per Client:
                  </label>
                  <span className="text-sm font-bold text-teal-400 font-mono">
                    ₹{avgTicket}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={avgTicket}
                  onChange={(e) => setAvgTicket(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>

              {/* Recovery Progress Bar */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">Monthly Retention Potential:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    ~{monthlyLostCustomers} Customers Retained
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (monthlyLostCustomers / 120) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right: Net Recovered Revenue Result Box */}
            <div className="rounded-2xl bg-gradient-to-b from-emerald-950/50 via-slate-950 to-slate-950 border-2 border-emerald-500/50 p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-bl-lg shadow">
                  Breakeven: Day {daysToBreakEven}
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-widest font-mono text-emerald-400 font-bold">
                  Estimated Monthly Cash Recovered
                </span>
                <div className="text-4xl sm:text-5xl font-black text-white mt-2 flex items-center justify-center gap-1 tracking-tight">
                  <span className="text-emerald-400">₹</span>
                  <span>{monthlyRecoverableCash.toLocaleString("en-IN")}</span>
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  From retaining ~{monthlyLostCustomers} weekend clients who normally walk out.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">{config.brandName} Starter Cost:</span>
                  <span className="font-mono text-slate-200">₹{platformCost} / mo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Net Monthly Gain:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    +₹{netProfitGain.toLocaleString("en-IN")} / mo
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Return on Investment (ROI):</span>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    {roiMultiplier}x ROI
                  </span>
                </div>
              </div>

              <Link href="/register" className="block pt-2">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 text-xs sm:text-sm gap-2 shadow-lg shadow-emerald-600/30">
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
