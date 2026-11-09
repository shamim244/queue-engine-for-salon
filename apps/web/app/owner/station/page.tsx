"use client";

import React, { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Salon, type Ticket, type Appointment, type Stylist } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSalonSocket } from "@/lib/socket";
import {
  Armchair,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  User,
  ShieldCheck,
  Plus,
  Play,
  Check,
  XCircle,
  Coffee,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OwnerStationPage() {
  const searchParams = useSearchParams();
  const { salon: authSalon } = useAuth();

  const currentSlug = searchParams.get("salon") || authSalon?.slug || "ramesh-barber";

  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeStylist, setActiveStylist] = useState<Stylist | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "APPOINTMENTS" | "WALKINS">("ALL");
  const [actionLoading, setActionLoading] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const fetchData = async () => {
    try {
      const salonRes = await api.salons.get(currentSlug);
      if (salonRes.salon) {
        setSalon(salonRes.salon);
        if (!activeStylist && salonRes.salon.stylists?.length > 0) {
          setActiveStylist(salonRes.salon.stylists[0]);
        }

        const queueRes = await api.queue.getActive(salonRes.salon.id);
        setActiveTickets(queueRes.tickets || []);

        const apptRes = await api.appointments.list(currentSlug, { date: todayStr });
        setAppointments(apptRes.appointments || []);
      }
    } catch (err) {
      console.error("[OwnerStation] Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentSlug]);

  // Real-time synchronization
  useSalonSocket(salon?.id || "salon-rural-01", () => {
    fetchData();
  });

  const currentlyServing = activeTickets.find(
    (t) =>
      (t.status === "IN_CHAIR" || t.status === "IN_SERVICE") &&
      (!activeStylist || !t.stylistId || t.stylistId === activeStylist.id)
  );

  const currentApptInChair = appointments.find(
    (a) =>
      a.status === "IN_CHAIR" &&
      (!activeStylist || !a.stylistId || a.stylistId === activeStylist.id)
  );

  const currentlySummoned = activeTickets.find(
    (t) =>
      t.status === "SUMMONED" &&
      (!activeStylist || !t.stylistId || t.stylistId === activeStylist.id)
  );

  // Filter and Interleave
  const waitingWalkIns = activeTickets.filter(
    (t) => t.status === "WAITING" || t.status === "SOFT_BUMPED"
  );

  const activeAppointments = appointments.filter(
    (a) =>
      a.status === "CONFIRMED" ||
      a.status === "CHECKED_IN" ||
      a.status === "IN_CHAIR" ||
      a.status === "PENDING_PAYMENT"
  );

  // Combined timeline items
  type TimelineItem =
    | { type: "WALKIN"; ticket: Ticket; sortKey: string }
    | { type: "APPOINTMENT"; appt: Appointment; sortKey: string };

  const combinedTimeline: TimelineItem[] = [
    ...waitingWalkIns.map((t) => ({
      type: "WALKIN" as const,
      ticket: t,
      sortKey: t.checkInTime || "",
    })),
    ...activeAppointments
      .filter((a) => a.status !== "IN_CHAIR")
      .map((a) => ({
        type: "APPOINTMENT" as const,
        appt: a,
        sortKey: `${a.scheduledDate}T${a.slotStartTime}:00`,
      })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const filteredTimeline = combinedTimeline.filter((item) => {
    if (activeTab === "APPOINTMENTS") return item.type === "APPOINTMENT";
    if (activeTab === "WALKINS") return item.type === "WALKIN";
    return true;
  });

  // Action Handlers
  const handleSummonAppointment = async (appt: Appointment) => {
    setActionLoading(true);
    try {
      await api.appointments.checkIn(appt.id);
      await fetchData();
    } catch (err) {
      console.error("Failed to summon appointment:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeatAppointment = async (apptId: string) => {
    setActionLoading(true);
    try {
      await api.appointments.seat(apptId, activeStylist?.id);
      await fetchData();
    } catch (err) {
      console.error("Failed to seat appointment:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteAppointment = async (apptId: string) => {
    setActionLoading(true);
    try {
      await api.appointments.complete(apptId);
      await fetchData();
    } catch (err) {
      console.error("Failed to complete appointment:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShowAppointment = async (appt: Appointment) => {
    setActionLoading(true);
    try {
      await api.appointments.noShow(appt.id);
      await fetchData();
    } catch (err) {
      console.error("Failed to mark appointment no-show:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteService = async (ticketId: string) => {
    setActionLoading(true);
    try {
      await api.queue.finish(ticketId, "CASH_PAID");
      await fetchData();
    } catch (err) {
      console.error("Failed to complete ticket:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSeatWalkIn = async (ticketId: string) => {
    if (!activeStylist) return;
    setActionLoading(true);
    try {
      await api.queue.seat(ticketId, activeStylist.id);
      await fetchData();
    } catch (err) {
      console.error("Failed to seat ticket:", err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Station Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Armchair className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Station Cockpit</span>
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px]">
                🟢 Live Sync
              </Badge>
            </h1>
            <p className="text-xs text-slate-400">{salon?.name || "Salon"}</p>
          </div>
        </div>

        {/* Stylist Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Chair / Barber:</label>
          <div className="flex gap-1.5 overflow-x-auto">
            {(salon?.stylists || []).map((stylist) => {
              const isSelected = activeStylist?.id === stylist.id;
              return (
                <button
                  key={stylist.id}
                  type="button"
                  onClick={() => setActiveStylist(stylist)}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {stylist.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Current In Chair vs Interleaved Queue Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Current Chair State */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border border-slate-800 bg-slate-900/90 shadow-xl rounded-3xl">
            <CardHeader className="pb-3 border-b border-slate-800/80">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Scissors className="h-4 w-4 text-amber-400" />
                <span>Currently In Chair</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {currentlyServing ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                      Ticket #{currentlyServing.ticketNumber}
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {currentlyServing.customerName}
                    </h3>
                    <p className="text-xs text-slate-400">{currentlyServing.serviceName}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-mono font-semibold text-white">
                      {currentlyServing.totalDurationMinutes} mins
                    </span>
                  </div>

                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleCompleteService(currentlyServing.id)}
                    className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Complete Service & Collect</span>
                  </Button>
                </div>
              ) : currentApptInChair ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                      ⭐ VIP APPOINTMENT IN CHAIR
                    </Badge>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {currentApptInChair.customerName}
                    </h3>
                    <p className="text-xs text-slate-400">{currentApptInChair.serviceName}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-mono font-semibold text-white">
                      {currentApptInChair.durationMinutes} mins
                    </span>
                  </div>

                  <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Advance Escrow:</span>
                    <span className="font-mono font-semibold text-emerald-400">
                      ₹{currentApptInChair.advanceAmount} HELD
                    </span>
                  </div>

                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleCompleteAppointment(currentApptInChair.id)}
                    className="w-full min-h-[48px] rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    <span>Complete & Release Escrow</span>
                  </Button>
                </div>
              ) : currentlySummoned ? (
                <div className="space-y-4 text-center py-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {currentlySummoned.customerName} (#{currentlySummoned.ticketNumber})
                    </h3>
                    <p className="text-xs text-amber-400 font-medium">Summoned - Ready to Sit</p>
                  </div>
                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleSeatWalkIn(currentlySummoned.id)}
                    className="w-full min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    <span>Seat Client in Chair</span>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-2">
                  <Armchair className="h-10 w-10 mx-auto text-slate-700" />
                  <p className="text-sm font-semibold text-slate-300">Chair Is Open</p>
                  <p className="text-xs text-slate-500">
                    Call next client from the interleaved queue timeline.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Interleaved Timeline (Appointments + Walk-ins) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-slate-800 bg-slate-900/90 shadow-xl rounded-3xl">
            <CardHeader className="pb-3 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-400" />
                  <span>Interleaved Waiting Timeline</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  Walk-ins smoothly fill open gaps around locked advance appointment anchors.
                </CardDescription>
              </div>

              {/* Segmented Filter */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`py-1 px-2.5 rounded-lg transition-all ${
                    activeTab === "ALL"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({combinedTimeline.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("APPOINTMENTS")}
                  className={`py-1 px-2.5 rounded-lg transition-all ${
                    activeTab === "APPOINTMENTS"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Appts ({activeAppointments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("WALKINS")}
                  className={`py-1 px-2.5 rounded-lg transition-all ${
                    activeTab === "WALKINS"
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Walk-ins ({waitingWalkIns.length})
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              {filteredTimeline.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Users className="h-8 w-8 mx-auto text-slate-600" />
                  <p className="text-sm">No clients currently waiting or scheduled.</p>
                </div>
              ) : (
                filteredTimeline.map((item, idx) => {
                  if (item.type === "APPOINTMENT") {
                    const appt = item.appt;
                    return (
                      <div
                        key={appt.id}
                        className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] px-2 py-0.5">
                              ⭐ VIP APPOINTMENT
                            </Badge>
                            <span className="font-mono text-xs font-bold text-amber-400">
                              {appt.slotStartTime} - {appt.slotEndTime}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white">{appt.customerName}</h4>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5">
                            <span>{appt.serviceName}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">
                              ₹{appt.advanceAmount} Paid
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {appt.status === "CHECKED_IN" ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleSeatAppointment(appt.id)}
                              className="min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span>Seat in Chair</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleSummonAppointment(appt)}
                              className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                            >
                              Summon
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => handleNoShowAppointment(appt)}
                            className="min-h-[44px] rounded-xl border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs"
                          >
                            No-Show
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  // Walk-in Ticket
                  const ticket = item.ticket;
                  return (
                    <div
                      key={ticket.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                            WALK-IN #{ticket.ticketNumber}
                          </Badge>
                          <span className="text-xs text-slate-400 font-mono">
                            Wait: ~{ticket.estimatedWaitMinutes}m
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white">{ticket.customerName}</h4>
                        <p className="text-xs text-slate-400">
                          {ticket.serviceName} ({ticket.totalDurationMinutes}m)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={actionLoading}
                          onClick={() => handleSeatWalkIn(ticket.id)}
                          className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
                        >
                          Seat Walk-in
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
