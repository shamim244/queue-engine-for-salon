"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Salon, Ticket } from "@/lib/api";
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

  // Quick Walk-In Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInServiceId, setWalkInServiceId] = useState("");
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

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
    console.log("[Owner Dashboard] Received event:", event.type);
    refreshData();
  });

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) {
      alert("Customer name is required");
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
      setIsQuickAddOpen(false);
      setWalkInName("");
      setWalkInPhone("");
      setWalkInServiceId("");
      refreshData();
    } catch (err) {
      alert("Failed to add walk-in client: " + (err as Error).message);
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  const handleToggleOperatingMode = async () => {
    if (!salon) return;
    const nextMode = salon.operatingMode === "RURAL_SOLO" ? "MODERN_MULTI" : "RURAL_SOLO";
    try {
      await api.salons.updateMode(salon.id, nextMode);
      setSelectedSalon({ ...salon, operatingMode: nextMode });
    } catch (err) {
      alert("Failed to toggle mode: " + (err as Error).message);
    }
  };

  const isRural = salon?.operatingMode === "RURAL_SOLO";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {salon?.name || "Salon Command Hub"}
            </h1>
            <Badge variant={isRural ? "warning" : "default"}>
              {isRural ? "Rural Solo Mode" : "Modern Multi-Station"}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Real-time queue monitoring, revenue analytics, and instant walk-in dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleOperatingMode}
            className="text-xs border-slate-700 hover:border-slate-500 gap-1.5"
            title="Toggle between Rural Solo & Modern Multi Mode"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
            Switch to {isRural ? "Multi-Station" : "Rural Solo"}
          </Button>

          <Button
            size="sm"
            onClick={() => setIsQuickAddOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            1-Tap Quick Add Walk-In
          </Button>
        </div>
      </div>

      {/* Real-time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Clients Served Today</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{loading ? "..." : metrics.todayServedCount}</div>
            <p className="text-xs text-slate-400 mt-1">Completed checkouts today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Today Revenue</CardTitle>
            <Banknote className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-400">
              {loading ? "..." : formatCurrency(metrics.todayRevenue)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Cash & UPI collected</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active in Queue</CardTitle>
            <Users className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{loading ? "..." : activeTickets.length}</div>
            <p className="text-xs text-slate-400 mt-1">Waiting & currently summoned</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/30 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Avg Pace Calibration</CardTitle>
            <Clock className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">
              {metrics.averageServiceDurationMinutes} <span className="text-lg font-normal text-slate-400">mins</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Calibrated seat duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Active Queue Board + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Waiting Queue */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>Live Waiting Clients</span>
                  <Badge variant="default" className="text-xs">
                    {activeTickets.length} in line
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Ordered by dynamic queue algorithm with soft-bump prioritization.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
                className="text-xs gap-1.5"
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
                  {activeTickets.map((ticket, idx) => (
                    <div
                      key={ticket.id}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-11 w-11 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center font-black text-amber-400 text-lg shadow-inner">
                          #{ticket.ticketNumber}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{ticket.customerName}</span>
                            {ticket.status === "CALLED" && (
                              <Badge variant="warning" className="animate-pulse text-[10px]">
                                SUMMONED
                              </Badge>
                            )}
                            {ticket.status === "IN_SERVICE" && (
                              <Badge variant="success" className="text-[10px]">
                                IN CHAIR
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {ticket.customerPhone ? maskPhone(ticket.customerPhone) : "Guest Walk-In"} ·{" "}
                            Est. wait: <span className="text-blue-400 font-semibold">{ticket.estimatedWaitMinutes}m</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-300">
                          {ticket.totalPrice ? formatCurrency(ticket.totalPrice) : "Standard"}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Pos #{idx + 1}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Quick Access Tools */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Operational Surfaces</CardTitle>
              <CardDescription>Instant launch for tablet chairs and lobby wall TVs</CardDescription>
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
                    <p className="text-[11px] text-slate-400">4-Digit PIN, Call Next, Live Bill</p>
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
                    <p className="text-[11px] text-slate-400">For lounge wall TV with phone masking</p>
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
                  <UserPlus className="h-4 w-4 text-emerald-400" />
                  <div>
                    <p className="text-white font-bold">Customer Door QR Page</p>
                    <p className="text-[11px] text-slate-400">Self check-in & Pocket TV Board</p>
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
                    <p className="text-[11px] text-slate-400">1-click print-ready salon QR</p>
                  </div>
                </div>
                <span>Open →</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: 1-Tap Quick Add Walk-In */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogClose onClose={() => setIsQuickAddOpen(false)} />
        <form onSubmit={handleQuickAdd}>
          <DialogHeader>
            <DialogTitle>1-Tap Quick Add Walk-In Client</DialogTitle>
            <DialogDescription>
              Ideal for elderly or zero-tech clients arriving at the counter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Client Name *
              </label>
              <Input
                placeholder="e.g. Rahul Verma or Uncle Ji"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Mobile Phone (Optional for SMS / WhatsApp alerts)
              </label>
              <Input
                placeholder="+91 98765 00000"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Service (Optional)
              </label>
              <select
                className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={walkInServiceId}
                onChange={(e) => setWalkInServiceId(e.target.value)}
              >
                <option value="">Default Haircut & Styling</option>
                {salon?.services?.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} (₹{srv.basePrice}) - {srv.estimatedDurationMinutes}m
                  </option>
                ))}
              </select>
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
