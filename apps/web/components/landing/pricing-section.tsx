"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Scissors, Armchair, Crown, Store, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const PricingSection: React.FC<SectionProps> = ({ config }) => {
  return (
    <section id="pricing" className="py-24 bg-[#0a0f0d] border-t border-slate-800/80 relative overflow-hidden">
      {/* Background Studio Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[450px] bg-gradient-to-r from-amber-600/10 via-emerald-600/15 to-transparent blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40"
          >
            💈 Zero Commission Pricing · 100% Haircut Revenue Yours
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Plans Built for Local Barbers to Multi-Chair Studios
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            Zero setup fees. Zero commission on haircut sales. Unlimited door QR check-ins, chair tablets, and TV mirrors included in every plan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Plan 1: Starter */}
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-900/90 via-slate-950 to-[#080d0a] border-2 border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between shadow-xl group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-xs text-amber-300 border-amber-500/40 bg-amber-500/10 flex items-center gap-1">
                  <Store className="h-3 w-3 text-amber-400" />
                  Neighborhood Tier
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono">1–3 Chairs</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-200 transition-colors">Starter Edition</h3>
              <p className="text-xs text-slate-400 mt-1">Single-location local barbershops &amp; grooming bays</p>

              <div className="my-6">
                <span className="text-4xl font-black text-white font-mono">₹{config.pricingStarterMonthly}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>1 Salon Location</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Up to 3 Stylist Chairs</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Door QR Check-Ins</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Automated WhatsApp Arrival Alerts</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>0% Fee Dynamic NPCI UPI QR &amp; Cash</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link href="/register">
                <Button variant="outline" className="w-full border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 text-slate-200 text-xs h-11 min-h-[44px]">
                  Start 14-Day Free Trial
                </Button>
              </Link>
            </div>
          </div>

          {/* Plan 2: Pro (Most Popular) */}
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-b from-emerald-950/50 via-slate-900/95 to-[#080d0a] border-2 border-emerald-500 shadow-2xl shadow-emerald-500/15 flex flex-col justify-between relative group">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black tracking-wider uppercase shadow-lg border border-emerald-400/40">
              Most Popular
            </span>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-xs text-emerald-300 border-emerald-500/40 bg-emerald-500/10 flex items-center gap-1">
                  <Armchair className="h-3 w-3 text-emerald-400" />
                  Busy Studio Tier
                </Badge>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">Up to 10 Chairs</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-200 transition-colors">Pro Edition</h3>
              <p className="text-xs text-slate-300 mt-1">High-volume salons, parlors &amp; boutique chains</p>

              <div className="my-6">
                <span className="text-4xl font-black text-white font-mono">₹{config.pricingProMonthly}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-200 pt-4 border-t border-slate-800/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">Up to 5 Locations</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Up to 10 Stylist Chairs Per Branch</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Waiting Lounge TV Departure Kiosk</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Stylist Commission &amp; Split Tracking</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Priority WhatsApp VIP Queue Lane</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link href="/register">
                <Button className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs h-12 shadow-lg shadow-emerald-600/30 gap-2 min-h-[48px]">
                  <span>Claim Your Pro Free Trial</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Plan 3: Elite */}
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-900/90 via-slate-950 to-[#080d0a] border-2 border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between shadow-xl group">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-xs text-amber-300 border-amber-500/40 bg-amber-500/10 flex items-center gap-1">
                  <Crown className="h-3 w-3 text-amber-400" />
                  Franchise Tier
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono">Unlimited Chairs</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-amber-200 transition-colors">Elite Enterprise</h3>
              <p className="text-xs text-slate-400 mt-1">Regional franchise networks &amp; luxury salon groups</p>

              <div className="my-6">
                <span className="text-4xl font-black text-white font-mono">₹{config.pricingEliteMonthly}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800/80">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">Unlimited Salon Locations</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Barber Chairs &amp; Tablets</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Multi-Branch Inventory &amp; Stock Sync</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>White-Label Custom Domain Support</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Dedicated Account Manager &amp; SLA</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link href="/register">
                <Button variant="outline" className="w-full border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 text-slate-200 text-xs h-11 min-h-[44px]">
                  Contact Enterprise Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
