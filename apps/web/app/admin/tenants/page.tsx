"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { api, Salon, Stylist, Service } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Tv,
  QrCode,
  Armchair,
  Check,
  Sparkles,
  Settings,
  Trash2,
  Save,
  AlertTriangle,
  UserCheck,
  Scissors,
  DollarSign,
  Clock,
  Shield,
  Activity,
} from "lucide-react";

export default function AdminTenantsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [stationFilter, setStationFilter] = useState<"ALL" | "SINGLE" | "MULTI">("ALL");

  // New Salon Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSalonName, setNewSalonName] = useState("");
  const [newSalonSlug, setNewSalonSlug] = useState("");
  const [newSalonPhone, setNewSalonPhone] = useState("");
  const [creating, setCreating] = useState(false);

  // Inspect & Manage Modal State
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [inspectTab, setInspectTab] = useState("overview");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    address: "",
    upiPaymentId: "",
    status: "ACTIVE" as "ACTIVE" | "SUSPENDED" | "MAINTENANCE",
  });

  // In-app Toast Banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Stylist quick add in modal
  const [newStylistName, setNewStylistName] = useState("");
  const [newStylistPhone, setNewStylistPhone] = useState("");
  const [newStylistDuration, setNewStylistDuration] = useState(25);
  const [isAddingStylist, setIsAddingStylist] = useState(false);

  // Service quick add in modal
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState(100);
  const [newServiceDuration, setNewServiceDuration] = useState(20);
  const [isAddingService, setIsAddingService] = useState(false);

  const fetchSalons = async () => {
    try {
      const data = await api.salons.getAll();
      setSalons(data || []);
      // If currently inspecting, update the selectedSalon instance as well
      if (selectedSalon) {
        const fresh = data?.find((s) => s.id === selectedSalon.id);
        if (fresh) setSelectedSalon(fresh);
      }
    } catch (err) {
      console.error("Failed to fetch salons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalons();
  }, []);

  const handleOpenInspect = (salon: Salon) => {
    setSelectedSalon(salon);
    setEditForm({
      name: salon.name || "",
      phone: salon.phone || "",
      address: salon.address || "",
      upiPaymentId: salon.upiPaymentId || "",
      status: salon.status || "ACTIVE",
    });
    setInspectTab("overview");
    setIsInspectModalOpen(true);
  };

  const handleSaveSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon) return;
    setIsSaving(true);
    try {
      await api.salons.update(selectedSalon.id, editForm);
      await fetchSalons();
      showToast("Salon details updated successfully!", "success");
    } catch (err: any) {
      showToast("Failed to update salon: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteSalon = async () => {
    if (!selectedSalon) return;
    setIsDeleting(true);
    try {
      await api.salons.delete(selectedSalon.id);
      setIsConfirmDeleteOpen(false);
      setIsInspectModalOpen(false);
      setSelectedSalon(null);
      await fetchSalons();
      showToast("Salon removed successfully.", "info");
    } catch (err: any) {
      showToast("Failed to delete salon: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddStylistToSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon || !newStylistName.trim()) return;
    setIsAddingStylist(true);
    try {
      await api.salons.addStylist(selectedSalon.id, {
        name: newStylistName.trim(),
        phone: newStylistPhone.trim() || undefined,
        avgDurationMinutes: Number(newStylistDuration) || 25,
      });
      setNewStylistName("");
      setNewStylistPhone("");
      setNewStylistDuration(25);
      showToast(`Stylist ${newStylistName.trim()} added!`, "success");
      await fetchSalons();
    } catch (err: any) {
      showToast("Failed to add stylist: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsAddingStylist(false);
    }
  };

  const handleAddServiceToSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalon || !newServiceName.trim()) return;
    setIsAddingService(true);
    try {
      await api.salons.addService(selectedSalon.id, {
        name: newServiceName.trim(),
        basePrice: Number(newServicePrice) || 100,
        estimatedDurationMinutes: Number(newServiceDuration) || 20,
      });
      setNewServiceName("");
      setNewServicePrice(100);
      setNewServiceDuration(20);
      showToast(`Service "${newServiceName.trim()}" added!`, "success");
      await fetchSalons();
    } catch (err: any) {
      showToast("Failed to add service: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsAddingService(false);
    }
  };

  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalonName.trim() || !newSalonPhone.trim()) {
      showToast("Name and Phone are required", "error");
      return;
    }
    setCreating(true);
    try {
      await api.salons.register({
        name: newSalonName.trim(),
        slug: newSalonSlug.trim() || undefined,
        phone: newSalonPhone.trim(),
        stylists: [{ name: "Master Stylist", avgDurationMinutes: 25 }],
        services: [
          { name: "Haircut", basePrice: 150, estimatedDurationMinutes: 25 },
          { name: "Beard Trim", basePrice: 80, estimatedDurationMinutes: 15 },
        ],
      });
      setIsCreateModalOpen(false);
      setNewSalonName("");
      setNewSalonSlug("");
      setNewSalonPhone("");
      showToast(`Salon "${newSalonName.trim()}" created!`, "success");
      fetchSalons();
    } catch (err) {
      showToast("Failed to create salon: " + (err as Error).message, "error");
    } finally {
      setCreating(false);
    }
  };

  // Filter salons by station capacity
  const filteredData = useMemo(() => {
    if (stationFilter === "ALL") return salons;
    if (stationFilter === "SINGLE") return salons.filter((s) => (s.stylists?.length || 0) <= 1);
    return salons.filter((s) => (s.stylists?.length || 0) > 1);
  }, [salons, stationFilter]);

  const columns = useMemo<ColumnDef<Salon>[]>(
    () => [
      {
        header: "Salon / Branch",
        accessorKey: "name",
        cell: ({ row }) => {
          const salon = row.original;
          return (
            <div>
              <div className="font-bold text-white text-sm">{salon.name}</div>
              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span className="font-mono text-blue-400">/s/{salon.slug}</span>
                <span>•</span>
                <span>{salon.phone}</span>
              </div>
            </div>
          );
        },
      },
      {
        header: "Stations & Capacity",
        id: "stations",
        cell: ({ row }) => {
          const salon = row.original;
          const count = salon.stylists?.length || 1;
          return (
            <Badge variant="outline" className="font-semibold text-xs border-slate-700 bg-slate-800/80 text-slate-300">
              {count === 1 ? "1 Station (Solo)" : `${count} Stations`}
            </Badge>
          );
        },
      },
      {
        header: "Chairs & Stylists",
        id: "stylists",
        cell: ({ row }) => {
          const count = row.original.stylists?.length || 1;
          return (
            <div className="text-xs text-slate-300">
              <span className="font-bold text-white">{count}</span> {count === 1 ? "Stylist" : "Stylists"}
            </div>
          );
        },
      },
      {
        header: "Status",
        id: "status",
        cell: ({ row }) => {
          const salon = row.original;
          const status = salon.status || "ACTIVE";
          return (
            <Badge
              variant={
                status === "ACTIVE"
                  ? "success"
                  : status === "SUSPENDED"
                  ? "destructive"
                  : "warning"
              }
              className="text-xs font-semibold"
            >
              {status}
            </Badge>
          );
        },
      },
      {
        header: "Live Touchpoints",
        id: "links",
        cell: ({ row }) => {
          const slug = row.original.slug;
          return (
            <div className="flex items-center gap-1.5">
              <Link
                href={`/s/${slug}`}
                target="_blank"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Customer Door QR"
              >
                <QrCode className="h-4 w-4" />
              </Link>
              <Link
                href={`/s/${slug}/tv`}
                target="_blank"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Lobby TV Departure Board"
              >
                <Tv className="h-4 w-4" />
              </Link>
              <Link
                href={`/s/${slug}/station`}
                target="_blank"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Staff Chair Working Station"
              >
                <Armchair className="h-4 w-4" />
              </Link>
            </div>
          );
        },
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => {
          const salon = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 border-slate-700 hover:border-slate-500 hover:text-white"
                onClick={() => handleOpenInspect(salon)}
              >
                <Settings className="h-3.5 w-3.5 text-blue-400" />
                Manage
              </Button>
              <Link href={`/owner?salon=${salon.slug}`}>
                <Button size="sm" variant="secondary" className="h-8 text-xs gap-1">
                  Owner Hub
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          );
        },
      },
    ],
    [salons]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* In-app Toast Banner */}
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
            {toast.type === "error" && <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />}
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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Tenant Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise high-performance data table powered by TanStack Table.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSalons}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin/onboarding">
            <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold">
              <Sparkles className="h-4 w-4" />
              Onboard Salon Wizard
            </Button>
          </Link>
          <Button size="sm" variant="outline" onClick={() => setIsCreateModalOpen(true)} className="gap-2 border-slate-700">
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, slug, phone..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-10"
          />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <span className="text-xs text-slate-400 font-medium">Capacity:</span>
          {(["ALL", "SINGLE", "MULTI"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStationFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                stationFilter === filter
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {filter === "ALL" ? "All Salons" : filter === "SINGLE" ? "1 Station (Solo)" : "Multi-Station (2+ Chairs)"}
            </button>
          ))}
        </div>
      </Card>

      {/* TanStack Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-900/90 text-xs uppercase font-semibold text-slate-400 tracking-wider">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-6 py-4">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                    No matching salon tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-white">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-white">
              {table.getFilteredRowModel().rows.length}
            </span>{" "}
            tenants
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2 text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-slate-300">
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2 text-xs"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal: Add New Salon */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogClose onClose={() => setIsCreateModalOpen(false)} />
        <form onSubmit={handleCreateSalon}>
          <DialogHeader>
            <DialogTitle>Register New Salon Branch</DialogTitle>
            <DialogDescription>
              Create a new tenant with immediate routing, QR generation, and socket initialization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Salon / Barber Shop Name *
              </label>
              <Input
                placeholder="e.g. Royal Crown Barbers"
                value={newSalonName}
                onChange={(e) => setNewSalonName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Custom URL Slug (Optional)
              </label>
              <Input
                placeholder="e.g. royal-crown (auto-generated if empty)"
                value={newSalonSlug}
                onChange={(e) => setNewSalonSlug(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Contact Phone Number *
              </label>
              <Input
                placeholder="+91 98765 00000"
                value={newSalonPhone}
                onChange={(e) => setNewSalonPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="gap-2">
              {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Create Salon Tenant
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: Inspect & Manage Tenant */}
      {selectedSalon && (
        <Dialog open={isInspectModalOpen} onOpenChange={setIsInspectModalOpen}>
          <DialogClose onClose={() => setIsInspectModalOpen(false)} />
          <div className="max-w-3xl w-full">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <span>{selectedSalon.name}</span>
                    <Badge
                      variant={
                        selectedSalon.status === "ACTIVE"
                          ? "success"
                          : selectedSalon.status === "SUSPENDED"
                          ? "destructive"
                          : "warning"
                      }
                      className="text-xs"
                    >
                      {selectedSalon.status || "ACTIVE"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-1">
                    Slug: <code className="text-blue-400">/s/{selectedSalon.slug}</code> · ID:{" "}
                    <code className="text-slate-400">{selectedSalon.id}</code>
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link href={`/s/${selectedSalon.slug}`} target="_blank">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-slate-700">
                      <QrCode className="h-3.5 w-3.5" />
                      QR
                    </Button>
                  </Link>
                  <Link href={`/s/${selectedSalon.slug}/tv`} target="_blank">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-slate-700">
                      <Tv className="h-3.5 w-3.5" />
                      TV
                    </Button>
                  </Link>
                  <Link href={`/s/${selectedSalon.slug}/station`} target="_blank">
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-slate-700">
                      <Armchair className="h-3.5 w-3.5" />
                      Station
                    </Button>
                  </Link>
                  <Link href={`/owner?salon=${selectedSalon.slug}`} target="_blank">
                    <Button size="sm" variant="secondary" className="h-8 text-xs gap-1">
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
                    Stylists ({selectedSalon.stylists?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="services">
                    Services ({selectedSalon.services?.length || 0})
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
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
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
                            className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
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
                      <Button type="submit" disabled={isSaving} className="gap-2">
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
                        {selectedSalon.stylists?.map((st) => (
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
                        className="text-xs h-9"
                        required
                      />
                      <Input
                        placeholder="Phone (Optional)"
                        value={newStylistPhone}
                        onChange={(e) => setNewStylistPhone(e.target.value)}
                        className="text-xs h-9"
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Avg Mins"
                          value={newStylistDuration}
                          onChange={(e) => setNewStylistDuration(Number(e.target.value))}
                          className="text-xs h-9 w-24"
                          min={5}
                          max={180}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isAddingStylist}
                          className="text-xs h-9 flex-1 gap-1"
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
                        {selectedSalon.services?.map((srv) => (
                          <tr key={srv.id} className="hover:bg-slate-900/30">
                            <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
                              <span>{srv.icon || "✂️"}</span>
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
                        className="text-xs h-9"
                        required
                      />
                      <Input
                        type="number"
                        placeholder="Price (₹)"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(Number(e.target.value))}
                        className="text-xs h-9"
                        min={0}
                        required
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Mins"
                          value={newServiceDuration}
                          onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                          className="text-xs h-9 w-24"
                          min={5}
                          max={240}
                          required
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isAddingService}
                          className="text-xs h-9 flex-1 gap-1"
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
                        disabled={isDeleting}
                        onClick={() => setIsConfirmDeleteOpen(true)}
                        className="gap-2 text-xs"
                      >
                        <Trash2 className="h-4 w-4" />
                        Permanently Delete {selectedSalon.name}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Dialog>
      )}

      {/* Modal: In-App Delete Confirmation */}
      {selectedSalon && (
        <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <DialogClose onClose={() => setIsConfirmDeleteOpen(false)} />
          <div>
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-500" />
                Permanently Delete &quot;{selectedSalon.name}&quot;?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong className="text-white">{selectedSalon.name}</strong>? This action cannot be undone. All active tickets, chair assignments, door QR routes, and TV dashboards for this branch will be permanently removed.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteSalon}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2"
              >
                {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Confirm Permanent Deletion
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}
