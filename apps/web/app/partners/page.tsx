"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Store,
  Briefcase,
  TrendingUp,
  Percent,
  Wallet,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Building2,
  DollarSign,
  Package,
  Layers,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_CONFIG } from "@/config/site";

export default function PartnersMarketingPage() {
  const [salonCount, setSalonCount] = useState<number>(30);
  const avgProPlan = SITE_CONFIG.pricing.pro.monthly; // ₹1,499
  const commissionRate = SITE_CONFIG.partner.standardCommissionPct / 100; // 0.30

  const monthlyEarnings = Math.round(salonCount * avgProPlan * commissionRate);
  const annualEarnings = monthlyEarnings * 12;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* 1. Partner Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 flex items-center justify-center font-black text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              SV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  {SITE_CONFIG.name}
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  Partner Network
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                City Reseller &amp; Distribution Portal
              </p>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              &larr; Back to {SITE_CONFIG.name} Platform
            </Link>
            <Link href="/partner/login">
              <Button size="sm" variant="outline" className="border-slate-700 text-xs text-slate-200 hover:bg-slate-900">
                Partner Sign In
              </Button>
            </Link>
            <Link href="/partner/join?source=partners_landing">
              <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 gap-1.5">
                Apply to Join
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-600/15 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-teal-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 text-xs font-medium mb-6 backdrop-blur-sm shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-semibold">{SITE_CONFIG.partner.standardCommissionPct}% Lifetime Recurring Commission</span>
            <span className="text-slate-500">·</span>
            <span>Zero Upfront Investment Required</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Build a High-Yield{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              Recurring Monthly Income
            </span>{" "}
            in the Salon Industry
          </h1>

          <p className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Distribute {SITE_CONFIG.name} to salons, barbershops, and luxury grooming studios in your city.
            Earn up to <strong>35% recurring commissions</strong> every single month on every active chair.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link href="/partner/join?source=partners_landing" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-600/30 gap-2 h-12 px-8">
                Claim Your City Territory
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/partner/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full border-slate-700 hover:bg-slate-900 text-slate-200 font-semibold gap-2 h-12 px-6">
                <span>Existing Partner Portal &rarr;</span>
              </Button>
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8 border-t border-slate-800/60 text-left">
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-black text-emerald-400">30%</p>
              <p className="text-xs text-slate-400 mt-0.5">Recurring Share</p>
            </div>
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-black text-white">Monthly</p>
              <p className="text-xs text-slate-400 mt-0.5">Direct UPI Settlements</p>
            </div>
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-black text-cyan-400">100% Free</p>
              <p className="text-xs text-slate-400 mt-0.5">Physical Counter Kits</p>
            </div>
            <div className="p-3">
              <p className="text-2xl sm:text-3xl font-black text-amber-400">3 Mins</p>
              <p className="text-xs text-slate-400 mt-0.5">Salon Onboarding Speed</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Commission Calculator */}
      <section className="py-16 bg-slate-900/50 border-y border-slate-800 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-3">
            Income Potential Simulator
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How Much Can You Earn as a City Partner?
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Drag the slider to see your monthly and annual recurring cash flow based on the average Pro Plan (₹1,499/mo).
          </p>

          <div className="mt-10 p-6 sm:p-8 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl max-w-2xl mx-auto text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Salons Onboarded in Your City
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {salonCount} Salons
              </span>
            </div>

            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={salonCount}
              onChange={(e) => setSalonCount(Number(e.target.value))}
              className="w-full mt-4 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
              <span>5 Salons</span>
              <span>50 Salons</span>
              <span>100 Salons</span>
              <span>150 Salons</span>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400 font-medium">Monthly Passive Cash</p>
                <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono">
                  ₹{monthlyEarnings.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Deposited every 1st of month</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-xs text-slate-400 font-medium">Annualized Earnings</p>
                <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
                  ₹{annualEarnings.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-emerald-400 mt-1">100% Recurring Lifetime Split</p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link href="/partner/join?source=partners_landing">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 text-xs">
                  Start Earning in Your Pincode &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why Partner With SalonView (4 Pillars) */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-3">
            Partner Benefits
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
            We Handle the Tech. You Capture the Market.
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Everything you need to successfully pitch and close salons in under 3 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">Zero Technical Hassle</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              We host the high-speed Bun servers, maintain 99.98% uptime, and manage cloud updates. You never have to write code or provide server support.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">Free Physical Launch Kits</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              We ship you premium acrylic counter stands, waterproof door QR decals, and field sales pitch decks to place inside every onboarded salon.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Wallet className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">Automated UPI Payouts</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Track your onboarded salons and accrued commissions live on your partner wallet. Withdraw funds directly to any Indian UPI VPA or bank account.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-white">Protected Territory</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              High-performing partners receive exclusive city rights and verified inbound salon leads for their assigned territory and pincodes.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Who is this program for? */}
      <section className="py-16 bg-slate-900/30 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Who Should Apply to the Partner Network?
          </h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="font-bold text-sm text-white flex items-center gap-2">
                💈 Salon Suppliers
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Distributors selling shears, cosmetics, and chairs who already visit salons weekly.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="font-bold text-sm text-white flex items-center gap-2">
                📈 Digital Agencies
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Local marketing agencies and freelancers managing Instagram/ads for salons.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="font-bold text-sm text-white flex items-center gap-2">
                💳 POS &amp; Hardware Reps
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Agents selling billing machines, Android tablets, and lounge display screens.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="font-bold text-sm text-white flex items-center gap-2">
                🚀 Field Sales Hustlers
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Independent professionals looking for a high-converting SaaS product to pitch locally.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Direct Registration Callout Box */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Launch in Your City?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-lg mx-auto">
            Apply today and claim your unique partner referral code. Start onboarding salons and earning recurring payouts within 24 hours.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/partner/join?source=partners_landing" className="w-full sm:w-auto">
              <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 px-8 shadow-lg shadow-emerald-600/25">
                Register as a Certified Partner &rarr;
              </Button>
            </Link>
            <Link href="/partner/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full border-slate-700 hover:bg-slate-900 text-slate-300 h-12 px-6">
                Sign In to Existing Partner Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} {SITE_CONFIG.legalName}. All rights reserved.</p>
        <p className="mt-1">
          Inquiries: <a href={`mailto:${SITE_CONFIG.support.partnerEmail}`} className="text-emerald-400 hover:underline">{SITE_CONFIG.support.partnerEmail}</a>
        </p>
      </footer>
    </div>
  );
}
