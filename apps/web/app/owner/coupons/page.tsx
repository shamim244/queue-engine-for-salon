"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  discountType: "PERCENT" | "FLAT";
  discountValue: number;
  minBill: number;
  usesCount: number;
  maxUses?: number;
  isActive: boolean;
  expiresOn: string;
}

function OwnerCouponsContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();

  const [coupons, setCoupons] = useState<Coupon[]>([
    {
      id: "cp-1",
      code: "FESTIVAL20",
      discountType: "PERCENT",
      discountValue: 20,
      minBill: 200,
      usesCount: 42,
      maxUses: 100,
      isActive: true,
      expiresOn: "15 Nov 2026",
    },
    {
      id: "cp-2",
      code: "WELCOME50",
      discountType: "FLAT",
      discountValue: 50,
      minBill: 150,
      usesCount: 88,
      maxUses: 200,
      isActive: true,
      expiresOn: "31 Dec 2026",
    },
    {
      id: "cp-3",
      code: "CHAMPYFREE",
      discountType: "FLAT",
      discountValue: 40,
      minBill: 180,
      usesCount: 15,
      isActive: false,
      expiresOn: "10 Oct 2026",
    },
  ]);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Coupon form
  const [newCode, setNewCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minBill, setMinBill] = useState<number>(150);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = (id: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    const created: Coupon = {
      id: `cp-${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue) || 10,
      minBill: Number(minBill) || 0,
      usesCount: 0,
      isActive: true,
      expiresOn: "31 Dec 2026",
    };

    setCoupons([created, ...coupons]);
    setIsCreateModalOpen(false);
    setNewCode("");
    setDiscountValue(20);
    setMinBill(150);
  };

  const handleDelete = (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Coupons & Promotional Offers
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Create discount vouchers, festival codes, and special first-visit incentives.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
        >
          <Plus className="h-4 w-4" />
          Create New Coupon
        </Button>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((coupon) => (
          <Card key={coupon.id} className="relative flex flex-col justify-between">
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
                        className="text-slate-400 hover:text-white"
                        title="Copy Coupon Code"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {coupon.discountType === "PERCENT"
                        ? `${coupon.discountValue}% OFF`
                        : `₹${coupon.discountValue} FLAT OFF`}
                    </p>
                  </div>
                </div>

                <Badge variant={coupon.isActive ? "success" : "secondary"}>
                  {coupon.isActive ? "Active" : "Paused"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Minimum Bill:</span>
                  <strong className="text-white">{formatCurrency(coupon.minBill)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Redeemed:</span>
                  <span className="text-white">
                    <strong>{coupon.usesCount}</strong> {coupon.maxUses ? `/ ${coupon.maxUses}` : "times"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expires:</span>
                  <span className="text-slate-300">{coupon.expiresOn}</span>
                </div>
              </div>
            </CardContent>

            <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-slate-700"
                onClick={() => handleToggleStatus(coupon.id)}
              >
                {coupon.isActive ? "Pause Coupon" : "Activate Coupon"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-500 hover:text-rose-400"
                onClick={() => handleDelete(coupon.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

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

          <div className="space-y-4 my-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Coupon Code *
              </label>
              <Input
                placeholder="e.g. DIWALI25 or SUNDAYCUT"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
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
                  className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
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
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Minimum Bill Amount (₹)
              </label>
              <Input
                type="number"
                min={0}
                value={minBill}
                onChange={(e) => setMinBill(Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
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
