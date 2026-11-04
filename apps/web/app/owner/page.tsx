"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Salon, Ticket, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { formatCurrency, maskPhone } from "@/lib/utils";
import {
  Users,
  Banknote,
  Clock,
  UserPlus,
  Play,
  Armchair,
  CheckCircle2,
  Tv,
  Printer,
  Sparkles,
  RefreshCw,
  PhoneCall,
  SlidersHorizontal,
  Volume2,
  Check,
  X,
  CreditCard,
  QrCode,
  AlertCircle,
  Scissors,
  ExternalLink,
} from "lucide-react";

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

  // Quick Walk-In Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInServiceId, setWalkInServiceId] = useState("");
  const [walkInStylistId, setWalkInStylistId] = useState("");
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

  // Checkout & Payment Modal
  const [checkoutTicket, setCheckoutTicket] = useState<Ticket | null>(null);
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH_PAID" | "ONLINE_PAID">("CASH_PAID");
  const [submittingCheckout, setSubmittingCheckout] = useState(false);

  // Seat in Chair Modal
  const [seatTicket, setSeatTicket] = useState<Ticket | null>(null);
  const [selectedSeatStylistId, setSelectedSeatStylistId] = useState<string>("");

  // In-app Cancel Ticket Confirmation Dialog
  const [cancelTargetTicket, setCancelTargetTicket] = useState<Ticket | null>(null);
  const [cancellingTicket, setCancellingTicket] = useState(false);

  // In-App Toast Notification Banner (No blocking browser alert() popups)
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getServiceName = (serviceId?: string) => {
    const match = salon?.services?.find((s) => s.id === serviceId);
    return match?.name || "Haircut";
  };

  const currentSlug = salon?.slug || searchParams.get("salon") || "salon-rural-01";

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

  const handleOpenSeatModal = (ticket: Ticket) => {
    setSeatTicket(ticket);
    const defaultStylist = salon?.stylists?.[0]?.id || "";
    setSelectedSeatStylistId(ticket.stylistId || defaultStylist);
  };

  const handleConfirmSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seatTicket) return;
    setActionLoadingId(seatTicket.id);
    try {
      await api.queue.seat(seatTicket.id, selectedSeatStylistId || undefined);
      showToast(`Ticket #${seatTicket.ticketNumber} seated in chair!`, "success");
      setSeatTicket(null);
      await refreshData();
    } catch (err: any) {
      showToast("Failed to seat client: " + (err.message || "Unknown error"), "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenCheckout = (ticket: Ticket) => {
    setCheckoutTicket(ticket);
    setCheckoutAmount(ticket.totalPrice || 100);
    setPaymentMethod("CASH_PAID");
  };

  const handleConfirmCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutTicket) return;
    setSubmittingCheckout(true);
    try {
      await api.queue.finish(checkoutTicket.id, paymentMethod, Number(checkoutAmount));
      showToast(`Bill collected (₹${checkoutAmount}). Chair freed!`, "success");
      setCheckoutTicket(null);
      await refreshData();
    } catch (err: any) {
      showToast("Failed to complete checkout: " + (err.message || "Unknown error"), "error");
    } finally {
      setSubmittingCheckout(false);
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

  const handleRequestCancelTicket = (ticket: Ticket) => {
    setCancelTargetTicket(ticket);
  };

  const handleConfirmCancelTicket = async () => {
    if (!cancelTargetTicket) return;
    setCancellingTicket(true);
    try {
      await api.queue.cancel(cancelTargetTicket.id, "Removed by front desk");
      showToast(`Ticket #${cancelTargetTicket.ticketNumber} cancelled.`, "info");
      setCancelTargetTicket(null);
      await refreshData();
    } catch (err: any) {
      showToast("Failed to cancel ticket: " + (err.message || "Unknown error"), "error");
    } finally {
      setCancellingTicket(false);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) {
      showToast("Customer name is required", "error");
      return;
    }
    setSubmittingWalkIn(true);
    try {
      await api.queue.quickAdd({
        salonSlug: currentSlug,
        customerName: walkInName.trim(),
        customerPhone: walkInPhone.trim() || undefined,
        serviceId: walkInServiceId || undefined,
      });
      showToast(`Walk-in added: ${walkInName.trim()}`, "success");
      setIsQuickAddOpen(false);
      setWalkInName("");
      setWalkInPhone("");
      setWalkInServiceId("");
      setWalkInStylistId("");
      await refreshData();
    } catch (err: any) {
      showToast("Failed to add walk-in client: " + (err.message || "Unknown error"), "error");
    } finally {
      setSubmittingWalkIn(false);
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
              {(salon?.stylists?.length || 1) === 1 ? "1 Station (Solo)" : `${salon?.stylists?.length || 1} Stations`}
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
            className="text-xs border-blue-500/50 hover:bg-blue-600/20 text-blue-300 font-semibold gap-1.5"
          >
            {actionLoadingId === "CALL_NEXT" ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-blue-400" />
            )}
            Call Next Client
          </Button>

          <Button
            size="sm"
            onClick={() => setIsQuickAddOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 shadow-md shadow-amber-500/20"
          >
            <UserPlus className="h-4 w-4" />
            + Counter Walk-In
          </Button>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-slate-400 uppercase font-semibold">Clients Served Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{loading ? "..." : metrics.todayServedCount}</div>
            <p className="text-xs text-slate-400 mt-1">Completed checkouts today</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-slate-400 uppercase font-semibold">Today Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-400">
              {loading ? "..." : formatCurrency(metrics.todayRevenue)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Cash & UPI collected</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-slate-400 uppercase font-semibold">Currently Waiting</CardTitle>
            <Users className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-400">{loading ? "..." : waitingTickets.length}</div>
            <p className="text-xs text-slate-400 mt-1">{summonedTickets.length} summoned to chairs</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-slate-400 uppercase font-semibold">Chairs Active</CardTitle>
            <Armchair className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">
              {inServiceTickets.length} / {salon?.stylists?.length || 1}
            </div>
            <p className="text-xs text-slate-400 mt-1">Working stations occupied</p>
          </CardContent>
        </Card>
      </div>

      {/* Chairs & Stations Real-Time Visual Floor Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Armchair className="h-4 w-4 text-amber-400" />
            <span>Chairs & Stylist Floor Status</span>
          </h2>
          <span className="text-xs text-slate-400">
            {salon?.stylists?.length || 1} Working {(salon?.stylists?.length || 1) === 1 ? "Station" : "Stations"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(salon?.stylists || []).map((stylist, idx) => {
            // Find if this stylist is currently serving or has summoned a client
            const seatedTicket = inServiceTickets.find((t) => t.stylistId === stylist.id);
            const summonedTicket = summonedTickets.find((t) => t.stylistId === stylist.id);
            const activeOnChair = seatedTicket || summonedTicket;

            return (
              <Card
                key={stylist.id}
                className={`relative border transition-all ${
                  seatedTicket
                    ? "border-emerald-500/50 bg-emerald-950/15"
                    : summonedTicket
                    ? "border-amber-500/50 bg-amber-950/15"
                    : "border-slate-800 bg-slate-900/60"
                }`}
              >
                <CardHeader className="pb-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-white text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-white">{stylist.name}</CardTitle>
                        <p className="text-[11px] text-slate-400">
                          {stylist.historicalAvgDurationMinutes || 25}m avg
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={seatedTicket ? "success" : summonedTicket ? "warning" : "outline"}
                      className="text-[10px] py-0"
                    >
                      {seatedTicket ? "IN SERVICE" : summonedTicket ? "SUMMONED" : "AVAILABLE"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-1">
                  {seatedTicket ? (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          #{seatedTicket.ticketNumber}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[120px]">
                          {seatedTicket.customerName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {seatedTicket.serviceName || "Haircut"} · {formatCurrency(seatedTicket.totalPrice || 100)}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => handleOpenCheckout(seatedTicket)}
                        className="w-full text-xs h-7 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold mt-1"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Finish & Bill
                      </Button>
                    </div>
                  ) : summonedTicket ? (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          #{summonedTicket.ticketNumber}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[120px]">
                          {summonedTicket.customerName}
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-300/80">Summoned (WhatsApp Sent)</p>
                      <div className="flex gap-1.5 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleOpenSeatModal(summonedTicket)}
                          className="flex-1 text-xs h-7 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                        >
                          Seat Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSoftBump(summonedTicket.id)}
                          className="text-xs h-7 px-2 border-slate-700 text-slate-300"
                          title="Hold for 3 minutes if stepped out"
                        >
                          Hold 3m
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-3 text-center space-y-2">
                      <p className="text-xs text-slate-400">Chair ready for next client</p>
                      {waitingTickets.length > 0 ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenSeatModal(waitingTickets[0])}
                          className="w-full text-xs h-7 font-semibold"
                        >
                          Seat #{waitingTickets[0].ticketNumber} Next
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Queue is clear</span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Active Queue Board + Operational Surfaces */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Actionable Waiting Queue */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>Active Queue Clients</span>
                  <Badge variant="default" className="text-xs">
                    {activeTickets.length} Active
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Full front-desk control: summon, seat, hold, or bill directly.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
                className="text-xs gap-1.5 border-slate-700 hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>

            <CardContent>
              {activeTickets.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <Armchair className="h-10 w-10 mx-auto text-slate-600 stroke-1" />
                  <p className="text-sm font-medium">No clients currently waiting in the queue.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuickAddOpen(true)}
                    className="text-xs text-amber-400 border-amber-500/40"
                  >
                    + Add Walk-In Client Now
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {activeTickets.map((ticket, idx) => {
                    const isTicketLoading = actionLoadingId === ticket.id;
                    const isSeated = ticket.status === "IN_CHAIR" || ticket.status === "IN_SERVICE";
                    const isSummoned = ticket.status === "SUMMONED" || ticket.status === "CALLED";
                    const isSoftBumped = ticket.status === "SOFT_BUMPED";

                    return (
                      <div
                        key={ticket.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                      >
                        {/* Client details */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-11 w-11 rounded-xl border flex items-center justify-center font-black text-base shrink-0 shadow-inner ${
                              isSeated
                                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                                : isSummoned
                                ? "bg-amber-950/40 border-amber-500/40 text-amber-400 animate-pulse"
                                : "bg-slate-800 border-slate-700/80 text-white"
                            }`}
                          >
                            #{ticket.ticketNumber}
                          </div>

                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm truncate">
                                {ticket.customerName}
                              </span>
                              {isSeated && (
                                <Badge variant="success" className="text-[10px] py-0">
                                  IN CHAIR
                                </Badge>
                              )}
                              {isSummoned && (
                                <Badge variant="warning" className="text-[10px] py-0 animate-pulse">
                                  SUMMONED
                                </Badge>
                              )}
                              {isSoftBumped && (
                                <Badge variant="secondary" className="text-[10px] py-0 text-slate-300">
                                  HELD 3M
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              {ticket.customerPhone ? maskPhone(ticket.customerPhone) : "Walk-in Guest"} ·{" "}
                              <span className="text-slate-300">{ticket.serviceName || "Haircut"}</span> ·{" "}
                              <span className="text-emerald-400 font-semibold font-mono">
                                {formatCurrency(ticket.totalPrice || 100)}
                              </span>{" "}
                              {ticket.estimatedWaitMinutes > 0 && (
                                <>
                                  · wait: <span className="text-blue-400 font-mono">{ticket.estimatedWaitMinutes}m</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Front Desk Direct Action Buttons */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {isSeated ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenCheckout(ticket)}
                              disabled={isTicketLoading}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Finish & Bill
                            </Button>
                          ) : isSummoned ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleOpenSeatModal(ticket)}
                                disabled={isTicketLoading}
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-1"
                              >
                                <Armchair className="h-3.5 w-3.5" />
                                Seat
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSoftBump(ticket.id)}
                                disabled={isTicketLoading}
                                className="h-8 text-xs px-2 border-slate-700 text-slate-300 hover:text-white"
                                title="Hold place for 3 minutes"
                              >
                                Hold 3m
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSummonTicket(ticket.id)}
                                disabled={isTicketLoading}
                                className="h-8 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1 font-semibold"
                                title="Send WhatsApp ready notification"
                              >
                                <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                                Summon
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenSeatModal(ticket)}
                                disabled={isTicketLoading}
                                className="h-8 text-xs gap-1 font-semibold"
                              >
                                <Armchair className="h-3.5 w-3.5" />
                                Seat
                              </Button>
                            </>
                          )}

                          {/* Quick Cancel button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRequestCancelTicket(ticket)}
                            disabled={isTicketLoading}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Remove / Cancel Ticket"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Operational Touchpoints */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Operational Surfaces</CardTitle>
              <CardDescription>Instant launch for mirror tablets and lobby TVs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Link
                href={`/s/${currentSlug}/station`}
                target="_blank"
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 flex items-center justify-between text-xs text-slate-200 transition-all font-medium"
              >
                <div className="flex items-center gap-3">
                  <Armchair className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-white font-bold">Staff Chair Working Station</p>
                    <p className="text-[11px] text-slate-400">4-Digit PIN mirror tablet</p>
                  </div>
                </div>
                <span>Launch →</span>
              </Link>

              <Link
                href={`/s/${currentSlug}/tv`}
                target="_blank"
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 flex items-center justify-between text-xs text-slate-200 transition-all font-medium"
              >
                <div className="flex items-center gap-3">
                  <Tv className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-white font-bold">Public Lobby TV Board</p>
                    <p className="text-[11px] text-slate-400">For lounge wall Smart TV</p>
                  </div>
                </div>
                <span>Launch →</span>
              </Link>

              <Link
                href={`/s/${currentSlug}`}
                target="_blank"
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 flex items-center justify-between text-xs text-slate-200 transition-all font-medium"
              >
                <div className="flex items-center gap-3">
                  <QrCode className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-white font-bold">Customer Door QR Page</p>
                    <p className="text-[11px] text-slate-400">Self check-in & Pocket Ticket</p>
                  </div>
                </div>
                <span>Launch →</span>
              </Link>

              <Link
                href={`/owner/links?salon=${currentSlug}`}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 flex items-center justify-between text-xs text-slate-200 transition-all font-medium"
              >
                <div className="flex items-center gap-3">
                  <Printer className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-white font-bold">Printable Mirror Poster</p>
                    <p className="text-[11px] text-slate-400">A4 laminated door QR sheet</p>
                  </div>
                </div>
                <span>Open →</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: 1-Tap Counter Walk-In */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogClose onClose={() => setIsQuickAddOpen(false)} />
        <form onSubmit={handleQuickAdd}>
          <DialogHeader>
            <DialogTitle>Counter Walk-In Check-In</DialogTitle>
            <DialogDescription>
              Quickly enqueue a walk-in client arriving at the desk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Client Name *
              </label>
              <Input
                placeholder="e.g. Rahul Verma or Sharma Ji"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Mobile Phone (Optional for WhatsApp chair notification)
              </label>
              <Input
                placeholder="+91 98765 00000"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Service Selection
                </label>
                <select
                  className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  value={walkInServiceId}
                  onChange={(e) => setWalkInServiceId(e.target.value)}
                >
                  <option value="">Default Haircut & Styling</option>
                  {salon?.services?.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({formatCurrency(srv.basePrice)}) - {srv.estimatedDurationMinutes}m
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Assigned Stylist (Optional)
                </label>
                <select
                  className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  value={walkInStylistId}
                  onChange={(e) => setWalkInStylistId(e.target.value)}
                >
                  <option value="">Next Available Chair</option>
                  {salon?.stylists?.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuickAddOpen(false)}
              disabled={submittingWalkIn}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submittingWalkIn}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
            >
              {submittingWalkIn ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Issue Ticket & Enqueue
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: Seat in Chair */}
      {seatTicket && (
        <Dialog open={Boolean(seatTicket)} onOpenChange={() => setSeatTicket(null)}>
          <DialogClose onClose={() => setSeatTicket(null)} />
          <form onSubmit={handleConfirmSeat}>
            <DialogHeader>
              <DialogTitle>Seat Client in Chair</DialogTitle>
              <DialogDescription>
                Assign Ticket #{seatTicket.ticketNumber} ({seatTicket.customerName}) to a working station.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Select Working Chair / Stylist
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(salon?.stylists || []).map((st) => {
                    const isSelected = selectedSeatStylistId === st.id;
                    const isOccupied = inServiceTickets.some((t) => t.stylistId === st.id);

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedSeatStylistId(st.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-500/15 text-white"
                            : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-white">{st.name}</p>
                          <Badge
                            variant={isOccupied ? "secondary" : "success"}
                            className="text-[9px] py-0"
                          >
                            {isOccupied ? "Occupied" : "Free"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Avg: {st.historicalAvgDurationMinutes || 25} mins
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSeatTicket(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2">
                <Armchair className="h-4 w-4" />
                Confirm Seating
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Modal: Checkout & Bill Collection */}
      {checkoutTicket && (
        <Dialog open={Boolean(checkoutTicket)} onOpenChange={() => setCheckoutTicket(null)}>
          <DialogClose onClose={() => setCheckoutTicket(null)} />
          <form onSubmit={handleConfirmCheckout}>
            <DialogHeader>
              <DialogTitle>Complete Service & Collect Bill</DialogTitle>
              <DialogDescription>
                Ticket #{checkoutTicket.ticketNumber} · {checkoutTicket.customerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Final Bill Amount (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={checkoutAmount}
                  onChange={(e) => setCheckoutAmount(Number(e.target.value))}
                  className="font-mono text-lg font-bold text-emerald-400"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Service: {checkoutTicket.serviceName || "Haircut"}. Flexible pricing: adjust for cash discounts or add-ons.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Payment Collection Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH_PAID")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === "CASH_PAID"
                        ? "border-emerald-500 bg-emerald-500/15 text-white"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    <p className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4" />
                      Cash Collected
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Paid directly to counter</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("ONLINE_PAID")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      paymentMethod === "ONLINE_PAID"
                        ? "border-blue-500 bg-blue-500/15 text-white"
                        : "border-slate-800 bg-slate-900 text-slate-400"
                    }`}
                  >
                    <p className="font-bold text-sm text-blue-400 flex items-center gap-1.5">
                      <QrCode className="h-4 w-4" />
                      UPI / Online QR
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Scanned UPI payment</p>
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckoutTicket(null)}
                disabled={submittingCheckout}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingCheckout}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2"
              >
                {submittingCheckout ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Mark Paid & Free Seat
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Modal: Confirm Cancel Ticket */}
      {cancelTargetTicket && (
        <Dialog open={Boolean(cancelTargetTicket)} onOpenChange={() => setCancelTargetTicket(null)}>
          <DialogClose onClose={() => setCancelTargetTicket(null)} />
          <div>
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Cancel Queue Ticket #{cancelTargetTicket.ticketNumber}?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel the ticket for <span className="text-white font-bold">{cancelTargetTicket.customerName}</span>? This will free their position and recalculate estimated wait times for everyone else in line.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelTargetTicket(null)}
                disabled={cancellingTicket}
              >
                Keep in Queue
              </Button>
              <Button
                type="button"
                onClick={handleConfirmCancelTicket}
                disabled={cancellingTicket}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-2"
              >
                {cancellingTicket ? <RefreshCw className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
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
