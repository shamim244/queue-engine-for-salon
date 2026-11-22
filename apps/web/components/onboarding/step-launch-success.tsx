"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  QrCode,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Tv,
  ArrowRight,
  LogIn,
  User,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SubscriptionPlan } from "@/lib/api";
import type { LaunchResult, OnboardingWizardMode } from "./types";

export interface StepLaunchSuccessProps {
  launchResult: LaunchResult;
  currentPlan: SubscriptionPlan;
  netPayable: number;
  isFreePlan: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  downloadQrCode: () => void;
  shareOnWhatsApp: () => void;
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => Promise<void>;
  ownerUsername: string;
  mode: OnboardingWizardMode;
  handlePostLaunchProceed: () => void;
}

export function StepLaunchSuccess({
  launchResult,
  currentPlan,
  netPayable,
  isFreePlan,
  canvasRef,
  downloadQrCode,
  shareOnWhatsApp,
  copiedKey,
  copyToClipboard,
  ownerUsername,
  mode,
  handlePostLaunchProceed,
}: StepLaunchSuccessProps) {
  // Ensure internal router links stay on current origin if ownerLoginUrl contains an external domain
  const cleanUser = ownerUsername.trim().toLowerCase();
  const currentOrigin = typeof window !== "undefined" && typeof window.location !== "undefined" && window.location ? window.location.origin : "";
  const internalOwnerLoginUrl =
    launchResult.ownerLoginUrl.startsWith("http") &&
    currentOrigin &&
    !launchResult.ownerLoginUrl.startsWith(currentOrigin)
      ? `/salon/login?tab=owner&identifier=${encodeURIComponent(cleanUser)}&username=${encodeURIComponent(cleanUser)}`
      : launchResult.ownerLoginUrl;

  return (
    <div className="max-w-2xl mx-auto py-4 px-2 sm:px-4 space-y-6 animate-in fade-in zoom-in-95 duration-400">
      {/* Success Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/40 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 mb-2">
          🚀 Onboarding Successful & Live
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {launchResult.salon.name} is Ready!
        </h2>
        <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
          Salon instance <span className="font-mono text-emerald-400">/s/{launchResult.salon.slug}</span> is active with live queue tracking, SMS/WhatsApp alert dispatch, and staff stations.
        </p>
      </div>

      {/* Payment Verification Status or Free Tier Badge */}
      {launchResult.manualPayment?.submitted ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 shadow-xl space-y-2 text-left">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Clock className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Payment Verification Under Process (Ref / UTR: {launchResult.manualPayment.utr})</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your manual subscription payment of <strong>₹{netPayable}</strong> for the <strong>{currentPlan.name}</strong> plan is queued for Super Admin review.
          </p>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs text-slate-300">
            ⚡ <strong>Instant Salon Activation:</strong> Your salon is live right now on the <strong>Free Plan</strong> so you and your team can log in and start using it immediately! Premium features will activate automatically once your reference is verified.
          </div>
        </div>
      ) : launchResult.chosenTier === "FREE" || isFreePlan ? (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 text-xs flex items-center gap-2 text-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Active on <strong>{currentPlan.name}</strong> (₹0). You can test freely and upgrade anytime from Owner Billing!</span>
        </div>
      ) : null}

      {/* Instant Door QR Launch Card */}
      <Card className="bg-slate-900/95 border-slate-800 p-6 rounded-2xl shadow-xl text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-blue-400 text-sm font-semibold">
          <QrCode className="w-4 h-4" /> Official Entrance Door QR Kit
        </div>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Print this high-resolution QR and paste on the front door/mirror. Walk-in clients scan to enter queue instantly without installing any app!
        </p>

        <div className="p-4 bg-white rounded-2xl inline-block shadow-xl border border-slate-200">
          <canvas ref={canvasRef} className="mx-auto" />
          <p className="text-[11px] font-mono text-slate-800 font-bold mt-1 tracking-wider">
            SCAN TO JOIN QUEUE
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            onClick={downloadQrCode}
            variant="outline"
            className="border-slate-700 text-white hover:bg-slate-800 gap-2 min-h-[44px]"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Download Door QR PNG
          </Button>
          <Button
            onClick={shareOnWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 min-h-[44px]"
          >
            <Share2 className="w-4 h-4" />
            Send to Owner WhatsApp
          </Button>
        </div>
      </Card>

      {/* Operational Links */}
      <Card className="bg-slate-900/95 border-slate-800 p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Operational Links & Access Points
        </h3>

        <div className="space-y-3">
          {/* Storefront Link */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-400">Customer Storefront & Live Tracker</div>
              <div className="text-sm font-mono text-blue-400 truncate">{launchResult.storeUrl}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(launchResult.storeUrl, "store")}
                className="h-9 w-9 p-0 text-slate-400 hover:text-white"
              >
                {copiedKey === "store" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Link href={launchResult.storeUrl} target="_blank">
                <Button size="sm" variant="outline" className="border-slate-700 text-xs min-h-[36px]">
                  Open <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* TV Departure Board */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-400">Lounge TV Departure Board</div>
              <div className="text-sm font-mono text-purple-400 truncate">{launchResult.tvUrl}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={launchResult.tvUrl} target="_blank">
                <Button size="sm" variant="outline" className="border-slate-700 text-xs gap-1 min-h-[36px]">
                  <Tv className="w-3 h-3 text-purple-400" /> Open TV
                </Button>
              </Link>
            </div>
          </div>

          {/* Owner Login */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Owner Dashboard Portal</span>
              </div>
              <div className="text-sm font-mono flex items-center gap-2 flex-wrap">
                <span className="text-slate-400 text-xs">Username:</span>
                <Link
                  href={internalOwnerLoginUrl}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400/60 transition-all font-bold group cursor-pointer shadow-sm"
                  title="Click to sign in — username will be autofilled"
                >
                  <User className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-colors" />
                  <span className="text-white font-bold font-mono">{`@${ownerUsername}`}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 group-hover:text-amber-200 bg-amber-500/10 group-hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/20 transition-all">
                    <span>Sign In</span>
                    <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={internalOwnerLoginUrl}>
                <Button size="sm" className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs min-h-[38px] px-4 gap-1.5 shadow-md shadow-amber-600/20">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Owner Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {/* Final Completion Action */}
      <div className="pt-2">
        <Button
          onClick={handlePostLaunchProceed}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 min-h-[48px] rounded-xl shadow-lg"
        >
          {mode === "PARTNER"
            ? "Return to Partner Salons Dashboard →"
            : mode === "ADMIN"
            ? "View in Admin Master Tenants →"
            : "Sign in to Owner Dashboard Now →"}
        </Button>
      </div>
    </div>
  );
}
