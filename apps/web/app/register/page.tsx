"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Store,
  Building2,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Tv,
  Armchair,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, setAuthToken } from "@/lib/api";
import { slugify, getRuralSoloPreset, getModernMultiPreset } from "@/lib/onboarding";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: "customer" vs "owner"
  const [accountType, setAccountType] = useState<"customer" | "owner">(
    searchParams.get("role") === "customer" || searchParams.get("type") === "customer"
      ? "customer"
      : "owner"
  );

  // Customer registration state
  const [custFullName, setCustFullName] = useState("");
  const [custPhone, setCustPhone] = useState("+91 ");
  const [custUsername, setCustUsername] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPassword, setCustPassword] = useState("");
  const [custLoading, setCustLoading] = useState(false);
  const [custError, setCustError] = useState<string | null>(null);

  // Salon Owner registration state
  const [salonName, setSalonName] = useState("");
  const [salonSlug, setSalonSlug] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [operatingMode, setOperatingMode] = useState<"RURAL_SOLO" | "MODERN_MULTI">("RURAL_SOLO");
  const [ownerName, setOwnerName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    slug: string;
    salonName: string;
    token?: string;
  } | null>(null);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustError(null);
    if (!custFullName.trim()) {
      setCustError("Full name is required");
      return;
    }
    if (!custPhone.trim() || custPhone.trim() === "+91") {
      setCustError("Valid phone number is required");
      return;
    }
    if (!custPassword || custPassword.length < 6) {
      setCustError("Password must be at least 6 characters long");
      return;
    }

    setCustLoading(true);
    try {
      const resp = await api.auth.registerCustomer({
        name: custFullName.trim(),
        phone: custPhone.trim(),
        username: custUsername.trim() || undefined,
        email: custEmail.trim() || undefined,
        password: custPassword,
      });

      if (resp.success && resp.token) {
        setAuthToken(resp.token);
        const redirectParam = searchParams.get("redirect");
        router.push(redirectParam || "/me");
      } else {
        setCustError(resp.message || "Failed to create account. Please try again.");
      }
    } catch (err: any) {
      setCustError(err.message || "Failed to create customer account");
    } finally {
      setCustLoading(false);
    }
  };


  const handleNameChange = (val: string) => {
    setSalonName(val);
    const generated = slugify(val);
    setSalonSlug(generated);
    if (!username) {
      setUsername(generated.replace(/-/g, "_"));
    }
  };

  const handleAutofillDemo = () => {
    const randomId = Math.floor(100 + Math.random() * 900);
    const name = `Classic Cuts Salon ${randomId}`;
    const slug = slugify(name);
    setSalonName(name);
    setSalonSlug(slug);
    setPhone("+91 98765 0" + randomId);
    setOperatingMode("RURAL_SOLO");
    setOwnerName("Kailash Sharma");
    setUsername(`kailash_${randomId}`);
    setPassword("Salon@1234");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!salonName.trim()) {
      setError("Salon name is required");
      return;
    }
    if (!salonSlug.trim()) {
      setError("Custom salon URL slug is required");
      return;
    }
    if (!phone.trim() || phone.trim() === "+91") {
      setError("Valid salon phone number is required");
      return;
    }
    if (!username.trim()) {
      setError("Owner username is required");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const preset = operatingMode === "RURAL_SOLO" ? getRuralSoloPreset() : getModernMultiPreset();

      const payload = {
        name: salonName.trim(),
        slug: salonSlug.trim(),
        phone: phone.trim(),
        operatingMode,
        countryCode: "+91",
        currency: "INR",
        ownerUser: {
          username: username.trim(),
          password: password,
          name: ownerName.trim() || username.trim(),
          phone: phone.trim(),
        },
        stylists: preset.stylists,
        services: preset.services,
      };

      const result = await api.admin.onboard(payload);

      if (result.success) {
        if (result.ownerUser?.id) {
          // Attempt automatic login to set credentials
          try {
            const loginResp = await api.auth.login(username.trim(), password);
            if (loginResp?.token) {
              setAuthToken(loginResp.token);
            }
          } catch {}
        }

        setSuccessData({
          slug: result.salon.slug,
          salonName: result.salon.name,
        });
      } else {
        setError(result.message || "Failed to register salon");
      }
    } catch (err: any) {
      setError(err.message || "Failed to register salon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <header className="max-w-3xl mx-auto w-full pt-4 pb-8 flex items-center justify-between border-b border-slate-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            EQ
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base text-white">Engine Que</h1>
            <p className="text-[11px] text-slate-400">Salon Registration Portal</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto w-full py-8 sm:py-12 flex-1">
        {/* Account Mode Switcher */}
        {!successData && (
          <div className="flex justify-center mb-8">
            <div className="p-1 rounded-2xl bg-slate-900 border border-slate-800 flex gap-1 shadow-xl">
              <button
                type="button"
                onClick={() => setAccountType("customer")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  accountType === "customer"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                👤 Customer Account
              </button>
              <button
                type="button"
                onClick={() => setAccountType("owner")}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  accountType === "owner"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                💈 Salon Owner / Barber
              </button>
            </div>
          </div>
        )}

        {accountType === "customer" && !successData ? (
          /* Customer Registration Form */
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 shadow-2xl space-y-6">
            <div className="text-center max-w-md mx-auto space-y-2 pb-4 border-b border-slate-800">
              <Badge variant="warning" className="text-xs">
                FREQUENT GROOMER PROFILE
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Create Customer Account
              </h2>
              <p className="text-xs text-slate-400">
                Save your favorite haircut specs, get real-time WhatsApp ticket alerts, and earn loyalty stamps for free cuts!
              </p>
            </div>

            {custError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {custError}
              </div>
            )}

            <form onSubmit={handleCustomerSubmit} className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Full Name *
                </label>
                <Input
                  placeholder="e.g. Vikram Sharma"
                  value={custFullName}
                  onChange={(e) => setCustFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Mobile Number (For Ticket Chimes & SMS) *
                </label>
                <Input
                  placeholder="+91 98765 43210"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  You can use this phone number to sign in anytime without needing a username.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Username (Optional)
                </label>
                <Input
                  placeholder="e.g. vikram_sharma"
                  value={custUsername}
                  onChange={(e) => setCustUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Email Address (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="vikram@example.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Account Password *
                </label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={custPassword}
                  onChange={(e) => setCustPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={custLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm h-12 rounded-xl shadow-lg shadow-amber-500/20 mt-2"
              >
                {custLoading ? "Creating Profile..." : "🎟️ Create Account & Open My Portal"}
              </Button>

              <div className="text-center pt-2 text-xs text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="text-amber-400 hover:underline font-bold">
                  Sign In
                </Link>
              </div>
            </form>
          </div>
        ) : successData ? (
          /* Success Screen */
          <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 to-slate-900/80 p-6 sm:p-10 shadow-2xl animate-in fade-in duration-300">
            <div className="text-center max-w-lg mx-auto mb-8">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>
              <Badge variant="success" className="mb-2">Provisioned &amp; Ready</Badge>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {successData.salonName} is Live!
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 mt-2">
                Your queue engine is operational. Your printable door QR and mirror station are active.
              </p>
            </div>

            {/* Launch Links Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <Link
                href={`/owner?salon=${successData.slug}`}
                className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                    👑
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-blue-300 transition-colors">
                      Owner Command Hub
                    </h4>
                    <p className="text-[11px] text-slate-400">Manage roster, billing, PINs</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href={`/s/${successData.slug}/station`}
                className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                    <Armchair className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors">
                      Barber Chair Station
                    </h4>
                    <p className="text-[11px] text-slate-400">Mirror tablet quick PIN UI</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-emerald-400" />
              </Link>

              <Link
                href={`/s/${successData.slug}`}
                target="_blank"
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 text-sky-400 flex items-center justify-center">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-sky-300 transition-colors">
                      Door QR Check-In
                    </h4>
                    <p className="text-[11px] text-slate-400">Customer scan &amp; walk-in</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href={`/s/${successData.slug}/tv`}
                target="_blank"
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-slate-800 text-rose-400 flex items-center justify-center">
                    <Tv className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-rose-300 transition-colors">
                      Lobby TV Display
                    </h4>
                    <p className="text-[11px] text-slate-400">Airport departure board</p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </Link>
            </div>

            <div className="text-center pt-4 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4">
              <Link href={`/owner?salon=${successData.slug}`}>
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-8 shadow-lg shadow-blue-600/30">
                  Launch Owner Hub &rarr;
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccessData(null);
                  handleAutofillDemo();
                }}
                className="border-slate-700 text-slate-300"
              >
                Register Another Salon
              </Button>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
              <div>
                <Badge variant="purple" className="mb-2 text-xs">Self-Service Onboarding</Badge>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Register Your Salon
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Launch your salon queue engine in 3 minutes. Zero setup fee.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutofillDemo}
                className="text-xs border-dashed border-blue-500/40 text-blue-300 hover:bg-blue-950/30 gap-1.5 shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                Autofill Demo Salon
              </Button>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Salon Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Store className="h-4 w-4 text-blue-400" />
                  1. Salon Brand &amp; Location
                </h3>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                    Salon Name <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Royal Traditional Barber or Aura Luxe Salon"
                    value={salonName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    className="bg-slate-950/80 border-slate-700 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                      Custom URL Slug <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs text-slate-500 font-mono">/s/</span>
                      <Input
                        placeholder="royal-barber"
                        value={salonSlug}
                        onChange={(e) => setSalonSlug(slugify(e.target.value))}
                        required
                        className="bg-slate-950/80 border-slate-700 text-sm pl-8 font-mono text-blue-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                      Salon Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="bg-slate-950/80 border-slate-700 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Architecture Picker */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-400" />
                  2. Choose Operating Architecture Mode
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setOperatingMode("RURAL_SOLO")}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      operatingMode === "RURAL_SOLO"
                        ? "bg-amber-950/20 border-amber-500/80 ring-1 ring-amber-500/30"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-400">Rural Solo Barber</span>
                        {operatingMode === "RURAL_SOLO" && (
                          <span className="h-4 w-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        1 chair, cash-first, 1-tap quick add for non-smartphone clients, voice alerts.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setOperatingMode("MODERN_MULTI")}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      operatingMode === "MODERN_MULTI"
                        ? "bg-blue-950/20 border-blue-500/80 ring-1 ring-blue-500/30"
                        : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-400">Modern Multi-Station</span>
                        {operatingMode === "MODERN_MULTI" && (
                          <span className="h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">
                        Multi-chair, lobby TV departure board, 4-digit mirror PINs, WhatsApp Cloud API.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Owner Account */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  3. Salon Owner Account Credentials
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                      Owner Full Name
                    </label>
                    <Input
                      placeholder="e.g. Ramesh Kumar"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="bg-slate-950/80 border-slate-700 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                      Admin Username <span className="text-rose-400">*</span>
                    </label>
                    <Input
                      placeholder="e.g. ramesh_owner"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="bg-slate-950/80 border-slate-700 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                    Secure Password (min 6 chars) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-950/80 border-slate-700 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-12 shadow-lg shadow-blue-600/30 gap-2"
                >
                  {loading ? (
                    "Provisioning Salon Engine..."
                  ) : (
                    <>
                      <span>Launch Your Salon Engine Now</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-center text-[11px] text-slate-500 mt-2.5">
                  By registering, you agree to our terms of service. Free forever for solo barbers.
                </p>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto w-full pt-6 pb-2 text-center text-xs text-slate-500 border-t border-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div>Engine Que System &copy; 2026. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <Link href="/dev" className="hover:text-slate-300">
            Dev Launcher
          </Link>
          <Link href="/login" className="hover:text-slate-300">
            Sign In
          </Link>
          <Link href="/" className="hover:text-slate-300">
            Home Page
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading registration...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
