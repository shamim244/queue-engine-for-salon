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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Coupon, CouponDiscountType } from "@/lib/api";

function OwnerCouponsContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.coupons.getAll({
        targetType: "SALON_SERVICE",
        salonId: salon?.id,
      });
      if (res.coupons) {
        setCoupons(res.coupons);
      }
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, [salon?.id]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await api.coupons.create({
        code: newCode.trim().toUpperCase(),
        targetType: "SALON_SERVICE",
        salonId: salon?.id || null,
        discountType,
        discountValue: Number(discountValue) || 10,
        minOrderAmount: Number(minBill) || 0,
        maxDiscountAmount: maxDiscount ? Number(maxDiscount) : null,
        maxUses: maxUses ? Number(maxUses) : null,
        maxUsesPerUser: 1,
      });

      if (res.success && res.coupon) {
        setCoupons((prev) => [res.coupon, ...prev]);
        setIsCreateModalOpen(false);
        setNewCode("");
        setDiscountValue(20);
        setMinBill(150);
        setMaxDiscount("");
        setMaxUses("");
        showToast(`Coupon "${res.coupon.code}" created successfully!`);
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
                          onClick={() => handleCopy(coupon.code)}
                          className="text-slate-400 hover:text-white min-h-[32px] min-w-[32px] flex items-center justify-center"
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

                  <Badge
                    variant={coupon.status === "ACTIVE" ? "success" : "secondary"}
                    className={coupon.status === "ACTIVE" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400"}
                  >
                    {coupon.status === "ACTIVE" ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Minimum Bill:</span>
                    <strong className="text-white">{formatCurrency(coupon.minOrderAmount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Redeemed:</span>
                    <span className="text-white">
                      <strong>{coupon.usedCount}</strong> {coupon.maxUses ? `/ ${coupon.maxUses}` : "times"}
                    </span>
                  </div>
                  {coupon.validUntil && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valid Until:</span>
                      <span className="text-slate-300">
                        {new Date(coupon.validUntil).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>

              <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] text-xs border-slate-700 hover:bg-slate-800"
                  onClick={() => handleToggleStatus(coupon)}
                >
                  {coupon.status === "ACTIVE" ? "Pause Coupon" : "Activate Coupon"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[40px] text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-950/20"
                  onClick={() => handleDelete(coupon.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
              Offer special discounts to entice walk-ins or reward frequent clients.
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
                placeholder="e.g. DIWALI25 or SUNDAYCUT"
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
                  placeholder="Optional cap"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Max Total Redemptions (Optional)
              </label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 100 uses"
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
