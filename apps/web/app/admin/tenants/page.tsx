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
import { api, Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
} from "lucide-react";

export default function AdminTenantsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "RURAL_SOLO" | "MODERN_MULTI">("ALL");
  const [updatingModeId, setUpdatingModeId] = useState<string | null>(null);

  // New Salon Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newSalonName, setNewSalonName] = useState("");
  const [newSalonSlug, setNewSalonSlug] = useState("");
  const [newSalonPhone, setNewSalonPhone] = useState("");
  const [newSalonMode, setNewSalonMode] = useState<"RURAL_SOLO" | "MODERN_MULTI">("RURAL_SOLO");
  const [creating, setCreating] = useState(false);

  const fetchSalons = async () => {
    try {
      const data = await api.salons.getAll();
      setSalons(data || []);
    } catch (err) {
      console.error("Failed to fetch salons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalons();
  }, []);

  const handleToggleMode = async (salon: Salon) => {
    const nextMode = salon.operatingMode === "RURAL_SOLO" ? "MODERN_MULTI" : "RURAL_SOLO";
    setUpdatingModeId(salon.id);
    try {
      await api.salons.updateMode(salon.id, nextMode);
      setSalons((prev) =>
        prev.map((s) => (s.id === salon.id ? { ...s, operatingMode: nextMode } : s))
      );
    } catch (err) {
      alert("Failed to update operating mode: " + (err as Error).message);
    } finally {
      setUpdatingModeId(null);
    }
  };

  const handleCreateSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalonName.trim() || !newSalonPhone.trim()) {
      alert("Name and Phone are required");
      return;
    }
    setCreating(true);
    try {
      await api.salons.register({
        name: newSalonName.trim(),
        slug: newSalonSlug.trim() || undefined,
        phone: newSalonPhone.trim(),
        operatingMode: newSalonMode,
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
      fetchSalons();
    } catch (err) {
      alert("Failed to create salon: " + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  // Filter salons by mode before passing to TanStack Table
  const filteredData = useMemo(() => {
    if (modeFilter === "ALL") return salons;
    return salons.filter((s) => s.operatingMode === modeFilter);
  }, [salons, modeFilter]);

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
        header: "Operating Mode",
        accessorKey: "operatingMode",
        cell: ({ row }) => {
          const salon = row.original;
          const isRural = salon.operatingMode === "RURAL_SOLO";
          const isUpdating = updatingModeId === salon.id;

          return (
            <div className="flex items-center gap-2">
              <Badge variant={isRural ? "warning" : "default"} className="font-semibold text-xs">
                {isRural ? "Rural Solo" : "Multi-Station"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 py-0 border-slate-700 hover:border-slate-500"
                onClick={() => handleToggleMode(salon)}
                disabled={isUpdating}
                title="1-Click Operating Mode Switcher"
              >
                <SlidersHorizontal className={`h-3 w-3 mr-1 ${isUpdating ? "animate-spin" : ""}`} />
                Switch to {isRural ? "Multi" : "Solo"}
              </Button>
            </div>
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
          const slug = row.original.slug;
          return (
            <Link href={`/owner?salon=${slug}`}>
              <Button size="sm" variant="secondary" className="h-8 text-xs gap-1">
                Owner Hub
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          );
        },
      },
    ],
    [updatingModeId]
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
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Salon
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
          <span className="text-xs text-slate-400 font-medium">Mode:</span>
          {(["ALL", "RURAL_SOLO", "MODERN_MULTI"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modeFilter === mode
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {mode === "ALL" ? "All Modes" : mode === "RURAL_SOLO" ? "Rural Solo" : "Multi-Station"}
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

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Initial Operating Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setNewSalonMode("RURAL_SOLO")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newSalonMode === "RURAL_SOLO"
                      ? "border-amber-500 bg-amber-500/10 text-amber-200"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  <p className="font-bold text-sm">Rural Solo-Barber</p>
                  <p className="text-[11px] opacity-75">1 chair, fast walk-in, simple numpad</p>
                </button>

                <button
                  type="button"
                  onClick={() => setNewSalonMode("MODERN_MULTI")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    newSalonMode === "MODERN_MULTI"
                      ? "border-blue-500 bg-blue-500/10 text-blue-200"
                      : "border-slate-800 bg-slate-900 text-slate-400"
                  }`}
                >
                  <p className="font-bold text-sm">Modern Multi-Station</p>
                  <p className="text-[11px] opacity-75">Multi-barber, smart desk assignment</p>
                </button>
              </div>
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
    </div>
  );
}
