"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminPartnerApi } from "@/lib/partner-api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  ArrowLeft,
  Sparkles,
  Compass,
  TrendingUp,
  Store,
  Briefcase,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";

const PERSONAS = [
  { id: "GROUND_HUSTLER", label: "Ground Hustler", desc: "Field visits & barber champion", icon: Compass },
  { id: "CREATOR", label: "Online Creator", desc: "YouTube & social influencer channels", icon: TrendingUp },
  { id: "SALON_OWNER", label: "Salon Owner", desc: "Peer referrals & neighborhood salons", icon: Store },
  { id: "DEDICATED", label: "Dedicated Agency", desc: "Franchisee or professional sales team", icon: Briefcase },
];

export default function AdminNewPartnerPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    countryCode: "+91",
    email: "",
    city: "",
    persona: "GROUND_HUSTLER",
    referralCode: "",
    password: "",
    commissionModel: "RECURRING_PERCENT",
    commissionPercent: 10,
    bountyAmount: 0,
    durationType: "6_MONTHS",
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Auto-generate initial secure password on load
  useEffect(() => {
    generateRandomPassword();
  }, []);

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const special = "@#$!";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += special.charAt(Math.floor(Math.random() * special.length));
    pwd += Math.floor(10 + Math.random() * 90);
    setFormData((prev) => ({ ...prev, password: pwd }));
  };

  // Auto-suggest referral code from Full Name if not manually overridden
  const handleNameChange = (name: string) => {
    const cleanCode = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 16);
    setFormData((prev) => ({
      ...prev,
      fullName: name,
      referralCode: hasManuallyEditedCode ? prev.referralCode : cleanCode,
    }));
  };

  // Live Check Email Availability
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

  // Live Check Referral Code Availability
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
        const res = await adminPartnerApi.checkCodeAvailability(code);
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

    const cleanPhone = formData.phone.replace(/\D/g, "");
    if (!formData.fullName.trim() || !cleanPhone || !formData.city.trim()) {
      setErrorMessage("Please complete all required fields: Full Name, 10-digit Phone, and City.");
      return;
    }

    if (cleanPhone.length !== 10) {
      setErrorMessage("Please enter an exact 10-digit mobile number.");
      return;
    }

    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Please enter an email address. Email is mandatory for partner onboarding.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address format (e.g. partner@example.com).");
      return;
    }
    if (emailStatus.emailChecked === cleanEmail && emailStatus.available === false) {
      setErrorMessage(emailStatus.message || "This email address is already registered to another partner.");
      return;
    }

    if (formData.password && formData.password.trim().length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    const code = formData.referralCode.trim().toUpperCase();
    if (code) {
      if (codeAvailability.checking) {
        setErrorMessage("Please wait while referral code availability is verified...");
        return;
      }
      if (codeAvailability.codeChecked === code && codeAvailability.available === false) {
        setErrorMessage(codeAvailability.message || "Please choose a valid and available referral code.");
        return;
      }

      // Re-verify immediately before submission to prevent race conditions
      setIsSubmitting(true);
      try {
        const verifyRes = await adminPartnerApi.checkCodeAvailability(code);
        if (!verifyRes.available) {
          setCodeAvailability({
            checking: false,
            available: false,
            message: verifyRes.message,
            suggestions: verifyRes.suggestions,
            codeChecked: code,
          });
          setErrorMessage(verifyRes.message || "Referral code is already taken. Please choose another.");
          setIsSubmitting(false);
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
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await adminPartnerApi.onboardPartner({
        fullName: formData.fullName.trim(),
        phone: `${formData.countryCode}${cleanPhone}`,
        city: formData.city.trim(),
        persona: formData.persona,
        email: cleanEmail,
        password: formData.password.trim(),
        referralCode: formData.referralCode.trim().toUpperCase() || undefined,
        commissionModel: formData.commissionModel,
        commissionPercent: Number(formData.commissionPercent),
        bountyAmount: Number(formData.bountyAmount),
        durationType: formData.durationType,
        payoutUpiId: formData.payoutUpiId.trim() || undefined,
        pitchNotes: formData.pitchNotes.trim() || undefined,
      });

      if (res.success && res.partner) {
        setSuccessData({
          partner: res.partner,
          rawPassword: formData.password.trim(),
        });
      } else {
        setErrorMessage(res.message || "Failed to onboard partner.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to onboard partner.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!successData) return;
    const { partner, rawPassword } = successData;
    const msg = `🎉 *Welcome to Engine Que Partner Network!*

*Partner Name:* ${partner.fullName}
*Mobile:* ${partner.phone}
*Referral Code:* ${partner.referralCode}
*Status:* 🟢 Active & Auto-Approved
*Commission:* ${partner.commissionPercent}% Recurring

*Your Login Credentials:*
• Login Portal: https://engineque.in/partner/login
• Identifier: ${partner.phone}
• Password: ${rawPassword}

Share your referral code with local salons to earn passive commission on every transaction!`;

    navigator.clipboard.writeText(msg);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const handleCopySinglePassword = () => {
    if (!formData.password) return;
    navigator.clipboard.writeText(formData.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-xs px-3 py-1">
              Auto-Approved & Activated
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Partner Onboarded Successfully!
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              <strong className="text-white">{successData.partner.fullName}</strong> is now an active partner. Credentials and custom referral code have been securely registered.
            </p>
          </div>

          {/* Credentials Summary Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Full Name:</span>
              <span className="text-white font-bold">{successData.partner.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Mobile Phone:</span>
              <span className="text-white">{successData.partner.phone}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Custom Referral Code:</span>
              <span className="text-amber-400 font-bold text-base tracking-wider">{successData.partner.referralCode}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Account Status:</span>
              <span className="text-emerald-400 font-bold">🟢 ACTIVE (Instant)</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
              <span className="text-slate-400 font-sans">Commission Rate:</span>
              <span className="text-slate-200">{successData.partner.commissionPercent}% Recurring ({successData.partner.durationType || "6 Months"})</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400 font-sans">Configured Password:</span>
              <span className="text-amber-300 font-bold text-sm">{successData.rawPassword}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Ready to Send:</span> Click the button below to copy the complete WhatsApp onboarding message with login link and password.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              type="button"
              onClick={handleCopyCredentials}
              className="w-full sm:flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {copiedCreds ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Copied WhatsApp Message!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-950" />
                  <span>Copy Partner Credentials (WhatsApp)</span>
                </>
              )}
            </Button>

            <Link href={`/admin/partners/${successData.partner.id}`} className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs px-4 flex items-center gap-1.5"
              >
                <span>View 360° Profile</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSuccessData(null);
                setFormData({
                  fullName: "",
                  phone: "",
                  countryCode: "+91",
                  email: "",
                  city: "",
                  persona: "GROUND_HUSTLER",
                  referralCode: "",
                  password: "",
                  commissionModel: "RECURRING_PERCENT",
                  commissionPercent: 10,
                  bountyAmount: 0,
                  durationType: "6_MONTHS",
                  payoutUpiId: "",
                  pitchNotes: "",
                });
                setHasManuallyEditedCode(false);
                generateRandomPassword();
              }}
              className="w-full sm:w-auto h-12 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs px-4"
            >
              Onboard Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/partners"
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Partners Directory</span>
        </Link>
        <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[11px]">
          Dedicated Admin Onboarding
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <UserPlus className="w-7 h-7 text-amber-400" />
          <span>Onboard New Partner</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Create and instantly activate a verified partner account with custom referral code and password.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Partner Persona */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Partner Persona & Channel <span className="text-rose-400">*</span>
            </h2>
            <span className="text-[11px] text-slate-400">Determines operational focus</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PERSONAS.map((item) => {
              const Icon = item.icon;
              const isSelected = formData.persona === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, persona: item.id })}
                  className={`p-3.5 rounded-2xl border text-left transition-all min-h-[70px] ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-xs text-white">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: Contact & Identity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            2. Contact & Territory Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Vikram Malhotra"
                required
                className="h-11 bg-slate-950 border-slate-800 text-sm text-white rounded-xl focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mobile Number (10 digits) <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center">
                <span className="h-11 px-3.5 bg-slate-950 border border-r-0 border-slate-800 text-slate-400 text-sm rounded-l-xl flex items-center font-mono">
                  +91
                </span>
                <Input
                  type="tel"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                  placeholder="9876543210"
                  required
                  className="h-11 bg-slate-950 border-slate-800 text-sm text-white rounded-r-xl rounded-l-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Operating City / Town <span className="text-rose-400">*</span>
              </label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Mumbai, Surat, Varanasi"
                required
                className="h-11 bg-slate-950 border-slate-800 text-sm text-white rounded-xl focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address (Primary Login) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="partner@example.com"
                  required
                  className="h-11 bg-slate-950 border-slate-800 text-sm text-white rounded-xl focus:border-amber-500 pr-9"
                />
                {emailStatus.checking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  </div>
                )}
              </div>
              {formData.email.trim() && !emailStatus.checking && emailStatus.emailChecked === formData.email.trim().toLowerCase() && (
                <div className="mt-1.5 text-[11px]">
                  {emailStatus.available ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
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
        </div>

        {/* Card 3: Referral Code & Credentials */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              3. Custom Referral Code & Password Setup
            </h2>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
              Live Availability Check
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Referral Code Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Custom Referral Code <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-slate-400">Auto-suggested from name</span>
              </div>
              <div className="relative">
                <Input
                  value={formData.referralCode}
                  onChange={(e) => {
                    setHasManuallyEditedCode(true);
                    setFormData({ ...formData, referralCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") });
                  }}
                  placeholder="e.g. VIKRAMPRO"
                  required
                  maxLength={20}
                  className="h-11 bg-slate-950 border-slate-800 text-sm text-amber-400 font-mono font-bold tracking-wider rounded-xl focus:border-amber-500 uppercase"
                />
                {codeAvailability.checking && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              <div className="mt-1.5 text-[11px]">
                {formData.referralCode.trim().length >= 3 && !codeAvailability.checking && (
                  codeAvailability.codeChecked === formData.referralCode.trim().toUpperCase() && (
                    codeAvailability.available ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
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
                            <span className="text-slate-400 text-[10px]">Suggested alternatives:</span>
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
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Partner Password <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Generate New</span>
                  </button>
                  {formData.password && (
                    <button
                      type="button"
                      onClick={handleCopySinglePassword}
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1"
                    >
                      {copiedPassword ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPassword ? "Copied" : "Copy"}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 characters"
                  required
                  className="h-11 pr-10 bg-slate-950 border-slate-800 text-sm text-white font-mono rounded-xl focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Admin can directly set or generate this password for instant partner login.
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Commission & Payout Terms */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              4. Commission Model & Terms
            </h2>
            <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]">
              Direct Auto-Approval
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "RECURRING_PERCENT", label: "Model B: Recurring %", desc: "Ongoing revenue share" },
              { id: "FLAT_BOUNTY", label: "Model A: Flat Bounty", desc: "One-time milestone bounty" },
              { id: "HYBRID", label: "Hybrid: Bounty + Recurring", desc: "Best of both models" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setFormData({ ...formData, commissionModel: m.id })}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  formData.commissionModel === m.id
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <div className="font-semibold text-xs text-white mb-0.5">{m.label}</div>
                <div className="text-[10px] text-slate-500">{m.desc}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Recurring Commission Rate (%)
              </label>
              <Input
                type="number"
                min={0}
                max={50}
                value={formData.commissionPercent}
                onChange={(e) => setFormData({ ...formData, commissionPercent: Number(e.target.value) })}
                className="h-11 bg-slate-950 border-slate-800 text-sm text-white rounded-xl focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Commission Duration
              </label>
              <select
                value={formData.durationType}
                onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                className="w-full h-11 px-3 bg-slate-950 border border-slate-800 text-sm text-white rounded-xl focus:outline-none focus:border-amber-500"
              >
                <option value="6_MONTHS">6 Months (Default)</option>
                <option value="12_MONTHS">1 Year</option>
                <option value="3_MONTHS">3 Months</option>
                <option value="LIFETIME">Lifetime</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Payout UPI ID (Optional)
              </label>
              <Input
                value={formData.payoutUpiId}
                onChange={(e) => setFormData({ ...formData, payoutUpiId: e.target.value })}
                placeholder="mobile@upi"
                className="h-11 bg-slate-950 border-slate-800 text-sm text-white rounded-xl focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link href="/admin/partners">
            <Button
              type="button"
              variant="outline"
              className="h-12 px-6 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm min-h-[48px]"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || codeAvailability.available === false}
            className="h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 min-h-[48px] shadow-lg shadow-amber-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Onboarding & Activating...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Onboard & Activate Partner</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
