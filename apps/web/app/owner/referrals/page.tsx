"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Users,
  Share2,
  Sparkles,
  Wallet,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ExternalLink,
  RefreshCw,
  Building2,
  Coins,
  Percent,
  Calculator,
  Tag,
  CheckCircle2,
  TrendingUp,
  HelpCircle,
  Share,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import type { WalletTransaction, ReferralStatsResult } from "@/lib/api";

function OwnerReferralsContent() {
  const searchParams = useSearchParams();
  const currentSalonParam = searchParams.get("salon") || "";
  const { salon, organization } = useAuth();
  const orgId = organization?.id || salon?.organizationId || "org-aura-01";
  const orgSlug = organization?.slug || salon?.slug || currentSalonParam || "aura-salon";
  const salonSlug = salon?.slug || currentSalonParam || "aura-salon";

  // Live Wallet & Referral States
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [referralStats, setReferralStats] = useState<ReferralStatsResult | null>(null);
  const [passbook, setPassbook] = useState<WalletTransaction[]>([]);
  const [referralCode, setReferralCode] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [sharedSuccess, setSharedSuccess] = useState<boolean>(false);

  const loadBackendData = async () => {
    setLoadingData(true);
    try {
      const [balRes, statsRes, passRes, codeRes] = await Promise.all([
        api.wallets.getBalance("OWNER", orgId).catch(() => null),
        api.referrals.getStats({ referrerOrgId: orgId }).catch(() => null),
        api.wallets.getPassbook("OWNER", orgId, undefined, 30).catch(() => null),
        api.referrals.getCode({ orgId, slug: orgSlug }).catch(() => null),
      ]);

      if (balRes?.success) setWalletBalance(balRes.balance);
      if (statsRes?.success) setReferralStats(statsRes);
      if (passRes?.success) setPassbook(passRes.transactions);
      if (codeRes?.success) setReferralCode(codeRes.code);
      else setReferralCode(`REF_${orgSlug.toUpperCase().slice(0, 8)}`);
    } catch (err) {
      console.warn("Error loading referral / wallet data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadBackendData();
  }, [orgId, orgSlug]);

  // Dynamic benefits from Admin Panel
  const ownerRewardPercent = referralStats?.commissionPercent ?? 30;
  const friendDiscountPercent = referralStats?.friendDiscountPercent ?? 20;
  const rewardCalculationBasis = referralStats?.rewardCalculationBasis ?? "NET_PAID";
  const isOriginalPriceBasis = rewardCalculationBasis === "ORIGINAL_PRICE";

  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/register?ref=${referralCode}`;
    }
    return `https://que-engine.com/register?ref=${referralCode}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join Queue-Engine for Salons",
          text: `Namaste! Use my invite code ${referralCode} to get ${friendDiscountPercent}% OFF your salon software subscription:`,
          url: getShareUrl(),
        });
        setSharedSuccess(true);
        setTimeout(() => setSharedSuccess(false), 2000);
      } catch (err) {
        // Fallback to copy link if user cancels
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Namaste! Digitally manage your salon's live queues, appointments, and UPI receipts with Queue-Engine.

🎁 Register using my invite code *${referralCode}* to get *${friendDiscountPercent}% OFF* your subscription plan!
👉 ${getShareUrl()}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // Mock demonstration calculations based on active admin percentages & calculation basis
  const sampleOriginal = 1000;
  const sampleFriendDiscount = Math.round((sampleOriginal * friendDiscountPercent) / 100);
  const sampleNetEligible = Math.max(0, sampleOriginal - sampleFriendDiscount);
  const sampleOwnerReward = isOriginalPriceBasis
    ? Math.round((sampleOriginal * ownerRewardPercent) / 100)
    : Math.round((sampleNetEligible * ownerRewardPercent) / 100);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Salon Owner Referrals & Wallet</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Two-Way Referral Program: You earn <span className="text-purple-300 font-bold">{ownerRewardPercent}% reward</span> on referred subscriptions, and your friend gets <span className="text-emerald-300 font-bold">{friendDiscountPercent}% discount</span>.
          </p>
        </div>

        <Button
          onClick={loadBackendData}
          variant="outline"
          size="sm"
          className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white min-h-[44px] gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin text-purple-400" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Program Selector Tabs / Route Navigation */}
      <div className="flex gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-xl max-w-md">
        <div className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] bg-purple-600 text-white shadow-md shadow-purple-600/30">
          <Building2 className="w-4 h-4" />
          <span>Owner Referrals ({ownerRewardPercent}%)</span>
        </div>
        <Link
          href={`/owner/loyalty?salon=${salonSlug}`}
          className="flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] text-slate-400 hover:text-white hover:bg-slate-800/40"
        >
          <Gift className="w-4 h-4 text-amber-400" />
          <span>Client Loyalty</span>
        </Link>
      </div>

      {/* 5-Card Referral Dashboard Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Referrals */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Referrals</span>
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {referralStats?.totalReferred || 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Invited salon owners</p>
          </CardContent>
        </Card>

        {/* Successful Referrals */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Converted</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {referralStats?.convertedCount || 0}
            </div>
            <p className="text-[10px] text-emerald-500/80 mt-0.5">Active subscriptions</p>
          </CardContent>
        </Card>

        {/* Pending Rewards */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Pending</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {referralStats?.pendingCount || 0}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Awaiting plan activation</p>
          </CardContent>
        </Card>

        {/* Total Earnings */}
        <Card className="bg-slate-900/80 border-slate-800">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Earned</span>
              <Coins className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">
              {formatCurrency(referralStats?.totalEarned || 0)}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Credited to wallet</p>
          </CardContent>
        </Card>

        {/* Total Discounts Given to Friends */}
        <Card className="bg-slate-900/80 border-slate-800 col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Friend Savings</span>
              <Tag className="w-3.5 h-3.5 text-pink-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-pink-400 mt-1">
              {formatCurrency(referralStats?.totalFriendDiscounts || 0)}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Total discounts given</p>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Two-Way Share Banner with Badges */}
      <div className="bg-gradient-to-r from-purple-950/50 via-slate-900 to-indigo-950/40 border border-purple-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            {/* Promotional Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Percent className="w-3 h-3" />
                Earn {ownerRewardPercent}% Cash Reward
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Gift className="w-3 h-3" />
                Give {friendDiscountPercent}% Welcome Discount
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <Sparkles className="w-3 h-3" />
                {isOriginalPriceBasis ? "Original Price Rewards" : "Net-Eligible Payouts"}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Invite Salon Owners: You Get {ownerRewardPercent}%, They Get {friendDiscountPercent}%
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              When a salon owner joins using your link, they receive an instant <strong className="text-emerald-300">{friendDiscountPercent}% discount</strong> on their first subscription bill. Once completed, your wallet is automatically credited with <strong className="text-purple-300">{ownerRewardPercent}%</strong> {isOriginalPriceBasis ? "of the full plan price" : "of their net purchase amount"}!
            </p>
          </div>

          {/* Social Share Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl min-h-[48px] px-5 shadow-lg shadow-emerald-600/20 gap-2 flex-1 sm:flex-none"
            >
              <Share2 className="w-4 h-4" />
              <span>Share on WhatsApp</span>
            </Button>
            <Button
              onClick={handleNativeShare}
              variant="outline"
              className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl min-h-[48px] px-4 gap-2 flex-1 sm:flex-none"
            >
              <Share className="w-4 h-4 text-purple-400" />
              <span>{sharedSuccess ? "Shared!" : "Share..."}</span>
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl min-h-[48px] px-4 gap-2 flex-1 sm:flex-none"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
            </Button>
          </div>
        </div>

        {/* Referral Code & URL Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Your Unique Referral Code</span>
              <span className="text-sm font-mono font-black text-purple-300">{referralCode || "..."}</span>
            </div>
            <button
              onClick={handleCopyCode}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Copy referral code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="truncate mr-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Direct Invite Registration Link</span>
              <span className="text-xs font-mono text-slate-300 truncate block">{getShareUrl()}</span>
            </div>
            <a
              href={getShareUrl()}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Open invite link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Transparent Calculation Explainer Card */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-purple-400" />
              <span>
                How Your Referral Reward Is Calculated (
                {isOriginalPriceBasis ? "Original Plan Price Basis" : "Net-Eligible Basis"}
                )
              </span>
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-[10px] self-start sm:self-auto ${
                isOriginalPriceBasis
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              {isOriginalPriceBasis ? "Original Price Engine" : "Net Paid Engine"}
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-400">
            {isOriginalPriceBasis ? (
              <span>
                Per platform rules, your owner reward is calculated on the <strong>Full Original Plan Price</strong> before friend discounts, giving you maximum reward value!
              </span>
            ) : (
              <span>
                Per platform rules, owner rewards are calculated on the <strong>Net Eligible Amount</strong> after all friend welcome discounts and plan discounts are deducted.
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">1. Plan Sticker Price</span>
              <span className="text-sm font-mono font-bold text-white">{formatCurrency(sampleOriginal)}</span>
              <span className="text-[10px] text-slate-500 block">Base software tier</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">2. Friend Welcome Off</span>
              <span className="text-sm font-mono font-bold text-emerald-400">-{formatCurrency(sampleFriendDiscount)}</span>
              <span className="text-[10px] text-slate-500 block">{friendDiscountPercent}% referral discount</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">3. Net Friend Pays</span>
              <span className="text-sm font-mono font-bold text-amber-400">{formatCurrency(sampleNetEligible)}</span>
              <span className="text-[10px] text-slate-500 block">Cash collected</span>
            </div>

            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">4. Calculation Pool</span>
              <span className="text-sm font-mono font-bold text-cyan-400">
                {formatCurrency(isOriginalPriceBasis ? sampleOriginal : sampleNetEligible)}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {isOriginalPriceBasis ? "Original sticker price" : "Net eligible cash"}
              </span>
            </div>

            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-3 col-span-2 md:col-span-1">
              <span className="text-purple-300 block text-[10px] uppercase font-bold">5. Your Reward ({ownerRewardPercent}%)</span>
              <span className="text-base font-mono font-black text-purple-400">+{formatCurrency(sampleOwnerReward)}</span>
              <span className="text-[10px] text-emerald-400 font-semibold block">Credited to wallet</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral-Wise Detailed Transaction Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Referral-Wise Audit Breakdown</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Granular breakdown of original purchase, discounts deducted, net eligible base, and owner rewards for each referred salon.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px]">
            Audit Certified
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {!referralStats?.recentAttributions || referralStats.recentAttributions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-600" />
              <p className="font-medium text-slate-400">No referral transactions recorded yet.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Share your WhatsApp link above. When a salon signs up and subscribes, their detailed discount and reward breakdown will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-y border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Referred Salon</th>
                    <th className="py-3 px-4 text-right">Original Purchase</th>
                    <th className="py-3 px-4 text-right">Discounts Deducted</th>
                    <th className="py-3 px-4 text-right">Net Eligible Base</th>
                    <th className="py-3 px-4 text-center">Engine Basis</th>
                    <th className="py-3 px-4 text-right">Your Reward</th>
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
                    const rate = attr.rewardPercentage || ownerRewardPercent;

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
                              {attr.calculationBasis === "ORIGINAL_PRICE" ? "Original Price" : "Net Paid"}
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
                                ({rate}% of {attr.calculationBasis === "ORIGINAL_PRICE" ? "Orig" : "Net"})
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

      {/* Double-Entry Wallet Passbook */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-purple-400" />
              <span>Double-Entry Wallet Passbook</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Live audit ledger of all referral commission credits, subscription deductions, and balance updates.
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Balance</span>
            <span className="text-base font-black text-white">{formatCurrency(walletBalance)}</span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {passbook.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium">No passbook transactions recorded yet.</p>
              <p className="text-xs text-slate-500">
                Transactions will automatically appear here when referral rewards or checkout deductions occur.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-y border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {passbook.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.type === "CREDIT"
                              ? "bg-emerald-950/70 text-emerald-400 border border-emerald-800/50"
                              : "bg-rose-950/70 text-rose-400 border border-rose-800/50"
                          }`}
                        >
                          {tx.type === "CREDIT" ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-[240px] truncate">
                        <span className="font-medium text-white block truncate">{tx.reason}</span>
                        {tx.referenceId && (
                          <span className="block text-[10px] text-slate-500 font-mono">
                            Ref: {tx.referenceId}
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                          tx.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {tx.type === "CREDIT" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OwnerReferralsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Referrals...</div>}>
      <OwnerReferralsContent />
    </Suspense>
  );
}
