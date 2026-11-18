"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Smartphone } from "lucide-react";

export interface SupportedCountry {
  code: string;
  name: string;
  flag: string;
}

export const DEFAULT_COUNTRIES: SupportedCountry[] = [
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+1", name: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
];

export interface PhoneInputProps {
  value: string;
  onChange: (nationalNumber: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (countryCode: string) => void;
  countries?: SupportedCountry[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  showDigitCounter?: boolean;
  error?: string | null;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      countryCode = "+91",
      onCountryCodeChange,
      countries = DEFAULT_COUNTRIES,
      disabled = false,
      required = false,
      placeholder = "9876543210",
      className,
      id,
      name,
      showDigitCounter = true,
      error,
    },
    ref
  ) => {
    const cleanDigits = (value || "").replace(/\D/g, "").slice(0, 10);
    const isComplete = cleanDigits.length === 10;
    const hasInput = cleanDigits.length > 0;
    const isIndian = countryCode === "+91";
    const invalidIndianStart = isIndian && hasInput && !["6", "7", "8", "9"].includes(cleanDigits[0]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;

      // Detect pasted E.164 numbers (e.g. +91 9876543210 or +19876543210)
      if (raw.startsWith("+")) {
        for (const c of countries) {
          if (raw.startsWith(c.code)) {
            if (onCountryCodeChange) {
              onCountryCodeChange(c.code);
            }
            raw = raw.slice(c.code.length);
            break;
          }
        }
      }

      // Strip non-digits and clamp to exact 10 digits
      let digits = raw.replace(/\D/g, "");
      // Strip leading 0 often added in trunk dialing
      if (digits.length === 11 && digits.startsWith("0")) {
        digits = digits.slice(1);
      }
      const clamped = digits.slice(0, 10);
      onChange(clamped);
    };

    return (
      <div className={cn("space-y-1.5", className)}>
        <div
          className={cn(
            "relative flex rounded-xl border bg-slate-950/80 shadow-sm transition-all",
            error
              ? "border-rose-500/80 ring-1 ring-rose-500/20"
              : isComplete
              ? "border-emerald-500/60 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20"
              : hasInput
              ? "border-amber-500/60 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/20"
              : "border-slate-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
          )}
        >
          {/* Country Code Select */}
          <div className="relative border-r border-slate-800 bg-slate-900/80 rounded-l-xl flex items-center">
            <select
              value={countryCode}
              onChange={(e) => onCountryCodeChange && onCountryCodeChange(e.target.value)}
              disabled={disabled}
              suppressHydrationWarning
              className="appearance-none bg-transparent pl-3 pr-7 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Country Code"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code} className="bg-slate-900 text-white py-1">
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 text-slate-400 text-[10px]">
              ▼
            </div>
          </div>

          {/* 10-Digit Mobile Number Input */}
          <div className="relative flex-1 flex items-center">
            <input
              ref={ref}
              id={id}
              name={name}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              placeholder={placeholder}
              value={cleanDigits}
              onChange={handleInputChange}
              disabled={disabled}
              required={required}
              suppressHydrationWarning
              className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
            />

            {/* Validation Indicator */}
            {isComplete && (
              <div className="pr-3 text-emerald-400 flex items-center gap-1 text-xs font-semibold animate-in fade-in">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>
        </div>

        {/* Real-time Input-Time Feedback & Digit Counter */}
        {showDigitCounter && (
          <div className="flex items-center justify-between px-1 text-[11px]">
            <span className="flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-slate-500" />
              {invalidIndianStart ? (
                <span className="text-amber-400 font-medium">Starts with 6, 7, 8, or 9 in India</span>
              ) : hasInput && !isComplete ? (
                <span className="text-amber-400/90 font-medium">
                  {10 - cleanDigits.length} more digit{10 - cleanDigits.length === 1 ? "" : "s"} required
                </span>
              ) : isComplete ? (
                <span className="text-emerald-400 font-medium">Valid 10-digit number</span>
              ) : (
                <span className="text-slate-400">National mobile number (10 digits)</span>
              )}
            </span>
            <span
              className={cn(
                "font-mono font-semibold transition-colors",
                !hasInput
                  ? "text-slate-500"
                  : isComplete
                  ? "text-emerald-400"
                  : "text-amber-400"
              )}
            >
              {cleanDigits.length}/10 {isComplete ? "✓" : "digits"}
            </span>
          </div>
        )}

        {/* Error message if passed */}
        {error && <p className="text-xs text-rose-400 px-1">{error}</p>}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
