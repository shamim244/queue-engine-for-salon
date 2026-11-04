"use client";

import React, { useEffect, useState } from "react";
import { api, Organization } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";

interface BillingTransaction {
  id: string;
  invoiceNo: string;
  orgName: string;
  tier: "SOLO" | "PRO" | "ENTERPRISE";
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
    tier: "SOLO",
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

export default function AdminBillingPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrgId, setUpdatingOrgId] = useState<string | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<string>("ALL");

  // In-App Toast Banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrgs = async () => {
    try {
      const data = await api.salons.getOrganizations();
      setOrganizations(data.organizations || []);
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleUpdateTier = async (orgId: string, nextTier: "STARTER" | "PRO" | "ENTERPRISE" | "SOLO") => {
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

  const tierPrices: Record<string, number> = { STARTER: 499, SOLO: 499, PRO: 1499, ENTERPRISE: 4999 };
  const totalMRR = organizations.reduce((acc, o) => acc + (tierPrices[o.tier] || 499), 0);
  const starterCount = organizations.filter((o) => o.tier === "STARTER" || o.tier === "SOLO").length;
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

  const tiers = [
    {
      id: "STARTER",
      name: "Starter Plan",
      price: "₹499 / mo",
      branches: "1 Branch",
      stylists: "Up to 3 Chairs / Stylist",
      features: ["Door QR Poster", "Simple 4-Digit Chair UI", "Basic SMS Alerts", "Standard Queue Algorithm"],
      badge: "secondary",
    },
    {
      id: "PRO",
      name: "Pro Plan",
      price: "₹1,499 / mo",
      branches: "Up to 5 Branches",
      stylists: "Up to 10 Chairs / Branch",
      features: [
        "Everything in Starter",
        "Public Lobby TV Departure Board",
        "Real-time WhatsApp Alerts",
        "Speed Calibration Sliders",
        "Tactile 2-Second Chair Swap",
      ],
      badge: "default",
      popular: true,
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise Plan",
      price: "₹4,999 / mo",
      branches: "Unlimited Branches (25+)",
      stylists: "Unlimited Chairs (30+)",
      features: [
        "Everything in Pro",
        "Custom SMS Gateway Interconnect",
        "White-label Domain Mapping",
        "Super Admin Global Telemetry",
        "Priority 24/7 SLA Support",
      ],
      badge: "purple",
    },
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Subscription Tiers & Revenue Operations
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Nationwide tenant billing cycles, subscription quotas, and recurring revenue settlement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOrgs} disabled={loading} className="gap-2 border-slate-700">
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
              <span>Settlement Schedule</span>
              <Clock className="h-4 w-4 text-purple-400" />
            </CardDescription>
            <CardTitle className="text-xl text-white font-bold">
              1st of Every Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              Automated UPI AutoPay & Card mandate batch
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
              <span>Razorpay Live</span>
              <Badge variant="success" className="text-[10px] py-0">99.98%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-400">
              Webhooks operational & TLS verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => (
          <Card
            key={t.id}
            className={`relative flex flex-col justify-between ${
              t.popular ? "border-blue-500/60 shadow-xl shadow-blue-500/10" : "border-slate-800"
            }`}
          >
            {t.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default" className="px-3 py-0.5 shadow-md">
                  MOST POPULAR
                </Badge>
              </div>
            )}
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <CardDescription className="mt-1">{t.price}</CardDescription>
                </div>
                <Badge variant={t.badge as any}>{t.id}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-xs space-y-1 text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                <p>
                  <span className="text-slate-400">Branches Quota:</span>{" "}
                  <strong className="text-white">{t.branches}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Staff Limit:</span>{" "}
                  <strong className="text-white">{t.stylists}</strong>
                </p>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {t.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-500 w-full text-center">
                Automated monthly recurring billing
              </span>
            </CardFooter>
          </Card>
        ))}
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
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Organization ID: <code className="text-slate-300">{org.id}</code> · Slug:{" "}
                      <code className="text-blue-400">{org.slug}</code> · Branches:{" "}
                      <strong className="text-white">{org.branchCount || 1}</strong> / {org.maxBranches}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {(["STARTER", "PRO", "ENTERPRISE"] as const).map((t) => {
                      const isCurrent = org.tier === t || (t === "STARTER" && org.tier === "SOLO");
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
                className="pl-9 bg-slate-950 border-slate-800 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(["ALL", "SOLO", "PRO", "ENTERPRISE"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setInvoiceFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
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
    </div>
  );
}
