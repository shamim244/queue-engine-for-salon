"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Coupon, CouponDiscountType, CouponTargetType } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tag,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Search,
} from "lucide-react";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New coupon state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("PERCENT");
  const [discountValue, setDiscountValue] = useState(20);
  const [targetType, setTargetType] = useState<CouponTargetType>("SUBSCRIPTION");
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | undefined>(500);
  const [minOrderAmount, setMinOrderAmount] = useState<number | undefined>(999);
  const [creating, setCreating] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.coupons.getAll();
      if (res && res.coupons) {
        setCoupons(res.coupons);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setCreating(true);
    try {
      const res = await api.coupons.create({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue,
        targetType,
        maxDiscountAmount,
        minOrderAmount,
        status: "ACTIVE",
      });
      if (res && res.success) {
        showToast("success", `Coupon code ${code.toUpperCase()} created!`);
        setIsCreateModalOpen(false);
        setCode("");
        loadCoupons();
      } else {
        showToast("error", "Failed to create coupon");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error creating coupon");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!window.confirm("Are you sure you want to deactivate/delete this coupon code?")) return;
    try {
      const res = await api.coupons.delete(couponId);
      if (res && res.success) {
        setCoupons((prev) => prev.filter((c) => c.id !== couponId));
        showToast("success", "Coupon code removed");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to remove coupon");
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
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
            <span className="text-pink-400 font-medium">Growth & Marketing</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">Coupons</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            🎁 Coupon & Discount Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage promotional coupon codes, percentage/flat discounts, and redemption usage limits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCoupons}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-pink-600 hover:bg-pink-500 text-white font-bold h-9 gap-1.5 text-xs shadow-md shadow-pink-600/20"
          >
            <Plus className="h-4 w-4" />
            New Coupon
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search coupons by promo code..."
          className="pl-9 bg-slate-900/70 border-slate-700 text-slate-100 placeholder:text-slate-500 h-10 text-xs"
        />
      </div>

      {/* Coupons Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mx-auto mb-2" />
          Loading promotional coupons...
        </div>
      ) : filteredCoupons.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40 p-12 text-center">
          <Tag className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Promo Coupons Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Create promotional coupon codes to incentivize new salon onboardings or subscription upgrades.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold"
          >
            Create First Coupon
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => (
            <Card key={coupon.id} className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-lg text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {coupon.code}
                  </span>
                  <Badge variant="outline" className={coupon.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]" : "text-slate-500"}>
                    {coupon.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Discount Value:</span>
                  <span className="font-bold text-pink-400">
                    {coupon.discountType === "PERCENT" ? `${coupon.discountValue}% OFF` : formatCurrency(coupon.discountValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Type:</span>
                  <span className="text-slate-200">{coupon.targetType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Times Redeemed:</span>
                  <span className="font-mono text-white">{coupon.usedCount || 0}</span>
                </div>
                {coupon.minOrderAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Min Order:</span>
                    <span className="text-slate-300 font-mono">{formatCurrency(coupon.minOrderAmount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCoupon(coupon.id)}
                    className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Coupon Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateCoupon}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-pink-400">
              <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Create Promotional Coupon</h3>
                <p className="text-xs text-slate-400">Configure discount code parameters</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Coupon Code</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DIWALI50 or PROMO20"
                className="bg-slate-950 border-slate-700 text-white font-mono uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 text-xs outline-none"
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FLAT">Flat (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Discount Value</label>
                <Input
                  type="number"
                  min={1}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Target Scope</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 text-xs outline-none"
                >
                  <option value="SUBSCRIPTION">SaaS Subscription</option>
                  <option value="SALON_SERVICE">Salon Service</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Max Cap (₹)</label>
                <Input
                  type="number"
                  value={maxDiscountAmount || ""}
                  onChange={(e) => setMaxDiscountAmount(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Optional"
                  className="bg-slate-950 border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !code.trim()}
                className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold gap-1.5"
              >
                {creating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Publish Coupon
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}