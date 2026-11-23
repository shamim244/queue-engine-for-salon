"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const PricingSection: React.FC<SectionProps> = ({ config }) => {
  return (
    <section id="pricing" className="py-20 bg-slate-900/40 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Simple, Transparent Pricing
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Plans Built for Local Barbers to Multi-Chair Studios
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Zero setup fees. Zero commission on haircut sales. Pick the plan that fits your chair count.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Plan 1: Starter */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <Badge variant="outline" className="text-xs mb-3 text-emerald-400 border-emerald-500/30">
                Starter Tier
              </Badge>
              <h3 className="text-xl font-bold text-white">Starter Edition</h3>
              <p className="text-xs text-slate-400 mt-1">Single-location local barbershops (1–3 chairs)</p>

              <div className="my-6">
                <span className="text-4xl font-black text-white">₹{config.pricingStarterMonthly}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800">
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
                <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-200 text-xs">
                  Start 14-Day Free Trial
                </Button>
              </Link>
            </div>
          </div>

          {/* Plan 2: Pro (Most Popular) */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-900 border-2 border-emerald-500/80 shadow-2xl shadow-emerald-500/10 flex flex-col justify-between relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold tracking-wide uppercase shadow-md">
              Most Popular
            </span>

            <div>
              <Badge variant="outline" className="text-xs mb-3 text-emerald-300 border-emerald-500/30">
                Pro Growth Tier
              </Badge>
              <h3 className="text-xl font-bold text-white">Pro Edition</h3>
              <p className="text-xs text-slate-400 mt-1">High-volume salons, parlors &amp; boutique chains</p>

              <div className="my-6">
                <span className="text-4xl font-black text-white">₹{config.pricingProMonthly}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Up to 5 Locations</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Up to 10 Stylist Chairs Per Branch</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Airport Departure TV Kiosk Screen</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>4-Digit Rapid Mirror PIN Switching</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Milestone Digital Loyalty Stamp Cards</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link href="/register">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 text-xs">
                  Get Started with Pro
                </Button>
              </Link>
            </div>
          </div>

          {/* Plan 3: Elite */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <Badge variant="outline" className="text-xs mb-3 text-teal-400 border-teal-500/30">
                Elite Franchise Tier
              </Badge>
              <h3 className="text-xl font-bold text-white">Elite Chain Edition</h3>
              <p className="text-xs text-slate-400 mt-1">Multi-branch regional brands &amp; luxury franchises</p>

              <div className="my-6">
                <span className="text-4xl font-black text-white">₹{config.pricingEliteMonthly}</span>
                <span className="text-xs text-slate-400 ml-1.5 font-medium">/ month</span>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-300 pt-4 border-t border-slate-800">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Locations &amp; Chairs</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Super Admin Platform Command Center</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>White-Label Custom Brand &amp; Domain</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Dedicated Account Manager &amp; WhatsApp SLA</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link href="/register">
                <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-200 text-xs">
                  Contact for Elite Chain
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
