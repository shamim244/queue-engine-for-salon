"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { partnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  UserPlus,
  Coins,
  CreditCard,
  AlertCircle,
} from "lucide-react";

export type SalonFilterType = "ALL" | "ACTIVE_PAID" | "PENDING" | "FREE" | "QUALIFIED";

export default function PartnerSalonsPage() {
  const [salons, setSalons] = useState<any[]>([]);
  const [filter, setFilter] = useState<SalonFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSalons() {
      try {
        const res = await partnerApi.getSalons();
        if (res.success) {
          setSalons(res.salons);
        }
      } catch (err) {
        console.error("Error loading referred salons:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSalons();
  }, []);

  const totalEarnedAcrossSalons = salons.reduce(
    (acc, s) => acc + (Number(s.earnedCommission) || 0),
    0
  );

  const filteredSalons = salons.filter((s) => {
    const matchesFilter =
      filter === "ALL" ||
      (filter === "QUALIFIED" && s.qualificationStatus === "QUALIFIED") ||
      (filter === "ACTIVE_PAID" && s.paymentStatus === "ACTIVE_PAID") ||
      (filter === "PENDING" && s.paymentStatus === "PENDING_APPROVAL") ||
      (filter === "FREE" && (s.paymentStatus === "FREE_TESTING" || s.currentTier === "FREE"));

    const matchesSearch =
      !searchQuery.trim() ||
      s.salonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.salonSlug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.pendingUtr && s.pendingUtr.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs mb-1.5">
            Your Affiliate Network
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Referred Salons ({salons.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track real-time subscription tiers, payment approvals, and commission earnings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
              Total Commission
            </span>
            <span className="text-base font-black text-amber-400">
              ₹{totalEarnedAcrossSalons.toLocaleString("en-IN")}
            </span>
          </div>

          <Link href="/partner/onboard">
            <Button className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 min-h-[44px]">
              <UserPlus className="w-4 h-4" />
              <span>Onboard New Salon</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: "ALL", label: `All (${salons.length})` },
            {
              id: "ACTIVE_PAID",
              label: `Active Paid (${salons.filter((s) => s.paymentStatus === "ACTIVE_PAID").length})`,
            },
            {
              id: "PENDING",
              label: `Pending Review (${salons.filter((s) => s.paymentStatus === "PENDING_APPROVAL").length})`,
            },
            {
              id: "FREE",
              label: `Free Testing (${salons.filter((s) => s.paymentStatus === "FREE_TESTING" || s.currentTier === "FREE").length})`,
            },
            {
              id: "QUALIFIED",
              label: `Qualified (${salons.filter((s) => s.qualificationStatus === "QUALIFIED").length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as SalonFilterType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all min-h-[36px] ${
                filter === tab.id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72 relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search salon or UTR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Salons List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {filteredSalons.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Store className="w-6 h-6" />
            </div>
            <p className="text-sm text-slate-400">No referred salons found in this view.</p>
            <Link href="/partner/onboard">
              <Button variant="outline" className="text-xs border-slate-700 text-amber-400 hover:bg-slate-800">
                Onboard a Salon Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredSalons.map((salon) => {
              const isQualified = salon.qualificationStatus === "QUALIFIED";
              const count = salon.ticketsCompletedCount || 0;
              const progressPct = Math.min(100, Math.round((count / 15) * 100));
              const isFree = salon.currentTier === "FREE" || salon.paymentStatus === "FREE_TESTING";
              const isPending = salon.paymentStatus === "PENDING_APPROVAL";
              const isActivePaid = salon.paymentStatus === "ACTIVE_PAID";
              const commission = Number(salon.earnedCommission) || 0;

              return (
                <div
                  key={salon.attributionId}
                  className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  {/* Left Column: Salon Identity, Plan & Payment Status */}
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-white">{salon.salonName}</span>

                      {/* Plan Tier Badge */}
                      <Badge
                        className={`text-[10px] font-semibold border ${
                          isFree
                            ? "bg-slate-800 text-slate-300 border-slate-700"
                            : "bg-blue-950/60 text-blue-300 border-blue-500/40"
                        }`}
                      >
                        {salon.currentPlanName || (isFree ? "Free Testing Plan" : `${salon.currentTier} Plan`)}
                      </Badge>

                      {/* Payment Verification Status Badge */}
                      {isPending ? (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                          Payment Under Review &bull; ₹{salon.pendingAmount}
                        </Badge>
                      ) : isActivePaid ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Active Paid ({salon.billingCycle?.toUpperCase() || "1M"})
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px]">
                          Free Tier (100% Free)
                        </Badge>
                      )}

                      {/* Qualification Badge */}
                      {isQualified ? (
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Qualified
                        </Badge>
                      ) : null}
                    </div>

                    {/* UTR Reference if pending */}
                    {isPending && salon.pendingUtr && (
                      <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Submitted Bank Ref / UTR: <strong className="font-mono text-white">{salon.pendingUtr}</strong>. Awaiting Super Admin approval.</span>
                      </div>
                    )}

                    <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                      <span>Handle: <span className="font-mono text-blue-400">/s/{salon.salonSlug}</span></span>
                      <span>&bull;</span>
                      <span>Onboarded: {new Date(salon.onboardedAt).toLocaleDateString("en-IN")}</span>
                      {salon.salonPhone && (
                        <>
                          <span>&bull;</span>
                          <span>Phone: {salon.salonPhone}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Earnings, Milestone & Storefront Link */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 shrink-0">
                    {/* Earned Commission Pill */}
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 text-right min-w-[110px]">
                      <span className="text-[10px] text-slate-400 block font-medium flex items-center justify-end gap-1">
                        <Coins className="w-3 h-3 text-amber-400" /> Earned
                      </span>
                      <span className="text-sm font-extrabold text-amber-300 font-mono">
                        ₹{commission.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Milestone Progress Bar */}
                    <div className="w-full sm:w-40 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Milestone (15 Tix)</span>
                        <span className="font-bold text-white">
                          {isQualified ? "Complete" : `${count}/15`}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isQualified ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${isQualified ? 100 : progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* View Live Storefront */}
                    <a
                      href={`/s/${salon.salonSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex-shrink-0"
                      title="View Digital Storefront"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
