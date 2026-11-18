"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { adminPartnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Settings,
  Percent,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Clock,
  Sparkles,
  Ticket,
  Wallet,
  Users,
} from "lucide-react";

export default function AdminPartnerSettingsPage() {
  const [settings, setSettings] = useState({
    defaultCommissionModel: "RECURRING_PERCENT",
    defaultCommissionPercent: 10,
    defaultBountyAmount: 0,
    defaultDurationType: "6_MONTHS",
    defaultReferralDiscountPercent: 10,
    qualificationTicketsThreshold: 15,
    minPayoutThreshold: 500,
    autoApprovePartners: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await adminPartnerApi.getSettings();
        if (res.success && res.settings) {
          setSettings(res.settings);
        }
      } catch (err: any) {
        console.error("Error loading partner settings:", err);
        setErrorMessage(err?.message || "Failed to load settings.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await adminPartnerApi.updateSettings(settings);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        setErrorMessage(res.message || "Failed to save settings.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save settings.");
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

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div>
        <Link
          href="/admin/partners"
          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Partner Directory</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs">
                Partner Governance
              </Badge>
              <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-xs">
                Platform Rules
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Partner Program Settings & Rules
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure global defaults for partner commissions, salon signup discounts, ticket milestones, and payout limits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/partners/marketing">
              <Button variant="outline" className="h-10 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs">
                Marketing CMS
              </Button>
            </Link>
            <Link href="/admin/partners/attributions">
              <Button variant="outline" className="h-10 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs">
                Attributions
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Global partner program settings updated successfully! All future partner quotes and transactions will apply these rules.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Default Commission Architecture */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-400" />
              <span>Default Commission Slabs & Model</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              New partners will inherit these terms upon registration. Terms can still be tailored individually per partner.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Model */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Default Commission Model
              </label>
              <select
                value={settings.defaultCommissionModel}
                onChange={(e) => setSettings({ ...settings, defaultCommissionModel: e.target.value as any })}
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
                Default Recurring Commission (%)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step={0.5}
                  min={0}
                  max={50}
                  value={settings.defaultCommissionPercent}
                  onChange={(e) => setSettings({ ...settings, defaultCommissionPercent: Number(e.target.value) })}
                  className="h-12 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-sm pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  %
                </span>
              </div>
            </div>

            {/* Bounty Amount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Default Activation Bounty (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  step={50}
                  min={0}
                  value={settings.defaultBountyAmount}
                  onChange={(e) => setSettings({ ...settings, defaultBountyAmount: Number(e.target.value) })}
                  className="h-12 pl-7 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-sm"
                  required
                />
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Commission Duration Window
              </label>
              <select
                value={settings.defaultDurationType}
                onChange={(e) => setSettings({ ...settings, defaultDurationType: e.target.value as any })}
                className="w-full h-12 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs px-3 focus:outline-none focus:border-amber-500 font-semibold"
              >
                <option value="3_MONTHS">3 Months Window</option>
                <option value="6_MONTHS">6 Months Window (Default)</option>
                <option value="12_MONTHS">12 Months Window</option>
                <option value="LIFETIME">Lifetime Attribution</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Bilateral Discount & Qualification Engine */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Salon Bilateral Discount & Anti-Fraud Milestone</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Rules governing customer incentives when using partner promo codes and locking milestones.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Salon Referral Discount */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Salon Referral Discount (%)
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step={1}
                  min={0}
                  max={30}
                  value={settings.defaultReferralDiscountPercent}
                  onChange={(e) => setSettings({ ...settings, defaultReferralDiscountPercent: Number(e.target.value) })}
                  className="h-12 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-sm pr-8"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  %
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Discounts automatically quoted on step 3 of the Onboarding Wizard when a partner code is applied.
              </p>
            </div>

            {/* Qualification Threshold */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Ticket Qualification Threshold
              </label>
              <div className="relative">
                <Ticket className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="number"
                  step={1}
                  min={1}
                  max={100}
                  value={settings.qualificationTicketsThreshold}
                  onChange={(e) => setSettings({ ...settings, qualificationTicketsThreshold: Number(e.target.value) })}
                  className="h-12 pl-9 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-sm"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Completed real queue tickets required before locked commission moves to Available balance.
              </p>
            </div>

            {/* Min Payout Threshold */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Minimum Withdrawal Threshold (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  ₹
                </span>
                <Input
                  type="number"
                  step={50}
                  min={100}
                  value={settings.minPayoutThreshold}
                  onChange={(e) => setSettings({ ...settings, minPayoutThreshold: Number(e.target.value) })}
                  className="h-12 pl-7 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-sm"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Minimum wallet balance required before a partner can submit a UPI/Bank payout request.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Partner Onboarding Policy */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-white block">
                Auto-Approve Partner Applications
              </span>
              <span className="text-xs text-slate-400">
                When enabled, new partner applicants at <span className="font-mono text-slate-300">/partner/join</span> will be set to ACTIVE immediately without requiring manual admin approval.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoApprovePartners}
                onChange={(e) => setSettings({ ...settings, autoApprovePartners: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/partners">
            <Button type="button" variant="outline" className="h-12 px-6 rounded-xl border-slate-700 text-slate-300 text-xs">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSaving}
            className="h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 min-h-[48px]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Program Settings</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
