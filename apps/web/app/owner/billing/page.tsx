"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Organization, SubscriptionPlan, BillingCycle } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ALL_PLAN_FEATURES } from "@/components/admin/billing/create-plan-modal";
import {
  CreditCard,
  Building2,
  CheckCircle2,
  Users,
  Store,
  Sparkles,
  Zap,
  ShieldCheck,
  Check,
  RefreshCw,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
} from "lucide-react";

const featureLabelMap: Record<string, string> = {};
for (const f of ALL_PLAN_FEATURES) {
  featureLabelMap[f.id] = f.label;
}

const CYCLE_OPTIONS: { id: BillingCycle; label: string; months: number; badge?: string }[] = [
  { id: "1m", label: "1 Month", months: 1 },
  { id: "3m", label: "3 Months", months: 3, badge: "Save 10%" },
  { id: "6m", label: "6 Months", months: 6, badge: "Save 16%" },
  { id: "1y", label: "1 Year", months: 12, badge: "Save 30%" },
];

function OwnerBillingContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();

  const [org, setOrg] = useState<Organization | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("3m");
  const [selectingPlanId, setSelectingPlanId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentSlug = salon?.slug || searchParams.get("salon") || "ramesh-barber";

  useEffect(() => {
    async function loadData() {
      try {
        const [salonRes, plansRes] = await Promise.all([
          api.salons.get(currentSlug).catch(() => ({ salon: null })),
          api.plans.getAll().catch(() => ({ success: false, plans: [] })),
        ]);

        if (plansRes.plans && plansRes.plans.length > 0) {
          setPlans(plansRes.plans);
        }

        if (salonRes.salon?.organizationId) {
          const orgRes = await api.salons.getOrganization(salonRes.salon.organizationId);
          if (orgRes.organization) {
            setOrg(orgRes.organization);
          }
        } else {
          // Default demo organization
          setOrg({
            id: "org-demo",
            name: "Ramesh Traditional Grooming",
            slug: "ramesh-grooming",
            tier: "STARTER",
            planId: "plan-starter-01",
            maxBranches: 1,
            maxStylistsPerBranch: 1,
            branchCount: 1,
          });
        }
      } catch (e) {
        console.error("Failed to load billing:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentSlug]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectingPlanId(plan.id);
    showToast(`Selected "${plan.name}" (${selectedCycle.toUpperCase()} cycle). Proceeding to settlement.`);
    setTimeout(() => {
      setSelectingPlanId(null);
    }, 1500);
  };

  // Determine current active plan
  const currentPlan =
    plans.find((p) => p.id === org?.planId) ||
    plans.find((p) => p.slug === org?.slug) ||
    plans[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-600/50 bg-emerald-950/80 text-emerald-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Subscription & Billing Portal
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review active quotas, select optimal billing durations, and calibrate enterprise capacity.
        </p>
      </div>

      {/* Active Subscription Summary */}
      <Card className="border-indigo-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl text-white">Active Subscription</CardTitle>
                <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-bold text-xs uppercase px-2.5 py-0.5">
                  {currentPlan ? currentPlan.name : org?.tier || "STARTER"}
                </Badge>
              </div>
              <CardDescription className="mt-1 text-slate-400">
                Organization: <strong className="text-white">{org?.name || "Ramesh Traditional Grooming"}</strong>
              </CardDescription>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">Current Cycle AutoPay</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center sm:justify-end gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Active & Verified
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Branch Capacity</span>
              <div className="text-2xl font-black text-white">
                {org?.branchCount || 1}{" "}
                <span className="text-xs font-normal text-slate-500">
                  / {currentPlan ? currentPlan.maxBranches : org?.maxBranches || 1} allowed
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Barber Chairs per Branch</span>
              <div className="text-2xl font-black text-indigo-400">
                {currentPlan ? currentPlan.maxStylistsPerBranch : org?.maxStylistsPerBranch || 2}{" "}
                <span className="text-xs font-normal text-slate-500">active chairs</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Live Telemetry Gate</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                Connected <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Cycle Interactive Segmented Switcher */}
      <div className="flex flex-col items-center justify-center space-y-3 pt-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-indigo-400" />
          Choose Billing Frequency (Save Up to 30% Upfront)
        </span>

        <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl max-w-full overflow-x-auto">
          {CYCLE_OPTIONS.map((c) => {
            const isSelected = selectedCycle === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCycle(c.id)}
                className={`relative px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span>{c.label}</span>
                {c.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${
                      isSelected
                        ? "bg-white text-indigo-900"
                        : "bg-emerald-950/80 text-emerald-300 border border-emerald-800/50"
                    }`}
                  >
                    {c.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = currentPlan?.id === p.id;

          // Resolve cycle price & discount
          let isCycleEnabled = true;
          let cyclePrice = p.price1m;
          let cycleMonths = 1;
          let discountPct = 0;

          if (selectedCycle === "1m") {
            isCycleEnabled = p.cycle1mEnabled;
            cyclePrice = p.price1m;
            cycleMonths = 1;
          } else if (selectedCycle === "3m") {
            isCycleEnabled = p.cycle3mEnabled;
            cyclePrice = p.price3m ?? Math.round(p.price1m * 3 * (1 - (p.discountPct3m || 10) / 100));
            cycleMonths = 3;
            discountPct = p.discountPct3m || 10;
          } else if (selectedCycle === "6m") {
            isCycleEnabled = p.cycle6mEnabled;
            cyclePrice = p.price6m ?? Math.round(p.price1m * 6 * (1 - (p.discountPct6m || 16) / 100));
            cycleMonths = 6;
            discountPct = p.discountPct6m || 16;
          } else if (selectedCycle === "1y") {
            isCycleEnabled = p.cycle1yEnabled;
            cyclePrice = p.price1y ?? Math.round(p.price1m * 12 * (1 - (p.discountPct1y || 30) / 100));
            cycleMonths = 12;
            discountPct = p.discountPct1y || 30;
          }

          const effectiveMonthly = Math.round(cyclePrice / cycleMonths);

          return (
            <Card
              key={p.id}
              className={`relative flex flex-col justify-between transition-all ${
                isCurrent
                  ? "border-emerald-500/80 shadow-xl shadow-emerald-500/10 bg-slate-900/90 ring-1 ring-emerald-500/30"
                  : p.isFeatured
                  ? "border-indigo-500/80 shadow-xl shadow-indigo-500/10 bg-slate-900/90 ring-1 ring-indigo-500/20"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {isCurrent ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="success" className="px-3 py-0.5 shadow-md font-bold text-xs">
                    ACTIVE CURRENT PLAN
                  </Badge>
                </div>
              ) : p.isFeatured ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-bold px-3 py-0.5 shadow-md text-xs">
                    RECOMMENDED
                  </Badge>
                </div>
              ) : null}

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-white">{p.name}</CardTitle>
                  {p.badge && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-2 font-semibold">
                      {p.badge}
                    </Badge>
                  )}
                </div>

                {isCycleEnabled ? (
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-white">
                        {formatCurrency(effectiveMonthly)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ month</span>
                    </div>

                    {cycleMonths > 1 ? (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          Billed as {formatCurrency(cyclePrice)} every {cycleMonths} months
                        </span>
                        {discountPct > 0 && (
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 py-0">
                            Save {discountPct}%
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">Billed monthly recurring</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-center">
                    <span className="text-xs text-amber-400 font-semibold block">
                      Cycle Unavailable
                    </span>
                    <span className="text-[11px] text-slate-400">
                      This tier is billed monthly at {formatCurrency(p.price1m)}/mo
                    </span>
                  </div>
                )}

                {p.description && (
                  <CardDescription className="mt-2 text-xs text-slate-400 line-clamp-2">
                    {p.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Quotas */}
                <div className="text-xs space-y-1.5 text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-blue-400" />
                      Branch Capacity:
                    </span>
                    <strong className="text-white font-bold">{p.maxBranches} Location(s)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-amber-400" />
                      Chairs Per Branch:
                    </span>
                    <strong className="text-white font-bold">{p.maxStylistsPerBranch} Stylists</strong>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Capabilities Included:
                  </span>
                  <ul className="space-y-2 text-xs text-slate-300 max-h-48 overflow-y-auto pr-1">
                    {p.features.map((featId, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>{featureLabelMap[featId] || featId}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-3 border-t border-slate-800">
                <Button
                  className={`w-full text-xs font-bold min-h-[44px] ${
                    isCurrent
                      ? "bg-slate-800 text-slate-300 pointer-events-none"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                  }`}
                  disabled={isCurrent || selectingPlanId === p.id}
                  onClick={() => handleSelectPlan(p)}
                >
                  {isCurrent ? (
                    <span className="flex items-center gap-1.5">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Current Plan
                    </span>
                  ) : selectingPlanId === p.id ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Activating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Select Plan <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function OwnerBillingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Billing Portal...</div>}>
      <OwnerBillingContent />
    </Suspense>
  );
}
