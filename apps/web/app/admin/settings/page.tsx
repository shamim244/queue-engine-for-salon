"use client";

import React, { Suspense, useState, useEffect } from "react";
import { SettingsNav } from "@/components/admin/settings-nav";
import { api } from "@/lib/api";
import type { PlatformSettings } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  Clock,
  Shield,
  DollarSign,
  Mail,
  Phone,
} from "lucide-react";

interface GeneralFormState {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  defaultTimezone: string;
  defaultGracePeriodMinutes: number;
  defaultBufferMinutes: number;
}

const defaultGeneralState: GeneralFormState = {
  platformName: "Engine Que Enterprise",
  supportEmail: "support@engineque.com",
  supportPhone: "+91 99999 88888",
  defaultCurrency: "INR",
  defaultTimezone: "Asia/Kolkata",
  defaultGracePeriodMinutes: 3,
  defaultBufferMinutes: 5,
};

function GeneralSettingsContent() {
  const [form, setForm] = useState<GeneralFormState>(defaultGeneralState);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const data = await api.admin.getSettings();
        if (data && data.general && isMounted) {
          setForm({
            platformName: data.general.platformName || defaultGeneralState.platformName,
            supportEmail: data.general.supportEmail || defaultGeneralState.supportEmail,
            supportPhone: data.general.supportPhone || defaultGeneralState.supportPhone,
            defaultCurrency: data.general.defaultCurrency || defaultGeneralState.defaultCurrency,
            defaultTimezone: data.general.defaultTimezone || defaultGeneralState.defaultTimezone,
            defaultGracePeriodMinutes:
              data.general.defaultGracePeriodMinutes ?? defaultGeneralState.defaultGracePeriodMinutes,
            defaultBufferMinutes:
              data.general.defaultBufferMinutes ?? defaultGeneralState.defaultBufferMinutes,
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await api.admin.updateSettings({
        general: {
          platformName: form.platformName,
          supportEmail: form.supportEmail,
          supportPhone: form.supportPhone,
          defaultCurrency: form.defaultCurrency,
          defaultTimezone: form.defaultTimezone,
          defaultGracePeriodMinutes: Number(form.defaultGracePeriodMinutes),
          defaultBufferMinutes: Number(form.defaultBufferMinutes),
        },
      });

      if (response && response.success) {
        setSuccessMessage("General platform settings saved successfully.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage("Failed to persist settings. Please review inputs.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">General Platform Settings</h1>
            <p className="text-sm text-slate-400">Core Platform Defaults & Business Rules</p>
          </div>
        </div>
      </div>

      {/* Settings Navigation */}
      <SettingsNav />

      {/* Status Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
          <Badge variant="outline" className="ml-auto border-emerald-700 text-emerald-300 text-xs">
            Saved
          </Badge>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Platform Identity */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              Platform Identity & Contact Channels
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure the public name and escalation contacts displayed on customer portals and receipt summaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-200">Platform Name</label>
              <Input
                value={form.platformName}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                placeholder="Engine Que Enterprise"
                className="bg-slate-950 border-slate-800 text-slate-200"
                required
              />
              <p className="text-xs text-slate-500">The primary brand name displayed across tenant suites and portal headers.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                Support Email
              </label>
              <Input
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                placeholder="support@engineque.com"
                className="bg-slate-950 border-slate-800 text-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                Support Hotline Phone
              </label>
              <Input
                value={form.supportPhone}
                onChange={(e) => setForm({ ...form, supportPhone: e.target.value })}
                placeholder="+91 99999 88888"
                className="bg-slate-950 border-slate-800 text-slate-200"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Regional & Financial Defaults */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Regional & Financial Defaults
            </CardTitle>
            <CardDescription className="text-slate-400">
              Default currency and timezone assigned to newly onboarded salons unless explicitly overridden.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Default Currency</label>
              <select
                value={form.defaultCurrency}
                onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Default Timezone</label>
              <select
                value={form.defaultTimezone}
                onChange={(e) => setForm({ ...form, defaultTimezone: e.target.value })}
                className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +05:30)</option>
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT +08:00)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Operational SLA & Queue Defaults */}
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              Queue State Machine & Buffer Calibration
            </CardTitle>
            <CardDescription className="text-slate-400">
              Platform-wide tolerances for soft-bump grace periods and inter-ticket chair cleaning buffer times.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Default Grace Period (Minutes)</label>
              <Input
                type="number"
                min={1}
                max={30}
                value={form.defaultGracePeriodMinutes}
                onChange={(e) =>
                  setForm({ ...form, defaultGracePeriodMinutes: parseInt(e.target.value) || 3 })
                }
                className="bg-slate-950 border-slate-800 text-slate-200"
                required
              />
              <p className="text-xs text-slate-500">
                Window allowed before an absent customer is placed on soft-bump hold.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Default Stylist Buffer Time (Minutes)</label>
              <Input
                type="number"
                min={0}
                max={30}
                value={form.defaultBufferMinutes}
                onChange={(e) =>
                  setForm({ ...form, defaultBufferMinutes: parseInt(e.target.value) || 0 })
                }
                className="bg-slate-950 border-slate-800 text-slate-200"
                required
              />
              <p className="text-xs text-slate-500">
                Padded turnaround buffer added between consecutive tickets on a single stylist chair.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-800/80 pt-5 flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2 font-medium"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export default function GeneralSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading settings...</div>}>
      <GeneralSettingsContent />
    </Suspense>
  );
}
