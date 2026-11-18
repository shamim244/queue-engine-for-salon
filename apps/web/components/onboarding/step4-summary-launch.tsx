"use client";

import React from "react";
import {
  CreditCard,
  Smartphone,
  QrCode,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  Tag,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionPlan } from "@/lib/api";
import type { BillingCycle, QuoteData } from "./types";

export interface Step4Props {
  salonName: string;
  slug: string;
  ownerUsername: string;
  ownerWhatsApp: string;
  ownerCountryCode: string;
  salonPhone: string;
  salonCountryCode: string;
  currentPlan: SubscriptionPlan;
  selectedCycle: BillingCycle;
  grossPrice: number;
  calculatedDiscount: number;
  hasValidDiscount: boolean;
  quoteData: QuoteData | null;
  partnerCode: string;
  adminFreeTrial: boolean;
  netPayable: number;
  isFreePlan: boolean;
  paymentMode: "MANUAL_UPI" | "AUTOMATED_UPI";
  setPaymentMode: (mode: "MANUAL_UPI" | "AUTOMATED_UPI") => void;
  manualUtr: string;
  setManualUtr: (utr: string) => void;
  manualQrCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  copiedKey: string | null;
  copyToClipboard: (text: string, key: string) => Promise<void>;
  stepErrors: Record<string, string>;
  setStepErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  availablePlans: SubscriptionPlan[];
  onSelectPlan: (planId: string) => void;
}

export function Step4SummaryLaunch({
  salonName,
  slug,
  ownerUsername,
  ownerWhatsApp,
  ownerCountryCode,
  salonPhone,
  salonCountryCode,
  currentPlan,
  selectedCycle,
  grossPrice,
  calculatedDiscount,
  hasValidDiscount,
  quoteData,
  partnerCode,
  adminFreeTrial,
  netPayable,
  isFreePlan,
  paymentMode,
  setPaymentMode,
  manualUtr,
  setManualUtr,
  manualQrCanvasRef,
  copiedKey,
  copyToClipboard,
  stepErrors,
  setStepErrors,
  availablePlans,
  onSelectPlan,
}: Step4Props) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Review & Instant Launch</h2>
        <p className="text-xs text-slate-400 mt-1">
          Verify salon parameters and initiate atomic database provisioning.
        </p>
      </div>

      {/* Review Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400">Salon Name</span>
            <p className="text-white font-bold text-sm truncate">{salonName}</p>
          </div>
          <div>
            <span className="text-slate-400">Storefront URL</span>
            <p className="text-blue-400 font-mono text-sm truncate">/s/{slug}</p>
          </div>
          <div>
            <span className="text-slate-400">Owner Username</span>
            <p className="text-amber-400 font-mono text-sm truncate">@{ownerUsername}</p>
          </div>
          <div>
            <span className="text-slate-400">Contact / WhatsApp</span>
            <p className="text-slate-200 text-sm truncate font-medium">
              {ownerWhatsApp
                ? `${ownerCountryCode} ${ownerWhatsApp}`
                : `${salonCountryCode} ${salonPhone}`}
            </p>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>
              Plan: {currentPlan.name} (
              {selectedCycle === "1m"
                ? "Monthly"
                : selectedCycle === "3m"
                ? "Quarterly"
                : selectedCycle === "6m"
                ? "6 Months"
                : "1 Year"}
              )
            </span>
            <span>₹{grossPrice}</span>
          </div>

          {hasValidDiscount && (
            <div className="flex items-center justify-between text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                Partner Promo Discount (10%):
              </span>
              <span>-₹{calculatedDiscount}</span>
            </div>
          )}

          {hasValidDiscount && (
            <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-400">🤝 Partner Attribution:</span>
              <span className="text-emerald-400 font-mono font-medium truncate max-w-[200px]">
                {quoteData?.partnerName
                  ? `${quoteData.partnerName} (${partnerCode.trim().toUpperCase()})`
                  : partnerCode.trim().toUpperCase()}
              </span>
            </div>
          )}

          {adminFreeTrial && (
            <div className="flex items-center justify-between text-purple-400 font-semibold">
              <span>Super Admin Free VIP Trial:</span>
              <span>-₹{grossPrice}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-extrabold text-white">
            <span>Net Amount Due Now:</span>
            <span className="text-emerald-400 text-base">₹{netPayable}</span>
          </div>
        </div>

        {/* ================= Payment Gateway Selection (If Paid Plan) ================= */}
        {netPayable > 0 ? (
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Select Payment Method</h3>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                Payable: ₹{netPayable}
              </Badge>
            </div>

            {/* Payment Mode Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMode("MANUAL_UPI")}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 min-h-[48px] ${
                  paymentMode === "MANUAL_UPI"
                    ? "bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/40 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    paymentMode === "MANUAL_UPI"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-white">Direct UPI / Bank UTR</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    Pay via PhonePe / GPay / Paytm & enter 12-digit UTR reference
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode("AUTOMATED_UPI")}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 min-h-[48px] ${
                  paymentMode === "AUTOMATED_UPI"
                    ? "bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/40 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    paymentMode === "AUTOMATED_UPI"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-white">Dynamic UPI QR Code</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                    Instant scan & automatic webhook confirmation
                  </p>
                </div>
              </button>
            </div>

            {/* Manual UPI Transfer Details */}
            {paymentMode === "MANUAL_UPI" && (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] text-slate-400">Official Platform UPI ID:</span>
                      <div className="font-mono text-emerald-400 font-bold text-sm tracking-wide">
                        engineque@okaxis
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard("engineque@okaxis", "upi_vpa")}
                      className="border-slate-700 text-slate-300 text-xs min-h-[36px] w-full sm:w-auto"
                    >
                      {copiedKey === "upi_vpa" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1" />
                      )}
                      {copiedKey === "upi_vpa" ? "Copied UPI ID" : "Copy UPI ID"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <div className="bg-white p-1 rounded-lg shrink-0">
                      <canvas ref={manualQrCanvasRef} className="w-20 h-20" />
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <p className="text-white font-medium">Scan to pay exact net amount:</p>
                      <div className="text-emerald-400 font-extrabold text-sm">₹{netPayable}</div>
                      <p className="text-[10px] text-slate-500">Supports GPay, PhonePe, Paytm, BHIM</p>
                    </div>
                  </div>
                </div>

                {/* UTR Input Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>
                      12-Digit Bank Reference / UTR Number <span className="text-red-400">*</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Found in payment receipt</span>
                  </label>
                  <Input
                    value={manualUtr}
                    onChange={(e) => {
                      setManualUtr(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 22));
                      if (stepErrors.manualUtr) {
                        setStepErrors((prev) => {
                          const n = { ...prev };
                          delete n.manualUtr;
                          return n;
                        });
                      }
                    }}
                    placeholder="e.g. 412389472910"
                    className="bg-slate-900 border-slate-800 text-white font-mono tracking-wider text-sm min-h-[46px]"
                    maxLength={22}
                  />
                  {stepErrors.manualUtr && (
                    <p className="text-xs text-red-400">{stepErrors.manualUtr}</p>
                  )}
                </div>

                {/* Non-blocking activation notice */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Waiting Time:</strong> Your salon launches immediately on the <strong>Free Plan</strong> so you can log in right now. Once Super Admin verifies this reference, your <strong>{currentPlan.name}</strong> subscription activates automatically!
                  </span>
                </div>
              </div>
            )}

            {/* Automated UPI Option */}
            {paymentMode === "AUTOMATED_UPI" && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                <p>
                  Dynamic automated gateway invoice will open upon clicking Launch. Once completed, your subscription activates in real time.
                </p>
              </div>
            )}

            {/* Fallback link to Free Plan */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  const free = availablePlans.find((p) => Number(p.price1m) === 0);
                  if (free) {
                    onSelectPlan(free.id);
                  }
                }}
                className="text-xs text-blue-400 hover:text-blue-300 underline font-medium"
              >
                Prefer to test first without paying? Switch to Free Plan (Pay ₹0 Today) &rarr;
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white text-sm">{currentPlan.name} (₹0 Due Today)</div>
              <p className="text-slate-300 mt-0.5">
                Zero upfront payment required. You get live digital queue tracking, station desk, and printable customer door QR. You can upgrade to a paid tier anytime from Owner Billing!
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2">
        <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
        <span>
          Starter presets (Master Barber station + 4 essential services) will be auto-generated so the salon is 100% operational immediately!
        </span>
      </div>
    </div>
  );
}
