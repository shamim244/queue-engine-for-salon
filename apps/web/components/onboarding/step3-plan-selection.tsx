"use client";

import React from "react";
import {
  Loader2,
  Check,
  CheckCircle2,
  Tag,
  Lock,
  Edit3,
  ClipboardPaste,
  CheckCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionPlan } from "@/lib/api";
import {
  type OnboardingWizardMode,
  type BillingCycle,
  CYCLE_OPTIONS,
  featureLabelMap,
  getCyclePrice,
  type QuoteData,
} from "./types";

export interface Step3Props {
  mode: OnboardingWizardMode;
  availablePlans: SubscriptionPlan[];
  isLoadingPlans: boolean;
  selectedPlanId: string;
  setSelectedPlanId: (id: string) => void;
  selectedCycle: BillingCycle;
  setSelectedCycle: (cycle: BillingCycle) => void;
  currentPlan: SubscriptionPlan;
  partnerCode: string;
  setPartnerCode: (code: string) => void;
  lockPartnerCode: boolean;
  isEditingCode: boolean;
  setIsEditingCode: (editing: boolean) => void;
  isVerifyingCode: boolean;
  quoteData: QuoteData | null;
  hasValidDiscount: boolean;
  grossPrice: number;
  calculatedDiscount: number;
  netPayable: number;
  handlePasteCode: () => void;
  adminOverridesAllowed: boolean;
  adminFreeTrial: boolean;
  setAdminFreeTrial: (val: boolean) => void;
}

export function Step3PlanSelection({
  mode,
  availablePlans,
  isLoadingPlans,
  selectedPlanId,
  setSelectedPlanId,
  selectedCycle,
  setSelectedCycle,
  currentPlan,
  partnerCode,
  setPartnerCode,
  lockPartnerCode,
  isEditingCode,
  setIsEditingCode,
  isVerifyingCode,
  quoteData,
  hasValidDiscount,
  grossPrice,
  calculatedDiscount,
  netPayable,
  handlePasteCode,
  adminOverridesAllowed,
  adminFreeTrial,
  setAdminFreeTrial,
}: Step3Props) {
  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Select Subscription Plan</h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose an active platform plan. Prefer zero payment? Select our 100% Free plan to test without cost.
          </p>
        </div>
        {/* Billing Cycle Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 self-start sm:self-auto">
          {CYCLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedCycle(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 min-h-[36px] ${
                selectedCycle === opt.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <span>{opt.label}</span>
              {opt.badge && selectedCycle !== opt.id && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                  {opt.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoadingPlans ? (
        <div className="p-8 text-center text-slate-400 space-y-2 border border-slate-800 rounded-2xl bg-slate-950/40">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
          <p className="text-xs font-medium">Loading platform subscription plans...</p>
        </div>
      ) : (
        /* Plan Choice Cards (Modern Accessible Pattern) */
        <div className="space-y-3" role="radiogroup" aria-label="Subscription plans">
          {availablePlans.map((plan) => {
            const isSelected = currentPlan.id === plan.id;
            const cyclePrice = getCyclePrice(plan, selectedCycle);
            const isFree = cyclePrice === 0;

            return (
              <label
                key={plan.id}
                className={`card group block p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-600/10 border-blue-500 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500/40"
                    : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="subscription_plan_choice"
                  value={plan.id}
                  checked={isSelected}
                  onChange={() => setSelectedPlanId(plan.id)}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-base">{plan.name}</span>
                      {isFree ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] px-2 py-0">
                          100% Free
                        </Badge>
                      ) : plan.badge ? (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-2 py-0">
                          {plan.badge}
                        </Badge>
                      ) : null}
                      {plan.isFeatured && (
                        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-2 py-0">
                          Featured
                        </Badge>
                      )}
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-500/40">
                          <CheckCircle2 className="w-3 h-3 text-blue-400" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {plan.description || "Digital queue engine and token tracking for high-converting salons."}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {isFree ? (
                      <>
                        <div className="text-xl font-black text-emerald-400">₹0</div>
                        <div className="text-[10px] text-emerald-400/80 font-medium">100% Free Plan</div>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-black text-white">₹{cyclePrice}</div>
                        <div className="text-[10px] text-slate-400">
                          for {selectedCycle === "1m" ? "1 mo" : selectedCycle === "3m" ? "3 mo" : selectedCycle === "6m" ? "6 mo" : "1 yr"}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Feature Bullet Points */}
                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300">
                    {plan.features.slice(0, 6).map((feat, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{featureLabelMap[feat] || feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </label>
            );
          })}
        </div>
      )}

      {/* Partner Referral Code Section */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Tag className="w-4 h-4 text-emerald-400" />
            <span>Partner or Salon Referral Code (Win-Win Discount)</span>
          </div>
          {mode === "PARTNER" && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
              <Lock className="w-3 h-3 mr-1" /> Assigned Partner
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              id="partner-referral-input"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
              disabled={lockPartnerCode && Boolean(partnerCode.trim()) && !isEditingCode}
              placeholder="e.g., AMIT20 or REF_GETSALON"
              className={`bg-slate-900 border-slate-800 text-white font-mono uppercase tracking-wider min-h-[46px] pr-8 text-sm ${
                lockPartnerCode && Boolean(partnerCode.trim()) && !isEditingCode
                  ? "opacity-95 cursor-not-allowed text-emerald-400 font-bold bg-emerald-950/20 border-emerald-500/40"
                  : ""
              }`}
            />
            {isVerifyingCode && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {lockPartnerCode && Boolean(partnerCode.trim()) && !isEditingCode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditingCode(true)}
              className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs px-3 min-h-[46px] shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-400" /> Change
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePasteCode}
                className="border-emerald-600/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 hover:text-white text-xs px-3 min-h-[46px] font-semibold"
              >
                <ClipboardPaste className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Paste Code
              </Button>
              {isEditingCode && Boolean(partnerCode.trim()) && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsEditingCode(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 min-h-[46px] font-semibold"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Lock
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Live Discount Status Quote */}
        {partnerCode.trim() && (
          <div>
            {hasValidDiscount ? (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 text-emerald-300 text-xs flex flex-col gap-2 shadow-lg">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCheck className="w-4 h-4 text-emerald-400" />
                    {quoteData?.discountPercent || 10}% Win-Win Referral Discount Applied!
                  </span>
                  <span className="text-[11px] text-slate-300 font-medium">
                    Referred by: <strong className="text-white">{quoteData?.partnerName || "Assigned Partner"}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-300 pt-1.5 border-t border-emerald-500/20">
                  <span>
                    Plan ₹{grossPrice} &minus; {quoteData?.discountPercent || 10}% instant promo (Save ₹{calculatedDiscount})
                  </span>
                  <span className="text-white font-extrabold text-sm bg-emerald-500/20 px-2.5 py-0.5 rounded border border-emerald-500/30">
                    Net: ₹{netPayable}
                  </span>
                </div>
              </div>
            ) : quoteData && !isVerifyingCode ? (
              <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
                <span>❌ {quoteData.message || "Invalid partner code"}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPartnerCode("");
                    setIsEditingCode(true);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white underline ml-2"
                >
                  Clear Code
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Admin Overrides */}
        {adminOverridesAllowed && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-purple-300 font-semibold">Admin Provisioning Override:</span>
            <button
              type="button"
              onClick={() => setAdminFreeTrial(!adminFreeTrial)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all min-h-[36px] ${
                adminFreeTrial
                  ? "bg-purple-600 text-white border-purple-500"
                  : "bg-slate-900 text-slate-400 border-slate-800"
              }`}
            >
              {adminFreeTrial ? "100% Free VIP Trial Enabled" : "Grant Free VIP Trial"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
