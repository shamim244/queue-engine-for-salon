"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Salon, Ticket, Stylist, Service } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { triggerHaptic } from "@/lib/haptics";

// Modular Staff Components
import { StaffGreetingBanner } from "@/components/staff/staff-greeting-banner";
import { StaffKpiStats } from "@/components/staff/staff-kpi-stats";
import { StaffChairCockpit } from "@/components/staff/staff-chair-cockpit";
import { StaffWaitingQueue } from "@/components/staff/staff-waiting-queue";
import { StaffDailyAnalytics } from "@/components/staff/staff-daily-analytics";
import { StaffPaymentModal } from "@/components/staff/staff-payment-modal";
import { StationTransferChairModal } from "@/components/station/station-transfer-chair-modal";

interface StaffDailyReport {
  totalServedToday: number;
  totalRevenueToday: number;
  avgActualMinutes: number;
  servicesCountMap: Record<string, number>;
  completedTickets: any[];
}

export default function StaffDashboardPage() {
  const { user, staff, salon } = useAuth();
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [report, setReport] = useState<StaffDailyReport>({
    totalServedToday: 0,
    totalRevenueToday: 0,
    avgActualMinutes: 20,
    servicesCountMap: {},
    completedTickets: [],
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Dynamic Service & Estimated Duration Calibration
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(20);

  // 1-Tap Chair Transfer Modal State
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Cash / UPI Payment Modal State
  const [paymentTicket, setPaymentTicket] = useState<Ticket | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const effectiveSalonId = salon?.id || "salon-rural-01";
  const effectiveSlug = salon?.slug || "ramesh-barber";
  const stylistId = staff?.id || (user as any)?.staffId || undefined;

  const fetchQueueData = useCallback(async () => {
    try {
      const [res, salonRes, reportRes] = await Promise.all([
        api.queue.getActive(effectiveSalonId),
        api.salons.get(effectiveSlug),
        api.queue.getStaffReport(effectiveSalonId, stylistId).catch(() => null),
      ]);

      setActiveTickets(res.tickets || []);
      if (salonRes.salon?.services) {
        setServices(salonRes.salon.services);
      }
      if (salonRes.salon?.stylists) {
        setStylists(salonRes.salon.stylists);
      }
      if (reportRes && reportRes.success) {
        setReport({
          totalServedToday: reportRes.totalServedToday || 0,
          totalRevenueToday: reportRes.totalRevenueToday || 0,
          avgActualMinutes: reportRes.avgActualMinutes || 20,
          servicesCountMap: reportRes.servicesCountMap || {},
          completedTickets: reportRes.completedTickets || [],
        });
      }
    } catch (err) {
      console.error("Staff queue fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveSalonId, effectiveSlug, stylistId]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Real-time WebSocket hook
  useSalonSocket(effectiveSalonId, () => {
    fetchQueueData();
  });

  // Current client strictly seated in chair for this authenticated staff member
  const myInChairTicket = activeTickets.find(
    (t) =>
      (t.status === "IN_CHAIR" || t.status === "IN_SERVICE") &&
      stylistId &&
      (t.stylistId === stylistId || t.servedByStylistId === stylistId)
  );

  // Sync custom duration when ticket in chair updates
  useEffect(() => {
    if (myInChairTicket) {
      setCustomDurationMinutes(myInChairTicket.estimatedWaitMinutes || 20);
      setSelectedServiceId(myInChairTicket.serviceId || "");
    }
  }, [myInChairTicket]);

  // Summoned ticket strictly summoned to this authenticated staff chair
  const mySummonedTicket = activeTickets.find(
    (t) =>
      (t.status === "SUMMONED" || t.status === "CALLED") &&
      stylistId &&
      (t.stylistId === stylistId || t.servedByStylistId === stylistId)
  );

  // Waiting clients eligible for this staff chair (universal unassigned OR requested this stylist)
  const waitingTickets = activeTickets.filter(
    (t) =>
      (t.status === "WAITING" || t.status === "SOFT_BUMPED") &&
      (!t.stylistId || (stylistId && t.stylistId === stylistId))
  );

  // Chair Cockpit Actions
  const handleCallNext = async () => {
    setActionLoading(true);
    triggerHaptic("summon");
    try {
      const res = await api.queue.callNext(effectiveSalonId, stylistId);
      if (res.ticket) {
        showToast(`Summoned Ticket #${res.ticket.ticketNumber} (${res.ticket.customerName})!`, "success");
      } else {
        showToast("No waiting clients in queue.", "info");
      }
      fetchQueueData();
    } catch (err: any) {
      triggerHaptic("alert");
      showToast(err.message || "Failed to call next client", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartService = async (ticketId: string) => {
    setActionLoading(true);
    triggerHaptic("tap");
    try {
      await api.queue.seat(ticketId, stylistId);
      showToast("Service started! Chair timer is ticking.", "success");
      fetchQueueData();
    } catch (err: any) {
      triggerHaptic("alert");
      showToast(err.message || "Failed to start service", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateFinish = (ticket: Ticket) => {
    setPaymentTicket(ticket);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (
    paymentStatus: "CASH_PAID" | "ONLINE_PAID",
    finalAmount: number
  ) => {
    if (!paymentTicket) return;
    setIsPaying(true);
    try {
      await api.queue.finish(paymentTicket.id, paymentStatus, finalAmount);
      triggerHaptic("complete");
      showToast(
        `Completed Ticket #${paymentTicket.ticketNumber} (₹${finalAmount} ${
          paymentStatus === "CASH_PAID" ? "Cash" : "UPI"
        })!`,
        "success"
      );
      setIsPaymentModalOpen(false);
      setPaymentTicket(null);
      fetchQueueData();
    } catch (err: any) {
      triggerHaptic("alert");
      showToast(err.message || "Failed to complete service", "error");
    } finally {
      setIsPaying(false);
    }
  };

  const handleBump = async (ticketId: string) => {
    setActionLoading(true);
    triggerHaptic("tap");
    try {
      await api.queue.softBump(ticketId);
      showToast("Client given 3-minute grace bump.", "info");
      fetchQueueData();
    } catch (err: any) {
      showToast(err.message || "Failed to bump ticket", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Tap Handover Chair to Another Stylist
  const handleOpenTransfer = (ticket: Ticket) => {
    setTransferTicket(ticket);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = async (targetStylistId: string, reason?: string) => {
    if (!transferTicket) return;
    setIsTransferring(true);
    try {
      const resp = await api.queue.transferChair({
        ticketId: transferTicket.id,
        targetStylistId,
        reason: reason || "Handover from Staff Panel",
      });
      triggerHaptic("transfer");
      const targetStylist = stylists.find((s) => s.id === targetStylistId);
      showToast(
        `Ticket #${transferTicket.ticketNumber} handed over to ${targetStylist?.name || "another barber"}!`,
        "success"
      );
      setIsTransferModalOpen(false);
      setTransferTicket(null);
      fetchQueueData();
    } catch (err: any) {
      triggerHaptic("alert");
      showToast("Error transferring chair: " + (err.message || "Failed"), "error");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSelectServicePreset = (service: Service) => {
    setSelectedServiceId(service.id);
    setCustomDurationMinutes(service.estimatedDurationMinutes);
    showToast(`Service set to ${service.name} (~${service.estimatedDurationMinutes} mins)`, "info");
  };

  const handleAdjustDuration = (deltaMinutes: number) => {
    const updated = Math.max(5, Math.min(120, customDurationMinutes + deltaMinutes));
    setCustomDurationMinutes(updated);
    showToast(`Estimated duration adjusted to ${updated} mins`, "info");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-950 border-emerald-500/50 text-emerald-200"
                : toast.type === "error"
                ? "bg-rose-950 border-rose-500/50 text-rose-200"
                : "bg-slate-900 border-slate-700 text-slate-200"
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 1. Top Greeting & Quick Navigation Banner */}
      <StaffGreetingBanner
        salonName={salon?.name}
        stylistName={staff?.name || user?.fullName || user?.username}
        effectiveSlug={effectiveSlug}
      />

      {/* 2. Stats Telemetry Tiles */}
      <StaffKpiStats
        isChairOccupied={!!myInChairTicket}
        waitingCount={waitingTickets.length}
        totalServedToday={report.totalServedToday}
        totalRevenueToday={report.totalRevenueToday}
      />

      {/* 3. Active Workspace Grid (Chair Cockpit + Waiting Queue) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StaffChairCockpit
            myInChairTicket={myInChairTicket}
            mySummonedTicket={mySummonedTicket}
            waitingCount={waitingTickets.length}
            services={services}
            selectedServiceId={selectedServiceId}
            customDurationMinutes={customDurationMinutes}
            actionLoading={actionLoading}
            onSelectServicePreset={handleSelectServicePreset}
            onAdjustDuration={handleAdjustDuration}
            onSetPresetDuration={(mins) => setCustomDurationMinutes(mins)}
            onCallNext={handleCallNext}
            onStartService={handleStartService}
            onFinishService={handleInitiateFinish}
            onBumpTicket={handleBump}
            onTransferTicket={handleOpenTransfer}
          />
        </div>

        <div>
          <StaffWaitingQueue
            waitingTickets={waitingTickets}
            actionLoading={actionLoading}
            hasInChairTicket={!!myInChairTicket}
            onStartService={handleStartService}
          />
        </div>
      </div>

      {/* 4. Daily Work Report & Shift Analytics */}
      <StaffDailyAnalytics
        avgActualMinutes={report.avgActualMinutes}
        totalRevenueToday={report.totalRevenueToday}
        servicesCountMap={report.servicesCountMap}
        completedTickets={report.completedTickets}
      />

      {/* 5. 1-Tap Chair Handover Modal */}
      <StationTransferChairModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        ticket={transferTicket}
        stylists={stylists}
        currentStylistId={stylistId}
        onConfirmTransfer={handleConfirmTransfer}
        isLoading={isTransferring}
      />

      {/* 6. Cash vs UPI Payment Completion Modal */}
      <StaffPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        ticket={paymentTicket}
        onConfirmPayment={handleConfirmPayment}
        isLoading={isPaying}
      />
    </div>
  );
}
