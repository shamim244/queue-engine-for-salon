"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, Salon, Ticket, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LiveServiceTimer } from "@/components/live-service-timer";
import { formatCurrency, maskPhone } from "@/lib/utils";
import {
  Armchair,
  Scissors,
  Users,
  CheckCircle2,
  Clock,
  Volume2,
  Zap,
  ExternalLink,
  Sliders,
  Phone,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export default function StaffDashboardPage() {
  const { user, staff, salon } = useAuth();
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const effectiveSalonId = salon?.id || "salon-rural-01";
  const effectiveSlug = salon?.slug || "ramesh-barber";
  const stylistId = staff?.id || (user as any)?.staffId || undefined;

  const fetchQueueData = useCallback(async () => {
    try {
      const res = await api.queue.getActive(effectiveSalonId);
      setActiveTickets(res.tickets || []);
    } catch (err) {
      console.error("Staff queue fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [effectiveSalonId]);

  useEffect(() => {
    fetchQueueData();
  }, [fetchQueueData]);

  // Real-time WebSocket hook
  useSalonSocket(effectiveSalonId, () => {
    fetchQueueData();
  });

  // Current client in chair for this staff member (or unassigned in chair)
  const myInChairTicket = activeTickets.find(
    (t) => (t.status === "IN_CHAIR" || t.status === "IN_SERVICE") && (!t.stylistId || t.stylistId === stylistId)
  );

  // Summoned ticket
  const mySummonedTicket = activeTickets.find(
    (t) => (t.status === "SUMMONED" || t.status === "CALLED") && (!t.stylistId || t.stylistId === stylistId)
  );

  // Waiting clients
  const waitingTickets = activeTickets.filter(
    (t) => t.status === "WAITING" && (!t.stylistId || t.stylistId === stylistId)
  );

  // Actions
  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const res = await api.queue.callNext(effectiveSalonId, stylistId);
      if (res.ticket) {
        showToast(`Summoned Ticket #${res.ticket.ticketNumber} (${res.ticket.customerName})!`, "success");
      } else {
        showToast("No waiting clients in queue.", "info");
      }
      fetchQueueData();
    } catch (err: any) {
      showToast(err.message || "Failed to call next client", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartService = async (ticketId: string) => {
    setActionLoading(true);
    try {
      await api.queue.seat(ticketId, stylistId);
      showToast("Service started! Chair timer is ticking.", "success");
      fetchQueueData();
    } catch (err: any) {
      showToast(err.message || "Failed to start service", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishService = async (ticketId: string) => {
    setActionLoading(true);
    try {
      await api.queue.finish(ticketId, "ONLINE_PAID");
      showToast("Service completed! Great cut.", "success");
      fetchQueueData();
    } catch (err: any) {
      showToast(err.message || "Failed to complete service", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBump = async (ticketId: string) => {
    setActionLoading(true);
    try {
      await api.queue.softBump(ticketId);
      showToast("Client given 3-minute hold bump.", "info");
      fetchQueueData();
    } catch (err: any) {
      showToast(err.message || "Failed to bump ticket", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast */}
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

      {/* TOP GREETING BANNER */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="text-[10px] px-2.5 py-0.5">
              ACTIVE STATION
            </Badge>
            <span className="text-xs text-slate-400">
              Salon: <strong className="text-white">{salon?.name || "Ramesh Traditional Barber"}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Welcome, {staff?.name || user?.fullName || user?.username || "Stylist"}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Control your mirror chair, summon next walk-in, and manage haircut speed.
          </p>
        </div>

        {/* Quick Links */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={`/s/${effectiveSlug}/station`}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Armchair className="h-4 w-4" />
            <span>Full Mirror Terminal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* STATS TELEMETRY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Chair Status</span>
          <p className="text-xl font-black text-white flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                myInChairTicket ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span>{myInChairTicket ? "Occupied" : "Open"}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Waiting in Queue</span>
          <p className="text-xl font-black text-amber-400">{waitingTickets.length} Clients</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Pace</span>
          <p className="text-xl font-black text-white">~{staff?.avgDurationMinutes || 25}m / cut</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Quick Action</span>
          <Link
            href="/staff/preferences"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 pt-0.5"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Edit PIN &amp; Pace →</span>
          </Link>
        </div>
      </div>

      {/* ACTIVE MIRROR CHAIR WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: ACTIVE CLIENT IN CHAIR OR SUMMON CALL */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Armchair className="h-5 w-5 text-amber-400" />
                  <span>Mirror Chair #1</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  Live operational station for your active customer
                </CardDescription>
              </div>

              <Badge
                variant={myInChairTicket ? "success" : mySummonedTicket ? "warning" : "secondary"}
                className="text-xs px-3 py-1 font-bold uppercase"
              >
                {myInChairTicket ? "IN SERVICE" : mySummonedTicket ? "CALLING..." : "EMPTY CHAIR"}
              </Badge>
            </CardHeader>

            <CardContent className="p-6">
              {myInChairTicket ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                        Current In-Chair Client
                      </span>
                      <h3 className="text-2xl font-black text-white mt-1">
                        #{myInChairTicket.ticketNumber} • {myInChairTicket.customerName}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{maskPhone(myInChairTicket.customerPhone)}</span>
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <Badge variant="purple" className="text-xs font-bold px-3 py-1">
                        {myInChairTicket.serviceName}
                      </Badge>
                      <p className="text-lg font-black text-white mt-1">
                        {formatCurrency(myInChairTicket.totalPrice || 100)}
                      </p>
                    </div>
                  </div>

                  {/* Live Service Timer */}
                  <LiveServiceTimer
                    startedTime={(myInChairTicket as any).startedTime || myInChairTicket.createdAt}
                    estimatedDurationMinutes={myInChairTicket.estimatedWaitMinutes || 25}
                    variant="station"
                  />

                  {/* Actions for In-Chair */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={() => handleFinishService(myInChairTicket.id)}
                      disabled={actionLoading}
                      className="flex-1 min-h-[52px] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Complete Cut &amp; Collect Payment</span>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleBump(myInChairTicket.id)}
                      disabled={actionLoading}
                      className="min-h-[52px] px-5 border-slate-700 text-slate-300 hover:text-white rounded-xl gap-2 text-xs font-semibold"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>+3m Hold</span>
                    </Button>
                  </div>
                </div>
              ) : mySummonedTicket ? (
                <div className="space-y-6 text-center py-4">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-base font-bold">
                      <Volume2 className="h-5 w-5 animate-pulse" />
                      <span>Summoning Ticket #{mySummonedTicket.ticketNumber} ({mySummonedTicket.customerName})</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      The client has been alerted via Audio Chime and phone. Tap below when they sit in your chair.
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={() => handleStartService(mySummonedTicket.id)}
                      disabled={actionLoading}
                      className="min-h-[52px] px-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl gap-2 shadow-xl shadow-amber-500/25"
                    >
                      <Play className="h-5 w-5 fill-slate-950" />
                      <span>Client is Seated • Start Timer</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Armchair className="h-8 w-8 text-slate-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Your Chair is Ready for the Next Client</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      {waitingTickets.length > 0
                        ? `${waitingTickets.length} client(s) waiting in the lounge. Tap below to summon the next walk-in.`
                        : "No one currently waiting. Relax or check your tools."}
                    </p>
                  </div>

                  <Button
                    onClick={handleCallNext}
                    disabled={actionLoading || waitingTickets.length === 0}
                    className="min-h-[52px] px-8 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 gap-2"
                  >
                    <Volume2 className="h-5 w-5" />
                    <span>Summon Next Walk-In</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: WAITING QUEUE LIST */}
        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>Waiting Clients ({waitingTickets.length})</span>
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                  Auto-Sorted
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3">
              {waitingTickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Lounge is clear.
                </div>
              ) : (
                <div className="space-y-2">
                  {waitingTickets.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-amber-400">#{t.ticketNumber}</span>
                          <span className="text-xs font-bold text-white truncate">{t.customerName}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{t.serviceName}</p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleStartService(t.id)}
                        disabled={actionLoading || !!myInChairTicket}
                        className="text-xs bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold h-9 px-3 rounded-lg border border-slate-700"
                      >
                        Seat Now
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
