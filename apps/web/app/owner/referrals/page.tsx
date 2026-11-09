"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Gift,
  Users,
  Share2,
  Sparkles,
  Trophy,
  CheckCircle2,
  Save,
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import type { WalletTransaction, ReferralStatsResult } from "@/lib/api";

function OwnerReferralsContent() {
  const { salon, organization } = useAuth();
  const orgId = organization?.id || salon?.organizationId || "org-aura-01";
  const orgSlug = organization?.slug || salon?.slug || "aura-salon";

  const [activeTab, setActiveTab] = useState<"B2B_OWNER" | "B2C_LOYALTY">("B2B_OWNER");

  // Live Wallet & Referral States
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [referralStats, setReferralStats] = useState<ReferralStatsResult | null>(null);
  const [passbook, setPassbook] = useState<WalletTransaction[]>([]);
  const [referralCode, setReferralCode] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // B2C Loyalty Settings
  const [referrerBonus, setReferrerBonus] = useState(50);
  const [refereeDiscount, setRefereeDiscount] = useState(50);
  const [stampCardGoal, setStampCardGoal] = useState(6);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // B2C Leaderboard fallback
  const [consumerAdvocates] = useState([
    { name: "Vikram Sharma", phone: "+91 98765 ***10", referredCount: 8, totalEarned: 400 },
    { name: "Amit Verma", phone: "+91 99887 ***22", referredCount: 5, totalEarned: 250 },
    { name: "Kunal Singh", phone: "+91 98112 ***99", referredCount: 3, totalEarned: 150 },
  ]);

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

  const handleWhatsAppShare = () => {
    const text = `Hey! Manage salon queue, stylist chairs, and UPI payments seamlessly with Queue-Engine. Sign up using my referral link and get ₹500 off your subscription: ${getShareUrl()}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleSaveLoyaltySettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Referrals & Wallet Center
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Earn ₹500 for every salon owner you refer, manage your owner wallet passbook, and configure customer loyalty.
          </p>
        </div>

        <Button
          onClick={loadBackendData}
          variant="outline"
          size="sm"
          className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white min-h-[44px] gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin text-blue-400" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Program Selector Tabs */}
      <div className="flex gap-2 p-1 bg-slate-900/80 border border-slate-800 rounded-xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab("B2B_OWNER")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] ${
            activeTab === "B2B_OWNER"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Salon Owner Referrals (₹500)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("B2C_LOYALTY")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 min-h-[44px] ${
            activeTab === "B2C_LOYALTY"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/40"
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Client Loyalty Program</span>
        </button>
      </div>

      {activeTab === "B2B_OWNER" ? (
        <>
          {/* Top KPI Cards for Salon Owner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Wallet Balance */}
            <Card className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border-purple-500/30 shadow-lg shadow-purple-950/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs uppercase tracking-wider font-bold text-purple-300">
                  Spendable Wallet Balance
                </CardTitle>
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Wallet className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-white tracking-tight">
                  {formatCurrency(walletBalance)}
                </div>
                <p className="text-xs text-purple-300/80 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  Auto-applied to subscription renewals
                </p>
              </CardContent>
            </Card>

            {/* Total Earned */}
            <Card className="bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 border-emerald-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs uppercase tracking-wider font-bold text-emerald-300">
                  Total Referral Commission
                </CardTitle>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Coins className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(referralStats?.totalEarned || 0)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {referralStats?.convertedCount || 0} active subscriptions rewarded
                </p>
              </CardContent>
            </Card>

            {/* Referred Salons Count */}
            <Card className="bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-950 border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs uppercase tracking-wider font-bold text-blue-300">
                  Network Inflow
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Users className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-white tracking-tight">
                  {referralStats?.totalReferred || 0}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {referralStats?.pendingCount || 0} salons pending subscription activation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Viral Share Banner */}
          <div className="bg-gradient-to-r from-purple-900/30 via-slate-900 to-indigo-950/40 border border-purple-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  ₹500 Instant Commission Program
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Refer a Salon Owner & Both of You Benefit
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                  Share your referral link with salon owner friends. When they activate any Queue-Engine plan, you receive
                  ₹500 in your wallet, and they get ₹500 off their first subscription bill.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  onClick={handleWhatsAppShare}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl min-h-[48px] px-5 shadow-lg shadow-emerald-600/20 gap-2 flex-1 sm:flex-none"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
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
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Your Referral Code</span>
                  <span className="text-sm font-mono font-black text-purple-300">{referralCode || "..."}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Direct Invite Link</span>
                  <span className="text-xs font-mono text-slate-300 truncate block">{getShareUrl()}</span>
                </div>
                <a
                  href={getShareUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* 2-Column: Passbook Ledger & Attributions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Double-Entry Passbook Ledger (2 Cols) */}
            <Card className="lg:col-span-2 bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-purple-400" />
                    <span>Double-Entry Wallet Passbook</span>
                  </CardTitle>
                  <CardDescription>
                    Real-time audit ledger of all credits, referral commissions, and checkout deductions.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px]">
                  Immutable
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                {passbook.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-sm font-medium">No passbook transactions recorded yet.</p>
                    <p className="text-xs text-slate-500">
                      Transactions will automatically appear here when referral credits or checkout deductions happen.
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
                            <td className="py-3 px-4 max-w-[200px] truncate">
                              <span className="font-medium text-white">{tx.reason}</span>
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

            {/* Referred Salons List (1 Col) */}
            <Card className="bg-slate-900 border-slate-800 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Recent Referral Inflows</span>
                </CardTitle>
                <CardDescription>
                  Tracking salon owners who joined using your invite link.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {!referralStats?.recentAttributions || referralStats.recentAttributions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-600" />
                    <p>No referrals in progress.</p>
                    <p className="text-[11px] text-slate-500">
                      Share your WhatsApp link above to start onboarding salons!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {referralStats.recentAttributions.map((attr) => (
                      <div key={attr.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">Referred Salon</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(attr.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              attr.status === "CONVERTED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {attr.status === "CONVERTED" ? "+₹500 Earned" : "Pending Plan"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* B2C Client Loyalty Program */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Referral & Stamp Rules Form */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Gift className="h-4 w-4 text-amber-400" />
                <span>Client Referral & Loyalty Settings</span>
              </CardTitle>
              <CardDescription>
                Configure referral wallet bonuses and digital loyalty stamp goals for haircut customers.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSaveLoyaltySettings} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Customer Referrer Reward (₹ Credit to existing client)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={referrerBonus}
                    onChange={(e) => setReferrerBonus(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Credited to client&apos;s consumer wallet once their referred friend completes a salon service.
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Friend Welcome Discount (₹ Off for new customer)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={refereeDiscount}
                    onChange={(e) => setRefereeDiscount(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Automatically deducted from the new customer&apos;s first chair bill at checkout.
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-slate-300 block mb-1">
                    Loyalty Stamp Goal (Visits needed for Free Grooming Gift)
                  </label>
                  <Input
                    type="number"
                    min={3}
                    max={12}
                    value={stampCardGoal}
                    onChange={(e) => setStampCardGoal(Number(e.target.value))}
                    className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    E.g. Visit 6 times to get a complimentary beard trim or head massage.
                  </span>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 min-h-[48px] px-6 rounded-xl"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Loyalty Settings</span>
                  </Button>
                </div>

                {savedSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Referral and loyalty rules updated successfully!</span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Top Customer Advocates Leaderboard */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-white">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>Top Customer Advocates</span>
              </CardTitle>
              <CardDescription>
                Customers bringing the highest number of new walk-in clients to your salon.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="divide-y divide-slate-800">
                {consumerAdvocates.map((ref, idx) => (
                  <div
                    key={idx}
                    className="py-3.5 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 font-mono text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{ref.name}</p>
                        <p className="text-[11px] text-slate-400">{ref.phone}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-emerald-400 text-sm">
                        {ref.referredCount} referrals
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {formatCurrency(ref.totalEarned)} earned
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
