"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { adminPartnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Percent,
  Wallet,
  Store,
  History,
  Lock,
  PauseCircle,
  PlayCircle,
  ExternalLink,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminPartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [partner, setPartner] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [attributions, setAttributions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [customReferralCodeInput, setCustomReferralCodeInput] = useState("");

  // Password Management State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const special = "@#$!";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += special.charAt(Math.floor(Math.random() * special.length));
    pwd += Math.floor(10 + Math.random() * 90);
    setNewPassword(pwd);
    setCopied(false);
    setPasswordSuccessMessage(null);
    setPasswordErrorMessage(null);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner) return;
    if (newPassword.trim().length < 8) {
      setPasswordErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsSettingPassword(true);
    setPasswordErrorMessage(null);
    setPasswordSuccessMessage(null);
    try {
      const res = await adminPartnerApi.setPassword(partner.id, newPassword.trim());
      if (res.success) {
        setPasswordSuccessMessage(`Password updated successfully for ${partner.fullName}!`);
        await loadPartnerDetails();
      } else {
        setPasswordErrorMessage(res.message || "Failed to set password.");
      }
    } catch (err: any) {
      setPasswordErrorMessage(err?.message || "Failed to set password.");
    } finally {
      setIsSettingPassword(false);
    }
  };

  // Form Terms
  const [terms, setTerms] = useState({
    commissionModel: "RECURRING_PERCENT",
    commissionPercent: 10,
    bountyAmount: 0,
    durationType: "6_MONTHS",
    isCommissionPaused: false,
  });

  const loadPartnerDetails = async () => {
    try {
      const res = await adminPartnerApi.getPartner(id);
      if (res.success) {
        setPartner(res.partner);
        setWallet(res.wallet);
        setAttributions(res.attributions || []);
        setLedger(res.ledger || []);
        setCustomReferralCodeInput(res.partner.referralCode || "");
        setTerms({
          commissionModel: res.partner.commissionModel || "RECURRING_PERCENT",
          commissionPercent: res.partner.commissionPercent || 10,
          bountyAmount: res.partner.bountyAmount || 0,
          durationType: res.partner.durationType || "6_MONTHS",
          isCommissionPaused: Boolean(res.partner.isCommissionPaused),
        });
      }
    } catch (err) {
      console.error("Error loading partner:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPartnerDetails();
  }, [id]);

  const handleSaveTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (customReferralCodeInput.trim() && customReferralCodeInput.trim().toUpperCase() !== partner.referralCode) {
        await adminPartnerApi.updateReferralCode(id, customReferralCodeInput.trim().toUpperCase());
      }

      const res = await adminPartnerApi.updateCommission(id, {
        commissionModel: terms.commissionModel,
        commissionPercent: Number(terms.commissionPercent),
        bountyAmount: Number(terms.bountyAmount),
        durationType: terms.durationType,
        isCommissionPaused: terms.isCommissionPaused,
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await loadPartnerDetails();
      }
    } catch (err) {
      console.error("Error saving partner terms:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="p-8 text-center text-slate-400">
        Partner not found.
        <div className="mt-4">
          <Link href="/admin/partners">
            <Button variant="outline">Return to Directory</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Header */}
      <div>
        <Link
          href="/admin/partners"
          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Partner Directory</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {partner.fullName}
              </h1>
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs">
                {partner.persona}
              </Badge>
              <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-mono text-xs">
                {partner.referralCode}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Mobile: <span className="text-slate-200 font-mono">{partner.phone}</span> • City:{" "}
              <span className="text-slate-200">{partner.city}</span> • Status:{" "}
              <span className="font-bold text-amber-400">{partner.status}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {partner.hasPassword ? (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password Set</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="border-rose-500/40 text-rose-400 bg-rose-500/10 text-xs flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No Password Set</span>
              </Badge>
            )}

            <Button
              size="sm"
              onClick={() => {
                setShowPasswordModal(true);
                setNewPassword("");
                setPasswordSuccessMessage(null);
                setPasswordErrorMessage(null);
                setCopied(false);
              }}
              className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{partner.hasPassword ? "Reset Password" : "Set Password"}</span>
            </Button>

            <Badge
              variant="outline"
              className={
                terms.isCommissionPaused
                  ? "border-rose-500/30 text-rose-300 bg-rose-500/10"
                  : "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
              }
            >
              {terms.isCommissionPaused ? "Commission Paused" : "Commission Accruing"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Authentication & Account Security Governance */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>Authentication & Security Governance</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Field partners log in at <span className="font-mono text-slate-300">/partner/login</span> using their Mobile Phone (+91), Email, or Referral Code with this password.
            </p>
          </div>

          <Button
            onClick={() => {
              setShowPasswordModal(true);
              setNewPassword("");
              setPasswordSuccessMessage(null);
              setPasswordErrorMessage(null);
              setCopied(false);
            }}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0"
          >
            <KeyRound className="w-4 h-4" />
            <span>{partner.hasPassword ? "Reset Partner Password" : "Set Partner Password"}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block text-[11px] mb-1">Password Status</span>
            {partner.hasPassword ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Configured & Verified
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Missing (Partner cannot log in)
              </span>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block text-[11px] mb-1">Supported Login Identifiers</span>
            <div className="font-mono text-slate-200 text-[11px] space-y-0.5">
              <div>Phone: {partner.phone}</div>
              {partner.email && <div>Email: {partner.email}</div>}
              <div>Code: {partner.referralCode}</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-slate-400 block text-[11px] mb-1">Security Standard</span>
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Bcrypt Hash (Cost 10)
            </span>
          </div>
        </div>
      </div>

      {/* Contract Terms Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Percent className="w-5 h-5 text-amber-400" />
          <span>Partner Terms & Commission Governance</span>
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Adjust recurring subscription rate, promotional activation bounty, duration window, or toggle commission pause.
        </p>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-6 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Partner terms updated successfully! Applied to future transactions.</span>
          </div>
        )}

        <form onSubmit={handleSaveTerms} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Referral Code */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Partner Referral Code
              </label>
              <Input
                type="text"
                value={customReferralCodeInput}
                onChange={(e) => setCustomReferralCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                maxLength={20}
                className="h-12 rounded-xl bg-slate-950 border-slate-700 text-amber-400 font-mono font-bold text-sm tracking-wider uppercase"
                required
              />
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Commission Model
              </label>
              <select
                value={terms.commissionModel}
                onChange={(e) => setTerms({ ...terms, commissionModel: e.target.value })}
                className="w-full h-12 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs px-3 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="RECURRING_PERCENT">Model B (Recurring SaaS %)</option>
                <option value="FLAT_BOUNTY">Model A (Flat Activation Bounty)</option>
                <option value="HYBRID">Model Hybrid (Bounty + Recurring %)</option>
              </select>
            </div>

            {/* Recurring % */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Recurring Commission (%)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step={0.5}
                  min={0}
                  max={50}
                  value={terms.commissionPercent}
                  onChange={(e) => setTerms({ ...terms, commissionPercent: Number(e.target.value) })}
                  className="h-12 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-sm pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  %
                </span>
              </div>
            </div>

            {/* Bounty Amount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Activation Bounty (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  step={50}
                  min={0}
                  value={terms.bountyAmount}
                  onChange={(e) => setTerms({ ...terms, bountyAmount: Number(e.target.value) })}
                  className="h-12 pl-7 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-sm"
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Duration Type
              </label>
              <select
                value={terms.durationType}
                onChange={(e) => setTerms({ ...terms, durationType: e.target.value })}
                className="w-full h-12 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs px-3 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="3_MONTHS">3 Months Window</option>
                <option value="6_MONTHS">6 Months Window</option>
                <option value="12_MONTHS">12 Months Window</option>
                <option value="LIFETIME">Lifetime Attribution</option>
              </select>
            </div>
          </div>

          {/* Pause Commission Toggle */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-bold text-xs text-white block">
                Pause Commission Accrual
              </span>
              <span className="text-[11px] text-slate-400">
                When paused, new transactions will generate ₹0.00 commission for this partner.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={terms.isCommissionPaused}
                onChange={(e) => setTerms({ ...terms, isCommissionPaused: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Updated Terms</span>
          </Button>
        </form>
      </div>

      {/* Attributed Salons */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-400" />
          <span>Attributed Salons ({attributions.length})</span>
        </h2>
        <div className="divide-y divide-slate-800">
          {attributions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No salons attributed to this partner yet.
            </div>
          ) : (
            attributions.map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-200">Salon ID: {a.salonId}</div>
                  <div className="text-[11px] text-slate-500">Source: {a.source}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={a.qualificationStatus === "QUALIFIED" ? "secondary" : "outline"}
                    className={
                      a.qualificationStatus === "QUALIFIED"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]"
                        : "border-amber-500/30 text-amber-300 text-[10px]"
                    }
                  >
                    {a.qualificationStatus} ({a.ticketsCompletedCount}/15 tickets)
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Set / Reset Password Modal Dialog */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {partner.hasPassword ? "Reset Partner Password" : "Set Initial Password"}
                  </h3>
                  <p className="text-[11px] text-slate-400">Configure credentials for login</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Partner Snapshot */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Partner:</span>
                <span className="font-bold text-white">{partner.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mobile / Login ID:</span>
                <span className="font-mono text-slate-200">{partner.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referral Code:</span>
                <span className="font-mono font-bold text-amber-400">{partner.referralCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Auth:</span>
                <span className="text-[10px]">
                  {partner.hasPassword ? (
                    <span className="text-emerald-400 font-semibold">● Password Already Set</span>
                  ) : (
                    <span className="text-rose-400 font-semibold">● No Password Configured</span>
                  )}
                </span>
              </div>
            </div>

            {passwordErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordErrorMessage}</span>
              </div>
            )}

            {passwordSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs mb-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    New Password <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold hover:underline"
                  >
                    + Generate Strong Password
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showModalPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 pr-20 h-11 bg-slate-950 border-slate-700 text-white rounded-xl placeholder:text-slate-500 text-xs"
                    required
                    minLength={8}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="p-1 text-slate-400 hover:text-white"
                      tabIndex={-1}
                      title={showModalPassword ? "Hide" : "Show"}
                    >
                      {showModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {newPassword && (
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-1 text-slate-400 hover:text-amber-400"
                        tabIndex={-1}
                        title="Copy to Clipboard"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                {copied && (
                  <p className="text-[10px] text-emerald-400 font-medium">Copied password to clipboard!</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                <span className="font-bold text-amber-300">Admin Tip:</span> Share this password securely with the partner via WhatsApp or phone. They will log in using their phone/email and this password at <span className="font-mono text-slate-300">/partner/login</span>.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={isSettingPassword || !newPassword.trim()}
                  className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isSettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Password</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
