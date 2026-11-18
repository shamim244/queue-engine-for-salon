"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
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
import { ServiceIcon } from "@/components/ui/service-icon";
import { IconPickerDialog } from "@/components/owner/services/icon-picker-dialog";
import {
  suggestIconForServiceName,
  suggestMultipleIconsForServiceName,
  CURATED_SALON_ICONS,
  type SalonIconItem,
} from "@/lib/salon-icons";
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
  Edit2,
  Palette,
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
  const [isIconManuallySelected, setIsIconManuallySelected] = useState(false);
  const [autoMatchedIcon, setAutoMatchedIcon] = useState<SalonIconItem | null>(null);
  const [isAddOn, setIsAddOn] = useState(false);
  const [savingService, setSavingService] = useState(false);

  // Edit Service Modal State
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editName, setEditName] = useState("");
  const [editBasePrice, setEditBasePrice] = useState<number>(150);
  const [editDuration, setEditDuration] = useState<number>(25);
  const [editPricingType, setEditPricingType] = useState<"FIXED" | "STARTING_AT" | "FLEXIBLE_CHAIR">("FIXED");
  const [editIcon, setEditIcon] = useState("✂️");
  const [isEditIconManuallySelected, setIsEditIconManuallySelected] = useState(false);
  const [editAutoMatchedIcon, setEditAutoMatchedIcon] = useState<SalonIconItem | null>(null);
  const [editIsAddOn, setEditIsAddOn] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Computed multiple suggested icons for the typed service names
  const addServiceSuggestedIcons = useMemo(() => {
    return suggestMultipleIconsForServiceName(name, 4);
  }, [name]);

  const editServiceSuggestedIcons = useMemo(() => {
    return suggestMultipleIconsForServiceName(editName, 4);
  }, [editName]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!val.trim()) {
      setAutoMatchedIcon(null);
      setIsIconManuallySelected(false);
      setIcon("✂️");
      return;
    }

    if (!isIconManuallySelected) {
      const match = suggestIconForServiceName(val);
      if (match) {
        setIcon(match.value);
        setAutoMatchedIcon(match);
      }
    }
  };

  const handleEditNameChange = (val: string) => {
    setEditName(val);
    if (!val.trim()) {
      setEditAutoMatchedIcon(null);
      return;
    }

    if (!isEditIconManuallySelected) {
      const match = suggestIconForServiceName(val);
      if (match) {
        setEditIcon(match.value);
        setEditAutoMatchedIcon(match);
      }
    }
  };

  // Icon Picker Dialog State
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState<"add" | "edit">("add");

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
      setIcon("✂️");
      setIsIconManuallySelected(false);
      setAutoMatchedIcon(null);
      setIsAddOn(false);
      showToast(`Service "${name.trim()}" added to catalog!`, "success");
      fetchServices();
    } catch (err) {
      showToast("Failed to add service: " + (err as Error).message, "error");
    } finally {
      setSavingService(false);
    }
  };

  const handleOpenEdit = (srv: Service) => {
    setEditingService(srv);
    setEditName(srv.name);
    setEditBasePrice(srv.basePrice);
    setEditDuration(srv.estimatedDurationMinutes || 20);
    setEditPricingType(srv.pricingType || "FIXED");
    setEditIcon(srv.icon || "✂️");
    setIsEditIconManuallySelected(true);
    setEditAutoMatchedIcon(null);
    setEditIsAddOn(Boolean(srv.isAddOn));
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !salon || !editingService) return;
    setSavingEdit(true);
    try {
      await api.salons.updateService(salon.id, editingService.id, {
        name: editName.trim(),
        basePrice: Number(editBasePrice) || 0,
        estimatedDurationMinutes: Number(editDuration) || 20,
        pricingType: editPricingType,
        icon: editIcon,
        isAddOn: editIsAddOn,
      });
      setEditingService(null);
      showToast(`Service "${editName.trim()}" updated successfully!`, "success");
      fetchServices();
    } catch (err) {
      showToast("Failed to update service: " + (err as Error).message, "error");
    } finally {
      setSavingEdit(false);
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
          <Card key={srv.id} className="relative flex flex-col justify-between border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shadow-inner shrink-0 p-1.5">
                    <ServiceIcon icon={srv.icon} size={26} />
                  </div>
                  <div>
                    <CardTitle className="text-base text-white">{srv.name}</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-blue-400" />
                      <span>{srv.estimatedDurationMinutes} mins</span>
                      {srv.isAddOn && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">Add-On</span>
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

            <div className="p-3 pt-0 flex items-center justify-end gap-2 border-t border-slate-800/60 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 min-h-[38px]"
                onClick={() => handleOpenEdit(srv)}
              >
                <Edit2 className="h-3.5 w-3.5 text-amber-400" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 gap-1.5 min-h-[38px]"
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
              Create a grooming service with duration calibration, pricing rules, and custom vector icons.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div className="flex gap-3 items-start">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Icon</label>
                <button
                  type="button"
                  onClick={() => {
                    setIconPickerTarget("add");
                    setIsIconPickerOpen(true);
                  }}
                  className={`h-11 w-14 rounded-xl border bg-slate-900 flex items-center justify-center transition-all p-1 group relative ${
                    autoMatchedIcon && !isIconManuallySelected
                      ? "border-amber-500/80 ring-2 ring-amber-500/20 shadow-md"
                      : "border-slate-700 hover:border-amber-500"
                  }`}
                  title="Click to choose icon or paste SVGRepo link"
                >
                  <ServiceIcon icon={icon} size={24} />
                  {autoMatchedIcon && !isIconManuallySelected && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[9px] font-black text-slate-950 items-center justify-center">✨</span>
                    </span>
                  )}
                </button>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Service Name *</span>
                    {autoMatchedIcon && !isIconManuallySelected && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Auto-matched
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIconPickerTarget("add");
                      setIsIconPickerOpen(true);
                    }}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Palette className="h-3 w-3" />
                    Browse All ({CURATED_SALON_ICONS.length})
                  </button>
                </div>
                <Input
                  placeholder="e.g. Royal Beard Shaping or Haircut"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  autoFocus
                  required
                />

                {/* Quick-select matching icon chips */}
                {addServiceSuggestedIcons.length > 0 && name.trim().length >= 2 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 animate-in fade-in duration-200">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Sparkles className="h-3 w-3 text-amber-400" /> Match:
                    </span>
                    {addServiceSuggestedIcons.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => {
                          setIcon(sug.value);
                          setIsIconManuallySelected(true);
                          setAutoMatchedIcon(sug);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border transition-all ${
                          icon === sug.value
                            ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm"
                            : "bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                        }`}
                      >
                        <ServiceIcon icon={sug.value} size={14} />
                        <span>{sug.name}</span>
                      </button>
                    ))}
                  </div>
                )}
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

      {/* Modal: Edit Service */}
      {editingService && (
        <Dialog open={Boolean(editingService)} onOpenChange={() => setEditingService(null)}>
          <DialogClose onClose={() => setEditingService(null)} />
          <form onSubmit={handleUpdateService}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-amber-400" />
                <span>Edit &quot;{editingService.name}&quot;</span>
              </DialogTitle>
              <DialogDescription>
                Update service details, icon vectors, duration calibration, and pricing engine rules.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="flex gap-3 items-start">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Icon</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIconPickerTarget("edit");
                      setIsIconPickerOpen(true);
                    }}
                    className={`h-11 w-14 rounded-xl border bg-slate-900 flex items-center justify-center transition-all p-1 group relative ${
                      editAutoMatchedIcon && !isEditIconManuallySelected
                        ? "border-amber-500/80 ring-2 ring-amber-500/20 shadow-md"
                        : "border-slate-700 hover:border-amber-500"
                    }`}
                    title="Click to choose icon or paste SVGRepo link"
                  >
                    <ServiceIcon icon={editIcon} size={24} />
                    {editAutoMatchedIcon && !isEditIconManuallySelected && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[9px] font-black text-slate-950 items-center justify-center">✨</span>
                      </span>
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <span>Service Name *</span>
                      {editAutoMatchedIcon && !isEditIconManuallySelected && (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> Auto-matched
                        </span>
                      )}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIconPickerTarget("edit");
                        setIsIconPickerOpen(true);
                      }}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Palette className="h-3 w-3" />
                      Browse All ({CURATED_SALON_ICONS.length})
                    </button>
                  </div>
                  <Input
                    placeholder="e.g. Royal Beard Shaping"
                    value={editName}
                    onChange={(e) => handleEditNameChange(e.target.value)}
                    required
                  />

                  {/* Quick-select matching icon chips */}
                  {editServiceSuggestedIcons.length > 0 && editName.trim().length >= 2 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 animate-in fade-in duration-200">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
                        <Sparkles className="h-3 w-3 text-amber-400" /> Match:
                      </span>
                      {editServiceSuggestedIcons.map((sug) => (
                        <button
                          key={sug.id}
                          type="button"
                          onClick={() => {
                            setEditIcon(sug.value);
                            setIsEditIconManuallySelected(true);
                            setEditAutoMatchedIcon(sug);
                          }}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border transition-all ${
                            editIcon === sug.value
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm"
                              : "bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                          }`}
                        >
                          <ServiceIcon icon={sug.value} size={14} />
                          <span>{sug.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
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
                    value={editBasePrice}
                    onChange={(e) => setEditBasePrice(Number(e.target.value))}
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
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
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
                  value={editPricingType}
                  onChange={(e) => setEditPricingType(e.target.value as any)}
                >
                  <option value="FIXED">FIXED (Standard flat rate)</option>
                  <option value="STARTING_AT">STARTING_AT (Upsell in chair)</option>
                  <option value="FLEXIBLE_CHAIR">FLEXIBLE_CHAIR (Custom chairside amount)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isEditAddonCheck"
                  checked={editIsAddOn}
                  onChange={(e) => setEditIsAddOn(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="isEditAddonCheck" className="text-xs text-slate-300 cursor-pointer">
                  Mark as optional Add-on (e.g. Hair Wash, Head Massage)
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingService(null)}
                disabled={savingEdit}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingEdit}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {savingEdit ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Reusable Icon Picker Dialog */}
      <IconPickerDialog
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        currentValue={iconPickerTarget === "add" ? icon : editIcon}
        onSelect={(newIcon, iconItem) => {
          if (iconPickerTarget === "add") {
            setIcon(newIcon);
            setIsIconManuallySelected(true);
            setAutoMatchedIcon(iconItem || null);
            // If service name is blank, auto-fill it from the chosen icon's friendly title!
            if (!name.trim() && iconItem?.name) {
              setName(iconItem.name);
            }
          } else {
            setEditIcon(newIcon);
            setIsEditIconManuallySelected(true);
            setEditAutoMatchedIcon(iconItem || null);
            // If edit service name is blank, auto-fill it from the chosen icon's friendly title!
            if (!editName.trim() && iconItem?.name) {
              setEditName(iconItem.name);
            }
          }
        }}
      />

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
