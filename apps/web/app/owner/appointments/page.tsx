"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CalendarCheck,
  Percent,
  Banknote,
  ShieldCheck,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Coins,
  ArrowRight,
  Store,
  Zap,
} from "lucide-react";

function OwnerAppointmentsContent() {
  const searchParams = useSearchParams();
  const { salon: authSalon } = useAuth();
  const currentSlug = authSalon?.slug || searchParams.get("salon") || "ramesh-barber";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Policy State
  const [enabled, setEnabled] = useState(true);
  const [policyType, setPolicyType] = useState<"FREE" | "FIXED_TOKEN" | "PERCENTAGE" | "FULL">("FIXED_TOKEN");
  const [tokenAmount, setTokenAmount] = useState(100);
  const [percentage, setPercentage] = useState(40);
  const [allowFreeBooking, setAllowFreeBooking] = useState(true);
  const [cancellationCutoffHours, setCancellationCutoffHours] = useState(2);
  const [isCustomized, setIsCustomized] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      const res = await api.appointments.getPolicy(currentSlug);
      if (res?.policy) {
        setEnabled(res.policy.enabled !== false);
        setPolicyType(res.policy.policyType || "FIXED_TOKEN");
        setTokenAmount(typeof res.policy.tokenAmount === "number" ? res.policy.tokenAmount : 100);
        setPercentage(typeof res.policy.percentage === "number" ? res.policy.percentage : 40);
        setAllowFreeBooking(res.policy.allowFreeBooking ?? true);
        setCancellationCutoffHours(res.policy.cancellationCutoffHours || 2);
        setIsCustomized(Boolean(res.policy.isCustomized));
      }
    } catch (err: any) {
      console.error("Failed to load appointment policy:", err);
      showToast("Could not load appointment policy", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicy();
  }, [currentSlug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.appointments.updatePolicy(currentSlug, {
        enabled,
        policyType,
        tokenAmount: Number(tokenAmount) || 0,
        percentage: Number(percentage) || 40,
        allowFreeBooking: policyType === "FREE",
        cancellationCutoffHours: Number(cancellationCutoffHours) || 2,
      });

      if (res?.success) {
        setIsCustomized(true);
        showToast("Appointment booking policy updated successfully!", "success");
      } else {
        showToast("Failed to update policy", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save policy", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!confirm("Are you sure you want to reset this salon to inherit platform defaults?")) return;
    setResetting(true);
    try {
      const res = await api.appointments.resetPolicyToDefault(currentSlug);
      if (res?.success) {
        await fetchPolicy();
        showToast("Reset to platform default policy successfully!", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to reset policy", "error");
    } finally {
      setResetting(false);
    }
  };

  // Simulation math for a sample ₹300 haircut
  const samplePrice = 300;
  let simulatedAdvance = 0;
  if (!enabled) {
    simulatedAdvance = 0;
  } else if (policyType === "FREE") {
    simulatedAdvance = 0;
  } else if (policyType === "FULL") {
    simulatedAdvance = samplePrice;
  } else if (policyType === "PERCENTAGE") {
    simulatedAdvance = Math.round((samplePrice * (percentage || 40)) / 100);
  } else {
    simulatedAdvance = Math.min(samplePrice, tokenAmount || 100);
  }
  const simulatedBalance = Math.max(0, samplePrice - simulatedAdvance);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-slate-800 rounded-xl" />
        <div className="h-48 bg-slate-900 border border-slate-800 rounded-3xl" />
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition-all animate-in slide-in-from-top-4 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-amber-400" />
              <span>Appointment &amp; Advance Policy</span>
            </h1>
            {isCustomized ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                Custom Salon Policy
              </Badge>
            ) : (
              <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px]">
                Inheriting Platform Default
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Control whether your salon takes online appointments, set advance deposits (Free, 30%, 40%, Token, or Full), and define cancellation grace rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isCustomized && (
            <Button
              type="button"
              variant="outline"
              disabled={resetting}
              onClick={handleResetToDefault}
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs h-9 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{resetting ? "Resetting..." : "Reset to Default"}</span>
            </Button>
          )}

          <Link
            href={`/s/${currentSlug}/book`}
            target="_blank"
            className="h-9 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Store className="h-3.5 w-3.5" />
            <span>Preview Booking Form</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. MASTER TOGGLE: ENABLE / DISABLE APPOINTMENTS */}
        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-xl rounded-3xl overflow-hidden">
          <CardHeader className="p-5 sm:p-6 border-b border-slate-800/80">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Accept Online Appointments</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Allow customers to schedule guaranteed chair slots via your storefront. If turned off, your salon operates exclusively with live walk-in queue tickets.
                </CardDescription>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </CardHeader>

          {enabled && (
            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* 2. ADVANCE PAYMENT MODEL SELECTION */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5 text-amber-400" />
                  <span>Select Advance Payment Model</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: FREE */}
                  <div
                    onClick={() => setPolicyType("FREE")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all select-none flex flex-col justify-between ${
                      policyType === "FREE"
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
                        : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>Free (₹0 Minimum Deposit)</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ₹0 Min.
                          </span>
                        </span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            policyType === "FREE" ? "border-amber-400 bg-amber-400" : "border-slate-600"
                          }`}
                        >
                          {policyType === "FREE" && <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Zero minimum payment required online. Customers settle in person at salon checkout, but can optionally choose to pay 100% upfront online.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: PERCENTAGE (30%, 40%, 50%, 60%) */}
                  <div
                    onClick={() => setPolicyType("PERCENTAGE")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all select-none flex flex-col justify-between ${
                      policyType === "PERCENTAGE"
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
                        : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>Minimum Percentage Deposit</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                            Min. {percentage}%
                          </span>
                        </span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            policyType === "PERCENTAGE" ? "border-amber-400 bg-amber-400" : "border-slate-600"
                          }`}
                        >
                          {policyType === "PERCENTAGE" && <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Clients must pay at least this percentage to reserve. Clients can always choose to pay 100% in full, but cannot pay less than your minimum.
                      </p>
                    </div>
                  </div>

                  {/* Option 3: FIXED TOKEN */}
                  <div
                    onClick={() => setPolicyType("FIXED_TOKEN")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all select-none flex flex-col justify-between ${
                      policyType === "FIXED_TOKEN"
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
                        : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>Minimum Fixed Token Deposit</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                            Min. ₹{tokenAmount}
                          </span>
                        </span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            policyType === "FIXED_TOKEN" ? "border-amber-400 bg-amber-400" : "border-slate-600"
                          }`}
                        >
                          {policyType === "FIXED_TOKEN" && <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Clients must pay at least this flat token to reserve. Clients can choose to pay 100% in full, but cannot pay less than this token.
                      </p>
                    </div>
                  </div>

                  {/* Option 4: FULL PREPAYMENT */}
                  <div
                    onClick={() => setPolicyType("FULL")}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all select-none flex flex-col justify-between ${
                      policyType === "FULL"
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
                        : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>100% Full Prepayment Required</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-mono">
                            100% Total
                          </span>
                        </span>
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            policyType === "FULL" ? "border-amber-400 bg-amber-400" : "border-slate-600"
                          }`}
                        >
                          {policyType === "FULL" && <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">
                        Clients must pay the complete 100% bill upfront before arrival. Zero balance left to settle at chair checkout.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. DYNAMIC CONFIGURATION CONTROLS */}
              {policyType === "PERCENTAGE" && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5 text-amber-400" />
                      <span>Custom Advance Percentage</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">{percentage}%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={5}
                      max={95}
                      value={percentage}
                      onChange={(e) => setPercentage(Math.min(95, Math.max(5, Number(e.target.value))))}
                      className="bg-slate-900 border-slate-700 text-white font-mono text-sm w-28"
                    />

                    {/* Quick percentage presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {[20, 30, 40, 50, 60, 75].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setPercentage(pct)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                            percentage === pct
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Recommended: 30% or 40% gives clients low commitment friction while stopping no-shows.
                  </p>
                </div>
              )}

              {policyType === "FIXED_TOKEN" && (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span>Fixed Token Deposit Amount (₹)</span>
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">₹{tokenAmount}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={10}
                      step={10}
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(Math.max(0, Number(e.target.value)))}
                      className="bg-slate-900 border-slate-700 text-white font-mono text-sm w-32"
                    />

                    <div className="flex flex-wrap gap-1.5">
                      {[50, 100, 150, 200, 300].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTokenAmount(amt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                            tokenAmount === amt
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. MINIMUM DEPOSIT & FULL PREPAYMENT POLICY NOTICE */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white">
                    {policyType === "FREE"
                      ? "Free Reservation Policy (₹0 Online Minimum)"
                      : "Minimum Deposit Guarantee Policy"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {policyType === "FREE"
                    ? "Clients can reserve chair slots for ₹0 and pay in person after service completion. They also have the convenient choice to pay 100% upfront online."
                    : `Your configured ${
                        policyType === "PERCENTAGE"
                          ? `${percentage}% advance`
                          : policyType === "FULL"
                          ? "100% prepayment"
                          : `₹${tokenAmount} token`
                      } acts as the strict minimum deposit. Clients cannot pay less than this amount, but can freely choose to pay 100% in full.`}
                </p>
              </div>

              {/* 5. CANCELLATION & RESCHEDULE WINDOW */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Free Reschedule &amp; Cancellation Grace Window</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={cancellationCutoffHours}
                    onChange={(e) => setCancellationCutoffHours(Number(e.target.value))}
                    className="h-9 px-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value={1}>1 hour before slot</option>
                    <option value={2}>2 hours before slot (Standard)</option>
                    <option value={4}>4 hours before slot</option>
                    <option value={12}>12 hours before slot</option>
                    <option value={24}>24 hours before slot</option>
                  </select>
                  <p className="text-[11px] text-slate-400">
                    100% deposit rolls over to the new slot when rescheduled before this window.
                  </p>
                </div>
              </div>

              {/* 6. LIVE SIMULATION PREVIEW CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 space-y-3 shadow-lg shadow-black/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Live Consumer Checkout Preview</span>
                  </span>
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                    Interactive Example
                  </Badge>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Sample Service: Haircut &amp; Beard Styling</span>
                    <span className="font-mono font-bold text-white">₹{samplePrice}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-amber-400 font-bold">
                    <span>Minimum Required Deposit (Default):</span>
                    <span className="font-mono text-sm">
                      {simulatedAdvance === 0 ? "₹0 (Pay at Salon)" : `₹${simulatedAdvance}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400 font-semibold text-[11px]">
                    <span>100% Full Payment (Optional Choice):</span>
                    <span className="font-mono text-sm font-bold">₹{samplePrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px] border-t border-slate-800/60 pt-1.5">
                    <span>Balance Due at Chair (if paying minimum):</span>
                    <span className="font-mono text-white font-semibold">₹{simulatedBalance}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          )}

          <CardFooter className="p-5 sm:p-6 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Applied instantly to your storefront &amp; booking links.</span>
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-10 px-6 gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {saving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? "Saving Changes..." : "Save Appointment Policy"}</span>
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export default function OwnerAppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading Appointment Settings...</div>}>
      <OwnerAppointmentsContent />
    </Suspense>
  );
}
