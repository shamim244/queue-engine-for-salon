"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ReferralStatsResult } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Share2,
  Users,
  TrendingUp,
  Gift,
  ChevronRight,
  RefreshCw,
  Save,
  CheckCircle2,
  Percent,
  Sliders,
  Building2,
  Calculator,
  Tag,
  ShieldCheck,
  Coins,
} from "lucide-react";

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Admin Configurable Commission & Discount Rules
  const [commissionPercent, setCommissionPercent] = useState(30);
  const [refereeDiscountPercent, setRefereeDiscountPercent] = useState(20);
  const [maxUsesPerReferee, setMaxUsesPerReferee] = useState(1);
  const [rewardCalculationBasis, setRewardCalculationBasis] = useState<"NET_PAID" | "ORIGINAL_PRICE">("NET_PAID");
  const [enabled, setEnabled] = useState(true);

  // Platform-Wide Referral Statistics & Audit Ledger
  const [referralStats, setReferralStats] = useState<ReferralStatsResult | null>(null);

  // Simulator Test Amounts
  const [simOriginal, setSimOriginal] = useState(1000);
  const [simSubDiscount, setSimSubDiscount] = useState(250);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        api.admin.getSettings(),
        api.referrals.getStats({}).catch(() => null),
      ]);
      if (settingsRes?.b2bReferral) {
        setCommissionPercent(settingsRes.b2bReferral.commissionPercent ?? 30);
        setRefereeDiscountPercent(settingsRes.b2bReferral.refereeDiscountPercent ?? 20);
        setMaxUsesPerReferee(settingsRes.b2bReferral.maxUsesPerReferee ?? 1);
        setRewardCalculationBasis(settingsRes.b2bReferral.rewardCalculationBasis ?? "NET_PAID");
        setEnabled(settingsRes.b2bReferral.enabled ?? true);
      }
      if (statsRes?.success) {
        setReferralStats(statsRes);
      }
    } catch (err) {
      console.warn("Failed to load admin referral settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveCommissionRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.admin.updateSettings({
        b2bReferral: {
          commissionPercent,
          refereeDiscountPercent,
          maxUsesPerReferee,
          rewardCalculationBasis,
          enabled,
        },
      });
      if (res?.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update referral commission rules:", err);
    } finally {
      setSaving(false);
    }
  };

  // Dynamic Math Simulator
  const simFriendDiscount = Math.round(((simOriginal - simSubDiscount) * refereeDiscountPercent) / 100);
  const simNetEligible = Math.max(0, simOriginal - simSubDiscount - simFriendDiscount);

  // Dual-Engine comparison
  const simOwnerRewardNetPaid = Math.round((simNetEligible * commissionPercent) / 100);
  const simTotalOutlayNetPaid = simFriendDiscount + simOwnerRewardNetPaid;
  const simOutlayPercentNetPaid = simOriginal > 0 ? ((simTotalOutlayNetPaid / simOriginal) * 100).toFixed(1) : "0";

  const simOwnerRewardOrigPrice = Math.round((simOriginal * commissionPercent) / 100);
  const simTotalOutlayOrigPrice = simFriendDiscount + simOwnerRewardOrigPrice;
  const simOutlayPercentOrigPrice = simOriginal > 0 ? ((simTotalOutlayOrigPrice / simOriginal) * 100).toFixed(1) : "0";

  const activeOwnerReward = rewardCalculationBasis === "ORIGINAL_PRICE" ? simOwnerRewardOrigPrice : simOwnerRewardNetPaid;
  const activeTotalOutlay = rewardCalculationBasis === "ORIGINAL_PRICE" ? simTotalOutlayOrigPrice : simTotalOutlayNetPaid;
  const activeOutlayPercent = rewardCalculationBasis === "ORIGINAL_PRICE" ? simOutlayPercentOrigPrice : simOutlayPercentNetPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-pink-400 font-medium">Growth & Marketing</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">Referrals</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            🤝 B2B Referral & Two-Way Reward Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic salon owner reward percentages (X%), friend welcome discounts (Y%), and transparent net-eligible payout math.
          </p>
        </div>

        <Button
          onClick={loadSettings}
          variant="outline"
          size="sm"
          className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white min-h-[44px] gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-400" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Owner Reward Rate (X%)</div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">{commissionPercent}%</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">Credited to referring salon</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Friend Discount (Y%)</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">{refereeDiscountPercent}%</div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">Off referred salon&apos;s plan</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Converted Subscriptions</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {referralStats?.convertedCount ?? 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">
              of {referralStats?.totalReferred ?? 0} total invitations
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Total Rewards Disbursed</div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">
              {formatCurrency(referralStats?.totalEarned ?? 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">Credited to owner wallets</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="text-xs text-slate-400 font-medium">Total Friend Savings</div>
            <div className="text-2xl sm:text-3xl font-black text-pink-400 mt-1">
              {formatCurrency(referralStats?.totalFriendDiscounts ?? 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">Discounts given at checkout</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Commission Settings Form */}
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Platform Commission & Discount Configuration</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Dynamically adjust the percentage reward granted to referring owners and the welcome discount given to referred friend salons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCommissionRules} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Salon Owner Reward Percentage (X%)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={80}
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white font-mono text-base font-bold min-h-[44px]"
                  />
                  <span className="text-slate-400 font-bold text-base">%</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Rewarded directly into referring owner&apos;s wallet upon successful referred plan activation.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Friend Welcome Discount (Y%)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={refereeDiscountPercent}
                    onChange={(e) => setRefereeDiscountPercent(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white font-mono text-base font-bold min-h-[44px]"
                  />
                  <span className="text-slate-400 font-bold text-base">%</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Welcome incentive applied to the newly invited salon&apos;s first subscription checkout.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Allowed Referral Purchases Per Salon
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={maxUsesPerReferee}
                    onChange={(e) => setMaxUsesPerReferee(Math.max(1, Number(e.target.value)))}
                    className="bg-slate-950 border-slate-800 text-white font-mono text-base font-bold min-h-[44px]"
                  />
                  <span className="text-slate-400 font-bold text-xs uppercase">Time(s)</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Strictly limits referral benefits (discount & commission) to 1 time (first purchase only).
                </p>
              </div>
            </div>

            {/* Dual-Engine Calculation Basis Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Dual-Engine Reward Calculation Engine
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRewardCalculationBasis("NET_PAID")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    rewardCalculationBasis === "NET_PAID"
                      ? "bg-purple-950/40 border-purple-500/70 shadow-lg shadow-purple-900/20"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${rewardCalculationBasis === "NET_PAID" ? "bg-purple-400" : "bg-slate-600"}`} />
                      Net Paid Basis (Margin Safe)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20">
                      ~52% Total Outlay
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Owner reward ({commissionPercent}%) is computed on the net cash collected after deducting friend discount ({refereeDiscountPercent}%) and subscription discounts.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRewardCalculationBasis("ORIGINAL_PRICE")}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    rewardCalculationBasis === "ORIGINAL_PRICE"
                      ? "bg-purple-950/40 border-purple-500/70 shadow-lg shadow-purple-900/20"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${rewardCalculationBasis === "ORIGINAL_PRICE" ? "bg-purple-400" : "bg-slate-600"}`} />
                      Original Price Basis (Viral Growth)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                      ~60% Total Outlay
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Owner reward ({commissionPercent}%) is computed on the full original plan price before friend discounts. Referrers receive higher one-time payouts.
                  </p>
                </button>
              </div>
            </div>

            {/* Dynamic Promotional Tags Preview */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-white block">Dynamic Share Badges Preview (Owner Portal)</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Percent className="w-3 h-3" />
                  Earn {commissionPercent}% Cash Reward
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Gift className="w-3 h-3" />
                  Give {refereeDiscountPercent}% Welcome Discount
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  {rewardCalculationBasis === "ORIGINAL_PRICE" ? "Original Price Rewards" : "Net-Eligible Payouts"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-xs block">Enable Referral Program</span>
                <span className="text-[11px] text-slate-400">
                  Allow salon owners to generate invite links and receive wallet rewards.
                </span>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="submit"
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-2 min-h-[48px] px-6 rounded-xl"
              >
                <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
                <span>{saving ? "Saving Rules..." : "Save Commission Rules"}</span>
              </Button>

              {savedSuccess && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Referral reward and discount rules updated successfully across the engine!</span>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Live Financial Calculation Simulator */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-purple-400" />
            <span>Dual-Engine Financial Calculation Simulator</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Compare platform outlay and owner rewards between Net Paid vs. Original Price calculation modes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Simulated Original Plan Purchase (₹)</label>
              <Input
                type="number"
                value={simOriginal}
                onChange={(e) => setSimOriginal(Number(e.target.value))}
                className="bg-slate-950 border-slate-800 text-white font-mono min-h-[40px]"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Simulated Plan / Cycle Discount (₹)</label>
              <Input
                type="number"
                value={simSubDiscount}
                onChange={(e) => setSimSubDiscount(Number(e.target.value))}
                className="bg-slate-950 border-slate-800 text-white font-mono min-h-[40px]"
              />
            </div>
          </div>

          {/* Active Calculation Summary */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Original</span>
              <span className="font-mono text-sm font-bold text-white">{formatCurrency(simOriginal)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Plan Discount</span>
              <span className="font-mono text-sm font-bold text-rose-400">-{formatCurrency(simSubDiscount)}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Friend Off ({refereeDiscountPercent}%)</span>
              <span className="font-mono text-sm font-bold text-emerald-400">-{formatCurrency(simFriendDiscount)}</span>
            </div>
            <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Collected</span>
              <span className="font-mono text-sm font-bold text-amber-400">{formatCurrency(simNetEligible)}</span>
            </div>
            <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-purple-300 uppercase font-bold block">
                Active Reward ({commissionPercent}%)
              </span>
              <span className="font-mono text-base font-black text-purple-400">+{formatCurrency(activeOwnerReward)}</span>
            </div>
          </div>

          {/* Side-by-Side Dual Engine Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className={`p-3.5 rounded-xl border ${rewardCalculationBasis === "NET_PAID" ? "bg-purple-950/20 border-purple-500/40" : "bg-slate-950/40 border-slate-800/80"}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>Engine A: Net Paid Basis</span>
                  {rewardCalculationBasis === "NET_PAID" && (
                    <Badge variant="outline" className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">Active</Badge>
                  )}
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">{simOutlayPercentNetPaid}% Total Outlay</span>
              </div>
              <div className="mt-2 space-y-1 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Friend Discount:</span>
                  <span className="font-mono text-emerald-400">-{formatCurrency(simFriendDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Owner Reward ({commissionPercent}% of ₹{simNetEligible}):</span>
                  <span className="font-mono text-purple-400">+{formatCurrency(simOwnerRewardNetPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold text-white pt-1 border-t border-slate-800">
                  <span>Total Platform Cost:</span>
                  <span className="font-mono">{formatCurrency(simTotalOutlayNetPaid)}</span>
                </div>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border ${rewardCalculationBasis === "ORIGINAL_PRICE" ? "bg-purple-950/20 border-purple-500/40" : "bg-slate-950/40 border-slate-800/80"}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>Engine B: Original Price Basis</span>
                  {rewardCalculationBasis === "ORIGINAL_PRICE" && (
                    <Badge variant="outline" className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">Active</Badge>
                  )}
                </span>
                <span className="font-mono text-xs font-bold text-purple-400">{simOutlayPercentOrigPrice}% Total Outlay</span>
              </div>
              <div className="mt-2 space-y-1 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Friend Discount:</span>
                  <span className="font-mono text-emerald-400">-{formatCurrency(simFriendDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Owner Reward ({commissionPercent}% of ₹{simOriginal}):</span>
                  <span className="font-mono text-purple-400">+{formatCurrency(simOwnerRewardOrigPrice)}</span>
                </div>
                <div className="flex justify-between font-semibold text-white pt-1 border-t border-slate-800">
                  <span>Total Platform Cost:</span>
                  <span className="font-mono">{formatCurrency(simTotalOutlayOrigPrice)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform-Wide Referral Activity & Audit Ledger */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Platform-Wide Referral Activity & Audit Ledger</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Live platform audit of all salon-to-salon referral invitations, conversions, friend discounts, and credited owner rewards.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px]">
            {referralStats?.totalReferred || 0} Total Records
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {!referralStats?.recentAttributions || referralStats.recentAttributions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-600" />
              <p className="font-medium text-slate-400">No salon referral transactions recorded yet.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                When salons invite other salon owners and subscriptions activate, platform-wide conversions will stream into this audit ledger.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-y border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Referring Salon (Host)</th>
                    <th className="py-3 px-4">Referred Salon (Friend)</th>
                    <th className="py-3 px-4 text-right">Sticker Price</th>
                    <th className="py-3 px-4 text-right">Discounts</th>
                    <th className="py-3 px-4 text-right">Net Base</th>
                    <th className="py-3 px-4 text-center">Engine</th>
                    <th className="py-3 px-4 text-right">Owner Reward</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {referralStats.recentAttributions.map((attr) => {
                    const orig = attr.originalAmount || attr.rewardAmount * 3 || 0;
                    const subDisc = attr.subscriptionDiscount || 0;
                    const friendDisc = attr.friendDiscount || 0;
                    const totalDisc = subDisc + friendDisc;
                    const net = attr.netEligibleAmount || (orig - totalDisc > 0 ? orig - totalDisc : orig);
                    const rate = attr.rewardPercentage || commissionPercent;

                    return (
                      <tr key={attr.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                          {new Date(attr.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">
                            {attr.referrerOrgName || attr.referrerOrgSlug || "Referring Salon"}
                          </span>
                          <span className="text-[10px] text-purple-400 font-mono">
                            Code: {attr.referrerCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white block">
                            {attr.referredOrgName || attr.referredOrgSlug || "Referred Salon"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {attr.referredOrgId ? `Org: ${attr.referredOrgId.slice(-6).toUpperCase()}` : "Pending Org"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-white">
                          {attr.status === "CONVERTED" ? formatCurrency(orig) : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-rose-400">
                          {attr.status === "CONVERTED" && totalDisc > 0 ? `-${formatCurrency(totalDisc)}` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-amber-400">
                          {attr.status === "CONVERTED" ? formatCurrency(net) : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {attr.status === "CONVERTED" ? (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-2 py-0.5 ${
                                attr.calculationBasis === "ORIGINAL_PRICE"
                                  ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                  : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {attr.calculationBasis === "ORIGINAL_PRICE" ? "Original" : "Net Paid"}
                            </Badge>
                          ) : (
                            <span className="text-slate-600 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-400">
                          {attr.status === "CONVERTED" ? (
                            <span>
                              +{formatCurrency(attr.rewardAmount)}
                              <span className="block text-[10px] text-slate-500 font-normal">
                                ({rate}%)
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-500">Awaiting Plan</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold ${
                              attr.status === "CONVERTED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {attr.status === "CONVERTED" ? "Credited" : "Pending Plan"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
