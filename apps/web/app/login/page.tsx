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
  Sparkles,
  Scissors,
  Store,
  Crown,
  Loader2,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DemoPreset {
  id: AllowedRole;
  label: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: "purple" | "default" | "warning" | "success" | "outline";
  identifier: string;
  desc: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: "SUPER_ADMIN",
    label: "Super Admin",
    icon: <Crown className="w-4 h-4 text-purple-400" />,
    badge: "Full HQ",
    badgeColor: "purple",
    identifier: "admin / Admin@123",
    desc: "Platform governance, tenants & billing",
  },
  {
    id: "SALON_OWNER",
    label: "Salon Owner",
    icon: <Store className="w-4 h-4 text-blue-400" />,
    badge: "Aura Unisex",
    badgeColor: "default",
    identifier: "aura_owner / Aura@123",
    desc: "Multi-branch queue & staff operations",
  },
  {
    id: "STAFF",
    label: "Stylist / Barber",
    icon: <Scissors className="w-4 h-4 text-amber-400" />,
    badge: "Ramesh Chair",
    badgeColor: "warning",
    identifier: "ramesh / Ramesh@123",
    desc: "Mirror tablet station & queue controls",
  },
  {
    id: "CUSTOMER",
    label: "Customer Demo",
    icon: <User className="w-4 h-4 text-emerald-400" />,
    badge: "Self Check-in",
    badgeColor: "success",
    identifier: "vikram_sharma / Customer@123",
    desc: "Live queue tracker, haircut specs & loyalty stamp cards",
  },

];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const { login, demoLogin, user } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const target = resolveAuthRedirect(redirectParam, user.role);
      router.push(target);
    }
  }, [user, isLoading, redirectParam, router]);

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
      const target = resolveAuthRedirect(redirectParam, role);
      router.push(target);
    } catch (err: any) {
      setErrorMessage(
        err.message || "Invalid credentials. Please verify your username, email, or phone number."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoPreset = async (preset: DemoPreset) => {
    setErrorMessage(null);
    setActivePreset(preset.id);
    setIsLoading(true);

    try {
      await demoLogin(preset.id);
      const target = resolveAuthRedirect(redirectParam, preset.id);
      router.push(target);
    } catch (err: any) {
      setErrorMessage(
        err.message || `Failed to authenticate as ${preset.label}. Ensure backend is running.`
      );
    } finally {
      setIsLoading(false);
      setActivePreset(null);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase">
          <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          Enterprise Gatekeeper
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          Engine Que
          <Badge variant="purple" className="text-xs font-semibold px-2 py-0.5">
            Auth v2.0
          </Badge>
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Unified Platform Authentication &bull; Zero-Trust Role Routing
        </p>
      </div>

      {/* Demo 1-Click Quick Login Presets */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-200">
              <Sparkles className="w-4 h-4 text-amber-400" />
              1-Click Instant Demo Authentication
            </CardTitle>
            <span className="text-[11px] text-slate-400 font-mono">Development Sandbox</span>
          </div>
          <CardDescription className="text-xs text-slate-400">
            Select a verified platform persona to authenticate instantly without typing credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {DEMO_PRESETS.map((preset) => {
              const isSelected = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleDemoPreset(preset)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
                    isSelected
                      ? "border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/30"
                      : "border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2 font-medium text-white text-xs">
                      {preset.icon}
                      <span>{preset.label}</span>
                    </div>
                    <Badge variant={preset.badgeColor} className="text-[10px] px-1.5 py-0">
                      {preset.badge}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug truncate mb-1">
                    {preset.desc}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-700/40 text-[10px] font-mono text-slate-500 group-hover:text-slate-300">
                    <span className="truncate">{preset.identifier}</span>
                    {isSelected ? (
                      <Loader2 className="w-3 h-3 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors shrink-0" />
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
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            Standard Credentials Login
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Sign in with your assigned username, verified mobile phone number, or corporate email.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleStandardSubmit}>
          <CardContent className="space-y-4">
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
                Identifier (Username, Phone, or Email)
              </label>
              <Input
                id="login-identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. admin or 9876543210 or ramesh"
                className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
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
                  Security Password
                </span>
              </label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security password"
                  className="bg-slate-950/70 border-slate-700 text-white placeholder:text-slate-500 pr-10 focus-visible:ring-blue-500"
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

            {/* Mirror Tablet / Device Persistence Checkbox */}
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
                <span>Remember this mirror tablet / browser session</span>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 h-10 transition-all"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Sign In to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </Button>

            <div className="flex items-center justify-between w-full text-[11px] text-slate-500 px-1">
              <Link href="/" className="hover:text-blue-400 transition-colors">
                &larr; Return to Public Portal
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
    <div className="w-full max-w-xl mx-auto space-y-6 animate-pulse p-4">
      <div className="text-center space-y-3">
        <div className="h-6 w-32 bg-slate-800 rounded-full mx-auto" />
        <div className="h-8 w-48 bg-slate-800 rounded-xl mx-auto" />
        <div className="h-4 w-64 bg-slate-800 rounded mx-auto" />
      </div>
      <div className="h-40 bg-slate-900/60 rounded-2xl border border-slate-800" />
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
