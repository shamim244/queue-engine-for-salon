"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const PartnerBanner: React.FC<SectionProps> = ({ config }) => {
  return (
    <section className="py-14 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-y border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="max-w-xl text-left">
            <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 mb-2">
              🤝 City Distribution Network
            </Badge>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Are you a Salon Supplier, Agency, or Field Hustler?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Distribute {config.brandName} to local salons and barbers in your city. Earn {config.partnerCommissionPct}% lifetime recurring monthly commissions on every active chair. Free acrylic counter stands and sales materials provided.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Link href="/partners" className="w-full sm:w-auto">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 px-6 shadow-lg shadow-emerald-600/25 text-xs">
                Explore Partner Program &rarr;
              </Button>
            </Link>
            <Link href="/partner/login" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-300 h-11 px-4 text-xs">
                Partner Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
