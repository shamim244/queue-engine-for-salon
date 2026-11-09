"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { SubscriptionPlan } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatePlanModal, ALL_PLAN_FEATURES } from "@/components/admin/billing/create-plan-modal";
import {
  Sparkles,
  Plus,
  Edit2,
  Archive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Layers,
  Store,
  Users,
  Check,
  Star,
} from "lucide-react";

const featureLabelMap: Record<string, string> = {};
for (const f of ALL_PLAN_FEATURES) {
  featureLabelMap[f.id] = f.label;
}

export default function SubscriptionPlansStudioPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await api.plans.getAll({ status: "all" });
      if (res.success && res.plans) {
        setPlans(res.plans);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleArchivePlan = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Are you sure you want to archive plan "${plan.name}"?`)) {
      return;
    }
    try {
      const res = await api.plans.archive(plan.id);
      if (res.success) {
        showToast("success", `Plan "${plan.name}" archived successfully!`);
        loadPlans();
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to archive plan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-blue-400 font-medium">Subscription Plans</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            📑 Subscription Plans Studio & Dynamic Calibrator
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Create and edit tiered pricing packages with 2-way smart discount calibrators (1M, 3M, 6M, 1Y) and 12-feature checklist gates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPlans}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => {
              setEditingPlan(null);
              setIsPlanModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-9 gap-2 text-xs shadow-md shadow-blue-600/20"
          >
            <Plus className="h-4 w-4" />
            Create Dynamic Plan
          </Button>
        </div>
      </div>

      {/* Plans Catalog Grid */}
      {loading ? (
        <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
          <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">Loading subscription plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40 p-12 text-center">
          <Layers className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Subscription Plans Defined</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Click "Create Dynamic Plan" to publish your first subscription tier with multi-cycle pricing and feature quotas.
          </p>
          <Button
            onClick={() => {
              setEditingPlan(null);
              setIsPlanModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create First Plan
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? plan.features : [];

            return (
              <Card
                key={plan.id}
                className={`flex flex-col justify-between border transition-all ${
                  plan.isFeatured
                    ? "border-blue-500/50 bg-slate-900/80 shadow-xl shadow-blue-950/20"
                    : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
                } ${plan.status !== "ACTIVE" ? "opacity-60 grayscale-[30%]" : ""}`}
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {plan.badge && (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-400 border-blue-500/30"
                          >
                            {plan.badge}
                          </Badge>
                        )}
                        {plan.isFeatured && (
                          <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] gap-1">
                            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className={plan.status === "ACTIVE" ? "text-emerald-400 border-emerald-500/30" : "text-slate-500"}>
                        {plan.status}
                      </Badge>
                    </div>

                    <CardTitle className="text-lg font-black text-white mt-2">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 line-clamp-2">
                      {plan.description || "Comprehensive salon management tier."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-1">
                    {/* Base Price Display */}
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">
                          {formatCurrency(plan.price1m)}
                        </span>
                        <span className="text-xs text-slate-400">/ month</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mt-2.5 pt-2.5 border-t border-slate-800/80 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">3M Cycle</span>
                          <span className="font-semibold text-slate-300">
                            {plan.cycle3mEnabled ? `${plan.discountPct3m}% off` : "Disabled"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">6M Cycle</span>
                          <span className="font-semibold text-slate-300">
                            {plan.cycle6mEnabled ? `${plan.discountPct6m}% off` : "Disabled"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">1Y Cycle</span>
                          <span className="font-semibold text-blue-400">
                            {plan.cycle1yEnabled ? `${plan.discountPct1y}% off` : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quotas */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center gap-2">
                        <Store className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400">Max Branches</div>
                          <div className="font-bold text-white">{plan.maxBranches}</div>
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400">Staff / Branch</div>
                          <div className="font-bold text-white">{plan.maxStylistsPerBranch}</div>
                        </div>
                      </div>
                    </div>

                    {/* Features checklist preview */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Included Features ({features.length}/12)
                      </span>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {features.map((fId) => (
                          <div key={fId} className="flex items-center gap-1.5 text-xs text-slate-300">
                            <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{featureLabelMap[fId] || fId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchivePlan(plan)}
                    className="border-slate-700 hover:bg-slate-800 text-slate-300 h-8 text-xs gap-1.5"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingPlan(plan);
                      setIsPlanModalOpen(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-white h-8 text-xs gap-1.5 font-semibold"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Plan
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      <CreatePlanModal
        isOpen={isPlanModalOpen}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingPlan(null);
        }}
        onSuccess={() => {
          setIsPlanModalOpen(false);
          setEditingPlan(null);
          loadPlans();
          showToast("success", editingPlan ? "Plan updated successfully!" : "New dynamic plan created!");
        }}
        editingPlan={editingPlan}
        showToast={(msg, type) => showToast(type, msg)}
      />
    </div>
  );
}