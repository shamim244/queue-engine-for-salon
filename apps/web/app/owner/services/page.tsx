"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Service, Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import {
  Tag,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  RefreshCw,
  Info,
  Sliders,
  Check,
  AlertCircle,
} from "lucide-react";

function OwnerServicesContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Service Modal
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [name, setName] = useState("");
  const [basePrice, setBasePrice] = useState<number>(150);
  const [duration, setDuration] = useState<number>(25);
  const [pricingType, setPricingType] = useState<"FIXED" | "STARTING_AT" | "FLEXIBLE_CHAIR">("FIXED");
  const [icon, setIcon] = useState("✂️");
  const [isAddOn, setIsAddOn] = useState(false);
  const [savingService, setSavingService] = useState(false);

  // In-app Delete Confirmation Modal State
  const [serviceToDelete, setServiceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingService, setDeletingService] = useState(false);

  // In-App Toast Banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const currentSlug = salon?.slug || searchParams.get("salon") || "ramesh-barber";

  const fetchServices = async () => {
    try {
      const salonRes = await api.salons.get(currentSlug);
      setServices(salonRes.salon?.services || []);
    } catch (err) {
      console.error("Failed to load services:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [currentSlug]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !salon) return;
    setSavingService(true);
    try {
      await api.salons.addService(salon.id, {
        name: name.trim(),
        basePrice: Number(basePrice) || 0,
        estimatedDurationMinutes: Number(duration) || 20,
        pricingType,
        icon,
        isAddOn,
      });
      setIsAddServiceOpen(false);
      setName("");
      setBasePrice(150);
      setDuration(25);
      showToast(`Service "${name.trim()}" added to catalog!`, "success");
      fetchServices();
    } catch (err) {
      showToast("Failed to add service: " + (err as Error).message, "error");
    } finally {
      setSavingService(false);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!salon || !serviceToDelete) return;
    setDeletingService(true);
    try {
      await api.salons.deleteService(salon.id, serviceToDelete.id);
      showToast(`Service "${serviceToDelete.name}" removed from catalog.`, "info");
      setServiceToDelete(null);
      fetchServices();
    } catch (err) {
      showToast("Failed to delete service: " + (err as Error).message, "error");
    } finally {
      setDeletingService(false);
    }
  };

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
            {toast.type === "info" && <Sparkles className="h-5 w-5 text-blue-400 shrink-0" />}
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Service Catalog & Pricing Engine
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure services, duration calibrations, and flexible pricing models (Fixed, Starting At, or Flexible Chair).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchServices}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddServiceOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Service
          </Button>
        </div>
      </div>

      {/* Pricing Models Explanation Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-xs space-y-1">
          <Badge variant="default" className="text-[10px] mb-1">
            FIXED
          </Badge>
          <p className="font-semibold text-white">Standard Exact Price</p>
          <p className="text-slate-400">
            Guaranteed flat rate displayed on Door QR and auto-charged on completion.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-xs space-y-1">
          <Badge variant="warning" className="text-[10px] mb-1">
            STARTING AT
          </Badge>
          <p className="font-semibold text-white">Base Price + Upsell</p>
          <p className="text-slate-400">
            Displays as "From ₹[base]", allows stylist to add custom add-ons during chair service.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-xs space-y-1">
          <Badge variant="purple" className="text-[10px] mb-1">
            FLEXIBLE CHAIR
          </Badge>
          <p className="font-semibold text-white">Flexible Chairside Pricing</p>
          <p className="text-slate-400">
            Stylist live-edits the final bill on the chair tablet before 1-tap cash or UPI checkout.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((srv) => (
          <Card key={srv.id} className="relative flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xl shadow-inner">
                    {srv.icon || "✂️"}
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">{srv.name}</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-blue-400" />
                      <span>{srv.estimatedDurationMinutes} mins</span>
                      {srv.isAddOn && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400">Add-On</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={
                    srv.pricingType === "FLEXIBLE_CHAIR"
                      ? "purple"
                      : srv.pricingType === "STARTING_AT"
                      ? "warning"
                      : "default"
                  }
                  className="text-[10px]"
                >
                  {srv.pricingType || "FIXED"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
                <span className="text-xs text-slate-400">Base Price:</span>
                <span className="text-lg font-black text-emerald-400">
                  {formatCurrency(srv.basePrice)}
                </span>
              </div>
            </CardContent>

            <div className="p-4 pt-0 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 gap-1.5"
                onClick={() => setServiceToDelete({ id: srv.id, name: srv.name })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Add Service */}
      <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
        <DialogClose onClose={() => setIsAddServiceOpen(false)} />
        <form onSubmit={handleAddService}>
          <DialogHeader>
            <DialogTitle>Add Service to Catalog</DialogTitle>
            <DialogDescription>
              Create a grooming service with duration calibration and pricing rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="flex gap-3">
              <div className="w-20">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Icon</label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="text-center text-xl"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Service Name *
                </label>
                <Input
                  placeholder="e.g. Royal Beard Shaping"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Base Price (₹) *
                </label>
                <Input
                  type="number"
                  min={0}
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Duration (Mins) *
                </label>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Pricing Engine Rule
              </label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={pricingType}
                onChange={(e) => setPricingType(e.target.value as any)}
              >
                <option value="FIXED">FIXED (Standard flat rate)</option>
                <option value="STARTING_AT">STARTING_AT (Upsell in chair)</option>
                <option value="FLEXIBLE_CHAIR">FLEXIBLE_CHAIR (Custom chairside amount)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isAddonCheck"
                checked={isAddOn}
                onChange={(e) => setIsAddOn(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="isAddonCheck" className="text-xs text-slate-300 cursor-pointer">
                Mark as optional Add-on (e.g. Hair Wash, Head Massage)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddServiceOpen(false)}
              disabled={savingService}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={savingService}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {savingService ? "Saving..." : "Add to Catalog"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: Confirm Delete Service */}
      {serviceToDelete && (
        <Dialog open={Boolean(serviceToDelete)} onOpenChange={() => setServiceToDelete(null)}>
          <DialogClose onClose={() => setServiceToDelete(null)} />
          <div>
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Remove &quot;{serviceToDelete.name}&quot; from Catalog?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this service? Existing active queue tickets with this service will keep their price, but new customers won&apos;t be able to select it.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setServiceToDelete(null)}
                disabled={deletingService}
              >
                Keep Service
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteService}
                disabled={deletingService}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-2"
              >
                {deletingService ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Confirm Delete
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default function OwnerServicesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Services...</div>}>
      <OwnerServicesContent />
    </Suspense>
  );
}
