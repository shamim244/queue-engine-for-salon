import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Store, ChevronRight, CheckCircle2, Ticket } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { slugify, type OnboardingFormData } from "@/lib/onboarding";
import { partnerApi } from "@/lib/partner-api";

interface StepSalonIdentityProps {
  formData: OnboardingFormData;
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>;
  stepErrors: Record<string, string>;
  setStepErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleNameChange: (name: string) => void;
  setIsSlugManual: (manual: boolean) => void;
  onNext: () => void;
}

export function StepSalonIdentity({
  formData,
  setFormData,
  stepErrors,
  setStepErrors,
  handleNameChange,
  setIsSlugManual,
  onNext,
}: StepSalonIdentityProps) {
  const [verifiedPartner, setVerifiedPartner] = useState<{ name: string; city: string } | null>(null);
  const [partnerChecking, setPartnerChecking] = useState(false);

  const checkPartnerCode = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setVerifiedPartner(null);
      return;
    }
    setPartnerChecking(true);
    try {
      const res = await partnerApi.verifyCode(clean);
      if (res.success && res.valid && res.partner) {
        setVerifiedPartner({ name: res.partner.fullName, city: res.partner.city });
      } else {
        setVerifiedPartner(null);
      }
    } catch {
      setVerifiedPartner(null);
    } finally {
      setPartnerChecking(false);
    }
  }, []);

  useEffect(() => {
    if (formData.partnerCode) {
      checkPartnerCode(formData.partnerCode);
    }
  }, [formData.partnerCode, checkPartnerCode]);
  return (
    <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
          <Store className="h-4 w-4" />
          <span>Step 1 of 5</span>
        </div>
        <CardTitle className="text-xl text-white">Salon Identity & Location</CardTitle>
        <CardDescription className="text-slate-400">
          Enter primary business identity, brand handle URL slug, and regional contact details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Salon Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
              <span>
                Salon Name <span className="text-red-400">*</span>
              </span>
              <span className="text-xs text-slate-500">e.g. Ramesh Traditional Barber</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Royal Crown Barbers"
              className={`bg-slate-950 border-slate-800 text-white min-h-[44px] ${
                stepErrors.name ? "border-red-500" : ""
              }`}
            />
            {stepErrors.name && <p className="text-xs text-red-400">{stepErrors.name}</p>}
          </div>

          {/* URL Slug */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
              <span>
                Tenant Slug <span className="text-red-400">*</span>
              </span>
              <span className="text-xs text-slate-500">Auto-generated alphanumeric handle</span>
            </label>
            <div className="relative">
              <Input
                value={formData.slug}
                onChange={(e) => {
                  setIsSlugManual(true);
                  setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                }}
                placeholder="royal-crown-barbers"
                className="bg-slate-950 border-slate-800 text-white font-mono text-sm pl-28 min-h-[44px]"
              />
              <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-500 select-none">
                /s/
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Customer URL:{" "}
              <span className="text-slate-300 font-mono">/s/{formData.slug || "slug"}</span>
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
              <span>
                Contact Phone <span className="text-red-400">*</span>
              </span>
              <span className="text-xs text-slate-500">For SMS & WhatsApp alerts</span>
            </label>
            <PhoneInput
              value={formData.phone?.replace(/^\+\d+\s*/, "") || ""}
              onChange={(cleanDigits) => {
                const country = formData.countryCode || "+91";
                setFormData((prev) => ({ ...prev, phone: `${country}${cleanDigits}` }));
                if (stepErrors.phone) {
                  setStepErrors((errs) => {
                    const n = { ...errs };
                    delete n.phone;
                    return n;
                  });
                }
              }}
              countryCode={formData.countryCode || "+91"}
              onCountryCodeChange={(code) => {
                const cleanDigits = (formData.phone || "").replace(/\D/g, "").slice(-10);
                setFormData((prev) => ({
                  ...prev,
                  countryCode: code,
                  phone: cleanDigits ? `${code}${cleanDigits}` : "",
                }));
              }}
              placeholder="9876543210"
              showDigitCounter={true}
            />
            {stepErrors.phone && <p className="text-xs text-red-400">{stepErrors.phone}</p>}
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">Currency</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
              className="w-full h-11 px-3 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="AED">AED (د.إ) - UAE Dirham</option>
            </select>
          </div>

          {/* Address */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-200">Address / Location</label>
            <Input
              value={formData.address || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Shop No. 4, Market Complex, Main Road..."
              className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
            />
          </div>

          {/* UPI ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">UPI Payment ID (Optional)</label>
            <Input
              value={formData.upiPaymentId || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, upiPaymentId: e.target.value }))}
              placeholder="salon@upi or 9876543210@paytm"
              className="bg-slate-950 border-slate-800 text-white font-mono text-sm min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500">
              Enables instant dynamic UPI QR payment code on completion.
            </p>
          </div>

          {/* Parent Organization */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Parent Enterprise Org (Optional)
            </label>
            <Input
              value={formData.organizationName || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, organizationName: e.target.value }))}
              placeholder="e.g. Royal Salon Group"
              className="bg-slate-950 border-slate-800 text-white min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500">
              Assigns this branch to a parent franchise or multi-branch organization.
            </p>
          </div>

          {/* Partner / Referral Code */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-200 flex items-center justify-between">
              <span>Partner / Referral Code (Optional)</span>
              {verifiedPartner ? (
                <span className="text-xs font-semibold text-emerald-400">
                  ✅ Verified: {verifiedPartner.name} ({verifiedPartner.city})
                </span>
              ) : formData.partnerCode ? (
                <span className="text-xs font-semibold text-emerald-400">
                  🎟️ Partner Attribution Active
                </span>
              ) : null}
            </label>
            <Input
              value={formData.partnerCode || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, partnerCode: e.target.value.toUpperCase() }))
              }
              onBlur={() => {
                if (formData.partnerCode) checkPartnerCode(formData.partnerCode);
              }}
              placeholder="e.g. AMITVERMA"
              className="bg-slate-950 border-slate-800 text-white font-mono text-sm uppercase tracking-wider min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500">
              Enter affiliate or field partner promo code to link recurring SaaS rewards.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t border-slate-800 pt-6">
        <Link href="/admin/tenants">
          <Button variant="ghost" className="text-slate-400 min-h-[44px]">
            Cancel
          </Button>
        </Link>
        <Button onClick={onNext} className="gap-2 bg-blue-600 hover:bg-blue-500 min-h-[44px]">
          Continue to Subscription Plan
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
