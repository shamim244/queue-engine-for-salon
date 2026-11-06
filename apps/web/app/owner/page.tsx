"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Ticket } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Volume2,
  X,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import {
  OwnerKpiSummary,
  ChairsFloorGrid,
  ActiveQueueTable,
  OperationalSurfacesCard,
  CounterWalkinModal,
  SeatClientModal,
  CheckoutModal,
  CancelTicketModal,
} from "@/components/owner/dashboard";

function OwnerDashboardContent() {
  const searchParams = useSearchParams();
  const { salon, setSelectedSalon } = useAuth();

  const [metrics, setMetrics] = useState({
    todayServedCount: 0,
    todayRevenue: 0,
    averageServiceDurationMinutes: 25,
  });
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [checkoutTicket, setCheckoutTicket] = useState<Ticket | null>(null);
  const [seatTicket, setSeatTicket] = useState<Ticket | null>(null);
  const [cancelTargetTicket, setCancelTargetTicket] = useState<Ticket | null>(null);

  // In-App Toast Notification Banner (Zero blocking browser alerts)
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const currentSlug = salon?.slug || searchParams.get("salon") || "ramesh-barber";

  const refreshData = useCallback(async () => {
    if (!salon && !currentSlug) return;
    try {
      const salonRes = await api.salons.get(currentSlug);
      if (salonRes.salon) {
        setSelectedSalon(salonRes.salon);
      }
      const [metricsRes, queueRes] = await Promise.all([
        api.salons.getMetrics(salonRes.salon.id),
        api.queue.getActive(salonRes.salon.id),
      ]);
      setMetrics({
        todayServedCount: metricsRes.todayServedCount || 0,
        todayRevenue: metricsRes.todayRevenue || 0,
        averageServiceDurationMinutes: metricsRes.averageServiceDurationMinutes || 25,
      });
      setActiveTickets(queueRes.tickets || []);
    } catch (err) {
      console.error("Failed to refresh owner metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [currentSlug, salon, setSelectedSalon]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time WebSocket updates for this salon
  useSalonSocket(salon?.id, (event) => {
    console.log("[Owner Front Desk] Live Socket event:", event.type);
    refreshData();
  });

  // Action Handlers
  const handleCallNext = async (stylistId?: string) => {
    if (!salon) return;
    setActionLoadingId("CALL_NEXT");
    try {
      const res = await api.queue.callNext(salon.id, stylistId);
      if (res.success && res.ticket) {
        showToast(`Called ticket #${res.ticket.ticketNumber} (${res.ticket.customerName})`, "success");
        await refreshData();
      } else {
        showToast(res.message || "No waiting clients available in the queue.", "info");
      }
    } catch (err: any) {
      showToast("Failed to call next client: " + (err.message || "Unknown error"), "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSummonTicket = async (ticketId: string, stylistId?: string) => {
    setActionLoadingId(ticketId);
    try {
      await api.queue.summon(ticketId, stylistId);
      showToast("WhatsApp alert & buzzer sent to client!", "success");
      await refreshData();
    } catch (err: any) {
      showToast("Failed to summon client: " + (err.message || "Unknown error"), "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSoftBump = async (ticketId: string) => {
    setActionLoadingId(ticketId);
    try {
      await api.queue.softBump(ticketId);
      showToast("Client placed on 3-minute grace hold.", "info");
      await refreshData();
    } catch (err: any) {
      showToast("Failed to hold client: " + (err.message || "Unknown error"), "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const waitingTickets = activeTickets.filter((t) => t.status === "WAITING" || t.status === "SOFT_BUMPED");
  const inServiceTickets = activeTickets.filter((t) => t.status === "IN_CHAIR" || t.status === "IN_SERVICE");
  const summonedTickets = activeTickets.filter((t) => t.status === "SUMMONED" || t.status === "CALLED");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification Alert Banner */}
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
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Volume2 className="h-5 w-5 text-blue-400 shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Header & Operational Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {salon?.name || "Salon Command Hub"}
            </h1>
            <Badge variant="outline" className="text-xs border-slate-700 bg-slate-800 text-slate-300">
              {`${salon?.stylists?.length || 1} ${(salon?.stylists?.length || 1) === 1 ? "Station" : "Stations"}`}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Real-time reception desk operations, chair assignments, and live queue controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCallNext()}
            disabled={actionLoadingId === "CALL_NEXT" || waitingTickets.length === 0}
            className="text-xs border-blue-500/50 hover:bg-blue-600/20 text-blue-300 font-semibold gap-1.5 min-h-[44px]"
          >
            {actionLoadingId === "CALL_NEXT" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4 text-blue-400" />
            )}
            Call Next Client
          </Button>

          <Button
            size="sm"
            onClick={() => setIsQuickAddOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 shadow-md shadow-amber-500/20 min-h-[44px]"
          >
            <UserPlus className="h-4 w-4" />
            + Counter Walk-In
          </Button>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <OwnerKpiSummary
        metrics={metrics}
        loading={loading}
        waitingCount={waitingTickets.length}
        summonedCount={summonedTickets.length}
        inServiceCount={inServiceTickets.length}
        totalStylists={salon?.stylists?.length || 1}
      />

      {/* Chairs & Stations Real-Time Visual Floor Grid */}
      <ChairsFloorGrid
        stylists={salon?.stylists || []}
        inServiceTickets={inServiceTickets}
        summonedTickets={summonedTickets}
        waitingTickets={waitingTickets}
        onOpenCheckout={(t) => setCheckoutTicket(t)}
        onOpenSeatModal={(t) => setSeatTicket(t)}
        onSoftBump={handleSoftBump}
      />

      {/* Main Grid: Active Queue Board + Operational Surfaces */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Actionable Waiting Queue */}
        <div className="lg:col-span-2 space-y-4">
          <ActiveQueueTable
            activeTickets={activeTickets}
            loading={loading}
            actionLoadingId={actionLoadingId}
            onRefresh={refreshData}
            onOpenCheckout={(t) => setCheckoutTicket(t)}
            onOpenSeatModal={(t) => setSeatTicket(t)}
            onSummon={handleSummonTicket}
            onSoftBump={handleSoftBump}
            onRequestCancel={(t) => setCancelTargetTicket(t)}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          />
        </div>

        {/* Right Col: Operational Touchpoints */}
        <div className="space-y-4">
          <OperationalSurfacesCard currentSlug={currentSlug} />
        </div>
      </div>

      {/* Modals */}
      <CounterWalkinModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        salonSlug={currentSlug}
        services={salon?.services}
        stylists={salon?.stylists}
        onSuccess={() => refreshData()}
        showToast={showToast}
      />

      <SeatClientModal
        ticket={seatTicket}
        stylists={salon?.stylists}
        inServiceTickets={inServiceTickets}
        onClose={() => setSeatTicket(null)}
        onSuccess={() => refreshData()}
        showToast={showToast}
      />

      <CheckoutModal
        ticket={checkoutTicket}
        onClose={() => setCheckoutTicket(null)}
        onSuccess={() => refreshData()}
        showToast={showToast}
      />

      <CancelTicketModal
        ticket={cancelTargetTicket}
        onClose={() => setCancelTargetTicket(null)}
        onSuccess={() => refreshData()}
        showToast={showToast}
      />
    </div>
  );
}

export default function OwnerDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Dashboard...</div>}>
      <OwnerDashboardContent />
    </Suspense>
  );
}
