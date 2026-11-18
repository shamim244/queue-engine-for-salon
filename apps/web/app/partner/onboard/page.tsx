"use client";

import React, { useEffect, useState } from "react";
import { getStoredPartner, partnerApi } from "@/lib/partner-api";
import { UniversalSalonOnboardingWizard } from "@/components/onboarding/universal-onboarding-wizard";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PartnerAssistedOnboardPage() {
  const [partnerCode, setPartnerCode] = useState<string>("");

  useEffect(() => {
    const partner = getStoredPartner();
    const code = partner?.referralCode || partner?.referral_code;
    if (code) {
      setPartnerCode(String(code).trim().toUpperCase());
    } else {
      partnerApi
        .getMe()
        .then((res) => {
          if (res?.success && res?.partner) {
            const freshCode = res.partner.referralCode || res.partner.referral_code;
            if (freshCode) {
              setPartnerCode(String(freshCode).trim().toUpperCase());
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-950/20 text-xs px-3 py-0.5">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Field Hustler Fast-Track
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Assisted In-Shop Onboarding
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Help the salon owner onboard in under 2 minutes. Your referral code is automatically assigned for recurring commission and grants them 10% instant billing discount.
        </p>
        <div className="sr-only">
          <span>Salon &amp; Owner Identity</span>
          <span>Starter Menu &amp; Pricing</span>
        </div>
      </div>

      {/* Universal Wizard in PARTNER mode */}
      <UniversalSalonOnboardingWizard
        mode="PARTNER"
        initialPartnerCode={partnerCode}
        lockPartnerCode={Boolean(partnerCode.trim())}
        onSuccessRedirectUrl="/partner/salons"
      />
    </div>
  );
}
