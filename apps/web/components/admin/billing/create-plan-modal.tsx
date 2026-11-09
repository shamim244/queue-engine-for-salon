"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { SubscriptionPlan, CreatePlanPayload, PlanStatus } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Calendar,
  Layers,
  Store,
  Users,
  Check,
  Percent,
  Calculator,
  RefreshCw,
  CheckCircle2,
  Tag,
  Star,
} from "lucide-react";

export const ALL_PLAN_FEATURES = [
  { id: "station_chair_transfers", label: "Station Chair Transfers", description: "Handover clients between chairs mid-queue" },
  { id: "station_soft_bump", label: "Station Soft Bump", description: "3-minute grace period management and soft-bump protocol" },
  { id: "station_hold_pause", label: "Station Hold & Errand Pause", description: "Customer errand / chai pause ticket holding" },
  { id: "tv_departure_mirror", label: "TV Departure Lounge Mirror", description: "Airport-style live queue TV board" },
  { id: "whatsapp_sms_notifications", label: "WhatsApp & SMS Notifications", description: "Automated queue alerts and ready-to-call notifications" },
  { id: "staff_shift_analytics", label: "Staff Shift Analytics", description: "Revenue, cash vs. UPI breakdown, and shift pacing" },
  { id: "stylist_duration_overrides", label: "Stylist Duration Overrides", description: "Custom service speed calibration per barber" },
  { id: "staff_leave_recovery", label: "Staff Leave Recovery", description: "1-tap absence redistribution to Universal Fast Line" },
  { id: "customer_loyalty_stamps", label: "Customer Loyalty Stamp Cards", description: "Digital visit stamp cards and repeat client rewards" },
  { id: "consumer_referrals", label: "Consumer Referral Engine", description: "Customer-to-customer referral credit engine" },
  { id: "digital_storefront", label: "Digital Salon Storefront", description: "Public salon web storefront with photos and UPI QR" },
  { id: "custom_coupons", label: "Custom Discount Coupons", description: "Salon-created client discount vouchers" },
];

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (plan: SubscriptionPlan) => void;
  editingPlan?: SubscriptionPlan | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function CreatePlanModal({
  isOpen,
  onClose,
  onSuccess,
  editingPlan,
  showToast,
}: CreatePlanModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [badge, setBadge] = useState("");
  const [description, setDescription] = useState("");
  const [price1m, setPrice1m] = useState<number>(799);

  // Cycles & Calibrator
  const [cycle1mEnabled, setCycle1mEnabled] = useState(true);
  const [cycle3mEnabled, setCycle3mEnabled] = useState(true);
  const [cycle6mEnabled, setCycle6mEnabled] = useState(true);
  const [cycle1yEnabled, setCycle1yEnabled] = useState(true);

  const [discountPct3m, setDiscountPct3m] = useState<number>(10);
  const [discountPct6m, setDiscountPct6m] = useState<number>(16);
  const [discountPct1y, setDiscountPct1y] = useState<number>(30);

  const [price3m, setPrice3m] = useState<number>(2157);
  const [price6m, setPrice6m] = useState<number>(4027);
  const [price1y, setPrice1y] = useState<number>(6712);

  // Quotas & Features
  const [maxBranches, setMaxBranches] = useState<number>(1);
  const [maxStylistsPerBranch, setMaxStylistsPerBranch] = useState<number>(3);
  const [features, setFeatures] = useState<string[]>([
    "station_chair_transfers",
    "station_soft_bump",
    "station_hold_pause",
    "digital_storefront",
  ]);

  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState<PlanStatus>("ACTIVE");
  const [sortOrder, setSortOrder] = useState<number>(1);

  const [saving, setSaving] = useState(false);

  // Initialize form when opening / editing
  useEffect(() => {
    if (editingPlan) {
      setName(editingPlan.name);
      setSlug(editingPlan.slug);
      setBadge(editingPlan.badge || "");
      setDescription(editingPlan.description || "");
      setPrice1m(editingPlan.price1m);

      setCycle1mEnabled(editingPlan.cycle1mEnabled);
      setCycle3mEnabled(editingPlan.cycle3mEnabled);
      setCycle6mEnabled(editingPlan.cycle6mEnabled);
      setCycle1yEnabled(editingPlan.cycle1yEnabled);

      setDiscountPct3m(editingPlan.discountPct3m);
      setDiscountPct6m(editingPlan.discountPct6m);
      setDiscountPct1y(editingPlan.discountPct1y);

      setPrice3m(editingPlan.price3m ?? Math.round(editingPlan.price1m * 3 * (1 - editingPlan.discountPct3m / 100)));
      setPrice6m(editingPlan.price6m ?? Math.round(editingPlan.price1m * 6 * (1 - editingPlan.discountPct6m / 100)));
      setPrice1y(editingPlan.price1y ?? Math.round(editingPlan.price1m * 12 * (1 - editingPlan.discountPct1y / 100)));

      setMaxBranches(editingPlan.maxBranches);
      setMaxStylistsPerBranch(editingPlan.maxStylistsPerBranch);
      setFeatures(editingPlan.features || []);
      setIsFeatured(editingPlan.isFeatured);
      setStatus(editingPlan.status);
      setSortOrder(editingPlan.sortOrder);
    } else {
      // Default creation state
      setName("");
      setSlug("");
      setBadge("Popular");
      setDescription("Flexible salon queue operations with intelligent seat routing");
      setPrice1m(799);
      setCycle1mEnabled(true);
      setCycle3mEnabled(true);
      setCycle6mEnabled(true);
      setCycle1yEnabled(true);
      setDiscountPct3m(10);
      setDiscountPct6m(16);
      setDiscountPct1y(30);
      setPrice3m(Math.round(799 * 3 * 0.9));
      setPrice6m(Math.round(799 * 6 * 0.84));
      setPrice1y(Math.round(799 * 12 * 0.7));
      setMaxBranches(1);
      setMaxStylistsPerBranch(3);
      setFeatures([
        "station_chair_transfers",
        "station_soft_bump",
        "station_hold_pause",
        "digital_storefront",
      ]);
      setIsFeatured(false);
      setStatus("ACTIVE");
      setSortOrder(1);
    }
  }, [editingPlan, isOpen]);

  // Two-Way Calibrator Handlers
  const handlePrice1mChange = (newP1m: number) => {
    setPrice1m(newP1m);
    setPrice3m(Math.round(newP1m * 3 * (1 - discountPct3m / 100)));
    setPrice6m(Math.round(newP1m * 6 * (1 - discountPct6m / 100)));
    setPrice1y(Math.round(newP1m * 12 * (1 - discountPct1y / 100)));
  };

  // 3-Month cycle
  const handleDiscount3mChange = (pct: number) => {
    setDiscountPct3m(pct);
    setPrice3m(Math.round(price1m * 3 * (1 - pct / 100)));
  };

  const handlePrice3mChange = (customPrice: number) => {
    setPrice3m(customPrice);
    const nominal = price1m * 3;
    if (nominal > 0) {
      const calcPct = Math.max(0, Math.round(((nominal - customPrice) / nominal) * 100 * 10) / 10);
      setDiscountPct3m(calcPct);
    }
  };

  // 6-Month cycle
  const handleDiscount6mChange = (pct: number) => {
    setDiscountPct6m(pct);
    setPrice6m(Math.round(price1m * 6 * (1 - pct / 100)));
  };

  const handlePrice6mChange = (customPrice: number) => {
    setPrice6m(customPrice);
    const nominal = price1m * 6;
    if (nominal > 0) {
      const calcPct = Math.max(0, Math.round(((nominal - customPrice) / nominal) * 100 * 10) / 10);
      setDiscountPct6m(calcPct);
    }
  };

  // 1-Year cycle
  const handleDiscount1yChange = (pct: number) => {
    setDiscountPct1y(pct);
    setPrice1y(Math.round(price1m * 12 * (1 - pct / 100)));
  };

  const handlePrice1yChange = (customPrice: number) => {
    setPrice1y(customPrice);
    const nominal = price1m * 12;
    if (nominal > 0) {
      const calcPct = Math.max(0, Math.round(((nominal - customPrice) / nominal) * 100 * 10) / 10);
      setDiscountPct1y(calcPct);
    }
  };

  const toggleFeature = (featId: string) => {
    setFeatures((prev) =>
      prev.includes(featId) ? prev.filter((f) => f !== featId) : [...prev, featId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Plan name is required", "error");
      return;
    }
    if (price1m < 0) {
      showToast("Base monthly price must be positive", "error");
      return;
    }
    if (features.length === 0) {
      showToast("Please select at least 1 feature capability", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: CreatePlanPayload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        badge: badge.trim() ? badge.trim() : null,
        description: description.trim() ? description.trim() : null,
        price1m: Number(price1m),
        price3m: cycle3mEnabled ? Number(price3m) : undefined,
        price6m: cycle6mEnabled ? Number(price6m) : undefined,
        price1y: cycle1yEnabled ? Number(price1y) : undefined,
        discountPct3m: Number(discountPct3m),
        discountPct6m: Number(discountPct6m),
        discountPct1y: Number(discountPct1y),
        cycle1mEnabled,
        cycle3mEnabled,
        cycle6mEnabled,
        cycle1yEnabled,
        maxBranches: Number(maxBranches) || 1,
        maxStylistsPerBranch: Number(maxStylistsPerBranch) || 2,
        features,
        isFeatured,
        status,
        sortOrder: Number(sortOrder) || 1,
      };

      let resultPlan: SubscriptionPlan;

      if (editingPlan) {
        const res = await api.plans.update(editingPlan.id, payload);
        resultPlan = res.plan;
        showToast(`Plan "${resultPlan.name}" updated successfully!`, "success");
      } else {
        const res = await api.plans.create(payload);
        resultPlan = res.plan;
        showToast(`Plan "${resultPlan.name}" created and published!`, "success");
      }

      onSuccess(resultPlan);
      onClose();
    } catch (err: any) {
      showToast("Failed to save plan: " + (err.message || "Unknown error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} className="max-w-3xl">
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Dynamic Plan Studio</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-white">
            {editingPlan ? "Edit Subscription Plan" : "Create New Subscription Plan"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs sm:text-sm">
            Configure flexible billing durations, 2-way discount calibrator, quotas, and feature entitlements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
          {/* Section 1: Identity & Badge */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Store className="h-4 w-4 text-indigo-400" />
              <span>1. Plan Identity & Display</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Plan Display Name *
                </label>
                <Input
                  placeholder="e.g. Solo Traditional Barber"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  URL Slug (Optional)
                </label>
                <Input
                  placeholder="e.g. solo-barber (auto-generated)"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Display Badge (Optional)
                </label>
                <Input
                  placeholder="e.g. Most Popular, 3-Chair Special"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Display Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PlanStatus)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE (Visible in Portal)</option>
                  <option value="DRAFT">DRAFT (Hidden from Owners)</option>
                  <option value="ARCHIVED">ARCHIVED (Grandfathered Only)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Brief Value Proposition
                </label>
                <Input
                  placeholder="e.g. Designed for single-chair barbers with fast walk-in queueing"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 min-h-[44px]">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  Elevate as Featured Card (Highlight Border)
                </span>
              </label>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>Display Sort Order:</span>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-20 min-h-[44px] text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Two-Way Smart Pricing & Billing Cycles */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-400" />
                <span>2. Multi-Cycle Smart Discount Calibrator</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                Two-Way Sync Active
              </Badge>
            </div>

            {/* Base Monthly Anchor */}
            <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Anchor Base Monthly Price (1 Month) *
                </span>
                <span className="text-[11px] text-slate-400">
                  All multi-cycle percentage calculations anchor from this base rate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-400">₹</span>
                <Input
                  type="number"
                  min={0}
                  value={price1m}
                  onChange={(e) => handlePrice1mChange(Number(e.target.value))}
                  required
                  className="w-32 min-h-[44px] text-base font-extrabold text-white"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-400 ml-2">
                  <input
                    type="checkbox"
                    checked={cycle1mEnabled}
                    onChange={(e) => setCycle1mEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span>1M Enabled</span>
                </label>
              </div>
            </div>

            {/* 3 Months Calibrator */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                cycle3mEnabled ? "bg-slate-900/60 border-slate-800" : "bg-slate-950/20 border-slate-850 opacity-60"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer min-h-[40px]">
                  <input
                    type="checkbox"
                    checked={cycle3mEnabled}
                    onChange={(e) => setCycle3mEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span>3 Months Package (Quarterly)</span>
                </label>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Discount:</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!cycle3mEnabled}
                      value={discountPct3m}
                      onChange={(e) => handleDiscount3mChange(Number(e.target.value))}
                      className="w-20 min-h-[44px] text-center font-bold text-emerald-400"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Total: ₹</span>
                    <Input
                      type="number"
                      min={0}
                      disabled={!cycle3mEnabled}
                      value={price3m}
                      onChange={(e) => handlePrice3mChange(Number(e.target.value))}
                      className="w-28 min-h-[44px] font-extrabold text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Months Calibrator */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                cycle6mEnabled ? "bg-slate-900/60 border-slate-800" : "bg-slate-950/20 border-slate-850 opacity-60"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer min-h-[40px]">
                  <input
                    type="checkbox"
                    checked={cycle6mEnabled}
                    onChange={(e) => setCycle6mEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span>6 Months Package (Semi-Annual)</span>
                </label>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Discount:</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!cycle6mEnabled}
                      value={discountPct6m}
                      onChange={(e) => handleDiscount6mChange(Number(e.target.value))}
                      className="w-20 min-h-[44px] text-center font-bold text-emerald-400"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Total: ₹</span>
                    <Input
                      type="number"
                      min={0}
                      disabled={!cycle6mEnabled}
                      value={price6m}
                      onChange={(e) => handlePrice6mChange(Number(e.target.value))}
                      className="w-28 min-h-[44px] font-extrabold text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 1 Year Calibrator */}
            <div
              className={`p-3 rounded-lg border transition-all ${
                cycle1yEnabled ? "bg-slate-900/60 border-slate-800" : "bg-slate-950/20 border-slate-850 opacity-60"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-white cursor-pointer min-h-[40px]">
                  <input
                    type="checkbox"
                    checked={cycle1yEnabled}
                    onChange={(e) => setCycle1yEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span>1 Year Package (Annual Retainer)</span>
                </label>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Discount:</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      disabled={!cycle1yEnabled}
                      value={discountPct1y}
                      onChange={(e) => handleDiscount1yChange(Number(e.target.value))}
                      className="w-20 min-h-[44px] text-center font-bold text-emerald-400"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Total: ₹</span>
                    <Input
                      type="number"
                      min={0}
                      disabled={!cycle1yEnabled}
                      value={price1y}
                      onChange={(e) => handlePrice1yChange(Number(e.target.value))}
                      className="w-28 min-h-[44px] font-extrabold text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Branch & Stylist Quotas */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-400" />
              <span>3. Tenant Capacity & Resource Quotas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Maximum Branches Allowed *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={maxBranches}
                  onChange={(e) => setMaxBranches(Number(e.target.value))}
                  required
                  className="min-h-[44px]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Locations this salon owner organization can open
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Max Barber Chairs / Stylists per Branch *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={maxStylistsPerBranch}
                  onChange={(e) => setMaxStylistsPerBranch(Number(e.target.value))}
                  required
                  className="min-h-[44px]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Simultaneous active barber stations per physical branch
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: 12-Feature Checklist */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-400" />
                <span>4. Platform Capability & Feature Entitlements</span>
              </div>
              <span className="text-xs text-slate-400">
                {features.length} of {ALL_PLAN_FEATURES.length} Enabled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_PLAN_FEATURES.map((feat) => {
                const isSelected = features.includes(feat.id);
                return (
                  <div
                    key={feat.id}
                    onClick={() => toggleFeature(feat.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 min-h-[48px] ${
                      isSelected
                        ? "bg-indigo-950/30 border-indigo-500/50 text-white"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Controlled by div click
                      className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 shrink-0 pointer-events-none"
                    />
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold leading-snug">{feat.label}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {feat.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] border-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving Plan...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {editingPlan ? "Save Plan Changes" : "Publish Subscription Plan"}
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
