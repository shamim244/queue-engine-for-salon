"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { partnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Lock,
  Store,
  TrendingUp,
  Copy,
  Check,
  Share2,
  QrCode,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Zap,
  UserPlus,
  FileText,
  Clock,
  Compass,
} from "lucide-react";

export default function PartnerDashboard() {
  const [partner, setPartner] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentSalons, setRecentSalons] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await partnerApi.getMe();
        if (res.success) {
          setPartner(res.partner);
          setWallet(res.wallet);
          setStats(res.stats);
        }
        const salonsRes = await partnerApi.getSalons();
        if (salonsRes.success) {
          setRecentSalons(salonsRes.salons.slice(0, 5));
        }
      } catch (err) {
        console.error("Error loading partner dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Client-Side Dynamic QR Code Generation (GEMINI.md Rule 1: Zero Server Waste)
  useEffect(() => {
    if (partner?.referralCode && qrCanvasRef.current) {
      const shareUrl = `${window.location.origin}/register?ref=${partner.referralCode}`;
      QRCode.toCanvas(
        qrCanvasRef.current,
        shareUrl,
        {
          width: 140,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, [partner?.referralCode]);

  const copyToClipboard = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const referralUrl = typeof window !== "undefined" && partner?.referralCode
    ? `${window.location.origin}/register?ref=${partner.referralCode}`
    : `https://queue.salon/register?ref=${partner?.referralCode || ""}`;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Namaste, {partner?.fullName || "Partner"}!
            </h1>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs">
              {partner?.persona || "FIELD_PARTNER"}
            </Badge>
            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Active Partner
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Operating in <span className="text-slate-200 font-semibold">{partner?.city || "India"}</span> • Model:{" "}
            <span className="text-amber-300 font-bold">
              {partner?.commissionPercent || 10}% Net-Revenue Share
            </span>
            {partner?.bountyAmount > 0 && ` + ₹${partner.bountyAmount} Activation Bounty`}
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <Link href="/partner/onboard">
            <Button className="h-11 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-600/20 flex items-center gap-1.5 min-h-[44px]">
              <Zap className="w-4 h-4" />
              <span>Assisted Onboard</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Available Balance */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold text-emerald-400">Available Balance</span>
              <Wallet className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              ₹{wallet?.availableBalance ?? 0}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Ready for UPI</span>
            <Link href="/partner/wallet" className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-0.5">
              Withdraw <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Pending Locked Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Pending Lock</span>
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              ₹{wallet?.pendingLockedBalance ?? 0}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            Unlocks at 15 tickets or paid plan
          </div>
        </div>

        {/* Salons Onboarded */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Referred Salons</span>
              <Store className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats?.totalSalons ?? 0}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{stats?.qualifiedSalons ?? 0} Qualified</span>
            <span className="text-amber-400">{stats?.pendingSalons ?? 0} in progress</span>
          </div>
        </div>

        {/* Lifetime Earnings */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Lifetime Earnings</span>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">
              ₹{wallet?.lifetimeEarnings ?? 0}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            ₹{wallet?.totalWithdrawn ?? 0} settled via UPI
          </div>
        </div>
      </div>

      {/* Referral Link & Client QR Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8">
          {/* Client-Rendered QR Code Canvas */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-700 shadow-md flex-shrink-0">
            <canvas ref={qrCanvasRef} width={140} height={140} className="rounded-lg" />
            <span className="text-[10px] font-bold text-slate-800 mt-1 uppercase tracking-wider">
              Scan to Register
            </span>
          </div>

          {/* Details & Share Actions */}
          <div className="flex-1 space-y-4 text-center lg:text-left">
            <div>
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs mb-2">
                Your Exclusive Referral Attribution
              </Badge>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Share Link or Enter Code Onboarding
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Any salon registering with your code will be locked to your account. You earn recurring commission on all net subscription renewals.
              </p>
            </div>

            {/* Code & Link Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-amber-400 font-bold">
                <span>{partner?.referralCode || "..."}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(partner?.referralCode || "", false)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="w-full sm:flex-1 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 overflow-hidden">
                <span className="truncate">{referralUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(referralUrl, true)}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  title="Copy Link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* 1-Tap WhatsApp Share */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Namaste! Modernize your salon with live queue management, online appointments, and digital receipts on Engine Que. Register here: ${referralUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto"
              >
                <Button className="w-full sm:w-auto h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 min-h-[44px]">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Action Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/partner/onboard" className="block">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors">
              Assisted Onboarding Wizard
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Stand inside the salon, enter owner details, and instantly provision their shop on the spot in 2 minutes.
            </p>
          </div>
        </Link>

        <Link href="/partner/marketing" className="block">
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <h3 className="font-bold text-base text-white group-hover:text-blue-300 transition-colors">
              Pitch Kit & Counter Standees
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Download the 60-second salon pitch script, objection cheat-sheet, and printable table QR standee templates.
            </p>
          </div>
        </Link>
      </div>

      {/* Recently Onboarded Salons */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-white">Your Referred Salons</h3>
            <p className="text-xs text-slate-400">Track anti-fraud milestone progress (15 tickets) and paid status.</p>
          </div>
          <Link href="/partner/salons" className="text-xs font-bold text-amber-400 hover:underline">
            View All Salons
          </Link>
        </div>

        {recentSalons.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No salons onboarded yet. Tap &apos;Assisted Onboard&apos; to register your first neighborhood salon!
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {recentSalons.map((salon) => {
              const isQualified = salon.qualificationStatus === "QUALIFIED";
              const count = salon.ticketsCompletedCount || 0;
              const progressPct = Math.min(100, Math.round((count / 15) * 100));

              return (
                <div key={salon.attributionId} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-200">{salon.salonName}</span>
                      {salon.paymentStatus === "PENDING_APPROVAL" ? (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] flex items-center gap-1 font-bold">
                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                          Payment Under Review
                        </Badge>
                      ) : salon.paymentStatus === "ACTIVE_PAID" ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] flex items-center gap-1 font-bold">
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                          {salon.currentPlanName || "Paid Plan"}
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-800 text-slate-400 text-[10px]">
                          Free Plan
                        </Badge>
                      )}
                      {isQualified ? (
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                          Qualified 🌟
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]">
                          {count}/15 Tickets
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-blue-400">/s/{salon.salonSlug}</span>
                      <span>&bull;</span>
                      <span>Added: {new Date(salon.onboardedAt).toLocaleDateString("en-IN")}</span>
                      {Number(salon.earnedCommission) > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="text-amber-300 font-bold">₹{salon.earnedCommission} Earned</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full sm:w-48 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Milestone Progress</span>
                      <span>{isQualified ? "100%" : `${count}/15`}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isQualified ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${isQualified ? 100 : progressPct}%` }}
                      />
                    </div>
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
