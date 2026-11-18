"use client";

import React from "react";
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import type { OnboardingWizardMode, UsernameStatus, EmailStatus } from "./types";

export interface Step2Props {
  mode: OnboardingWizardMode;
  ownerFullName: string;
  setOwnerFullName: (val: string) => void;
  ownerUsername: string;
  setOwnerUsername: (val: string) => void;
  isUsernameManual: boolean;
  setIsUsernameManual: (val: boolean) => void;
  usernameStatus: UsernameStatus;
  ownerPassword: string;
  setOwnerPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  ownerWhatsApp: string;
  setOwnerWhatsApp: (val: string) => void;
  ownerCountryCode: string;
  setOwnerCountryCode: (val: string) => void;
  ownerEmail: string;
  setOwnerEmail: (val: string) => void;
  emailStatus: EmailStatus;
  stepErrors: Record<string, string>;
  setStepErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function Step2OwnerCredentials({
  mode,
  ownerFullName,
  setOwnerFullName,
  ownerUsername,
  setOwnerUsername,
  isUsernameManual,
  setIsUsernameManual,
  usernameStatus,
  ownerPassword,
  setOwnerPassword,
  showPassword,
  setShowPassword,
  ownerWhatsApp,
  setOwnerWhatsApp,
  ownerCountryCode,
  setOwnerCountryCode,
  ownerEmail,
  setOwnerEmail,
  emailStatus,
  stepErrors,
  setStepErrors,
}: Step2Props) {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Salon Owner Account Credentials</h2>
        <p className="text-xs text-slate-400 mt-1">
          Set up master credentials to access the Salon Owner Dashboard and staff station manager.
        </p>
      </div>

      {mode === "PARTNER" && (
        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            Field Agent Tip: Guide the barber to set a simple 6+ character password they can remember on their phone.
          </span>
        </div>
      )}

      {/* Owner Full Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">
          Owner Full Name <span className="text-red-400">*</span>
        </label>
        <Input
          value={ownerFullName}
          onChange={(e) => setOwnerFullName(e.target.value)}
          placeholder="e.g., Ramesh Kumar"
          className="bg-slate-950 border-slate-800 text-white min-h-[48px] text-base"
          maxLength={80}
        />
        {stepErrors.ownerFullName && (
          <p className="text-xs text-red-400">{stepErrors.ownerFullName}</p>
        )}
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            Owner Login Username <span className="text-red-400">*</span>
          </label>
          {mode === "ADMIN" && (
            <button
              type="button"
              onClick={() => {
                setIsUsernameManual(true);
                setOwnerUsername(`owner_${Math.random().toString(36).substring(2, 7)}`);
              }}
              className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Auto-Generate
            </button>
          )}
        </div>
        <Input
          value={ownerUsername}
          onChange={(e) => {
            setIsUsernameManual(true);
            setOwnerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
          }}
          placeholder="e.g., ramesh_salon"
          className={`bg-slate-950 border-slate-800 font-mono text-sm min-h-[48px] ${
            usernameStatus.available === true
              ? "border-emerald-500/50 text-emerald-400 focus-visible:ring-emerald-500/30"
              : usernameStatus.available === false
              ? "border-red-500/50 text-red-400 focus-visible:ring-red-500/30"
              : "text-blue-400"
          }`}
          maxLength={40}
        />

        {/* Real-Time Live Username Availability Feedback */}
        {ownerUsername.trim().length >= 3 && (
          <div className="pt-1">
            {usernameStatus.isChecking ? (
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                Checking username availability...
              </p>
            ) : usernameStatus.available === true ? (
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                @{ownerUsername} is available!
              </p>
            ) : usernameStatus.available === false ? (
              <div className="space-y-1.5 p-2.5 rounded-xl bg-red-950/20 border border-red-500/30">
                <p className="text-[11px] text-red-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0" />
                  {usernameStatus.reason || `@${ownerUsername} is already taken.`}
                </p>
                {usernameStatus.suggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400">Available suggestions:</span>
                    {usernameStatus.suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setIsUsernameManual(true);
                          setOwnerUsername(sug);
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-blue-300 font-mono text-[11px] border border-slate-700 transition-colors"
                      >
                        @{sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
        {stepErrors.ownerUsername && (
          <p className="text-xs text-red-400">{stepErrors.ownerUsername}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">
          Owner Password <span className="text-red-400">*</span> (min 6 characters)
        </label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            placeholder="••••••••"
            className="bg-slate-950 border-slate-800 text-white pr-10 min-h-[48px] text-base"
            maxLength={80}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {stepErrors.ownerPassword && (
          <p className="text-xs text-red-400">{stepErrors.ownerPassword}</p>
        )}
      </div>

      {/* Owner WhatsApp & Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Owner Mobile / WhatsApp (Operational & Alerts) <span className="text-red-400">*</span>
          </label>
          <PhoneInput
            value={ownerWhatsApp}
            onChange={(cleanDigits) => {
              setOwnerWhatsApp(cleanDigits);
              if (stepErrors.ownerWhatsApp) {
                setStepErrors((errs) => {
                  const n = { ...errs };
                  delete n.ownerWhatsApp;
                  return n;
                });
              }
            }}
            countryCode={ownerCountryCode}
            onCountryCodeChange={setOwnerCountryCode}
            placeholder="9876543210"
            showDigitCounter={true}
          />
          <p className="text-[10px] text-slate-400 mt-1 leading-tight">
            Used for queue notifications & alerts. Note: Primary login credentials are unique Email and Username.
          </p>
          {stepErrors.ownerWhatsApp && (
            <p className="text-xs text-red-400 mt-1">{stepErrors.ownerWhatsApp}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Owner Email Address (Primary Login Credential) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Input
              type="email"
              value={ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                if (stepErrors.ownerEmail) {
                  setStepErrors((errs) => {
                    const n = { ...errs };
                    delete n.ownerEmail;
                    return n;
                  });
                }
              }}
              placeholder="owner@example.com"
              className="bg-slate-950 border-slate-800 text-white min-h-[48px] text-sm pr-9"
              maxLength={120}
            />
            {emailStatus.isChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              </div>
            )}
          </div>
          {ownerEmail.trim() && !emailStatus.isChecking && emailStatus.checkedEmail === ownerEmail.trim().toLowerCase() && (
            <div className="mt-1 text-[11px]">
              {emailStatus.available ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{ownerEmail.trim().toLowerCase()} is available!</span>
                </span>
              ) : emailStatus.available === false ? (
                <span className="text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailStatus.reason || "This email is already registered."}</span>
                </span>
              ) : null}
            </div>
          )}
          {stepErrors.ownerEmail && (
            <p className="text-xs text-red-400 mt-1">{stepErrors.ownerEmail}</p>
          )}
        </div>
      </div>
    </div>
  );
}
