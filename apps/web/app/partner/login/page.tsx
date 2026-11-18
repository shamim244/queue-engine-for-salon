"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { partnerApi } from "@/lib/partner-api";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Handshake,
  Store,
  Loader2,
  ArrowRight,
  ShieldAlert,
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

function PartnerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  // Field Partner Form State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Affiliate Partner Login
  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMessage("Please enter your registered email address or mobile number.");
      return;
    }

    // Security Guard: Alert user if they enter a public referral code instead of login credential
    const isEmail = cleanId.includes("@");
    const digitsOnly = cleanId.replace(/\D/g, "");
    if (!isEmail && digitsOnly.length < 10) {
      setErrorMessage("Login identifier must be your registered Email Address or 10-digit Mobile Number. Public referral codes cannot be used for authentication.");
      return;
    }

    if (!password.trim()) {
      setErrorMessage("Please enter your partner account password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await partnerApi.login({
        identifier: cleanId,
        password: password.trim(),
      });

      if (res.success && res.token) {
        const dest = redirectParam && redirectParam.startsWith("/partner") ? redirectParam : "/partner";
        router.push(dest);
      } else {
        if (res.message?.includes("No password configured") || (res as any).code === "PASSWORD_NOT_SET") {
          setErrorMessage("No password configured for this partner account. Please contact Super Admin to set your password.");
        } else {
          setErrorMessage(res.message || "Failed to authenticate partner.");
        }
      }
    } catch (err: any) {
      if (err?.code === "PASSWORD_NOT_SET" || err?.message?.includes("No password configured")) {
        setErrorMessage("No password configured for this partner account. Please contact Super Admin to set your password.");
      } else {
        setErrorMessage(err?.message || "Invalid credentials or partner account pending review.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout
      title="Field Partner & Affiliate Sign In"
      description="Access your referral cockpit, live net earnings ledger, and UPI withdrawal desk."
      icon={<Handshake className="w-8 h-8 text-emerald-400" />}
      footer={
        <div className="flex flex-col items-center gap-2 text-center text-xs text-slate-400 w-full">
          <div className="flex items-center gap-2">
            <span>Want to become a partner?</span>
            <Link
              href="/partner/join"
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
            >
              Apply as Field Partner
            </Link>
          </div>
          <div className="flex items-center gap-3 pt-2 text-[11px] text-slate-400">
            <Link href="/salon/login" className="text-slate-300 hover:text-emerald-400">
              Salon Owner &amp; Staff Login
            </Link>
            <span>•</span>
            <Link href="/login" className="text-slate-300 hover:text-emerald-400">
              Customer Portal
            </Link>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Salon Owner Redirect Notice */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Salon Owner or Barber?</span>
          </div>
          <Link
            href="/salon/login"
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0 flex items-center gap-0.5"
          >
            <span>Salon Login</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Affiliate / Field Partner Form */}
        <form onSubmit={handlePartnerSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Partner Mobile Number or Email Address <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="partner@example.com or 9876543210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-9 h-11 bg-slate-800 border-slate-700 text-white rounded-xl placeholder:text-slate-500 text-sm min-h-[48px]"
                required
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports registered email address or 10-digit mobile number.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Partner Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10 h-11 bg-slate-800 border-slate-700 text-white rounded-xl placeholder:text-slate-500 text-sm min-h-[48px]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl gap-2 shadow-lg shadow-emerald-900/20 min-h-[48px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Account...
              </>
            ) : (
              <>
                Access Partner Cockpit
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </AuthCardLayout>
  );
}

export default function PartnerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      }
    >
      <PartnerLoginForm />
    </Suspense>
  );
}
