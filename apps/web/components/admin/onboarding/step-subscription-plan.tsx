import React from "react";
import { Store, Sparkles, Users, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OnboardingFormData } from "@/lib/onboarding";

interface StepSubscriptionPlanProps {
  formData: OnboardingFormData;
  applyPlan: (plan: "STARTER" | "PRO" | "ENTERPRISE") => void;
  onBack: () => void;
  onNext: () => void;
}

export function StepSubscriptionPlan({
  formData,
  applyPlan,
  onBack,
  onNext,
}: StepSubscriptionPlanProps) {
  return (
    <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
          <Store className="h-4 w-4" />
          <span>Step 2 of 5</span>
        </div>
        <CardTitle className="text-xl text-white">Select SaaS Subscription Plan</CardTitle>
        <CardDescription className="text-slate-400">
          Choose the subscription plan tier that defines the organization's location limits, stylist capacity, and features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Option 1: Starter Plan */}
          <div
            onClick={() => applyPlan("STARTER")}
            className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[320px] ${
              formData.tier === "STARTER"
                ? "bg-blue-950/30 border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10"
                : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="default" className="text-xs px-2 py-0.5">
                  Starter Plan
                </Badge>
                {formData.tier === "STARTER" && (
                  <span className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                <Store className="h-5 w-5 text-amber-400" />
                Starter Plan
              </h3>
              <div className="mb-3">
                <span className="text-2xl font-black text-white">₹499</span>
                <span className="text-xs text-slate-400 ml-1">/ month</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                For boutique barbershops and neighborhood salons starting with automated digital queuing.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Included Capabilities:
                </p>
                <div className="flex flex-col gap-1.5 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> 1 Salon Location
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Up to 3 Stylist Chairs
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> WhatsApp & SMS Notifications
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Dynamic NPCI UPI QR & Cash
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Client-Side Live Service Timers
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Standard Quota</span>
              <span className="font-semibold text-blue-400">Starter Tier</span>
            </div>
          </div>

          {/* Option 2: Pro Plan */}
          <div
            onClick={() => applyPlan("PRO")}
            className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[320px] ${
              formData.tier === "PRO"
                ? "bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10"
                : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="purple" className="text-xs px-2 py-0.5">
                  Pro Plan · Popular
                </Badge>
                {formData.tier === "PRO" && (
                  <span className="h-5 w-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                Pro Plan
              </h3>
              <div className="mb-3">
                <span className="text-2xl font-black text-white">₹1,499</span>
                <span className="text-xs text-slate-400 ml-1">/ month</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                For high-volume multi-station salons, grooming studios, and growing regional multi-branch chains.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Included Capabilities:
                </p>
                <div className="flex flex-col gap-1.5 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Up to 5 Salon Locations
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Up to 10 Stylists per Location
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Lobby Departure Board TV (/tv)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Station 4-Digit Quick PIN Switching
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Split Queue Routing & Upsells
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Expanded Capacity</span>
              <span className="font-semibold text-purple-400">Pro Tier</span>
            </div>
          </div>

          {/* Option 3: Enterprise Plan */}
          <div
            onClick={() => applyPlan("ENTERPRISE")}
            className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[320px] ${
              formData.tier === "ENTERPRISE"
                ? "bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10"
                : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <Badge variant="warning" className="text-xs px-2 py-0.5">
                  Enterprise Plan
                </Badge>
                {formData.tier === "ENTERPRISE" && (
                  <span className="h-5 w-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-400" />
                Enterprise Plan
              </h3>
              <div className="mb-3">
                <span className="text-2xl font-black text-white">₹4,999</span>
                <span className="text-xs text-slate-400 ml-1">/ month</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                For enterprise franchises, luxury salon networks, and statewide operators requiring custom scale.
              </p>

              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Included Capabilities:
                </p>
                <div className="flex flex-col gap-1.5 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Unlimited Locations & Chairs
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Dedicated Telemetry & Cloud HQ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Custom SMS / WhatsApp Gateway
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> Priority 24/7 SLA & Account Mgr
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-emerald-400" /> White-label Custom Domain
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
              <span>Unlimited Scale</span>
              <span className="font-semibold text-amber-400">Enterprise Tier</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
        <Button variant="outline" onClick={onBack} className="gap-2 min-h-[44px]">
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2 bg-blue-600 hover:bg-blue-500 min-h-[44px]">
          Continue to Owner Account
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
