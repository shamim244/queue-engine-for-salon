"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  TicketPercent,
  Plus,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Percent,
  Tag,
  Trash2,
  RefreshCw,
  AlertCircle,
  Share2,
  MessageCircle,
  Link2,
  ExternalLink,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Coupon, CouponDiscountType } from "@/lib/api";

function OwnerCouponsContent() {
  const searchParams = useSearchParams();
  const { salon: authSalon } = useAuth();
  const currentSlug = searchParams.get("salon") || authSalon?.slug || "getsalon";

  const [salon, setSalon] = useState<any>(authSalon || null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // New Coupon form fields
  const [newCode, setNewCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minBill, setMinBill] = useState<number>(150);
  const [maxDiscount, setMaxDiscount] = useState<string>("");
  const [maxUses, setMaxUses] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [isFirstVisitOnly, setIsFirstVisitOnly] = useState<boolean>(true);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState<number>(1);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Resolve Salon Context
  useEffect(() => {
    let isMounted = true;
    api.salons
      .get(currentSlug)
      .then((res) => {
        if (!isMounted) return;
        if (res.salon) {
          setSalon(res.salon);
        }
      })
      .catch((err) => console.warn("Could not load salon details for coupons:", err));

    return () => {
      isMounted = false;
    };
  }, [currentSlug]);

  const loadCoupons = async (salonId?: string) => {
    try {
      setLoading(true);
      const res = await api.coupons.getAll({
        targetType: "SALON_SERVICE",
        salonId: salonId || salon?.id,
      });
      if (res.coupons) {
        // Enforce client-side filtering as well to ensure zero cross-salon pollution
        const targetId = salonId || salon?.id;
        const filtered = targetId
          ? res.coupons.filter((c) => !c.salonId || c.salonId === targetId)
          : res.coupons;
        setCoupons(filtered);
      }
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (salon?.id) {
      loadCoupons(salon.id);
    } else {
      loadCoupons();
    }
  }, [salon?.id]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyBookingLink = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/s/${currentSlug}/book?coupon=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(code);
    showToast(`Copied booking link for coupon "${code}"!`);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleShareWhatsApp = (coupon: Coupon) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const queueUrl = `${origin}/s/${currentSlug}/queue?coupon=${encodeURIComponent(coupon.code)}`;
    const bookUrl = `${origin}/s/${currentSlug}/book?coupon=${encodeURIComponent(coupon.code)}`;
    const discountText =
      coupon.discountType === "PERCENT"
        ? `${coupon.discountValue}% OFF`
        : `${formatCurrency(coupon.discountValue)} FLAT OFF`;

    const text = `🎉 *Special Offer from ${salon?.name || "Our Salon"}!*\n\nUse coupon code *${coupon.code}* to get *${discountText}* on your haircut & grooming.\n\n🎟️ Join Live Queue Pass: ${queueUrl}\n📅 Book Advance Slot: ${bookUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = coupon.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.coupons.update(coupon.id, { status: newStatus });
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, status: newStatus } : c))
      );
      showToast(`Coupon "${coupon.code}" ${newStatus === "ACTIVE" ? "activated" : "paused"}.`);
    } catch (err: any) {
      showToast(err.message || "Failed to update coupon status");
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    if (!salon?.id) {
      setFormError("Salon context could not be resolved. Please reload.");
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      const res = await api.coupons.create({
        code: newCode.trim().toUpperCase(),
        targetType: "SALON_SERVICE",
        salonId: salon.id, // Strictly scoped to this salon
        discountType,
        discountValue: Number(discountValue) || 10,
        minOrderAmount: Number(minBill) || 0,
        maxDiscountAmount: discountType === "PERCENT" && maxDiscount ? Number(maxDiscount) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        maxUsesPerUser: isFirstVisitOnly ? 1 : (maxUsesPerUser > 0 ? maxUsesPerUser : 9999),
        isFirstTimeOnly: isFirstVisitOnly,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      });

      if (res.success && res.coupon) {
        setCoupons((prev) => [res.coupon, ...prev]);
        setIsCreateModalOpen(false);
        setNewCode("");
        setDiscountValue(20);
        setMinBill(150);
        setMaxDiscount("");
        setMaxUses("");
        setValidUntil("");
        setIsFirstVisitOnly(true);
        setMaxUsesPerUser(1);
        showToast(`Coupon "${res.coupon.code}" created for ${salon.name}!`);
      } else {
        setFormError("Could not create coupon.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.coupons.delete(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      showToast("Coupon removed successfully.");
    } catch (err: any) {
      showToast("Failed to delete coupon: " + err.message);
    }
  };

  const setPresetDate = (days: number | null) => {
    if (days === null) {
      setValidUntil("");
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + days);
    setValidUntil(d.toISOString().split("T")[0]);
  };

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Coupons & Promotional Offers
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create discount vouchers, festival codes, and special first-visit incentives for your clients.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 min-h-[44px] px-4"
        >
          <Plus className="h-4 w-4" />
          Create New Coupon
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-400" />
          <p className="text-sm font-medium">Loading promotional coupons...</p>
        </div>
      ) : coupons.length === 0 ? (
        <Card className="border-dashed border-slate-800 bg-slate-950/40 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <TicketPercent className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Active Promotional Coupons</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-6">
            Create festival codes or first-cut vouchers to attract new walk-in clients and increase repeat visits.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Your First Coupon
          </Button>
        </Card>
      ) : (
        /* Coupons Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <Card key={coupon.id} className="relative flex flex-col justify-between border-slate-800 bg-slate-900/60 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-base shadow-inner">
                      <TicketPercent className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white text-base tracking-wider">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="text-slate-400 hover:text-white min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
                          title="Copy Coupon Code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-amber-300 font-semibold mt-0.5">
                        {coupon.discountType === "PERCENT"
                          ? `${coupon.discountValue}% OFF`
                          : `${formatCurrency(coupon.discountValue)} FLAT OFF`}
                        {coupon.maxDiscountAmount ? ` (Up to ${formatCurrency(coupon.maxDiscountAmount)})` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <Badge
                      variant={coupon.status === "ACTIVE" ? "success" : "secondary"}
                      className={coupon.status === "ACTIVE" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"}
                    >
                      {coupon.status === "ACTIVE" ? "Active" : "Paused"}
                    </Badge>
                    {coupon.validUntil && new Date(coupon.validUntil) < new Date() && (
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-1.5 py-0.5 rounded">
                        Expired
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Minimum Bill:</span>
                    <strong className="text-white">{formatCurrency(coupon.minOrderAmount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Usage Limit:</span>
                    <span className="text-slate-200 font-medium">
                      {coupon.isFirstTimeOnly
                        ? "🌟 1st visit only (New clients)"
                        : coupon.maxUsesPerUser && coupon.maxUsesPerUser < 9000
                        ? `🔄 Up to ${coupon.maxUsesPerUser}x per customer`
                        : "Unlimited uses"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Redeemed:</span>
                    <span className="text-white">
                      <strong>{coupon.usedCount}</strong> {coupon.maxUses ? `/ ${coupon.maxUses}` : "times"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Validity:</span>
                    <span className={coupon.validUntil && new Date(coupon.validUntil) < new Date() ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                      {coupon.validUntil
                        ? new Date(coupon.validUntil).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Never Expires (Ongoing)"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Exclusive to {salon?.name || "your salon"}</span>
                </div>
              </CardContent>

              {/* Action Buttons */}
              <div className="p-4 pt-0 border-t border-slate-800/80 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[38px] text-[11px] border-emerald-600/40 text-emerald-300 hover:bg-emerald-950/40 gap-1.5"
                    onClick={() => handleShareWhatsApp(coupon)}
                    title="Share directly to customer WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[38px] text-[11px] border-slate-700 hover:bg-slate-800 gap-1.5 text-slate-300"
                    onClick={() => handleCopyBookingLink(coupon.code)}
                    title="Copy direct booking link with coupon applied"
                  >
                    {copiedLink === coupon.code ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5 text-blue-400" />
                    )}
                    <span>{copiedLink === coupon.code ? "Copied Link" : "Copy Link"}</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[36px] text-xs border-slate-700 hover:bg-slate-800"
                    onClick={() => handleToggleStatus(coupon)}
                  >
                    {coupon.status === "ACTIVE" ? "Pause Coupon" : "Activate Coupon"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-[36px] text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-950/20"
                    onClick={() => handleDelete(coupon.id)}
                    title="Delete Coupon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Create Coupon */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogClose onClose={() => setIsCreateModalOpen(false)} />
        <form onSubmit={handleCreateCoupon}>
          <DialogHeader>
            <DialogTitle>Create Promotional Coupon</DialogTitle>
            <DialogDescription>
              Create festival codes, walk-in vouchers, or first-visit incentives exclusive to {salon?.name || "your salon"}.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 my-2 bg-rose-950/60 border border-rose-600/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-4 my-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Coupon Code *
              </label>
              <Input
                placeholder="e.g. DIWALI25, FIRSTCUT, or SUNDAYOFF"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="font-mono uppercase min-h-[44px]"
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="flex min-h-[44px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FLAT">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Value ({discountType === "PERCENT" ? "%" : "₹"}) *
                </label>
                <Input
                  type="number"
                  min={1}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="min-h-[44px]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Min Bill Amount (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={minBill}
                  onChange={(e) => setMinBill(Number(e.target.value))}
                  className="min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Max Discount Cap (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  placeholder={discountType === "PERCENT" ? "e.g. 100 cap" : "Not applicable"}
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  disabled={discountType === "FLAT"}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            {/* Expiry Date with 1-Tap Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  <span>Expiry Date (Optional)</span>
                </label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPresetDate(7)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(30)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(null)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 hover:text-amber-300"
                  >
                    No Expiry
                  </button>
                </div>
              </div>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="min-h-[44px] text-xs bg-slate-900 border-slate-700"
              />
            </div>

            {/* Client Usage Scope */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Target Audience Policy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFirstVisitOnly(true);
                    setMaxUsesPerUser(1);
                  }}
                  className={`min-h-[46px] px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2.5 ${
                    isFirstVisitOnly
                      ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                  <div>
                    <span className="block font-bold">First Visit Only</span>
                    <span className="text-[10px] text-slate-400 font-normal">New customers (0 prior visits)</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFirstVisitOnly(false)}
                  className={`min-h-[46px] px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2.5 ${
                    !isFirstVisitOnly
                      ? "bg-blue-500/20 border-blue-500/60 text-blue-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                  <div>
                    <span className="block font-bold">Promotional Campaign</span>
                    <span className="text-[10px] text-slate-400 font-normal">Open to all clients (set limits)</span>
                  </div>
                </button>
              </div>

              {/* Per-Customer Frequency Controls (1x, 2x, 3x, 4x, etc.) */}
              {!isFirstVisitOnly ? (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      How many times can each customer use this coupon?
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {maxUsesPerUser >= 9000 ? "Unlimited" : `${maxUsesPerUser} time${maxUsesPerUser > 1 ? "s" : ""}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4].map((times) => (
                      <button
                        key={times}
                        type="button"
                        onClick={() => setMaxUsesPerUser(times)}
                        className={`min-h-[38px] rounded-lg text-xs font-bold border transition-all ${
                          maxUsesPerUser === times
                            ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {times === 1 ? "Once" : times === 2 ? "Twice" : `${times}x`}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setMaxUsesPerUser(9999)}
                      className={`min-h-[38px] rounded-lg text-xs font-bold border transition-all ${
                        maxUsesPerUser >= 9000
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      Unlimited
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {maxUsesPerUser === 1
                      ? "Each client can redeem this code exactly once with their mobile number."
                      : maxUsesPerUser >= 9000
                      ? "Clients can reuse this code without any personal limit."
                      : `Each client can redeem this code up to ${maxUsesPerUser} times with their mobile number.`}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-amber-300/80 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl leading-relaxed mt-1">
                  🔒 <strong>Anti-Abuse Verification:</strong> The system automatically verifies that the client has 0 prior completed visits at your salon. Once used, they cannot redeem it again.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Max Total Redemptions Across All Clients (Optional)
              </label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 100 uses (Leave blank for unlimited)"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setIsCreateModalOpen(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !newCode.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold min-h-[44px]"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save Coupon Code
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

export default function OwnerCouponsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Coupons...</div>}>
      <OwnerCouponsContent />
    </Suspense>
  );
}
