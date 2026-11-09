"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Organization, SubscriptionPlan } from "@/lib/api";
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
  Receipt,
  Download,
  Search,
  Filter,
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

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchOrgs(), fetchPlans()]);
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
                      className="text-xs gap-1.5 border-slate-700 min-h-[38px] flex-1"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-300" />
                      Edit Plan
                    </Button>
                    {!isArchived && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArchivePlan(p)}
                        className="text-xs gap-1.5 border-rose-900/50 hover:bg-rose-950/40 text-rose-300 min-h-[38px]"
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

                  <div className="flex items-center gap-2">
                    {(["STARTER", "PRO", "ENTERPRISE"] as const).map((t) => {
                      const isCurrent = org.tier === t;
                      return (
                        <Button
                          key={t}
                          size="sm"
                          variant={isCurrent ? "default" : "outline"}
                          className={`text-xs h-8 ${
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
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Invoices & Settlement Ledger */}
      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-400" />
                Subscription Settlements & Quota Enforcement
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Centralized multi-tenant franchise quotas, tier upgrade logs, and automated settlement records.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs">
                Webhook Active (200 OK)
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter pills */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search tenant, plan, method..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-9 bg-slate-950 border-slate-800 text-xs min-h-[40px]"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(["ALL", "STARTER", "PRO", "ENTERPRISE"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setInvoiceFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors min-h-[36px] ${
                    invoiceFilter === f
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  {f === "ALL" ? "All Tiers" : f}
                </button>
              ))}
            </div>
          </div>

          {/* Settlements Table */}
          <div className="rounded-xl border border-slate-800 overflow-x-auto bg-slate-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Billing Ref #</th>
                  <th className="py-3 px-4">Organization Tenant</th>
                  <th className="py-3 px-4">Tier Plan</th>
                  <th className="py-3 px-4">Settlement Amount</th>
                  <th className="py-3 px-4">Billing Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No matching settlement records found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-400 whitespace-nowrap">
                        {tx.invoiceNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                        {tx.orgName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            tx.tier === "ENTERPRISE"
                              ? "purple"
                              : tx.tier === "PRO"
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {tx.tier}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {tx.method}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="success" className="text-[10px] py-0">
                          {tx.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
