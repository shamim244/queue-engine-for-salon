"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Ticket, PaymentOrder } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Volume2,
  X,
  UserPlus,
  RefreshCw,
  Clock,
  ArrowRight,
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

  // Payment Order Verification Status
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState<PaymentOrder | null>(null);
  const [rejectedPaymentOrder, setRejectedPaymentOrder] = useState<PaymentOrder | null>(null);

  // In-App Toast Notification Banner (Zero blocking browser alerts)
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const paramSlug = searchParams.get("salon");
  const currentSlug = paramSlug || salon?.slug || "ramesh-barber";
  const [currentSalon, setCurrentSalon] = useState<Salon | null>(null);

  const refreshData = useCallback(async () => {
    if (!currentSlug) return;
    try {
      const salonRes = await api.salons.get(currentSlug);
      if (salonRes.salon) {
        setCurrentSalon(salonRes.salon);
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

      // Check organization payment orders for pending verification or rejection
      const orgId = salonRes.salon.organizationId || salon?.organizationId;
      if (orgId) {
        try {
          const ordersRes = await api.payments.getOrders({
            organizationId: orgId,
            limit: 10,
          });
          if (ordersRes.orders && ordersRes.orders.length > 0) {
            const pending = ordersRes.orders.find((o) => o.status === "PENDING_APPROVAL");
            setPendingPaymentOrder(pending || null);
            if (!pending) {
              const rejected = ordersRes.orders.find((o) => o.status === "REJECTED");
              setRejectedPaymentOrder(rejected || null);
            } else {
              setRejectedPaymentOrder(null);
            }
          }
        } catch {
          // non-fatal order status fetch
        }
      }
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

      {/* Payment Verification Status Banner (Manual UPI Approval) */}
      {pendingPaymentOrder && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Payment Verification Under Process</span>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                  Pending Super Admin Approval
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your subscription payment of <strong>₹{pendingPaymentOrder.amount}</strong> (Ref / UTR: <span className="font-mono text-amber-300 font-semibold">{pendingPaymentOrder.utrNumber || "Manual Transfer"}</span>) is under review. Your salon is <strong>100% active on the Free Plan</strong> (1 station & live queue). Premium features will activate automatically once verified!
              </p>
            </div>
          </div>
          <Link href={`/owner/billing?salon=${salon?.slug || currentSlug}`}>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-300 hover:bg-amber-950/60 text-xs shrink-0 min-h-[40px] px-4 font-semibold"
            >
              View Billing Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Rejected Payment Notification */}
      {rejectedPaymentOrder && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Payment Verification Rejected</span>
                <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                  Action Needed
                </Badge>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your payment reference of <strong>₹{rejectedPaymentOrder.amount}</strong> was not approved. Reason: <span className="text-rose-300 font-medium">{rejectedPaymentOrder.rejectionReason || "Bank reference could not be verified."}</span>
                <span className="block mt-0.5 text-slate-400">
                  Your salon remains active on the <strong>Free Plan (₹0)</strong> with zero data loss. You can retry with a valid UTR in Owner Billing.
                </span>
              </p>
            </div>
          </div>
          <Link href={`/owner/billing?salon=${salon?.slug || currentSlug}`}>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs shrink-0 min-h-[40px] px-4 font-semibold shadow-md shadow-rose-600/20"
            >
              Resolve in Billing <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
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
        totalStylists={currentSalon?.stylists?.length || salon?.stylists?.length || 1}
      />

      {/* Chairs & Stations Real-Time Visual Floor Grid */}
      <ChairsFloorGrid
        stylists={currentSalon?.stylists || salon?.stylists || []}
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
        services={currentSalon?.services || salon?.services}
        stylists={currentSalon?.stylists || salon?.stylists}
        onSuccess={() => refreshData()}
        showToast={showToast}
      />

      <SeatClientModal
        ticket={seatTicket}
        stylists={currentSalon?.stylists || salon?.stylists}
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
