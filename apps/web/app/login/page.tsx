"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { resolveAuthRedirect } from "@/components/auth-guard";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Crown,
  Store,
  Loader2,
  KeyRound,
  ShieldCheck,
  Check,
  CheckCircle2,
  Sparkles,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CredentialPreset {
  role: "SUPER_ADMIN" | "SALON_OWNER" | "STAFF";
  title: string;
  badge: string;
  badgeVariant: "purple" | "default" | "success" | "warning";
  identifier: string;
  secret: string;
  targetDesc: string;
}

const AVAILABLE_PRESETS: CredentialPreset[] = [
  {
    role: "SUPER_ADMIN",
    title: "Platform Administrator",
    badge: "SuperAdmin",
    badgeVariant: "purple",
    identifier: "admin",
    secret: "Admin@123",
    targetDesc: "Governance HQ & Tenants (/admin)",
  },
  {
    role: "SALON_OWNER",
    title: "Salon Owner / Storefront",
    badge: "Owner Hub",
    badgeVariant: "default",
    identifier: "owner",
    secret: "Owner@123",
    targetDesc: "Chairs, Queue & Salon Hub (/owner)",
  },
  {
    role: "STAFF",
    title: "Staff Stylist",
    badge: "Staff Desk",
    badgeVariant: "warning",
    identifier: "ramesh",
    secret: "Ramesh@123",
    targetDesc: "Chair Control & Queue Station (/staff)",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const salonParam = searchParams.get("salon");

  const { login, user, salon } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAutoRole, setActiveAutoRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCredentialsBox, setShowCredentialsBox] = useState(false);
  const [selectedCredRole, setSelectedCredRole] = useState<"SUPER_ADMIN" | "SALON_OWNER" | "STAFF">("SUPER_ADMIN");

  const getContextSalonSlug = (overrideSalon?: string | null): string => {
    if (overrideSalon) return overrideSalon;
    if (salonParam) return salonParam;
    if (redirectParam) {
      const qMatch = redirectParam.match(/[?&]salon=([a-zA-Z0-9-_]+)/);
      if (qMatch) return qMatch[1];
      const pMatch = redirectParam.match(/^\/s\/([a-zA-Z0-9-_]+)/);
      if (pMatch) return pMatch[1];
    }
    return salon?.slug || "ramesh-barber";
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("engine_remembered_identifier");
      if (saved) {
        setIdentifier(saved);
      }
    }
  }, []);

  // Redirect if user is already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      const effectiveSlug = getContextSalonSlug(salon?.slug);
      const target = resolveAuthRedirect(redirectParam, user.role, effectiveSlug);
      router.push(target);
    }
  }, [user, isLoading, redirectParam, salonParam, salon, router]);

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage("Please enter your identifier and password.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (rememberDevice) {
        localStorage.setItem("engine_remembered_identifier", identifier.trim());
      } else {
        localStorage.removeItem("engine_remembered_identifier");
      }

      const resp = await login(identifier.trim(), password);
      const role = resp?.user?.role;
      const effectiveSlug = getContextSalonSlug(resp?.salon?.slug);
      const target = resolveAuthRedirect(redirectParam, role, effectiveSlug);
      router.push(target);
    } catch (err: any) {
      setErrorMessage(
        err.message || "Invalid credentials. Please verify your username, email, or password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoLogin = async (preset: CredentialPreset) => {
    setErrorMessage(null);
    setActiveAutoRole(preset.role);
    setIsLoading(true);

    try {
      const resp = await login(preset.identifier, preset.secret);
      const role = resp?.user?.role || preset.role;
      const effectiveSlug = getContextSalonSlug(resp?.salon?.slug);
      const target = resolveAuthRedirect(redirectParam, role, effectiveSlug);
      router.push(target);
    } catch (err: any) {
      setErrorMessage(
        err.message || `Failed to sign in as ${preset.title}. Please verify backend status.`
      );
    } finally {
      setIsLoading(false);
      setActiveAutoRole(null);
    }
  };

  const handleFillCredentials = (preset: CredentialPreset) => {
    setSelectedCredRole(preset.role);
    setShowCredentialsBox(true);
    setIdentifier(preset.identifier);
    setPassword(preset.secret);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold tracking-wide shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Engine Que Enterprise Access</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Sign In to Platform
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Unified authentication for Governance, Salon Operations & Queues
        </p>

        {redirectParam && (
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
              <span className="text-slate-500">Destination:</span>
              <strong className="text-amber-400 font-mono">{redirectParam}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Unified Enterprise Authentication Card */}
      <Card className="border-slate-800 bg-slate-900/85 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        {/* 1-Click Fast-Access Bar */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Instant 1-Click Authentication</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const target = AVAILABLE_PRESETS.find((p) => p.role === selectedCredRole) || AVAILABLE_PRESETS[0];
                handleFillCredentials(target);
              }}
              className="h-7 px-2.5 text-[11px] gap-1.5 text-amber-300 hover:text-amber-200 hover:bg-amber-950/30 border border-amber-500/20"
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Show & Fill Credentials</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {AVAILABLE_PRESETS.map((preset) => {
              const isThisLoading = activeAutoRole === preset.role;
              const isSuperAdmin = preset.role === "SUPER_ADMIN";
              const isStaff = preset.role === "STAFF";
              return (
                <button
                  key={preset.role}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleAutoLogin(preset)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-all relative flex items-center justify-between group ${
                    isSuperAdmin
                      ? "border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 hover:border-purple-500/50"
                      : isStaff
                      ? "border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/40 hover:border-amber-500/50"
                      : "border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/40 hover:border-blue-500/50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isSuperAdmin ? (
                      <Crown className="w-4 h-4 text-purple-400" />
                    ) : isStaff ? (
                      <Scissors className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Store className="w-4 h-4 text-blue-400" />
                    )}
                    <span>
                      <span className="block font-bold text-white text-xs">{preset.title}</span>
                      <span className="block text-[10px] text-slate-400">1-Tap Direct &rarr;</span>
                    </span>
                  </span>
                  {isThisLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Standard Form Authentication */}
        <form onSubmit={handleStandardSubmit}>
          <div className="px-6 pt-4 pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Standard Credentials Login</span>
            </h2>
          </div>
          <CardContent className="space-y-4 px-6 pt-3 pb-5">
            {/* Active Credentials Preview Box */}
            {showCredentialsBox && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs space-y-2.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Credentials Populated Into Form</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCredentialsBox(false)}
                    className="text-slate-500 hover:text-slate-300 text-[11px]"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_PRESETS.map((p) => {
                    const isSelected = selectedCredRole === p.role;
                    return (
                      <button
                        key={p.role}
                        type="button"
                        onClick={() => handleFillCredentials(p)}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-amber-500/60 bg-amber-500/10 text-white"
                            : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] text-slate-200">{p.title}</span>
                          {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                        </span>
                        <span className="block font-mono text-[10px] space-y-0.5 text-slate-400">
                          <span className="block">User: <strong className="text-slate-200">{p.identifier}</strong></span>
                          <span className="block">Pass: <strong className="text-slate-200">{p.secret}</strong></span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Authentication Failed</p>
                  <p className="text-rose-400/90 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Identifier Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-identifier"
                className="text-xs font-medium text-slate-300 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Identifier (Username, Phone, or Email)</span>
              </label>
              <Input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin, owner, or phone number"
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500 h-10"
                disabled={isLoading}
                required
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-medium text-slate-300 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Security Password</span>
                </span>
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pr-10 focus-visible:ring-blue-500 h-10"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Device Persistence Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label
                htmlFor="remember-device"
                className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none"
              >
                <input
                  id="remember-device"
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <span>Remember this workstation / mirror session</span>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-1 px-6 pb-6">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 h-10 transition-all text-xs sm:text-sm"
            >
              {isLoading && activeAutoRole === null ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <div className="flex items-center justify-between w-full text-[11px] text-slate-500 px-1 pt-1">
              <Link
                href={redirectParam && redirectParam.startsWith("/") ? redirectParam : "/"}
                className="hover:text-blue-400 transition-colors"
              >
                &larr; {redirectParam ? `Return to ${redirectParam}` : "Return to Home"}
              </Link>
              <span>Zero-Trust Enterprise Portal</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function LoginLoadingSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-pulse p-4">
      <div className="text-center space-y-3">
        <div className="h-6 w-32 bg-slate-800 rounded-full mx-auto" />
        <div className="h-8 w-48 bg-slate-800 rounded-xl mx-auto" />
        <div className="h-4 w-64 bg-slate-800 rounded mx-auto" />
      </div>
      <div className="h-96 bg-slate-900/90 rounded-2xl border border-slate-800" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <Suspense fallback={<LoginLoadingSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
