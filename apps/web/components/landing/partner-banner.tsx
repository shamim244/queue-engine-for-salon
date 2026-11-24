"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Scissors, Store, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const PartnerBanner: React.FC<SectionProps> = ({ config }) => {
  return (
    <section className="py-16 bg-[#080d0a] border-y border-slate-800/80 relative overflow-hidden">
      {/* Background Studio Glow */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-amber-600/10 via-emerald-600/10 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-8 sm:p-12 rounded-[2.5rem] bg-gradient-to-r from-amber-950/30 via-slate-900/95 to-[#0a120f] border-2 border-amber-500/40 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Accent Trim */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/60 via-emerald-500/60 to-amber-500/60" />

          <div className="max-w-xl text-left space-y-3">
            <Badge
              variant="outline"
              className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/40 shadow-sm"
            >
              💈 City Salon Distribution Network
            </Badge>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
              Are you a Salon Supplier, Barber Equipment Dealer, or Agency?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Equip local salons, parlors, and barbershops in your city with {config.brandName}. Earn{" "}
              <strong className="text-amber-300 font-bold">{config.partnerCommissionPct}% lifetime recurring monthly commissions</strong>{" "}
              on every active chair. Free acrylic door stands, demo tablets, and localized onboarding kits provided.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full md:w-auto shrink-0">
            <Link href="/partners" className="w-full sm:w-auto">
              <Button className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black h-12 px-7 shadow-xl shadow-amber-600/20 text-xs min-h-[48px]">
                <span>Apply for Partner Franchise</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
            <Link href="/partner/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-200 h-12 px-5 text-xs min-h-[48px]"
              >
                Partner Portal Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
