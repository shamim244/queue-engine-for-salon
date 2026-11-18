"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, type Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhoneInput, DEFAULT_COUNTRIES } from "@/components/ui/phone-input";
import {
  ArrowLeft,
  UserPlus,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  User,
  KeyRound,
  Clock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

function CreateStaffContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { salon: authSalon } = useAuth();

  const currentSlug = searchParams.get("salon") || authSalon?.slug || "ramesh-barber";
  const prefillStaffId = searchParams.get("staffId") || undefined;
  const prefillName = searchParams.get("name") || "";
  const prefillPhone = searchParams.get("phone") || "";
  const prefillPace = Number(searchParams.get("pace")) || 25;

  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Station Quota
  const [quota, setQuota] = useState<{
    allowed: boolean;
    current: number;
    max: number;
    tier: string;
  } | null>(null);

  // Form Fields
  const parseInitialPhone = (raw: string) => {
    if (!raw) return { code: "+91", national: "" };
    let code = "+91";
    let digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+")) {
      for (const c of DEFAULT_COUNTRIES) {
        if (raw.startsWith(c.code)) {
          code = c.code;
          digits = raw.slice(c.code.length).replace(/\D/g, "");
          break;
        }
      }
    } else if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    }
    return { code, national: digits.slice(0, 10) };
  };

  const initialParsedPhone = parseInitialPhone(prefillPhone);
  const [fullName, setFullName] = useState(prefillName);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(initialParsedPhone.national);
  const [countryCode, setCountryCode] = useState(initialParsedPhone.code);
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [pace, setPace] = useState(prefillPace);

  // Errors State
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadSalonAndQuota() {
      setLoading(true);
      try {
        const salonRes = await api.salons.get(currentSlug);
        if (salonRes.salon) {
          setSalon(salonRes.salon);

          // If provisioning existing stylist, set default username if empty
          if (prefillName && !username) {
            const clean = prefillName
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]/g, "_")
              .replace(/_+/g, "_")
              .slice(0, 15);
            const branchPrefix = salonRes.salon.slug ? salonRes.salon.slug.split("-")[1] || "st" : "st";
            setUsername(`${clean}_${branchPrefix}`);
          }
        }

        try {
          const quotaRes = await api.salons.getQuota(currentSlug);
          if (quotaRes?.success) {
            setQuota({
              allowed: quotaRes.allowed,
              current: quotaRes.current,
              max: quotaRes.max,
              tier: quotaRes.tier,
            });
          }
        } catch {
          // non-fatal quota check
        }
      } catch (err: any) {
        console.error("Failed to load salon:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSalonAndQuota();
  }, [currentSlug, prefillName]);

  const handleAutoGenerateUsername = () => {
    if (!fullName.trim()) {
      setFieldErrors((prev) => ({ ...prev, fullName: "Please enter a full name first" }));
      return;
    }
    const clean = fullName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 15);
    const branchPrefix = salon?.slug ? salon.slug.split("-")[1] || "st" : "st";
    setUsername(`${clean}_${branchPrefix}`);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.username;
      return next;
    });
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setShowPassword(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }

    if (!username.trim()) {
      errors.username = "Username is required";
    } else if (!/^[a-zA-Z0-9_]{3,25}$/.test(username.trim())) {
      errors.username = "Username must be 3-25 alphanumeric characters or underscores";
    }

    if (!password || password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (phone && phone.trim()) {
      const cleanDigits = phone.trim().replace(/\D/g, "");
      if (cleanDigits.length !== 10) {
        errors.phone = "Mobile number must be exactly 10 digits (cannot be less or more)";
      } else if (countryCode === "+91" && !["6", "7", "8", "9"].includes(cleanDigits[0])) {
        errors.phone = "Indian mobile numbers must begin with 6, 7, 8, or 9";
      }
    }

    if (email && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = "Please enter a valid email address";
      }
    }

    if (pin && pin.trim()) {
      if (!/^\d{4}$/.test(pin.trim())) {
        errors.pin = "Mirror PIN must be exactly 4 digits (e.g. 1234)";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!salon) {
      setServerError("Salon branch context is missing. Please try reloading the page.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const cleanDigits = phone.trim().replace(/\D/g, "");
      const formattedPhone = cleanDigits.length === 10
        ? `${countryCode}${cleanDigits}`
        : undefined;

      const res = await api.auth.createStaff({
        salonId: salon.id,
        staffId: prefillStaffId,
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        password,
        email: email.trim() || undefined,
        phone: formattedPhone,
        pin: pin.trim() || undefined,
        avgDurationMinutes: Number(pace) || 25,
      });

      if (res && res.success) {
        // Redirect back to staff list with success banner
        router.push(`/owner/staff?salon=${currentSlug}&created=${encodeURIComponent(fullName.trim())}`);
      } else {
        setServerError((res as any)?.message || "Failed to create team member.");
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred while creating staff member.";
      setServerError(msg);

      // Map backend error to specific form field highlighting
      const msgLower = msg.toLowerCase();
      const updatedFieldErrors: Record<string, string> = {};
      if (msgLower.includes("phone")) {
        updatedFieldErrors.phone = msg;
      } else if (msgLower.includes("email")) {
        updatedFieldErrors.email = msg;
      } else if (msgLower.includes("username")) {
        updatedFieldErrors.username = msg;
      } else if (msgLower.includes("quota") || msgLower.includes("limit")) {
        updatedFieldErrors.quota = msg;
      }
      setFieldErrors((prev) => ({ ...prev, ...updatedFieldErrors }));
    } finally {
      setSubmitting(false);
    }
  };

  const isAtQuota = quota ? !quota.allowed && !prefillStaffId : false;

  return (
    <div className="max-w-3xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/owner/staff?salon=${currentSlug}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Staff Roster</span>
        </Link>
        <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">
          {salon?.name || "Salon Branch"}
        </Badge>
      </div>

      {/* Main Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <UserPlus className="h-7 w-7 text-amber-400" />
          {prefillStaffId ? "Provision Station Login" : "Add Team Member & Station"}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Create authentic staff credentials, 4-digit mirror PIN, speed calibration, and instant session security.
        </p>
      </div>

      {/* Quota Limit Warning Banner (If reached) */}
      {isAtQuota && (
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Station Quota Reached</span>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] py-0 px-2 font-mono">
                  {quota?.current} / {quota?.max} Used ({quota?.tier})
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Your salon is currently at maximum station capacity. Upgrade to Starter Solo or Pro to add unlimited barber chairs.
              </p>
            </div>
          </div>
          <Link
            href={`/owner/billing?salon=${currentSlug}`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 shadow-sm transition-colors active:scale-95 min-h-[40px]"
          >
            Upgrade Plan Now
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Link>
        </div>
      )}

      {/* Prominent Server Error Banner */}
      {serverError && (
        <div className="p-4 rounded-2xl border border-rose-500/50 bg-rose-950/60 text-rose-200 flex items-start gap-3 shadow-xl animate-in slide-in-from-top-2">
          <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-200">Could Not Create Team Member</h4>
            <p className="text-xs text-rose-300 leading-relaxed">{serverError}</p>
          </div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Staff Identity */}
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <User className="h-4 w-4 text-amber-400" />
              1. Personal Identity & Profile
            </CardTitle>
            <CardDescription>
              Basic identity used on customer receipts and the digital booking mirror.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.fullName;
                        return next;
                      });
                    }
                  }}
                  className={`bg-slate-950 border-slate-800 text-sm min-h-[44px] ${
                    fieldErrors.fullName ? "border-rose-500 ring-1 ring-rose-500" : ""
                  }`}
                  disabled={submitting}
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Mobile Phone Number
                </label>
                <PhoneInput
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.phone;
                        return next;
                      });
                    }
                  }}
                  countryCode={countryCode}
                  onCountryCodeChange={setCountryCode}
                  placeholder="9876543210"
                  showDigitCounter={true}
                  error={fieldErrors.phone}
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  placeholder="staff@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.email;
                        return next;
                      });
                    }
                  }}
                  className={`pl-9 bg-slate-950 border-slate-800 text-sm min-h-[44px] ${
                    fieldErrors.email ? "border-rose-500 ring-1 ring-rose-500" : ""
                  }`}
                  disabled={submitting}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.email}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Login Credentials */}
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-400" />
              2. Login Credentials
            </CardTitle>
            <CardDescription>
              Unique username and password used to sign in to the Barber Desk portal (`/staff/login`).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Username <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGenerateUsername}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Auto-Generate
                  </button>
                </div>
                <Input
                  placeholder="e.g. ramesh_st"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                    if (fieldErrors.username) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.username;
                        return next;
                      });
                    }
                  }}
                  className={`bg-slate-950 border-slate-800 font-mono text-sm min-h-[44px] ${
                    fieldErrors.username ? "border-rose-500 ring-1 ring-rose-500" : ""
                  }`}
                  disabled={submitting}
                />
                {fieldErrors.username && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.username}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                  >
                    <Lock className="h-3 w-3" />
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.password;
                          return next;
                        });
                      }
                    }}
                    className={`pr-10 bg-slate-950 border-slate-800 font-mono text-sm min-h-[44px] ${
                      fieldErrors.password ? "border-rose-500 ring-1 ring-rose-500" : ""
                    }`}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.password}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: In-Shop Station & Pace Calibration */}
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              3. Station PIN & Speed Pace
            </CardTitle>
            <CardDescription>
              Quick mirror touch screen unlock and service duration calibration for accurate queue countdowns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  4-Digit Mirror PIN (Optional)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={pin}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                    setPin(clean);
                    if (fieldErrors.pin) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.pin;
                        return next;
                      });
                    }
                  }}
                  className={`bg-slate-950 border-slate-800 font-mono text-center tracking-widest text-base min-h-[44px] ${
                    fieldErrors.pin ? "border-rose-500 ring-1 ring-rose-500" : ""
                  }`}
                  disabled={submitting}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enables rapid 1-second touch login on shared mirror station tablets.
                </p>
                {fieldErrors.pin && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.pin}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Average Haircut Pace: <span className="text-amber-400 font-bold">{pace} mins</span>
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={5}
                    value={pace}
                    onChange={(e) => setPace(Number(e.target.value))}
                    className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    disabled={submitting}
                  />
                  <span className="text-xs font-mono text-slate-300 shrink-0 w-12 text-right">
                    {pace} m
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Used by the client queue engine to calculate waiting room arrival ETAs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <Link
            href={`/owner/staff?salon=${currentSlug}`}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors min-h-[48px]"
          >
            Cancel
          </Link>

          <Button
            type="submit"
            disabled={submitting || isAtQuota}
            className="w-full sm:w-auto min-h-[48px] px-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Creating Team Member...</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                <span>{prefillStaffId ? "Save Station Credentials" : "Create Team Member"}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CreateStaffPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Staff Registration...</div>}>
      <CreateStaffContent />
    </Suspense>
  );
}
