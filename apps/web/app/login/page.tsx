"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, setAuthToken } from "@/lib/api";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";
import { AuthPasswordInput } from "@/components/auth/auth-password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Ticket,
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  UserPlus,
  LogIn,
  AtSign,
} from "lucide-react";

function ConsumerLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const initialMode = searchParams.get("tab") === "register" ? "register" : "login";

  const { login, logout, user } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // Login state (Primary: Email or Username)
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration state (Primary: Email & Username; Secondary: Mobile Phone)
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-route if already logged in as CUSTOMER
  useEffect(() => {
    if (user) {
      if (user.role === "CUSTOMER") {
        router.push(redirectParam || "/me");
      }
    }
  }, [user, redirectParam, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMessage("Please enter your email or username and password.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await login(loginIdentifier.trim(), loginPassword);
      if (resp.user && resp.user.role === "CUSTOMER") {
        router.push(redirectParam || "/me");
      } else {
        // Strict boundary: Admins and Partners cannot login on consumer portal
        await logout();
        if (resp.user?.role === "SUPER_ADMIN") {
          setErrorMessage("Administrator accounts must sign in at the dedicated portal: /admin/login");
        } else if (resp.user?.role === "SALON_OWNER" || resp.user?.role === "STAFF") {
          setErrorMessage("Salon owners and barbers must sign in at the partner portal: /partner/login");
        } else {
          setErrorMessage("Access denied: This portal is for consumers only.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid customer credentials. Please check your email/username and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regFullName.trim() || regFullName.trim().length < 2) {
      setErrorMessage("Please enter your full name (minimum 2 characters).");
      return;
    }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      setErrorMessage("Please choose a username (minimum 3 characters).");
      return;
    }
    if (!regPassword.trim() || regPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    // Optional phone validation if provided
    if (regPhone.trim()) {
      const rawDigits = regPhone.replace(/[^0-9]/g, "");
      if (rawDigits.length < 7 || rawDigits.length > 15) {
        setErrorMessage("If provided, mobile phone must be between 7 and 15 digits.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const resp = await api.auth.registerCustomer({
        name: regFullName.trim(),
        email: regEmail.trim().toLowerCase(),
        username: regUsername.trim().toLowerCase(),
        password: regPassword,
        phone: regPhone.trim() ? regPhone.trim() : undefined,
      });

      if (resp.success) {
        if (resp.token) {
          setAuthToken(resp.token);
        }
        setSuccessMessage("Account created successfully! Redirecting...");
        setTimeout(() => {
          router.push(redirectParam || "/me");
        }, 1200);
      } else {
        setErrorMessage(resp.message || "Failed to create customer account.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Registration failed. This email or username may already be taken.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCardLayout
      theme="blue"
      badge={
        <Badge variant="default" className="px-3 py-1 text-xs gap-1.5 font-medium shadow-sm bg-blue-500/20 text-blue-300 border-blue-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          Customer Lounge
        </Badge>
      }
      icon={
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
          <Ticket className="w-6 h-6" />
        </div>
      }
      title={mode === "login" ? "Customer Sign In" : "Create Customer Account"}
      description={
        mode === "login"
          ? "Track your live haircut wait times, redeem rewards, and view salon visits."
          : "Sign up in 30 seconds with email & username to track lines and avoid wait times."
      }
      footer={
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">Are you a Salon Owner or Stylist?</span>
            <Link
              href="/partner/login"
              className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              Go to Partner Portal
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="text-slate-500 text-[11px]">
            Platform Administrator?{" "}
            <Link href="/hq/login" className="text-purple-400 hover:underline">
              HQ Sign In
            </Link>
          </div>
        </div>
      }
    >
      {/* Tab Switcher: Sign In vs Register */}
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
            mode === "login"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Sign In</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
            mode === "register"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 mb-4 animate-in fade-in">
          <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 mb-4 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
          <div className="leading-relaxed">{successMessage}</div>
        </div>
      )}

      {mode === "login" ? (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="customer-identifier" className="block text-xs font-semibold text-slate-300">
              Email, Username, or Mobile Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                id="customer-identifier"
                type="text"
                autoComplete="username"
                placeholder="rohan@example.com, username, or 9876543210"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <AuthPasswordInput
            id="customer-password"
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            disabled={isLoading}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entering Lounge...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="reg-fullname" className="block text-xs font-semibold text-slate-300">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <Input
                id="reg-fullname"
                type="text"
                placeholder="Rohan Verma"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-300">
                Email Address
              </label>
              <span className="text-[11px] text-emerald-400 font-medium">Primary</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <Input
                id="reg-email"
                type="email"
                placeholder="rohan@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label htmlFor="reg-username" className="block text-xs font-semibold text-slate-300">
                Choose Username
              </label>
              <span className="text-[11px] text-emerald-400 font-medium">Primary</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <AtSign className="w-4 h-4" />
              </div>
              <Input
                id="reg-username"
                type="text"
                placeholder="rohanv"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <AuthPasswordInput
            id="reg-password"
            label="Create Password (min. 6 characters)"
            placeholder="••••••••••••"
            value={regPassword}
            onChange={(e) => setRegPassword(e.target.value)}
            disabled={isLoading}
          />

          <div className="space-y-1.5 text-left pt-1">
            <div className="flex items-center justify-between">
              <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-300">
                Mobile Phone
              </label>
              <span className="text-[11px] text-slate-400">Secondary (Optional)</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <Input
                id="reg-phone"
                type="tel"
                placeholder="+91 98765 43210 (Optional)"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                disabled={isLoading}
                className="pl-10 h-12 rounded-xl bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Zero SMS waste: We use email &amp; in-app notifications by default.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 min-h-[48px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Complete Customer Registration</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </AuthCardLayout>
  );
}

export default function ConsumerLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      }
    >
      <ConsumerLoginForm />
    </Suspense>
  );
}
