import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Salon } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServiceIcon } from "@/components/ui/service-icon";
import {
  QrCode,
  Tv,
  Armchair,
  ExternalLink,
  RefreshCw,
  Save,
  UserCheck,
  Plus,
  Scissors,
  AlertTriangle,
  Trash2,
} from "lucide-react";

interface InspectTenantModalProps {
  salon: Salon | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onDeleteRequest: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function InspectTenantModal({
  salon,
  isOpen,
  onClose,
  onRefresh,
  onDeleteRequest,
  showToast,
}: InspectTenantModalProps) {
  const [inspectTab, setInspectTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    upiPaymentId: "",
    status: "ACTIVE" as "ACTIVE" | "SUSPENDED" | "MAINTENANCE",
  });

  // Stylist quick add
  const [newStylistName, setNewStylistName] = useState("");
  const [newStylistPhone, setNewStylistPhone] = useState("");
  const [newStylistDuration, setNewStylistDuration] = useState(25);
  const [isAddingStylist, setIsAddingStylist] = useState(false);

  // Service quick add
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState(100);
  const [newServiceDuration, setNewServiceDuration] = useState(20);
  const [isAddingService, setIsAddingService] = useState(false);

  useEffect(() => {
    if (salon) {
      setEditForm({
        name: salon.name || "",
        phone: salon.phone || "",
        address: salon.address || "",
        upiPaymentId: salon.upiPaymentId || "",
        status: salon.status || "ACTIVE",
      });
      setInspectTab("overview");
    }
  }, [salon]);

  if (!salon) return null;

  const handleSaveSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.salons.update(salon.id, editForm);
      onRefresh();
      showToast("Salon details updated successfully!", "success");
    } catch (err: any) {
      showToast("Failed to update salon: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStylistToSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStylistName.trim()) return;
    setIsAddingStylist(true);
    try {
      await api.salons.addStylist(salon.id, {
        name: newStylistName.trim(),
        phone: newStylistPhone.trim() || undefined,
        avgDurationMinutes: Number(newStylistDuration) || 25,
      });
      setNewStylistName("");
      setNewStylistPhone("");
      setNewStylistDuration(25);
      showToast(`Stylist ${newStylistName.trim()} added!`, "success");
      onRefresh();
    } catch (err: any) {
      showToast("Failed to add stylist: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsAddingStylist(false);
    }
  };

  const handleAddServiceToSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    setIsAddingService(true);
    try {
      await api.salons.addService(salon.id, {
        name: newServiceName.trim(),
        basePrice: Number(newServicePrice) || 100,
        estimatedDurationMinutes: Number(newServiceDuration) || 20,
      });
      setNewServiceName("");
      setNewServicePrice(100);
      setNewServiceDuration(20);
      showToast(`Service "${newServiceName.trim()}" added!`, "success");
      onRefresh();
    } catch (err: any) {
      showToast("Failed to add service: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsAddingService(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div className="max-w-3xl w-full">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <span>{salon.name}</span>
                <Badge
                  variant={
                    salon.status === "ACTIVE"
                      ? "success"
                      : salon.status === "SUSPENDED"
                      ? "destructive"
                      : "warning"
                  }
                  className="text-xs"
                >
                  {salon.status || "ACTIVE"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Slug: <code className="text-blue-400">/s/{salon.slug}</code> · ID:{" "}
                <code className="text-slate-400">{salon.id}</code>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Link href={`/s/${salon.slug}`} target="_blank">
                <Button size="sm" variant="outline" className="min-h-[44px] sm:min-h-[32px] text-xs gap-1 border-slate-700">
                  <QrCode className="h-3.5 w-3.5" />
                  QR
                </Button>
              </Link>
              <Link href={`/s/${salon.slug}/tv`} target="_blank">
                <Button size="sm" variant="outline" className="min-h-[44px] sm:min-h-[32px] text-xs gap-1 border-slate-700">
                  <Tv className="h-3.5 w-3.5" />
                  TV
                </Button>
              </Link>
              <Link href={`/s/${salon.slug}/station`} target="_blank">
                <Button size="sm" variant="outline" className="min-h-[44px] sm:min-h-[32px] text-xs gap-1 border-slate-700">
                  <Armchair className="h-3.5 w-3.5" />
                  Station
                </Button>
              </Link>
              <Link href={`/owner?salon=${salon.slug}`} target="_blank">
                <Button size="sm" variant="secondary" className="min-h-[44px] sm:min-h-[32px] text-xs gap-1">
                  Owner
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <Tabs value={inspectTab} onValueChange={setInspectTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview & Settings</TabsTrigger>
              <TabsTrigger value="stylists">
                Stylists ({salon.stylists?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="services">
                Services ({salon.services?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="danger" className="text-red-400">
                Danger Zone
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Overview & Settings */}
            <TabsContent value="overview">
              <form onSubmit={handleSaveSalon} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Salon Display Name
                    </label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                      className="min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Contact Phone
                    </label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      required
                      className="min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Physical Address / Location
                    </label>
                    <Input
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="e.g. Shop 4, Station Road, Jaipur"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      UPI Payment ID (for Direct Door QR Pay)
                    </label>
                    <Input
                      value={editForm.upiPaymentId}
                      onChange={(e) => setEditForm({ ...editForm, upiPaymentId: e.target.value })}
                      placeholder="e.g. barber@upi"
                      className="min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Tenant Status Control
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, status: "ACTIVE" })}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all min-h-[52px] ${
                          editForm.status === "ACTIVE"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                            : "border-slate-800 bg-slate-900 text-slate-400"
                        }`}
                      >
                        <p className="font-bold">Active</p>
                        <p className="text-[10px] opacity-75">Open for check-in</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, status: "SUSPENDED" })}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all min-h-[52px] ${
                          editForm.status === "SUSPENDED"
                            ? "border-red-500 bg-red-500/10 text-red-200"
                            : "border-slate-800 bg-slate-900 text-slate-400"
                        }`}
                      >
                        <p className="font-bold">Suspended</p>
                        <p className="text-[10px] opacity-75">Queue locked</p>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <Button type="submit" disabled={isSaving} className="gap-2 min-h-[44px]">
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Salon Settings
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Tab 2: Stylists & Chairs */}
            <TabsContent value="stylists" className="space-y-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Stylist / Chair</th>
                      <th className="py-2.5 px-3">Contact</th>
                      <th className="py-2.5 px-3">Avg Speed</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {salon.stylists?.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {st.name}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">
                          {st.phone || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          {st.historicalAvgDurationMinutes || st.avgDurationMinutes || 25} mins
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="success" className="text-[10px] py-0">
                            Active
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form
                onSubmit={handleAddStylistToSalon}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3"
              >
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                  Quick Add Stylist / Chair
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Input
                    placeholder="Stylist Name (e.g. Rahul)"
                    value={newStylistName}
                    onChange={(e) => setNewStylistName(e.target.value)}
                    className="text-xs h-10 min-h-[44px] sm:min-h-[36px]"
                    required
                  />
                  <Input
                    placeholder="Phone (Optional)"
                    value={newStylistPhone}
                    onChange={(e) => setNewStylistPhone(e.target.value)}
                    className="text-xs h-10 min-h-[44px] sm:min-h-[36px]"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Avg Mins"
                      value={newStylistDuration}
                      onChange={(e) => setNewStylistDuration(Number(e.target.value))}
                      className="text-xs h-10 w-24 min-h-[44px] sm:min-h-[36px]"
                      min={5}
                      max={180}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isAddingStylist}
                      className="text-xs min-h-[44px] sm:min-h-[36px] flex-1 gap-1"
                    >
                      {isAddingStylist ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            {/* Tab 3: Services Catalog */}
            <TabsContent value="services" className="space-y-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Service Name</th>
                      <th className="py-2.5 px-3">Base Price</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {salon.services?.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-2">
                          <ServiceIcon icon={srv.icon} size={16} />
                          <span>{srv.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">
                          ₹{srv.basePrice}
                        </td>
                        <td className="py-2.5 px-3">
                          {srv.estimatedDurationMinutes} mins
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={srv.isAddOn ? "outline" : "default"}
                            className="text-[10px] py-0"
                          >
                            {srv.isAddOn ? "Add-On" : "Standard"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form
                onSubmit={handleAddServiceToSalon}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3"
              >
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-blue-400" />
                  Quick Add Service
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Input
                    placeholder="Service Name (e.g. Hair Spa)"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    className="text-xs h-10 min-h-[44px] sm:min-h-[36px]"
                    required
                  />
                  <Input
                    type="number"
                    placeholder="Price (₹)"
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(Number(e.target.value))}
                    className="text-xs h-10 min-h-[44px] sm:min-h-[36px]"
                    min={0}
                    required
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Mins"
                      value={newServiceDuration}
                      onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                      className="text-xs h-10 w-24 min-h-[44px] sm:min-h-[36px]"
                      min={5}
                      max={240}
                      required
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isAddingService}
                      className="text-xs min-h-[44px] sm:min-h-[36px] flex-1 gap-1"
                    >
                      {isAddingService ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              </form>
            </TabsContent>

            {/* Tab 4: Danger Zone */}
            <TabsContent value="danger">
              <div className="p-4 rounded-xl border border-red-900/60 bg-red-950/20 space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-red-200">
                      Delete or Archive Tenant
                    </h4>
                    <p className="text-xs text-red-300/80 mt-0.5">
                      Permanently deletes this salon branch, active tickets, and clears door QR and TV touchpoint routes.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onDeleteRequest}
                    className="gap-2 text-xs min-h-[44px]"
                  >
                    <Trash2 className="h-4 w-4" />
                    Permanently Delete {salon.name}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Dialog>
  );
}
