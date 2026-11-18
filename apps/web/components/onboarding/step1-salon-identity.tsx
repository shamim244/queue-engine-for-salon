"use client";

import React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { slugify } from "@/lib/onboarding";
import type { SlugStatus } from "./types";

export interface Step1Props {
  salonName: string;
  onSalonNameChange: (val: string) => void;
  slug: string;
  setSlug: (val: string) => void;
  isSlugManual: boolean;
  setIsSlugManual: (manual: boolean) => void;
  salonPhone: string;
  setSalonPhone: (phone: string) => void;
  salonCountryCode: string;
  setSalonCountryCode: (code: string) => void;
  city: string;
  setCity: (city: string) => void;
  category: string;
  setCategory: (cat: string) => void;
  upiPaymentId: string;
  setUpiPaymentId: (upi: string) => void;
  slugStatus: SlugStatus;
  stepErrors: Record<string, string>;
  setStepErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function Step1SalonIdentity({
  salonName,
  onSalonNameChange,
  slug,
  setSlug,
  isSlugManual,
  setIsSlugManual,
  salonPhone,
  setSalonPhone,
  salonCountryCode,
  setSalonCountryCode,
  city,
  setCity,
  category,
  setCategory,
  upiPaymentId,
  setUpiPaymentId,
  slugStatus,
  stepErrors,
  setStepErrors,
}: Step1Props) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Salon Identity & Location</h2>
        <p className="text-xs text-slate-400 mt-1">
          Enter basic shop details to generate your digital queue storefront.
        </p>
      </div>

      {/* Salon Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">
          Salon Name <span className="text-red-400">*</span>
        </label>
        <Input
          value={salonName}
          onChange={(e) => onSalonNameChange(e.target.value)}
          placeholder="e.g., Royal Gents Salon & Spa"
          className="bg-slate-950 border-slate-800 text-white min-h-[48px] text-base"
          maxLength={80}
        />
        {stepErrors.salonName && (
          <p className="text-xs text-red-400">{stepErrors.salonName}</p>
        )}
      </div>

      {/* Auto-generated Handle / Slug */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            Storefront Web Handle <span className="text-red-400">*</span>
          </label>
          <span className="text-[11px] text-slate-400">queue.salon/s/{slug || "..."}</span>
        </div>
        <Input
          value={slug}
          onChange={(e) => {
            setIsSlugManual(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="royal-salon"
          className={`bg-slate-950 border-slate-800 font-mono text-sm min-h-[48px] ${
            slugStatus.available === true
              ? "border-emerald-500/50 text-emerald-400 focus-visible:ring-emerald-500/30"
              : slugStatus.available === false
              ? "border-red-500/50 text-red-400 focus-visible:ring-red-500/30"
              : "text-blue-400"
          }`}
          maxLength={50}
        />

        {/* Real-Time Live Slug Availability Feedback */}
        {slug.trim().length >= 2 && (
          <div className="pt-1">
            {slugStatus.isChecking ? (
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                Checking handle availability...
              </p>
            ) : slugStatus.available === true ? (
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                /s/{slug} is available!
              </p>
            ) : slugStatus.available === false ? (
              <div className="space-y-1.5 p-2.5 rounded-xl bg-red-950/20 border border-red-500/30">
                <p className="text-[11px] text-red-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0" />
                  {slugStatus.reason || `/s/${slug} is already taken.`}
                </p>
                {slugStatus.suggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400">Available alternatives:</span>
                    {slugStatus.suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setIsSlugManual(true);
                          setSlug(sug);
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-300 font-mono text-[11px] border border-slate-700 transition-colors"
                      >
                        /s/{sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
        {stepErrors.slug && <p className="text-xs text-red-400">{stepErrors.slug}</p>}
      </div>

      {/* Contact Phone & City Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Salon Contact Phone <span className="text-red-400">*</span>
          </label>
          <PhoneInput
            value={salonPhone}
            onChange={(cleanDigits) => {
              setSalonPhone(cleanDigits);
              if (stepErrors.salonPhone) {
                setStepErrors((errs) => {
                  const n = { ...errs };
                  delete n.salonPhone;
                  return n;
                });
              }
            }}
            countryCode={salonCountryCode}
            onCountryCodeChange={setSalonCountryCode}
            placeholder="9876543210"
            showDigitCounter={true}
          />
          {stepErrors.salonPhone && (
            <p className="text-xs text-red-400">{stepErrors.salonPhone}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">City / Market Area</label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Bareilly, Civil Lines"
            className="bg-slate-950 border-slate-800 text-white min-h-[48px] text-base"
            maxLength={80}
          />
        </div>
      </div>

      {/* Salon Category / Operating Mode */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Salon Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: "HAIR_SALON", label: "Men's Barber" },
            { id: "UNISEX_SALON", label: "Unisex Salon" },
            { id: "SPA", label: "Beauty & Spa" },
          ].map((cat) => (
            <button
              type="button"
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all min-h-[44px] ${
                category === cat.id
                  ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-md"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional UPI ID for Customer Direct QR */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs font-semibold text-slate-300">
          Shop UPI ID for Customer Payments <span className="text-slate-500 font-normal">(Optional)</span>
        </label>
        <Input
          value={upiPaymentId}
          onChange={(e) => setUpiPaymentId(e.target.value)}
          placeholder="e.g., salonname@okhdfcbank"
          className="bg-slate-950 border-slate-800 text-white min-h-[48px] text-sm"
        />
      </div>
    </div>
  );
}
