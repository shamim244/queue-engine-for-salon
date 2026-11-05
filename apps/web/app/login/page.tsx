"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { resolveAuthRedirect, AllowedRole } from "@/components/auth-guard";
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
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CredentialPreset {
  role: "SUPER_ADMIN" | "SALON_OWNER";
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
    badge: "HQ Governance",
    badgeVariant: "purple",
    identifier: "admin",
    secret: "Admin@123",
    targetDesc: "Access platform metrics, onboarding, and enterprise settings (/admin)",
  },
  {
    role: "SALON_OWNER",
    title: "Salon Owner / Storefront",
    badge: "Salon Operations",
    badgeVariant: "default",
    identifier: "owner",
    secret: "Owner@123",
    targetDesc: "Manage chairs, catalog, queue flow, and branches (/owner)",
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
  const [selectedCredRole, setSelectedCredRole] = useState<"SUPER_ADMIN" | "SALON_OWNER">("SUPER_ADMIN");

  // Extract salon slug from redirectParam if not explicitly in salon query
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

  // Restore remembered identifier if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("engine_remembered_identifier");
      if (saved) {
        setIdentifier(saved);
      }
    }
  }, []);

  // If already logged in, redirect to destination
  useEffect(() => {
    if (user && !isLoading) {
      const effectiveSlug = getContextSalonSlug(salon?.slug);
      const target = resolveAuthRedirect(redirectParam, user.role, effectiveSlug);
      router.push(target);
    }
  }, [user, isLoading, redirectParam, salonParam, salon, router]);

  // Handle standard credential submit
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

  // 1-Click Automatic Login handler
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

  // Show and fill credentials into the login form inputs
  const handleFillCredentials = (preset: CredentialPreset) => {
    setSelectedCredRole(preset.role);
    setShowCredentialsBox(true);
    setIdentifier(preset.identifier);
    setPassword(preset.secret);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold tracking-wide">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Engine Que Enterprise Access</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Sign In to Platform
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Unified authentication for Platform Governance, Salon Operations & Queues
        </p>

        {redirectParam && (
          <div className="pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
              <span className="text-slate-500">Signing in to continue to:</span>
              <strong className="text-amber-400 font-mono">{redirectParam}</strong>
            </span>
          </div>
        )}
      </div>

      {/* 1-Click Direct Auto-Login Action Buttons */}
      <Card className="border-slate-800 bg-slate-900/70 backdrop-blur-md shadow-xl">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Instant 1-Click Authentication</span>
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
              Auto-Routing
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_PRESETS.map((preset) => {
              const isThisLoading = activeAutoRole === preset.role;
              const isSuperAdmin = preset.role === "SUPER_ADMIN";
              return (
                <button
                  key={preset.role}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleAutoLogin(preset)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                    isSuperAdmin
                      ? "border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 hover:border-purple-500/50"
                      : "border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/40 hover:border-blue-500/50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2 font-bold text-white text-xs">
                      {isSuperAdmin ? (
                        <Crown className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Store className="w-4 h-4 text-blue-400" />
                      )}
                      <span>{preset.title}</span>
                    </div>
                    <Badge variant={preset.badgeVariant} className="text-[10px] px-1.5 py-0">
                      {preset.badge}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-3">
                    {preset.targetDesc}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] font-semibold">
                    <span className={isSuperAdmin ? "text-purple-400" : "text-blue-400"}>
                      Auto Login &rarr;
                    </span>
                    {isThisLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Standard Form Authentication */}
      <Card className="border-slate-800 bg-slate-900/90 shadow-2xl">
        <CardHeader className="pb-3 pt-5 px-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>Standard Credentials Login</span>
            </CardTitle>

            {/* Button that shows credentials details and auto-fills into the form */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const target = selectedCredRole === "SUPER_ADMIN" ? AVAILABLE_PRESETS[0] : AVAILABLE_PRESETS[1];
                handleFillCredentials(target);
              }}
              className="text-xs h-8 gap-1.5 border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-amber-300 hover:text-amber-200"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Show & Fill Credentials</span>
            </Button>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Sign in with your assigned username, verified mobile phone number, or corporate email.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleStandardSubmit}>
          <CardContent className="space-y-4 px-6 pt-2 pb-5">
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
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "border-amber-500/60 bg-amber-500/10 text-white"
                            : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] text-slate-200">{p.title}</span>
                          {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                        </div>
                        <div className="font-mono text-[10px] space-y-0.5 text-slate-400">
                          <div>User: <strong className="text-slate-200">{p.identifier}</strong></div>
                          <div>Pass: <strong className="text-slate-200">{p.secret}</strong></div>
                        </div>
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
                placeholder="e.g. admin or owner"
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
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
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pr-10 focus-visible:ring-blue-500"
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
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 h-10 transition-all"
            >
              {isLoading && activeAutoRole === null ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>

            <div className="flex items-center justify-between w-full text-[11px] text-slate-500 px-1 pt-1">
              <Link
                href={redirectParam && redirectParam.startsWith("/") ? redirectParam : "/"}
                className="hover:text-blue-400 transition-colors"
              >
                &larr; {redirectParam ? `Return to ${redirectParam}` : "Return to Public Portal"}
              </Link>
              <span>Protected by Zero-Trust Boundary</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

function LoginLoadingSkeleton() {
  return (
    <div className="w-full max-w-lg mx-auto space-y-6 animate-pulse p-4">
      <div className="text-center space-y-3">
        <div className="h-6 w-32 bg-slate-800 rounded-full mx-auto" />
        <div className="h-8 w-48 bg-slate-800 rounded-xl mx-auto" />
        <div className="h-4 w-64 bg-slate-800 rounded mx-auto" />
      </div>
      <div className="h-32 bg-slate-900/60 rounded-2xl border border-slate-800" />
      <div className="h-64 bg-slate-900/90 rounded-2xl border border-slate-800" />
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
