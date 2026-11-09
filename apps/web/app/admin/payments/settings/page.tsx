"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PaymentGatewayConfig } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sliders,
  QrCode,
  Banknote,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Save,
  HelpCircle,
} from "lucide-react";

export default function PaymentGatewaySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const [config, setConfig] = useState<PaymentGatewayConfig>({
    upiManualEnabled: true,
    upiVpa: "salonpayments@icici",
    upiMerchantName: "Queue Engine SaaS",
    cashEnabled: true,
    cashInstructions: "Pay at main cash desk or deposit directly to bank account.",
    razorpayEnabled: false,
    razorpayKeyId: "",
    razorpayKeySecret: "",
  });

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getPaymentConfig();
      if (res.success && res.config) {
        setConfig(res.config);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to load gateway settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.admin.updatePaymentConfig(config);
      if (res.success) {
        showToast("success", "Payment gateway switchboard updated successfully!");
        if (res.config) setConfig(res.config);
      } else {
        showToast("error", "Failed to update gateway settings");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error updating gateway settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : toast.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-blue-950/90 border-blue-500/50 text-blue-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/admin/payments" className="hover:text-slate-200">Payments & Gateway</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-blue-400 font-medium">Gateway Settings</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            ⚙️ Payment Gateway Switchboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Toggle and configure platform checkout options: Manual UPI QR codes, Cash Counter settlements, and Razorpay Sandbox/Production.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfig}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          <Link href="/admin/payments/approvals">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
            >
              Manual Approvals Queue
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
          <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">Loading gateway switchboard settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. UPI Manual QR Card */}
            <Card
              className={`border transition-all ${
                config.upiManualEnabled
                  ? "border-purple-500/40 bg-slate-900/80 shadow-lg shadow-purple-950/20"
                  : "border-slate-800 bg-slate-900/40 opacity-75"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">Manual UPI QR</CardTitle>
                      <CardDescription className="text-xs">NPCI Dynamic Intent & 12-Digit UTR</CardDescription>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.upiManualEnabled}
                      onChange={(e) => setConfig({ ...config, upiManualEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <p className="text-xs text-slate-400">
                  Customers scan dynamic NPCI QR code, complete payment in GPay/PhonePe/Paytm, and submit 12-digit UTR for admin approval. Zero gateway fee (0%).
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Default Payee UPI ID (VPA)</label>
                  <Input
                    value={config.upiVpa || ""}
                    onChange={(e) => setConfig({ ...config, upiVpa: e.target.value })}
                    placeholder="salonpayments@icici"
                    disabled={!config.upiManualEnabled}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-500">Funds go directly to this bank account VPA.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Merchant Business Name</label>
                  <Input
                    value={config.upiMerchantName || ""}
                    onChange={(e) => setConfig({ ...config, upiMerchantName: e.target.value })}
                    placeholder="Queue Engine SaaS"
                    disabled={!config.upiManualEnabled}
                    className="bg-slate-950 border-slate-700 text-white text-xs"
                  />
                  <p className="text-[10px] text-slate-500">Displayed in customer's UPI app before payment.</p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Cash Manual Settlement Card */}
            <Card
              className={`border transition-all ${
                config.cashEnabled
                  ? "border-emerald-500/40 bg-slate-900/80 shadow-lg shadow-emerald-950/20"
                  : "border-slate-800 bg-slate-900/40 opacity-75"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">Cash / Desk Settlement</CardTitle>
                      <CardDescription className="text-xs">Counter & Bank Transfer Workflow</CardDescription>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.cashEnabled}
                      onChange={(e) => setConfig({ ...config, cashEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <p className="text-xs text-slate-400">
                  Allow salon owners to submit an offline cash or NEFT deposit order. Submissions remain pending until admin confirms receipt and manually activates.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Payer Instructions / Bank Details</label>
                  <textarea
                    rows={4}
                    value={config.cashInstructions || ""}
                    onChange={(e) => setConfig({ ...config, cashInstructions: e.target.value })}
                    placeholder="Pay directly at our Head Office or deposit cash into HDFC Bank A/C: 502000... IFSC: HDFC0000123"
                    disabled={!config.cashEnabled}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500">Rendered in the checkout dialog when user clicks Cash.</p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Razorpay Gateway Card */}
            <Card
              className={`border transition-all ${
                config.razorpayEnabled
                  ? "border-blue-500/40 bg-slate-900/80 shadow-lg shadow-blue-950/20"
                  : "border-slate-800 bg-slate-900/40 opacity-75"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">Razorpay PG</CardTitle>
                      <CardDescription className="text-xs">Cards, NetBanking & Auto-Verify</CardDescription>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.razorpayEnabled}
                      onChange={(e) => setConfig({ ...config, razorpayEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-1">
                <p className="text-xs text-slate-400">
                  Fully automated online payment gateway. Activates instant webhooks and webhook signature verification upon successful settlement.
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Razorpay Key ID</label>
                  <Input
                    value={config.razorpayKeyId || ""}
                    onChange={(e) => setConfig({ ...config, razorpayKeyId: e.target.value })}
                    placeholder="rzp_test_..."
                    disabled={!config.razorpayEnabled}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Razorpay Key Secret</label>
                  <Input
                    type="password"
                    value={config.razorpayKeySecret || ""}
                    onChange={(e) => setConfig({ ...config, razorpayKeySecret: e.target.value })}
                    placeholder="••••••••••••••••••••"
                    disabled={!config.razorpayEnabled}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                  />
                  <p className="text-[10px] text-slate-500">Encrypted and validated on the Bun server backend.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Settings are cached in-memory and committed immediately to MySQL.</span>
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 h-10 gap-2 shadow-lg shadow-blue-600/20"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Switchboard Configuration
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}