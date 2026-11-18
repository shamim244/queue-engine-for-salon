"use client";

import React, { useState, useEffect } from "react";
import { partnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User,
  CreditCard,
  Building2,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Save,
  Percent,
  AlertCircle,
  Landmark,
  Smartphone,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Tag,
  Sparkles,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export default function PartnerProfilePage() {
  const [partner, setPartner] = useState<any>(null);
  const [formData, setFormData] = useState({
    payoutUpiId: "",
    payoutHolderName: "",
    payoutBankName: "",
    payoutBankAccount: "",
    confirmBankAccount: "",
    payoutBankIfsc: "",
    payoutAccountType: "SAVINGS",
    pitchNotes: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Custom Referral Code State
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeAvailability, setCodeAvailability] = useState<{ available: boolean; message: string; suggestions?: string[] } | null>(null);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [codeSuccessMessage, setCodeSuccessMessage] = useState<string | null>(null);
  const [codeErrorMessage, setCodeErrorMessage] = useState<string | null>(null);

  const handleCheckAvailability = async (codeToTest?: string) => {
    const raw = typeof codeToTest === "string" ? codeToTest : customCodeInput;
    const clean = raw.trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setCodeAvailability({ available: false, message: "Code must be 3 to 20 characters." });
      return;
    }
    if (clean === partner?.referralCode?.toUpperCase()) {
      setCodeAvailability({ available: true, message: "This is your current active referral code." });
      return;
    }
    setIsCheckingCode(true);
    setCodeAvailability(null);
    try {
      const res = await partnerApi.checkCodeAvailability(clean, { excludeSelf: true });
      setCodeAvailability({ available: res.available, message: res.message, suggestions: res.suggestions });
    } catch (err: any) {
      setCodeAvailability({ available: false, message: err?.message || "Error checking code." });
    } finally {
      setIsCheckingCode(false);
    }
  };

  const handleSaveReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeErrorMessage(null);
    setCodeSuccessMessage(null);
    const clean = customCodeInput.trim().toUpperCase();
    if (!clean) {
      setCodeErrorMessage("Please enter a referral code.");
      return;
    }
    if (clean === partner?.referralCode?.toUpperCase()) {
      setCodeSuccessMessage("Referral code is already set to this value.");
      return;
    }
    setIsSavingCode(true);
    try {
      const res = await partnerApi.updateReferralCode(clean);
      if (res.success && res.partner) {
        setPartner(res.partner);
        setCodeSuccessMessage(`Referral code updated to "${clean}" successfully!`);
        setCodeAvailability(null);
        setTimeout(() => setCodeSuccessMessage(null), 4000);
      } else {
        setCodeErrorMessage(res.message || "Failed to update referral code.");
      }
    } catch (err: any) {
      setCodeErrorMessage(err?.message || "Failed to update referral code.");
    } finally {
      setIsSavingCode(false);
    }
  };

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordData.newPassword.trim().length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setPasswordError("New passwords do not match. Please verify.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await partnerApi.changePassword({
        currentPassword: passwordData.currentPassword.trim() || undefined,
        newPassword: passwordData.newPassword.trim(),
      });
      if (res.success) {
        setPasswordSuccess(true);
        setPasswordData({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
        setTimeout(() => setPasswordSuccess(false), 4000);
      } else {
        setPasswordError(res.message || "Failed to update password.");
      }
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await partnerApi.getMe();
        if (res.success && res.partner) {
          setPartner(res.partner);
          setCustomCodeInput(res.partner.referralCode || "");
          setFormData({
            payoutUpiId: res.partner.payoutUpiId || "",
            payoutHolderName: res.partner.payoutHolderName || "",
            payoutBankName: res.partner.payoutBankName || "",
            payoutBankAccount: res.partner.payoutBankAccount || "",
            confirmBankAccount: res.partner.payoutBankAccount || "",
            payoutBankIfsc: res.partner.payoutBankIfsc || "",
            payoutAccountType: res.partner.payoutAccountType || "SAVINGS",
            pitchNotes: res.partner.pitchNotes || "",
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    // Validate Bank Account matching if provided
    if (formData.payoutBankAccount.trim()) {
      if (formData.payoutBankAccount.trim() !== formData.confirmBankAccount.trim()) {
        setErrorMessage("Bank account numbers do not match. Please verify.");
        return;
      }
    }

    // Validate IFSC code format if provided
    if (formData.payoutBankIfsc.trim()) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      const cleanedIfsc = formData.payoutBankIfsc.trim().toUpperCase();
      if (!ifscRegex.test(cleanedIfsc)) {
        setErrorMessage("Invalid Indian IFSC Code format (e.g., HDFC0001234, SBIN0001234).");
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await partnerApi.updatePayoutMethods({
        payoutUpiId: formData.payoutUpiId.trim() || undefined,
        payoutHolderName: formData.payoutHolderName.trim() || undefined,
        payoutBankName: formData.payoutBankName.trim() || undefined,
        payoutBankAccount: formData.payoutBankAccount.trim() || undefined,
        payoutBankIfsc: formData.payoutBankIfsc.trim().toUpperCase() || undefined,
        payoutAccountType: formData.payoutAccountType,
      });

      if (formData.pitchNotes !== (partner?.pitchNotes || "")) {
        await partnerApi.updateProfile({ pitchNotes: formData.pitchNotes.trim() });
      }

      if (res.success) {
        if (res.partner) {
          setPartner(res.partner);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setErrorMessage(res.message || "Failed to update payout settings.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Error saving payout configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs mb-1.5">
          Account & Banking
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Partner Profile & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your verified Indian bank account, UPI VPA handle, and attribution contract details.
        </p>
      </div>

      {/* Personal Identity & Registered Credentials Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>Registered Partner Identity & Login Credentials</span>
          </h2>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10 text-xs">
            {partner?.status || "ACTIVE"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Primary Login Email</span>
              <span className="font-semibold text-xs text-white truncate block">{partner?.email || "—"}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Registered Mobile Number</span>
              <span className="font-semibold text-xs text-white font-mono block">{partner?.phone || "—"}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Full Legal Name</span>
              <span className="font-semibold text-xs text-white block">{partner?.fullName || "—"}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Operating City & Persona</span>
              <span className="font-semibold text-xs text-white block">
                {partner?.city || "India"} • {partner?.persona || "GROUND_HUSTLER"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Terms Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <Percent className="w-4 h-4" />
          <span>Active Terms & Attribution Contract</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Referral Code</span>
            <span className="font-mono font-bold text-sm text-amber-400">{partner?.referralCode}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Model</span>
            <span className="font-bold text-xs text-white">{partner?.commissionModel}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Recurring Rate</span>
            <span className="font-bold text-sm text-emerald-400">{partner?.commissionPercent}%</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-semibold">Duration</span>
            <span className="font-bold text-xs text-white">{partner?.durationType}</span>
          </div>
        </div>
      </div>

      {/* Custom Referral Code Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <span>Personalized Referral Code</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose a memorable, custom referral identifier for salons. When salons register with this code, they receive the partner discount and are permanently linked to your commissions.
          </p>
        </div>

        {codeSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{codeSuccessMessage}</span>
          </div>
        )}

        {codeErrorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{codeErrorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSaveReferralCode} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Custom Referral Identifier
              </label>
              {partner?.referralCode && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Current Active: <strong className="text-amber-400 font-bold">{partner.referralCode}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="e.g. VIPBARBER or RAMESH10"
                  value={customCodeInput}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                    setCustomCodeInput(val);
                    setCodeAvailability(null);
                    setCodeErrorMessage(null);
                  }}
                  maxLength={20}
                  className="h-12 rounded-xl bg-slate-900 border-slate-700 text-white font-mono font-bold text-sm tracking-wider uppercase min-h-[48px]"
                  required
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleCheckAvailability()}
                disabled={isCheckingCode || !customCodeInput.trim() || customCodeInput.trim().toUpperCase() === partner?.referralCode}
                className="h-12 px-4 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-semibold min-h-[48px]"
              >
                {isCheckingCode ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Check Availability"
                )}
              </Button>
            </div>

            {/* Live Availability Feedback */}
            {codeAvailability && (
              <div className="space-y-1.5">
                <div
                  className={`text-xs flex items-center gap-1.5 font-medium ${
                    codeAvailability.available ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {codeAvailability.available ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>{codeAvailability.message}</span>
                </div>
                {!codeAvailability.available && codeAvailability.suggestions && codeAvailability.suggestions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-slate-400 text-[10px]">Suggested alternatives:</span>
                    {codeAvailability.suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setCustomCodeInput(sug);
                          handleCheckAvailability(sug);
                        }}
                        className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[10px] transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Format: 3 to 20 uppercase characters (A-Z, 0-9, hyphens or underscores). Must be unique across all partners.
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSavingCode || !customCodeInput.trim() || customCodeInput.trim().toUpperCase() === partner?.referralCode}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-11 px-6 rounded-xl flex items-center gap-2 min-h-[44px]"
            >
              {isSavingCode ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Code...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Referral Code</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Payout & Bank Settings Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-400" />
            <span>Verified Payout Destinations (Profile Settings)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure your UPI and Indian Bank Account details here. During withdrawal, you simply select from your saved methods.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Payout methods saved and verified successfully!</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Section 1: UPI Destination */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>1. Instant UPI Settlement (VPA)</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Primary UPI ID / VPA
              </label>
              <Input
                type="text"
                placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                value={formData.payoutUpiId}
                onChange={(e) => setFormData({ ...formData, payoutUpiId: e.target.value })}
                className="h-11 rounded-xl bg-slate-900 border-slate-700 text-white font-mono text-sm min-h-[48px]"
              />
              <p className="text-[11px] text-slate-400">
                Used for instant UPI transfer withdrawals.
              </p>
            </div>
          </div>

          {/* Section 2: Indian Bank Account Form */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              <span>2. Direct Indian Bank Account (NEFT / IMPS)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Account Holder Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Sunita Rao"
                  value={formData.payoutHolderName}
                  onChange={(e) => setFormData({ ...formData, payoutHolderName: e.target.value })}
                  className="h-11 rounded-xl bg-slate-900 border-slate-700 text-white text-sm min-h-[48px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Bank Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. State Bank of India, HDFC Bank"
                  value={formData.payoutBankName}
                  onChange={(e) => setFormData({ ...formData, payoutBankName: e.target.value })}
                  className="h-11 rounded-xl bg-slate-900 border-slate-700 text-white text-sm min-h-[48px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Bank Account Number
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 501009988776"
                  value={formData.payoutBankAccount}
                  onChange={(e) => setFormData({ ...formData, payoutBankAccount: e.target.value })}
                  className="h-11 rounded-xl bg-slate-900 border-slate-700 text-white font-mono text-sm min-h-[48px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Confirm Bank Account Number
                </label>
                <Input
                  type="text"
                  placeholder="Re-enter account number"
                  value={formData.confirmBankAccount}
                  onChange={(e) => setFormData({ ...formData, confirmBankAccount: e.target.value })}
                  className="h-11 rounded-xl bg-slate-900 border-slate-700 text-white font-mono text-sm min-h-[48px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Bank IFSC Code (11 alphanumeric characters)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. SBIN0001234, HDFC0000456"
                  value={formData.payoutBankIfsc}
                  onChange={(e) => setFormData({ ...formData, payoutBankIfsc: e.target.value.toUpperCase() })}
                  className="h-11 rounded-xl bg-slate-900 border-slate-700 text-amber-400 font-mono text-sm uppercase min-h-[48px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payoutAccountType: "SAVINGS" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                      formData.payoutAccountType === "SAVINGS"
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    Savings A/C
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, payoutAccountType: "CURRENT" })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[44px] ${
                      formData.payoutAccountType === "CURRENT"
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    Current A/C
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Pitch Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Pitch / Partner Bio Notes
            </label>
            <textarea
              rows={2}
              value={formData.pitchNotes}
              onChange={(e) => setFormData({ ...formData, pitchNotes: e.target.value })}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs min-h-[48px]"
              placeholder="Tell us about your target salon network or growth strategy..."
            />
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 min-h-[48px] shadow-lg shadow-emerald-900/20"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Verified Payout Methods</span>
          </Button>
        </form>
      </div>

      {/* Security & Password Settings Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <span>Account Security & Login Password</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Update your partner account password used for logging into <span className="font-mono text-slate-300">/partner/login</span>.
          </p>
        </div>

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Password updated successfully! Use your new password for your next login.</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Current Password (Optional if newly assigned by Super Admin)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="pl-9 pr-10 h-11 rounded-xl bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 text-xs min-h-[48px]"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                New Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="pl-9 pr-10 h-11 rounded-xl bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 text-xs min-h-[48px]"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Confirm New Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type={showConfirmNewPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={passwordData.confirmNewPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                  className="pl-9 pr-10 h-11 rounded-xl bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 text-xs min-h-[48px]"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isChangingPassword || !passwordData.newPassword.trim()}
            className="w-full sm:w-auto h-11 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 min-h-[48px] shadow-lg shadow-amber-500/20"
          >
            {isChangingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            <span>Update Account Password</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
