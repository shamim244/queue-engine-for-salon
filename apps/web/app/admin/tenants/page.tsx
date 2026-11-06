"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { api, Salon } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import {
  TenantSearchFilterBar,
  PlanFilterType,
  getTenantTableColumns,
  AddTenantModal,
  InspectTenantModal,
  DeleteTenantModal,
} from "@/components/admin/tenants";

export default function AdminTenantsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilterType>("ALL");

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // In-app Toast Banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSalons = async () => {
    try {
      const data = await api.salons.getAll();
      setSalons(data || []);
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
    setIsInspectModalOpen(true);
  };

  // Filter salons by SaaS subscription plan
  const filteredData = useMemo(() => {
    if (planFilter === "ALL") return salons;
    return salons.filter((s) => {
      const tier = (s as any).tier || (s.organizationId === "org-aura" ? "PRO" : "STARTER");
      if (planFilter === "STARTER") return tier === "STARTER";
      return tier === planFilter;
    });
  }, [salons, planFilter]);

  const columns = useMemo(() => getTenantTableColumns(handleOpenInspect), [salons]);

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
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSalons}
            disabled={loading}
            className="gap-2 min-h-[44px]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin/onboarding">
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold min-h-[44px]"
            >
              <Sparkles className="h-4 w-4" />
              Onboard Salon Wizard
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 border-slate-700 min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <TenantSearchFilterBar
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        planFilter={planFilter}
        onPlanFilterChange={setPlanFilter}
      />

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
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
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
              className="h-9 px-2 text-xs min-h-[36px]"
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
              className="h-9 px-2 text-xs min-h-[36px]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal: Add New Salon */}
      <AddTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(name) => {
          showToast(`Salon "${name}" created!`, "success");
          fetchSalons();
        }}
        showToast={showToast}
      />

      {/* Modal: Inspect & Manage Tenant */}
      <InspectTenantModal
        salon={selectedSalon}
        isOpen={isInspectModalOpen}
        onClose={() => setIsInspectModalOpen(false)}
        onRefresh={fetchSalons}
        onDeleteRequest={() => setIsConfirmDeleteOpen(true)}
        showToast={showToast}
      />

      {/* Modal: In-App Delete Confirmation */}
      <DeleteTenantModal
        salon={selectedSalon}
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onSuccess={() => {
          setIsInspectModalOpen(false);
          setSelectedSalon(null);
          fetchSalons();
        }}
        showToast={showToast}
      />
    </div>
  );
}
