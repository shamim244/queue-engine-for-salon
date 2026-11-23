"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Armchair } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionProps } from "./types";

export const HeroMinimalist: React.FC<SectionProps> = ({ config }) => {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32 bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-block text-xs uppercase tracking-widest font-mono text-emerald-400 mb-6 font-semibold">
          {config.heroBadge}
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1] max-w-3xl mx-auto">
          {config.heroHeadline}
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          {config.heroSubheadline}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-8 text-sm gap-2 shadow-lg shadow-emerald-600/20"
            >
              {config.heroCtaText}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/s/ramesh-barber/station">
            <Button
              size="lg"
              variant="outline"
              className="border-slate-800 text-slate-300 hover:bg-slate-900 h-12 px-6 text-sm gap-2"
            >
              <Armchair className="h-4 w-4 text-emerald-400" />
              Live Demo Chair
            </Button>
          </Link>
        </div>

        <div className="mt-14 pt-8 border-t border-slate-900 flex flex-wrap justify-center items-center gap-8 text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Zero App Installation
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Direct 0% UPI Settlements
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            14-Day Free Trial
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            WhatsApp Auto-Summons
          </span>
        </div>
      </div>
    </section>
  );
};
