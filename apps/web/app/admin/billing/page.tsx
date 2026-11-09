"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type {
  Organization,
  SubscriptionPlan,
  PaymentOrder,
  PaymentGatewayConfig,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CreatePlanModal, ALL_PLAN_FEATURES } from "@/components/admin/billing/create-plan-modal";
import {
  CreditCard,
  Building,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Zap,
  ShieldCheck,
  Check,
  TrendingUp,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Plus,
  Edit2,
  Archive,
  Layers,
  Store,
  Users,
  QrCode,
  Banknote,
  Sliders,
  X,
  Copy,
} from "lucide-react";

interface BillingTransaction {
  id: string;
  invoiceNo: string;
  orgName: string;
  tier: "STARTER" | "PRO" | "ENTERPRISE";
  amount: number;
  date: string;
  status: "PAID" | "PENDING" | "PROCESSING";
  method: "UPI AutoPay" | "NetBanking" | "Corporate Card";
}

const sampleTransactions: BillingTransaction[] = [
  {
    id: "tx-101",
    invoiceNo: "EQ-INV-2026-1101",
    orgName: "Aura Luxury Wellness Chain",
    tier: "ENTERPRISE",
    amount: 4999,
    date: "Nov 01, 2026",
    status: "PAID",
    method: "Corporate Card",
  },
  {
    id: "tx-102",
    invoiceNo: "EQ-INV-2026-1102",
    orgName: "Ramesh Traditional Barber",
    tier: "STARTER",
    amount: 499,
    date: "Nov 01, 2026",
    status: "PAID",
    method: "UPI AutoPay",
  },
  {
    id: "tx-103",
    invoiceNo: "EQ-INV-2026-1028",
    orgName: "Metro Grooming Studio",
    tier: "PRO",
    amount: 1499,
    date: "Oct 28, 2026",
    status: "PAID",
    method: "UPI AutoPay",
  },
  {
    id: "tx-104",
    invoiceNo: "EQ-INV-2026-1025",
    orgName: "Royal Looks Barbershop",
    tier: "PRO",
    amount: 1499,
    date: "Oct 25, 2026",
    status: "PAID",
    method: "NetBanking",
  },
];

const featureLabelMap: Record<string, string> = {};
for (const f of ALL_PLAN_FEATURES) {
  featureLabelMap[f.id] = f.label;
}

export default function AdminBillingPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("ALL");

  // Plan Creator Modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Manual Payment Approvals State
  const [pendingPayments, setPendingPayments] = useState<PaymentOrder[]>([]);
  const [loadingPendingPayments, setLoadingPendingPayments] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<PaymentOrder | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  // Gateway Settings State
  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig>({
    upiManualEnabled: true,
    upiVpa: "salonpayments@icici",
    upiMerchantName: "Salon Queue SaaS",
    cashEnabled: true,
    cashInstructions: "Pay at salon head office or deposit cash into our designated bank account.",
    razorpayEnabled: false,
    razorpayKeyId: "",
    razorpayKeySecret: "",
  });
  const [savingGateway, setSavingGateway] = useState(false);

  // In-App Toast Banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPlans = async () => {
    try {
      const res = await api.plans.getAll({ status: "all" });
      setPlans(res.plans || []);
    } catch (err) {
      console.error("Failed to load subscription plans:", err);
    }
  };

  const fetchOrgs = async () => {
    try {
      const data = await api.salons.getOrganizations();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error("Failed to load organizations:", err);
    }
  };

  const fetchPendingPayments = async () => {
    setLoadingPendingPayments(true);
    try {
      const res = await api.admin.getPendingPayments();
      if (res.success) {
        setPendingPayments(res.orders || []);
      }
    } catch (err) {
      console.error("Failed to load pending payments:", err);
    } finally {
      setLoadingPendingPayments(false);
    }
  };

  const fetchGatewayConfig = async () => {
    try {
      const res = await api.admin.getPaymentConfig();
      if (res.success && res.config) {
        setGatewayConfig(res.config);
      }
    } catch (err) {
      console.error("Failed to load gateway config:", err);
    }
  };

  const handleApprovePayment = async (orderId: string) => {
    setProcessingPaymentId(orderId);
    try {
      const res = await api.admin.approvePayment(orderId);
      if (res.success) {
        showToast(res.message || "Payment approved and subscription activated!", "success");
        await Promise.all([fetchPendingPayments(), fetchOrgs(), fetchPlans()]);
      } else {
        showToast(res.message || "Approval failed.", "error");
      }
    } catch (err: any) {
      showToast("Approval error: " + err.message, "error");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrder) return;
    const reason = rejectionReasonInput.trim();
    if (!reason) {
      showToast("Please provide a rejection reason.", "error");
      return;
    }
    setProcessingPaymentId(rejectingOrder.id);
    try {
      const res = await api.admin.rejectPayment(rejectingOrder.id, reason);
      if (res.success) {
        showToast(res.message || "Payment order rejected.", "info");
        setRejectingOrder(null);
        setRejectionReasonInput("");
        await fetchPendingPayments();
      } else {
        showToast(res.message || "Rejection failed.", "error");
      }
    } catch (err: any) {
      showToast("Rejection error: " + err.message, "error");
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleSaveGatewayConfig = async () => {
    setSavingGateway(true);
    try {
      const res = await api.admin.updatePaymentConfig(gatewayConfig);
      if (res.success) {
        setGatewayConfig(res.config);
        showToast("Payment gateway configuration saved successfully!", "success");
      } else {
        showToast(res.message || "Failed to update configuration.", "error");
      }
    } catch (err: any) {
      showToast("Save error: " + err.message, "error");
    } finally {
      setSavingGateway(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchOrgs(),
      fetchPlans(),
      fetchPendingPayments(),
      fetchGatewayConfig(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleUpdateTier = async (orgId: string, nextTier: "STARTER" | "PRO" | "ENTERPRISE") => {
    setUpdatingOrgId(orgId);
    try {
      await api.salons.updateTier(orgId, nextTier);
      showToast(`Subscription plan updated to ${nextTier}`, "success");
      await fetchOrgs();
    } catch (err) {
      showToast("Failed to update tier: " + (err as Error).message, "error");
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const handleAssignPlan = async (orgId: string, planId: string) => {
    setUpdatingOrgId(orgId);
    try {
      await api.salons.updatePlan(orgId, planId);
      showToast(`Assigned plan to organization successfully`, "success");
      await fetchOrgs();
    } catch (err) {
      showToast("Failed to assign plan: " + (err as Error).message, "error");
    } finally {
      setUpdatingOrgId(null);
    }
  };

  const handleArchivePlan = async (plan: SubscriptionPlan) => {
    try {
      await api.plans.archive(plan.id);
      showToast(`Plan "${plan.name}" archived successfully`, "success");
      await fetchPlans();
    } catch (err) {
      showToast("Failed to archive plan: " + (err as Error).message, "error");
    }
  };

  const tierPrices: Record<string, number> = { STARTER: 499, PRO: 1499, ENTERPRISE: 4999 };
  const totalMRR = organizations.reduce((acc, o) => acc + (tierPrices[o.tier] || 499), 0);
  const starterCount = organizations.filter((o) => o.tier === "STARTER").length;
  const proCount = organizations.filter((o) => o.tier === "PRO").length;
  const enterpriseCount = organizations.filter((o) => o.tier === "ENTERPRISE").length;

  const filteredInvoices = sampleTransactions.filter((tx) => {
    const matchesFilter = invoiceFilter === "ALL" || tx.tier === invoiceFilter;
    const matchesSearch =
      invoiceSearch.trim() === "" ||
      tx.invoiceNo.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      tx.orgName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      tx.method.toLowerCase().includes(invoiceSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-950/80 border-emerald-600/50 text-emerald-200"
              : toast.type === "error"
              ? "bg-rose-950/80 border-rose-600/50 text-rose-200"
              : "bg-blue-950/80 border-blue-600/50 text-blue-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "success" && <Check className="h-5 w-5 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
            {toast.type === "info" && <CreditCard className="h-5 w-5 text-blue-400 shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header with Title and Create Plan Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Subscription Plans & Revenue Operations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Dynamic subscription plans catalog, 2-way discount calibrator, quotas, and multi-tenant billing.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              setEditingPlan(null);
              setIsPlanModalOpen(true);
            }}
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold min-h-[42px] px-4 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            Create New Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={loading}
            className="gap-2 border-slate-700 min-h-[42px]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Sync Gateway
          </Button>
        </div>
      </div>

      {/* Revenue & Platform Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Monthly Recurring Revenue</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-2xl text-white font-extrabold">
              {formatCurrency(totalMRR || 6997)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="font-semibold">+18.4%</span>
              <span className="text-slate-400">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Active Subscriptions</span>
              <Building className="h-4 w-4 text-blue-400" />
            </CardDescription>
            <CardTitle className="text-2xl text-white font-extrabold">
              {organizations.length || 2} Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              {starterCount} Starter · {proCount} Pro · {enterpriseCount} Enterprise
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Published Plans</span>
              <Layers className="h-4 w-4 text-indigo-400" />
            </CardDescription>
            <CardTitle className="text-2xl text-white font-extrabold">
              {plans.filter((p) => p.status === "ACTIVE").length} Active / {plans.length} Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              Dynamic quotas evaluated live
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs text-slate-400 uppercase font-semibold flex items-center justify-between">
              <span>Gateway Interconnect</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </CardDescription>
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <span>Universal Gateway</span>
              <Badge variant="success" className="text-[10px] py-0">99.98%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              UPI QR & Webhooks Operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Subscription Plans Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Dynamic Subscription Plans Catalog
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              SuperAdmin configured plans. Tenant quotas and billing durations are dynamically resolved.
            </p>
          </div>
          <Badge variant="outline" className="text-slate-400 border-slate-800 text-xs">
            {plans.length} Plans Defined
          </Badge>
        </div>

        {plans.length === 0 ? (
          <Card className="border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
            <p className="text-slate-400 text-sm mb-4">No subscription plans found. Create your first plan now!</p>
            <Button
              onClick={() => {
                setEditingPlan(null);
                setIsPlanModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Plan
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isArchived = p.status === "ARCHIVED";
              return (
                <Card
                  key={p.id}
                  className={`relative flex flex-col justify-between transition-all ${
                    p.isFeatured
                      ? "border-indigo-500/70 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/20"
                      : isArchived
                      ? "border-slate-850 opacity-60 bg-slate-950/20"
                      : "border-slate-800 bg-slate-900/50"
                  }`}
                >
                  {p.isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-bold px-3 py-0.5 shadow-md">
                        FEATURED PLAN
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold text-white">{p.name}</CardTitle>
                          {p.badge && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-2 font-semibold">
                              {p.badge}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-white">
                            {formatCurrency(p.price1m)}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">/ month</span>
                        </div>
                        {p.description && (
                          <CardDescription className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {p.description}
                          </CardDescription>
                        )}
                      </div>

                      <Badge
                        variant={
                          p.status === "ACTIVE"
                            ? "success"
                            : p.status === "DRAFT"
                            ? "default"
                            : "destructive"
                        }
                        className="text-[10px] uppercase font-bold shrink-0"
                      >
                        {p.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Active Billing Durations */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Billing Cycles Enabled:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {p.cycle1mEnabled && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60 font-medium">
                            1 Month
                          </span>
                        )}
                        {p.cycle3mEnabled && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-medium">
                            3M ({formatCurrency(p.price3m || 0)} · {p.discountPct3m}% off)
                          </span>
                        )}
                        {p.cycle6mEnabled && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 font-medium">
                            6M ({formatCurrency(p.price6m || 0)} · {p.discountPct6m}% off)
                          </span>
                        )}
                        {p.cycle1yEnabled && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-800/40 font-medium">
                            1Y ({formatCurrency(p.price1y || 0)} · {p.discountPct1y}% off)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quotas */}
                    <div className="text-xs space-y-1 text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/70">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-blue-400" />
                          Max Branches:
                        </span>
                        <strong className="text-white font-bold">{p.maxBranches} Location(s)</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-amber-400" />
                          Max Chairs/Branch:
                        </span>
                        <strong className="text-white font-bold">{p.maxStylistsPerBranch} Stylists</strong>
                      </div>
                    </div>

                    {/* Features Checklist */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Features Included ({p.features.length}):
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-300 max-h-36 overflow-y-auto pr-1">
                        {p.features.map((featId, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{featureLabelMap[featId] || featId}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPlan(p);
                        setIsPlanModalOpen(true);
                      }}
                      className="text-xs gap-1.5 border-slate-700 min-h-[44px] flex-1"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-300" />
                      Edit Plan
                    </Button>
                    {!isArchived && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchivePlan(p)}
                        className="text-xs gap-1.5 border-rose-900/50 hover:bg-rose-950/40 text-rose-300 min-h-[44px]"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Organizations Tier Controller */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Organization Tier Overrides</CardTitle>
            <CardDescription>
              Assign instant enterprise tier promotions or downgrades to tenant organizations.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrgs} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-slate-800">
            {organizations.map((org) => {
              const isUpdating = updatingOrgId === org.id;
              return (
                <div
                  key={org.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-blue-400" />
                      <h4 className="font-bold text-white text-base">{org.name}</h4>
                      <Badge variant={org.tier === "ENTERPRISE" ? "purple" : org.tier === "PRO" ? "default" : "secondary"}>
                        {org.tier}
                      </Badge>
                      {org.planId && (
                        <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-500/30">
                          Plan: {org.planId}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Organization ID: <code className="text-slate-300">{org.id}</code> · Slug:{" "}
                      <code className="text-blue-400">{org.slug}</code> · Branches:{" "}
                      <strong className="text-white">{org.branchCount || 1}</strong> / {org.maxBranches}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(["STARTER", "PRO", "ENTERPRISE"] as const).map((t) => {
                      const isCurrent = org.tier === t;
                      return (
                        <Button
                          key={t}
                          size="sm"
                          variant={isCurrent ? "default" : "outline"}
                          className={`text-xs min-h-[44px] px-3 font-semibold ${
                            isCurrent ? "pointer-events-none opacity-80" : "border-slate-700 hover:border-slate-500"
                          }`}
                          onClick={() => handleUpdateTier(org.id, t)}
                          disabled={isUpdating}
                        >
                          {isCurrent && <Check className="h-3.5 w-3.5 mr-1" />}
                          {t}
                        </Button>
                      );
                    })}

                    {plans.filter((p) => p.status === "ACTIVE").length > 0 && (
                      <select
                        value={org.planId || ""}
                        onChange={(e) => {
                          if (e.target.value) handleAssignPlan(org.id, e.target.value);
                        }}
                        disabled={isUpdating}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-indigo-300 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="" disabled>
                          Assign Dynamic Plan...
                        </option>
                        {plans
                          .filter((p) => p.status === "ACTIVE")
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatCurrency(p.price1m)}/mo)
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 1. Manual Payment Approvals Queue (SuperAdmin Verification Hub) */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-400" />
                  Manual Payment Approvals Queue
                </CardTitle>
                <Badge
                  variant={pendingPayments.length > 0 ? "default" : "secondary"}
                  className={
                    pendingPayments.length > 0
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "text-slate-400"
                  }
                >
                  {pendingPayments.length} Pending
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Verify customer 12-digit UPI UTR receipts or counter cash settlements. Approving activates tenant subscription and quota limits immediately.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingPayments}
              disabled={loadingPendingPayments}
              className="gap-2 border-slate-700 min-h-[40px]"
            >
              <RefreshCw className={`h-4 w-4 ${loadingPendingPayments ? "animate-spin" : ""}`} />
              Refresh Queue
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Order Ref #</th>
                  <th className="py-3 px-4">Tenant Salon</th>
                  <th className="py-3 px-4">Plan & Cycle</th>
                  <th className="py-3 px-4">Net Amount</th>
                  <th className="py-3 px-4">Method & UTR</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {pendingPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <CheckCircle className="w-8 h-8 text-emerald-500/40" />
                        <p className="font-semibold text-slate-400">Zero Pending Payment Requests</p>
                        <p className="text-[11px] text-slate-600">All customer UPI UTRs and cash requests have been verified.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingPayments.map((o) => {
                    const isProcessing = processingPaymentId === o.id;
                    const planName = o.metadata?.planName || o.targetId;
                    const cycleStr = (o.metadata?.cycle || "1m").toUpperCase();
                    return (
                      <tr key={o.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-400 whitespace-nowrap">
                          {o.id}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                          {o.organizationName || o.organizationId || "Salon Tenant"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-200">{planName}</span>
                          <span className="text-[10px] text-indigo-400 font-bold ml-1.5 bg-indigo-950/60 border border-indigo-800/40 px-1.5 py-0.5 rounded">
                            {cycleStr}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {formatCurrency(o.amount)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {o.provider === "UPI_QR" ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400">
                                <QrCode className="w-3.5 h-3.5" /> UPI QR
                              </span>
                              {o.utrNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded">
                                    UTR: {o.utrNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(o.utrNumber!);
                                      showToast("Copied UTR to clipboard", "info");
                                    }}
                                    className="p-1 hover:text-white text-slate-400"
                                    title="Copy UTR"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">No UTR provided</span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                                <Banknote className="w-3.5 h-3.5" /> Cash / Counter
                              </span>
                              {o.paymentProofNote && (
                                <p className="text-[11px] text-slate-400 max-w-xs truncate" title={o.paymentProofNote}>
                                  Note: {o.paymentProofNote}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(o.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleApprovePayment(o.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[36px] px-3 gap-1 shadow-sm"
                            >
                              {isProcessing ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              Approve & Activate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => {
                                setRejectingOrder(o);
                                setRejectionReasonInput("");
                              }}
                              className="border-rose-900/60 hover:bg-rose-950/40 text-rose-300 text-xs min-h-[36px] px-2.5"
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 2. Payment Gateway Switchboard & Configuration Hub */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-400" />
                Payment Gateway Switchboard & Merchant Credentials
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-1">
                Turn payment gateways ON or OFF and configure your business UPI ID (VPA) and Cash instructions. Salon checkout updates instantly.
              </CardDescription>
            </div>
            <Button
              onClick={handleSaveGatewayConfig}
              disabled={savingGateway}
              className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold min-h-[42px] px-5 shadow-lg shadow-indigo-600/20"
            >
              {savingGateway ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Switchboard Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* GATEWAY 1: UPI MANUAL QR */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                gatewayConfig.upiManualEnabled
                  ? "bg-blue-950/20 border-blue-500/40"
                  : "bg-slate-950/60 border-slate-800 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">UPI Manual Gateway</h4>
                    <p className="text-[11px] text-slate-400">Dynamic QR + 12-Digit UTR</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setGatewayConfig({
                      ...gatewayConfig,
                      upiManualEnabled: !gatewayConfig.upiManualEnabled,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[26px] items-center ${
                    gatewayConfig.upiManualEnabled ? "bg-blue-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      gatewayConfig.upiManualEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Merchant UPI ID (VPA):
                  </label>
                  <Input
                    placeholder="e.g. salonpayments@icici"
                    value={gatewayConfig.upiVpa}
                    onChange={(e) =>
                      setGatewayConfig({ ...gatewayConfig, upiVpa: e.target.value })
                    }
                    disabled={!gatewayConfig.upiManualEnabled}
                    className="bg-slate-900 border-slate-800 text-xs font-mono min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Payee / Merchant Display Name:
                  </label>
                  <Input
                    placeholder="e.g. Engine Que Salon SaaS"
                    value={gatewayConfig.upiMerchantName}
                    onChange={(e) =>
                      setGatewayConfig({ ...gatewayConfig, upiMerchantName: e.target.value })
                    }
                    disabled={!gatewayConfig.upiManualEnabled}
                    className="bg-slate-900 border-slate-800 text-xs min-h-[38px]"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Customer scans dynamic QR generated for their bill, then enters their UTR number for your approval.
                </p>
              </div>
            </div>

            {/* GATEWAY 2: CASH / COUNTER SETTLEMENT */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                gatewayConfig.cashEnabled
                  ? "bg-amber-950/20 border-amber-500/40"
                  : "bg-slate-950/60 border-slate-800 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Cash / Counter</h4>
                    <p className="text-[11px] text-slate-400">Offline Manual Settlement</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setGatewayConfig({
                      ...gatewayConfig,
                      cashEnabled: !gatewayConfig.cashEnabled,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[26px] items-center ${
                    gatewayConfig.cashEnabled ? "bg-amber-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      gatewayConfig.cashEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Payment Instructions / Bank Details:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide deposit bank details or instructions for paying at salon reception..."
                    value={gatewayConfig.cashInstructions}
                    onChange={(e) =>
                      setGatewayConfig({ ...gatewayConfig, cashInstructions: e.target.value })
                    }
                    disabled={!gatewayConfig.cashEnabled}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Customer submits an offline payment request. You verify cash receipt in your drawer and click Approve.
                </p>
              </div>
            </div>

            {/* GATEWAY 3: RAZORPAY / SANDBOX GATEWAY */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                gatewayConfig.razorpayEnabled
                  ? "bg-purple-950/20 border-purple-500/40"
                  : "bg-slate-950/60 border-slate-800 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Razorpay Sandbox / Live</h4>
                    <p className="text-[11px] text-slate-400">Automated Instant Gateway</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setGatewayConfig({
                      ...gatewayConfig,
                      razorpayEnabled: !gatewayConfig.razorpayEnabled,
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[26px] items-center ${
                    gatewayConfig.razorpayEnabled ? "bg-purple-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      gatewayConfig.razorpayEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Razorpay Key ID:
                  </label>
                  <Input
                    placeholder="rzp_test_..."
                    value={gatewayConfig.razorpayKeyId || ""}
                    onChange={(e) =>
                      setGatewayConfig({ ...gatewayConfig, razorpayKeyId: e.target.value })
                    }
                    disabled={!gatewayConfig.razorpayEnabled}
                    className="bg-slate-900 border-slate-800 text-xs font-mono min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                    Razorpay Key Secret:
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={gatewayConfig.razorpayKeySecret || ""}
                    onChange={(e) =>
                      setGatewayConfig({ ...gatewayConfig, razorpayKeySecret: e.target.value })
                    }
                    disabled={!gatewayConfig.razorpayEnabled}
                    className="bg-slate-900 border-slate-800 text-xs font-mono min-h-[38px]"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Enables instant checkout simulation and live credit card, netbanking, and corporate card settlements.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reject Payment Order Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400" />
                Reject Payment Order
              </h3>
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-mono text-white">{rejectingOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tenant:</span>
                <span className="font-semibold text-white">
                  {rejectingOrder.organizationName || rejectingOrder.organizationId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-emerald-400">{formatCurrency(rejectingOrder.amount)}</span>
              </div>
              {rejectingOrder.utrNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted UTR:</span>
                  <span className="font-mono text-amber-300 font-bold">{rejectingOrder.utrNumber}</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                Reason for Rejection:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. UTR not found in bank statement, payment reversed, incorrect amount..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingOrder(null)}
                className="border-slate-700 min-h-[40px]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmReject}
                disabled={processingPaymentId === rejectingOrder.id || !rejectionReasonInput.trim()}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold min-h-[40px] px-4"
              >
                {processingPaymentId === rejectingOrder.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirm Rejection"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Creator / Editor Modal */}
      <CreatePlanModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingPlan(null);
        }}
        editingPlan={editingPlan}
        onSuccess={() => {
          fetchPlans();
        }}
        showToast={showToast}
      />
    </div>
  );
}
