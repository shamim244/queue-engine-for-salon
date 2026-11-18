"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { partnerApi } from "@/lib/partner-api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  Compass,
  Store,
  Briefcase,
  TrendingUp,
  Percent,
  Wallet,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
} from "lucide-react";

export default function PartnerJoinPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    countryCode: "+91",
    phone: "",
    email: "",
    city: "",
    referralCode: "",
    password: "",
    confirmPassword: "",
    persona: "GROUND_HUSTLER",
    payoutUpiId: "",
    pitchNotes: "",
  });

  const [hasManuallyEditedCode, setHasManuallyEditedCode] = useState(false);
  const [codeAvailability, setCodeAvailability] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
    suggestions?: string[];
    codeChecked?: string;
  }>({ checking: false });

  const [emailStatus, setEmailStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
    emailChecked?: string;
  }>({ checking: false });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdPartner, setCreatedPartner] = useState<any>(null);

  // Auto-suggest referral code from Full Name
  const handleNameChange = (name: string) => {
    const cleanCode = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 16);
    setFormData((prev) => ({
      ...prev,
      fullName: name,
      referralCode: hasManuallyEditedCode ? prev.referralCode : cleanCode,
    }));
  };

  // Debounced Live Email Availability Check
  useEffect(() => {
    const cleanEmail = formData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEmailStatus({ checking: false, emailChecked: cleanEmail });
      return;
    }

    let isCurrent = true;
    setEmailStatus((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await api.auth.checkEmail(cleanEmail);
        if (!isCurrent) return;
        setEmailStatus({
          checking: false,
          available: res.available,
          message: res.reason,
          emailChecked: cleanEmail,
        });
      } catch (err: any) {
        if (!isCurrent) return;
        setEmailStatus({
          checking: false,
          available: false,
          message: err?.message || "Failed to check email availability",
          emailChecked: cleanEmail,
        });
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [formData.email]);

  // Debounced Live Availability Check
  useEffect(() => {
    const code = formData.referralCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      setCodeAvailability({ checking: false, codeChecked: "" });
      return;
    }

    let isCurrent = true;
    setCodeAvailability((prev) => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await partnerApi.checkCodeAvailability(code);
        if (!isCurrent) return;
        setCodeAvailability({
          checking: false,
          available: res.available,
          message: res.message,
          suggestions: res.suggestions,
          codeChecked: code,
        });
      } catch (err: any) {
        if (!isCurrent) return;
        setCodeAvailability({
          checking: false,
          available: false,
          message: err?.message || "Failed to check code availability",
          codeChecked: code,
        });
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [formData.referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhoneDigits = formData.phone.replace(/\D/g, "");
    if (!formData.fullName.trim() || !cleanPhoneDigits || !formData.city.trim()) {
      setErrorMessage("Please complete all required fields (Full Name, Mobile Phone, and City).");
      return;
    }

    if (cleanPhoneDigits.length !== 10) {
      setErrorMessage("Please enter an exact 10-digit mobile number.");
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address. Email is required as your primary login credential.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address format (e.g. partner@example.com).");
      return;
    }
    if (emailStatus.emailChecked === cleanEmail && emailStatus.available === false) {
      setErrorMessage(emailStatus.message || "This email address is already registered to another account.");
      return;
    }

    if (!formData.password || formData.password.trim().length < 8) {
      setErrorMessage("Please choose a secure password with at least 8 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify your passwords.");
      return;
    }

    const code = formData.referralCode.trim().toUpperCase();
    if (code) {
      if (codeAvailability.checking) {
        setErrorMessage("Please wait while we check referral code availability...");
        return;
      }
      if (codeAvailability.codeChecked === code && codeAvailability.available === false) {
        setErrorMessage(codeAvailability.message || "Please choose a valid and available referral code.");
        return;
      }

      // Re-verify immediately before submission to prevent race conditions
      setIsLoading(true);
      try {
        const verifyRes = await partnerApi.checkCodeAvailability(code);
        if (!verifyRes.available) {
          setCodeAvailability({
            checking: false,
            available: false,
            message: verifyRes.message,
            suggestions: verifyRes.suggestions,
            codeChecked: code,
          });
          setErrorMessage(verifyRes.message || "Referral code is already taken. Please choose another.");
          setIsLoading(false);
          return;
        }
      } catch (err: any) {
        setCodeAvailability({
          checking: false,
          available: false,
          message: err?.message || "Referral code verification failed. Please try another.",
          codeChecked: code,
        });
        setErrorMessage(err?.message || "Referral code verification failed.");
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...rest } = formData;
      const res = await partnerApi.apply({
        ...rest,
        email: cleanEmail,
        phone: `${formData.countryCode}${cleanPhoneDigits}`,
        password: rest.password.trim(),
        referralCode: rest.referralCode?.trim().toUpperCase() || undefined,
      });
      if (res.success && res.partner) {
        setCreatedPartner(res.partner);
        setIsSuccess(true);
      } else {
        const msg = res.message || "Failed to submit application. Please verify details.";
        setErrorMessage(msg);
        if (code && msg.toLowerCase().includes("referral code")) {
          setCodeAvailability({
            checking: false,
            available: false,
            message: msg,
            codeChecked: code,
          });
        }
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to submit application. Please verify your phone number.";
      setErrorMessage(msg);
      if (code && msg.toLowerCase().includes("referral code")) {
        setCodeAvailability({
          checking: false,
          available: false,
          message: msg,
          codeChecked: code,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess && createdPartner) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-lg bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 px-3 py-1 mb-3">
            Application Received
          </Badge>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Welcome, {createdPartner.fullName}!
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Your partner application is under review by Super Admin. Once approved, you can onboard neighborhood salons, track recurring commissions on net revenue, and request instant UPI payouts.
          </p>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-6 text-left space-y-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Reserved Partner Code
              </div>
              <div className="text-xl font-mono font-bold text-amber-400 flex items-center justify-between">
                <span>{createdPartner.referralCode}</span>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
                  Pending Activation
                </Badge>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Password configured! Upon approval, log in using your mobile number and chosen password.</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link href="/partner/login" className="block">
              <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
                <span>Go to Partner Login</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/" className="block text-xs text-slate-400 hover:text-slate-300">
              Return to Engine Que Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 px-3.5 py-1 mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Affiliate & Growth Network
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Earn 10%–20% Recurring SaaS Commission
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto">
            Partner with Engine Que to digitize Indian salons, queues, and appointments. Get paid directly to your UPI handle.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-6 leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Persona Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Choose Your Partner Persona
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    id: "GROUND_HUSTLER",
                    label: "Ground Hustler",
                    desc: "Door-to-door salon visits",
                    icon: Compass,
                  },
                  {
                    id: "CREATOR",
                    label: "Online Creator",
                    desc: "YouTube, Reels, Social Links",
                    icon: TrendingUp,
                  },
                  {
                    id: "SALON_OWNER",
                    label: "Salon Owner",
                    desc: "Invite neighboring shops",
                    icon: Store,
                  },
                  {
                    id: "DEDICATED",
                    label: "Dedicated Partner",
                    desc: "Agency, Team or Reseller",
                    icon: Briefcase,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = formData.persona === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, persona: item.id })}
                      className={`p-3 rounded-2xl border text-left transition-all min-h-[58px] ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-xs text-white">{item.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isLoading}
                  className="h-12 rounded-xl bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500"
                  required
                  maxLength={80}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  WhatsApp / Mobile Number <span className="text-rose-400">*</span>
                </label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(cleanDigits) => {
                    setFormData({ ...formData, phone: cleanDigits });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  countryCode={formData.countryCode}
                  onCountryCodeChange={(code) => setFormData({ ...formData, countryCode: code })}
                  placeholder="9876543210"
                  showDigitCounter={true}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* City & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  City / Region <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Bareilly, Indore, Jaipur"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  disabled={isLoading}
                  className="h-12 rounded-xl bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500"
                  required
                  maxLength={80}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Email Address (Primary Login & Commission Receipts) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isLoading}
                    className="h-12 rounded-xl bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500 pr-9"
                    maxLength={120}
                    required
                  />
                  {emailStatus.checking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    </div>
                  )}
                </div>
                {formData.email.trim() && !emailStatus.checking && emailStatus.emailChecked === formData.email.trim().toLowerCase() && (
                  <div className="text-[11px] min-h-[16px]">
                    {emailStatus.available ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Email is available for partner login!</span>
                      </span>
                    ) : emailStatus.available === false ? (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{emailStatus.message || "This email is already registered."}</span>
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Referral Code Card */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Custom Referral Code (Optional / Auto-Suggested)
                </label>
                <span className="text-[10px] text-slate-400">Auto-suggested from name</span>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. RAHULSHARMA or RAHULPRO"
                  value={formData.referralCode}
                  onChange={(e) => {
                    setHasManuallyEditedCode(true);
                    setFormData({ ...formData, referralCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") });
                  }}
                  disabled={isLoading}
                  maxLength={20}
                  className="h-12 rounded-xl bg-slate-950 border-slate-700 text-amber-400 font-mono font-bold tracking-wider placeholder:text-slate-600 uppercase"
                />
                {codeAvailability.checking && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  </div>
                )}
              </div>
              <div className="text-[11px] min-h-[18px]">
                {formData.referralCode.trim().length >= 3 && !codeAvailability.checking && (
                  codeAvailability.codeChecked === formData.referralCode.trim().toUpperCase() && (
                    codeAvailability.available ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Code <strong>{formData.referralCode.toUpperCase()}</strong> is available!</span>
                      </span>
                    ) : codeAvailability.available === false ? (
                      <div className="space-y-1.5">
                        <span className="text-rose-400 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{codeAvailability.message || "This referral code is already taken."}</span>
                        </span>
                        {codeAvailability.suggestions && codeAvailability.suggestions.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-slate-400 text-[10px]">Available alternatives:</span>
                            {codeAvailability.suggestions.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => {
                                  setHasManuallyEditedCode(true);
                                  setFormData((prev) => ({ ...prev, referralCode: sug }));
                                }}
                                className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] transition-colors"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null
                  )
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Salons will enter this code at onboarding or checkout to give you attribution and commission.
              </p>
            </div>

            {/* Account Credentials / Password Setup */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Account Login Password Setup</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Create a secure password (min. 8 characters). You will use this password along with your mobile phone or email to log in at <span className="font-mono text-slate-300">/partner/login</span> once your application is approved.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Create Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="•••••••• (Min 8 chars)"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isLoading}
                      className="pl-9 pr-10 h-12 rounded-xl bg-slate-950/90 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                      required
                      minLength={8}
                      maxLength={80}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      className="pl-9 pr-10 h-12 rounded-xl bg-slate-950/90 border-slate-700 text-white placeholder:text-slate-500 text-sm"
                      required
                      minLength={8}
                      maxLength={80}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payout UPI ID */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Payout UPI Handle (For Weekly Direct Earnings Transfer)
              </label>
              <Input
                type="text"
                placeholder="e.g. rahul@okhdfc or 9876543210@paytm"
                value={formData.payoutUpiId}
                onChange={(e) => setFormData({ ...formData, payoutUpiId: e.target.value })}
                disabled={isLoading}
                maxLength={60}
                className="h-12 rounded-xl bg-slate-950/80 border-slate-700 text-white placeholder:text-slate-500 font-mono text-sm"
              />
            </div>

            {/* Pitch / Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                How do you plan to promote? (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. I visit 10 salons weekly in South Delhi, or I run a barber tips channel with 25k followers."
                value={formData.pitchNotes}
                onChange={(e) => setFormData({ ...formData, pitchNotes: e.target.value })}
                disabled={isLoading}
                maxLength={500}
                className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>

            {/* Value Proposition Pill */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
              <Percent className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-amber-300">Net-Revenue Commission:</span> You earn a percentage on every renewal plan actually paid after coupons/discounts. Unlocks once salon hits 15 queue tickets or purchases a paid plan.
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-600/20 min-h-[48px] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <span>Submit Partner Application</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-400">
            Already an approved partner?{" "}
            <Link href="/partner/login" className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-0.5">
              Sign In to Cockpit
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
