"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Salon, Ticket, Service, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";
import { SalonNavbar } from "@/components/salon/salon-navbar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { formatCurrency, maskPhone } from "@/lib/utils";
import { LiveServiceTimer } from "@/components/live-service-timer";
import { ConnectionPill } from "@/components/connection-pill";
import {
  Scissors,
  Shuffle,
  Clock,
  Users,
  CheckCircle2,
  Armchair,
  Sparkles,
  Zap,
  Volume2,
  Trash2,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Phone,
  User as UserIcon,
  AlertCircle,
  Coffee,
  Plus,
} from "lucide-react";

export default function DedicatedQueuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const preselectedServiceId = searchParams?.get("service") || "";

  const { user } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // My Ticket (stored locally on this device)
  const [myTicket, setMyTicket] = useState<Ticket | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState(preselectedServiceId);
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Dynamic Mid-Queue Preference Switching State
  const [isSwitchPrefModalOpen, setIsSwitchPrefModalOpen] = useState(false);
  const [newPreferenceStylistId, setNewPreferenceStylistId] = useState<string | null>(null);
  const [isSwitchingPref, setIsSwitchingPref] = useState(false);

  const handleConfirmSwitchPreference = async () => {
    if (!myTicket) return;
    setIsSwitchingPref(true);
    try {
      const resp = await api.queue.switchPreference(myTicket.id, newPreferenceStylistId);
      if (resp.ticket) {
        setMyTicket(resp.ticket);
        setIsSwitchPrefModalOpen(false);
        const name = newPreferenceStylistId
          ? salon?.stylists?.find((s) => s.id === newPreferenceStylistId)?.name || "Barber"
          : "Fastest Available Chair";
        showToast(`Preference updated to ${name}! Your fair place in line is preserved.`, "success");
        playChime();
        fetchSalonAndQueue();
      }
    } catch (err) {
      showToast("Failed to switch preference: " + (err as Error).message, "error");
    } finally {
      setIsSwitchingPref(false);
    }
  };

  const [pausingTicket, setPausingTicket] = useState(false);
  const [resumingTicket, setResumingTicket] = useState(false);

  const handlePauseMyTicket = async () => {
    if (!myTicket) return;
    setPausingTicket(true);
    try {
      const resp = await api.queue.pause(myTicket.id, "Customer stepped out for errand");
      if (resp.ticket) {
        setMyTicket(resp.ticket);
        showToast("Your spot is held on pause! Tap 'I'm Back' when you return.", "info");
        fetchSalonAndQueue();
      }
    } catch (err) {
      showToast("Failed to pause spot: " + (err as Error).message, "error");
    } finally {
      setPausingTicket(false);
    }
  };

  const handleResumeMyTicket = async () => {
    if (!myTicket) return;
    setResumingTicket(true);
    try {
      const resp = await api.queue.resume(myTicket.id);
      if (resp.ticket) {
        setMyTicket(resp.ticket);
        showToast("Welcome back! You're lined up for the next available chair.", "success");
        playChime();
        fetchSalonAndQueue();
      }
    } catch (err) {
      showToast("Failed to resume spot: " + (err as Error).message, "error");
    } finally {
      setResumingTicket(false);
    }
  };

  // Mid-Queue Add-On Services State
  const [isAddServicesModalOpen, setIsAddServicesModalOpen] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [isUpdatingServices, setIsUpdatingServices] = useState(false);

  const handleConfirmUpdateServices = async () => {
    if (!myTicket) return;
    setIsUpdatingServices(true);
    try {
      // Optimistic in-memory calculation for instant 0ms mobile responsiveness
      const baseService = salon?.services?.find((s) => s.id === myTicket.serviceId) || {
        basePrice: myTicket.totalPrice || 100,
        estimatedDurationMinutes: myTicket.totalDurationMinutes || 20,
      };
      const addOns = (salon?.services || [])
        .filter((s) => selectedAddOnIds.includes(s.id))
        .map((s) => ({
          id: s.id,
          name: s.name,
          price: s.basePrice,
          durationMinutes: s.estimatedDurationMinutes,
        }));
      const newTotalPrice = baseService.basePrice + addOns.reduce((sum, a) => sum + a.price, 0);
      const newTotalDuration = baseService.estimatedDurationMinutes + addOns.reduce((sum, a) => sum + a.durationMinutes, 0);

      setMyTicket((prev) =>
        prev
          ? {
              ...prev,
              selectedAddOns: addOns,
              totalPrice: newTotalPrice,
              totalDurationMinutes: newTotalDuration,
            }
          : prev
      );

      const resp = await api.queue.updateServices(myTicket.id, selectedAddOnIds);
      if (resp.ticket) {
        setMyTicket(resp.ticket);
        showToast("Services updated! Your bill & wait time have been adjusted.", "success");
      }
      setIsAddServicesModalOpen(false);
      fetchSalonAndQueue();
    } catch (err: any) {
      console.error("Update services error:", err);
      showToast(err.message || "Failed to update services", "error");
      fetchSalonAndQueue();
    } finally {
      setIsUpdatingServices(false);
    }
  };

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Pre-fill user profile if logged in
  useEffect(() => {
    if (user) {
      if (!customerName && (user.fullName || user.username)) {
        setCustomerName(user.fullName || user.username);
      }
      if (!customerPhone && user.phone) {
        setCustomerPhone(user.phone);
      }
    }
  }, [user]);

  // Audio Chime notification
  const playChime = () => {
    try {
      if (typeof window !== "undefined") {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {}
  };

  const fetchSalonAndQueue = async () => {
    try {
      const salonRes = await api.salons.get(slug);
      if (salonRes.salon) {
        setSalon(salonRes.salon);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`salon_cache_${slug}`, JSON.stringify(salonRes.salon));
          } catch {}
        }
        if (!selectedServiceId && salonRes.salon.services?.length > 0) {
          setSelectedServiceId(preselectedServiceId || salonRes.salon.services[0].id);
        }
      }

      const queueRes = await api.queue.getActive(salonRes.salon.id);
      const tickets = queueRes.tickets || [];
      setActiveTickets(tickets);

      // Check if user has an active ticket
      if (typeof window !== "undefined") {
        const storedTicketId = localStorage.getItem(`ticket_${slug}`);
        if (storedTicketId) {
          const matching = tickets.find((t) => t.id === storedTicketId);
          if (matching) {
            const wasSummoned = matching.status === "CALLED" || matching.status === "SUMMONED";
            const prevSummoned = myTicket?.status === "CALLED" || myTicket?.status === "SUMMONED";
            if (wasSummoned && !prevSummoned) {
              playChime();
            }
            setMyTicket(matching);
          } else if (myTicket && myTicket.id === storedTicketId) {
            setMyTicket(null);
            localStorage.removeItem(`ticket_${slug}`);
          }
        }
      }
    } catch (err) {
      console.error("Queue load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`salon_cache_${slug}`);
        if (cached) {
          const parsed = JSON.parse(cached) as Salon;
          setSalon(parsed);
          if (parsed.services?.length > 0 && !selectedServiceId) {
            setSelectedServiceId(preselectedServiceId || parsed.services[0].id);
          }
          setLoading(false);
        }
      } catch {}
    }
    fetchSalonAndQueue();
  }, [slug]);

  // Real-time WebSocket hook
  const { isConnected, status, reconnectAttempts } = useSalonSocket(salon?.id, (event) => {
    fetchSalonAndQueue();
  });

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !selectedServiceId) {
      showToast("Please enter your name and select a service", "error");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await api.queue.checkIn({
        salonSlug: slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        serviceId: selectedServiceId,
        stylistId: selectedStylistId,
      });

      if (resp.ticket) {
        setMyTicket(resp.ticket);
        if (typeof window !== "undefined") {
          localStorage.setItem(`ticket_${slug}`, resp.ticket.id);
        }
        showToast(`Joined queue! You are Ticket #${resp.ticket.ticketNumber}`, "success");
        playChime();
        fetchSalonAndQueue();
      }
    } catch (err) {
      showToast("Failed to join queue: " + (err as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancelMyTicket = async () => {
    if (!myTicket) return;
    setCancelling(true);
    try {
      await api.queue.cancel(myTicket.id, "Customer left");
      setMyTicket(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`ticket_${slug}`);
      }
      setIsCancelConfirmOpen(false);
      showToast("Your queue ticket has been cancelled.", "info");
      fetchSalonAndQueue();
    } catch (err) {
      showToast("Failed to cancel ticket: " + (err as Error).message, "error");
    } finally {
      setCancelling(false);
    }
  };

  const selectedService = salon?.services?.find((s) => s.id === selectedServiceId);
  const selectedStylist = salon?.stylists?.find((st) => st.id === selectedStylistId);

  // Queue state breakdown
  const chairsServing = activeTickets.filter(
    (t) => t.status === "IN_CHAIR" || t.status === "IN_SERVICE"
  );
  const waitingSequence = activeTickets.filter(
    (t) => t.status === "WAITING" || t.status === "SUMMONED" || t.status === "CALLED" || t.status === "SOFT_BUMPED"
  );

  // Real-time Barber & Automated Queue Load Breakdown (Rule 1: Client-Compute Math)
  const queueLoadMetrics = useMemo(() => {
    const activeStylists = (salon?.stylists || []).filter((s) => s.isActive !== false);
    const chairCount = Math.max(1, activeStylists.length);

    const inChairTickets = activeTickets.filter(
      (t) => t.status === "IN_CHAIR" || t.status === "IN_SERVICE"
    );
    const waitingTickets = activeTickets.filter(
      (t) => t.status === "WAITING" || t.status === "SUMMONED" || t.status === "CALLED" || t.status === "SOFT_BUMPED"
    );

    const totalWaitingCount = waitingTickets.length;
    const occupiedChairs = inChairTickets.length;
    const freeChairs = Math.max(0, chairCount - occupiedChairs);

    // Automated / pooled estimation:
    // If free chairs exist and queue is empty, next client sits immediately (0 min wait)
    const automatedEstWaitMin = freeChairs > 0 && totalWaitingCount === 0
      ? 0
      : Math.max(5, Math.ceil(((totalWaitingCount + 1) / chairCount) * 15));

    // Per-barber dedicated metrics
    const byStylist: Record<
      string,
      {
        waitingCount: number;
        isInChair: boolean;
        inChairCustomer?: string;
        estWaitMin: number;
        diffFromAuto: number;
        isFreeNow: boolean;
      }
    > = {};

    for (const st of activeStylists) {
      const stInChair = inChairTickets.find((t) => t.stylistId === st.id);
      const stWaiting = waitingTickets.filter((t) => t.stylistId === st.id);
      const count = stWaiting.length;
      const avgDuration = st.avgDurationMinutes || 20;

      let estWait = 0;
      let isFreeNow = false;

      if (stInChair) {
        // Chair occupied: base half-duration + each dedicated waiting client
        estWait = Math.max(8, Math.round(avgDuration * 0.5) + count * avgDuration);
      } else if (count > 0) {
        estWait = count * avgDuration;
      } else {
        estWait = 0;
        isFreeNow = true;
      }

      byStylist[st.id] = {
        waitingCount: count,
        isInChair: !!stInChair,
        inChairCustomer: stInChair ? stInChair.customerName : undefined,
        estWaitMin: estWait,
        diffFromAuto: estWait - automatedEstWaitMin,
        isFreeNow,
      };
    }

    return {
      activeChairs: chairCount,
      freeChairs,
      totalWaiting: totalWaitingCount,
      automated: {
        waitingCount: totalWaitingCount,
        estWaitMin: automatedEstWaitMin,
        freeChairs,
      },
      byStylist,
    };
  }, [salon?.stylists, activeTickets]);

  // Position calculation considering specific stylist vs pooled queue
  const myIndex = myTicket ? waitingSequence.findIndex((t) => t.id === myTicket.id) : -1;
  const peopleAhead = myIndex >= 0 ? myIndex : 0;
  
  // Specific barber queue ahead count if user chose a specific barber
  const myBarberSpecificAhead = useMemo(() => {
    if (!myTicket || !myTicket.stylistId) return peopleAhead;
    const sameBarberWaiting = waitingSequence.filter((t) => t.stylistId === myTicket.stylistId);
    const idx = sameBarberWaiting.findIndex((t) => t.id === myTicket.id);
    return idx >= 0 ? idx : 0;
  }, [myTicket, waitingSequence, peopleAhead]);

  const estimatedWaitMin = myTicket
    ? (typeof myTicket.estimatedWaitMinutes === "number"
        ? myTicket.estimatedWaitMinutes
        : myIndex >= 0 ? Math.max(5, (myIndex + 1) * 15) : 0)
    : 0;

  // Real-Time Local Device Clock for Exact Clock-Time Window (Rule 1: Client-Compute Architecture)
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 10000); // Client-side tick every 10s without network calls
    return () => clearInterval(timer);
  }, []);

  const estimatedEtaWindow = useMemo(() => {
    if (!myTicket || estimatedWaitMin <= 0) {
      return {
        clockText: "Ready Now · Step In",
        exactTarget: "Now",
        tipText: "Please step directly up to your station chair.",
        isReady: true,
      };
    }

    const formatTime = (date: Date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minsStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
      return `${hours}:${minsStr} ${ampm}`;
    };

    const targetDate = new Date(currentTimeMs + estimatedWaitMin * 60000);
    const windowStartDate = new Date(currentTimeMs + Math.max(0, estimatedWaitMin - 2) * 60000);
    const windowEndDate = new Date(currentTimeMs + (estimatedWaitMin + 3) * 60000);

    const clockText = `${formatTime(windowStartDate)} – ${formatTime(windowEndDate)}`;
    const exactTarget = formatTime(targetDate);

    let tipText = `Relax nearby! Plan to be back at salon by ${formatTime(new Date(currentTimeMs + Math.max(0, estimatedWaitMin - 3) * 60000))}.`;
    if (estimatedWaitMin <= 4) {
      tipText = "You are up next! Please remain seated in the waiting lounge.";
    }

    return {
      clockText,
      exactTarget,
      tipText,
      isReady: false,
    };
  }, [currentTimeMs, estimatedWaitMin, myTicket]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* 1. TOP NAVBAR */}
      <SalonNavbar slug={slug} salon={salon} user={user} activeRoute="queue" />

      {/* 2. TOAST NOTIFICATION */}
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

      {/* 3. MAIN OPERATIONAL CONTAINER */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6 flex-1">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/s/${slug}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors py-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Salon Storefront</span>
          </Link>

          <div className="flex items-center gap-2">
            <ConnectionPill isConnected={isConnected} status={status} reconnectAttempts={reconnectAttempts} />
            <Link
              href={`/s/${slug}/tv`}
              target="_blank"
              className="text-xs text-blue-400 hover:text-blue-300 hidden sm:flex items-center gap-1 font-semibold bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20"
            >
              <span>Lobby TV</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* 4. ACTIVE POCKET TICKET (If already checked in) */}
        {myTicket ? (
          <Card className="border-2 border-amber-500/60 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-amber-500/10">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs uppercase tracking-widest font-black text-amber-400">
                    Live Pocket Ticket
                  </span>
                </div>
                <Badge
                  variant={
                    myTicket.status === "CALLED" || myTicket.status === "SUMMONED"
                      ? "warning"
                      : myTicket.status === "IN_SERVICE" || myTicket.status === "IN_CHAIR"
                      ? "success"
                      : "secondary"
                  }
                  className="text-xs px-3 py-1 uppercase font-bold"
                >
                  {myTicket.status === "CALLED" || myTicket.status === "SUMMONED"
                    ? "CHAIR READY"
                    : myTicket.status === "IN_SERVICE" || myTicket.status === "IN_CHAIR"
                    ? "IN CHAIR"
                    : "WAITING IN QUEUE"}
                </Badge>
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    Ticket #{myTicket.ticketNumber}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    For <span className="text-white font-semibold">{myTicket.customerName}</span>
                    {myTicket.customerPhone && maskPhone(myTicket.customerPhone) && (
                      <span className="text-slate-400 font-normal"> ({maskPhone(myTicket.customerPhone)})</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Service & Bill</span>
                  <span className="text-sm font-bold text-amber-400">{myTicket.serviceName}</span>
                  {myTicket.selectedAddOns && myTicket.selectedAddOns.length > 0 && (
                    <span className="text-[10px] text-slate-400 block max-w-[150px] truncate">
                      +{myTicket.selectedAddOns.map((a: any) => a.name).join(", ")}
                    </span>
                  )}
                  <span className="text-xs font-bold text-emerald-400 block mt-0.5 font-mono">
                    ₹{myTicket.totalPrice || 0}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Pulsating Summon Banner */}
              {(myTicket.status === "CALLED" || myTicket.status === "SUMMONED") && (
                <div className="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 text-sm font-bold text-center space-y-2 animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-lg text-amber-300">
                    <Volume2 className="h-6 w-6" />
                    <span>YOUR CHAIR IS READY!</span>
                  </div>
                  <p className="text-xs text-amber-100 font-normal">
                    Please step up to the mirror chair. Your barber is ready for your cut!
                  </p>
                  <Button
                    size="sm"
                    onClick={playChime}
                    className="bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 gap-1.5 rounded-xl h-10 px-4"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>Play Chime Alert</span>
                  </Button>
                </div>
              )}

              {/* Progress Timer or Waiting Stats */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Scissors className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-slate-400">Queue Routing:</span>
                  <span className="font-bold text-white">
                    {myTicket.stylistId
                      ? (salon?.stylists?.find((s) => s.id === myTicket.stylistId)?.name || "Dedicated Barber")
                      : "Fastest Available Chair"}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                    {myTicket.stylistId ? "Locked-In Chair" : "Universal Pool"}
                  </Badge>
                </div>

                {(myTicket.status === "WAITING" || myTicket.status === "SOFT_BUMPED" || myTicket.status === "PAUSED") && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setSelectedAddOnIds((myTicket.selectedAddOns || []).map((a: any) => a.id));
                        setIsAddServicesModalOpen(true);
                      }}
                      className="h-8 px-3 text-[11px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 font-bold shrink-0 rounded-lg gap-1"
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-400" />
                      <span>+ Add Services</span>
                    </Button>

                    {myTicket.status !== "PAUSED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={handlePauseMyTicket}
                        disabled={pausingTicket}
                        className="h-8 px-3 text-[11px] border-blue-500/40 text-blue-300 hover:bg-blue-500/10 font-bold shrink-0 rounded-lg gap-1"
                      >
                        <Coffee className="h-3.5 w-3.5 text-amber-400" />
                        <span>Pause Spot</span>
                      </Button>
                    )}

                    {salon?.stylists && salon.stylists.length > 0 && myTicket.status !== "PAUSED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setNewPreferenceStylistId(myTicket.stylistId || null);
                          setIsSwitchPrefModalOpen(true);
                        }}
                        className="h-8 px-3 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10 font-bold shrink-0 rounded-lg"
                      >
                        <Shuffle className="h-3.5 w-3.5 mr-1" />
                        <span>Change Barber</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {myTicket.status === "PAUSED" ? (
                <div className="p-4 rounded-2xl bg-blue-950/40 border-2 border-blue-500/50 text-blue-200 text-sm space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-white text-base">
                      <Coffee className="h-5 w-5 text-amber-400" />
                      <span>Spot Paused · Errand / Chai Mode</span>
                    </div>
                    <Badge variant="outline" className="border-blue-400 text-blue-300 text-[10px]">
                      HOLDING SPOT
                    </Badge>
                  </div>
                  <p className="text-xs text-blue-200 leading-relaxed">
                    Your spot in line is safe! Barbers will not call your number while you are away. When you walk back into the salon, tap below to get into the next open chair.
                  </p>
                  <Button
                    size="lg"
                    onClick={handleResumeMyTicket}
                    disabled={resumingTicket}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>👋 I&apos;m Back at Salon (Ready for Chair)</span>
                  </Button>
                </div>
              ) : myTicket.status === "IN_SERVICE" || myTicket.status === "IN_CHAIR" ? (
                <LiveServiceTimer
                  startedTime={(myTicket as any).startedTime || (myTicket as any).seatedAt || myTicket.createdAt}
                  estimatedDurationMinutes={myTicket.estimatedWaitMinutes || 20}
                  variant="customer"
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 py-2">
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block font-medium">
                        {myTicket.stylistId ? "In Barber's Line" : "People Ahead"}
                      </span>
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        {myTicket.stylistId ? myBarberSpecificAhead : peopleAhead}
                      </span>
                      {myTicket.stylistId && (
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          ({peopleAhead} in whole shop)
                        </span>
                      )}
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block font-medium">Est. Wait</span>
                      <span className="text-3xl sm:text-4xl font-black text-amber-400">~{estimatedWaitMin}m</span>
                    </div>
                  </div>

                  {/* Wall-Clock Arrival Target Banner (Eliminates Mental Math) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 text-center space-y-1 shadow-lg">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-bold uppercase tracking-wider">
                      <Clock className="h-3.5 w-3.5 text-amber-400" />
                      <span>Exact Arrival Target (Clock Time)</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {estimatedEtaWindow.clockText}
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      {estimatedEtaWindow.tipText}
                    </p>
                  </div>
                </>
              )}

              {/* Cancel Button */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 min-h-[44px] px-4 rounded-xl"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  <span>Cancel Ticket</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* 5. INSTANT WALK-IN CHECK-IN FORM (Optimized for Android touch) */
          <Card className="border-slate-800 bg-slate-900/70 shadow-2xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Zap className="h-4 w-4 fill-amber-400" />
                <span>Instant Walk-In Check-In</span>
              </div>
              <CardTitle className="text-2xl font-black text-white mt-1">
                Join {salon?.name || "the Salon"} Live Queue
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-400">
                Reserve your spot from your phone. Watch your countdown in real time and step into the chair without waiting around.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              <form onSubmit={handleJoinQueue} className="space-y-5">
                {/* Full Name (large touch target: 48px) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Your Full Name <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-12 bg-slate-950/80 border-slate-700 text-white rounded-xl text-base px-3.5 focus:border-amber-400"
                  />
                </div>

                {/* Mobile Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Mobile Phone Number <span className="text-slate-500 font-normal">(for SMS call-up)</span>
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-12 bg-slate-950/80 border-slate-700 text-white rounded-xl text-base px-3.5 focus:border-amber-400"
                  />
                </div>

                {/* Select Service */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Select Desired Service <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {salon?.services?.map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`min-h-[56px] p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          selectedServiceId === srv.id
                            ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                            : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="text-xl">{srv.icon || "✂️"}</span>
                          <div className="truncate">
                            <p className="text-xs sm:text-sm font-bold truncate">{srv.name}</p>
                            <p className="text-[11px] text-slate-400">~{srv.estimatedDurationMinutes} mins</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs sm:text-sm font-bold text-amber-400 shrink-0 ml-2">
                          {formatCurrency(srv.basePrice)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Barber Preference & Real-time Load Distribution */}
                {salon?.stylists && salon.stylists.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 block">
                        Barber Preference &amp; Live Line Load
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {queueLoadMetrics.activeChairs} chairs active
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* 1. FASTEST AVAILABLE (AUTO-ASSIGN POOL) */}
                      <button
                        type="button"
                        onClick={() => setSelectedStylistId(null)}
                        className={`min-h-[58px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          selectedStylistId === null
                            ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                            : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                            <span className="text-xs font-bold">Fastest Available Chair</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 font-bold shrink-0">
                            ~{queueLoadMetrics.automated.estWaitMin}m Wait
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between w-full mt-2 text-[11px]">
                          <span className="text-slate-400">
                            {queueLoadMetrics.automated.freeChairs > 0 && queueLoadMetrics.automated.waitingCount === 0 ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                Chair open right now
                              </span>
                            ) : (
                              <span>{queueLoadMetrics.automated.waitingCount} in general line</span>
                            )}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-300">Fastest Lane</span>
                        </div>
                      </button>

                      {/* 2. SPECIFIC BARBER CARDS WITH REAL-TIME LOAD */}
                      {salon.stylists.map((st) => {
                        const metric = queueLoadMetrics.byStylist[st.id] || {
                          waitingCount: 0,
                          isInChair: false,
                          estWaitMin: 20,
                          diffFromAuto: 0,
                          isFreeNow: true,
                        };

                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setSelectedStylistId(st.id)}
                            className={`min-h-[58px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              selectedStylistId === st.id
                                ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                                : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-1.5 truncate">
                                <Scissors className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="text-xs font-bold truncate">{st.name}</span>
                              </div>
                              <span className="text-xs font-bold font-mono text-slate-200 shrink-0 ml-1">
                                ~{metric.estWaitMin}m
                              </span>
                            </div>

                            <div className="flex items-center justify-between w-full mt-2 text-[11px]">
                              <span className="text-slate-400 truncate">
                                {metric.isFreeNow ? (
                                  <span className="text-emerald-400 font-medium">Chair Ready (0 waiting)</span>
                                ) : metric.isInChair ? (
                                  <span>In Chair • {metric.waitingCount} waiting</span>
                                ) : (
                                  <span>{metric.waitingCount} waiting for {st.name.split(" ")[0]}</span>
                                )}
                              </span>

                              {metric.diffFromAuto > 5 ? (
                                <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                                  +{metric.diffFromAuto}m vs auto
                                </span>
                              ) : metric.isFreeNow ? (
                                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                                  Ready
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* 3. REAL-TIME ROUTING & WAIT COMPARISON BANNER */}
                    <div className="p-3.5 rounded-xl border bg-slate-950/70 border-slate-800 transition-all text-xs">
                      {selectedStylistId === null ? (
                        <div className="flex items-start gap-2.5 text-emerald-300">
                          <Zap className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-white">Automated First-Available Line Selected</p>
                            <p className="text-slate-300 mt-0.5 leading-relaxed">
                              You will be assigned to whichever chair finishes first. There are currently{" "}
                              <strong className="text-white">{queueLoadMetrics.automated.waitingCount}</strong> client(s) waiting in queue across all active chairs, with an estimated wait of{" "}
                              <strong className="text-amber-400">~{queueLoadMetrics.automated.estWaitMin} mins</strong>.
                            </p>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const st = salon.stylists.find((s) => s.id === selectedStylistId);
                          const stMetric = st ? queueLoadMetrics.byStylist[st.id] : null;
                          const name = st?.name || "Selected Barber";

                          if (stMetric?.isFreeNow) {
                            return (
                              <div className="flex items-start gap-2.5 text-emerald-300">
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="font-bold text-white">Dedicated Line: {name} is Ready!</p>
                                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                                    {name}&apos;s chair is currently open with 0 clients waiting. You will be seated right away upon arrival!
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-start gap-2.5 text-amber-300">
                              <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="font-bold text-white">Dedicated Line Locked to {name}</p>
                                <p className="text-slate-300 mt-0.5 leading-relaxed">
                                  There are <strong className="text-white">{stMetric?.waitingCount || 0}</strong> client(s) waiting specifically in {name}&apos;s line. Estimated wait for this chair is{" "}
                                  <strong className="text-amber-400">~{stMetric?.estWaitMin || 20} mins</strong>
                                  {stMetric && stMetric.diffFromAuto > 0 ? (
                                    <span> ({stMetric.diffFromAuto} mins longer than Fastest Available).</span>
                                  ) : (
                                    <span> (same as automated line).</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Action (Thumb friendly: minimum 52px height) */}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[52px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/25 gap-2 active:scale-98 transition-transform"
                >
                  <Zap className="h-5 w-5 fill-slate-950" />
                  <span>{submitting ? "Securing Your Spot..." : "Join Live Queue Now"}</span>
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* 6. LIVE CHAIR FLOOR & REAL-TIME QUEUE LIST */}
        <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
          <CardHeader className="pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-blue-400" />
                <span>Live Floor &amp; Waiting List</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                {activeTickets.length} Total on Floor
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {/* Currently Serving Chairs */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>In Mirror Chairs ({chairsServing.length})</span>
              </span>

              {chairsServing.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  All mirror chairs currently open. Next walk-in sits down immediately!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {chairsServing.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                          #{t.ticketNumber}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{t.customerName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{t.serviceName}</p>
                        </div>
                      </div>
                      <Badge variant="success" className="text-[10px] shrink-0">
                        In Chair
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waiting in Lounge */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">
                Up Next in Lounge ({waitingSequence.length})
              </span>

              {waitingSequence.length === 0 ? (
                <div className="p-3 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Zero waiting! Step inside to be served immediately.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950/60 border border-slate-800">
                  {waitingSequence.map((t, idx) => {
                    const isMe = myTicket?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`px-3.5 py-3 flex items-center justify-between text-xs ${
                          isMe ? "bg-amber-500/10 text-amber-300 font-bold" : "text-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 truncate">
                          <span className="font-mono font-bold text-slate-400 shrink-0">#{t.ticketNumber}</span>
                          <span className="font-semibold truncate">
                            {isMe ? `${t.customerName} (You)` : t.customerName || `Guest #${t.ticketNumber}`}
                          </span>
                          {t.customerPhone && maskPhone(t.customerPhone) && !isMe && (
                            <span className="text-[10px] text-slate-500 font-normal shrink-0">
                              ({maskPhone(t.customerPhone)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-400">{t.serviceName}</span>
                          <Badge variant={isMe ? "warning" : "secondary"} className="text-[10px]">
                            {idx === 0 || t.estimatedWaitMinutes === 0
                              ? "Next Up"
                              : `~${t.estimatedWaitMinutes || (idx + 1) * 15}m wait`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 6.5 DYNAMIC MID-QUEUE PREFERENCE SWITCHING DIALOG */}
      <Dialog open={isSwitchPrefModalOpen} onOpenChange={setIsSwitchPrefModalOpen}>
        <DialogClose onClose={() => setIsSwitchPrefModalOpen(false)} />
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-amber-400" />
              <span>Change Barber Preference</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Switch to a specific barber or back to the fastest chair anytime. Your original arrival time is preserved so you keep your fair place in line!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {/* Option A: Fastest Available */}
            <button
              type="button"
              onClick={() => setNewPreferenceStylistId(null)}
              className={`w-full p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                newPreferenceStylistId === null
                  ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                  : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold">Fastest Available Chair (Auto-Assign)</span>
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 font-bold">
                  ~{queueLoadMetrics.automated.estWaitMin}m Wait
                </Badge>
              </div>
              <span className="text-[11px] text-slate-400 mt-1.5">
                Automatically places you into whichever of the {queueLoadMetrics.activeChairs} chairs opens first.
              </span>
            </button>

            {/* Option B: Specific Stylists */}
            {salon?.stylists?.map((st) => {
              const metric = queueLoadMetrics.byStylist[st.id] || { waitingCount: 0, estWaitMin: 20, isFreeNow: true };
              const isSelected = newPreferenceStylistId === st.id;

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setNewPreferenceStylistId(st.id)}
                  className={`w-full p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 truncate">
                      <Scissors className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold truncate">{st.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 shrink-0 ml-1">
                      ~{metric.estWaitMin}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between w-full text-[11px] text-slate-400 mt-1.5">
                    <span>{metric.waitingCount} waiting specifically for {st.name.split(" ")[0]}</span>
                    {metric.isFreeNow && <span className="text-emerald-400 font-semibold">Chair Ready</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <DialogFooter className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsSwitchPrefModalOpen(false)}
              disabled={isSwitchingPref}
              className="flex-1 min-h-[44px] rounded-xl border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSwitchPreference}
              disabled={isSwitchingPref}
              className="flex-1 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              {isSwitchingPref ? "Updating..." : "Update Preference"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 6.8 MID-QUEUE ADD-ON SERVICES DIALOG (SELF-SERVICE UPSELL & RECALCULATION) */}
      <Dialog open={isAddServicesModalOpen} onOpenChange={setIsAddServicesModalOpen}>
        <DialogClose onClose={() => setIsAddServicesModalOpen(false)} />
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <span>Add Services & Grooming</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Customize your grooming session while you wait. Your barber will be prepared, and your queue wait time updates automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Current Base Service Card */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Primary Service</span>
              <span className="text-xs font-bold text-white">{myTicket?.serviceName}</span>
            </div>
            <Badge variant="outline" className="text-[11px] border-emerald-500/30 text-emerald-400 font-bold">
              Base Service
            </Badge>
          </div>

          {/* Available Add-Ons List */}
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Available Add-Ons</span>
            {(salon?.services || [])
              .filter((s) => s.id !== myTicket?.serviceId)
              .map((svc) => {
                const isSelected = selectedAddOnIds.includes(svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedAddOnIds((prev) => prev.filter((id) => id !== svc.id));
                      } else {
                        setSelectedAddOnIds((prev) => [...prev, svc.id]);
                      }
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all min-h-[48px] ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/50"
                        : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected ? "bg-emerald-500 border-emerald-500 text-slate-950" : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-white">{svc.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          +{svc.estimatedDurationMinutes || 15} mins duration
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      +{formatCurrency(svc.basePrice)}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Dynamic Price & Time Summary Preview */}
          {(() => {
            const baseService = salon?.services?.find((s) => s.id === myTicket?.serviceId);
            const basePrice = baseService?.basePrice || myTicket?.totalPrice || 100;
            const baseDuration = baseService?.estimatedDurationMinutes || myTicket?.totalDurationMinutes || 20;
            const addOns = (salon?.services || []).filter((s) => selectedAddOnIds.includes(s.id));
            const addOnsPrice = addOns.reduce((sum, a) => sum + a.basePrice, 0);
            const addOnsDuration = addOns.reduce((sum, a) => sum + (a.estimatedDurationMinutes || 0), 0);
            const previewTotal = basePrice + addOnsPrice;
            const previewDuration = baseDuration + addOnsDuration;

            return (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Updated Total Duration:</span>
                  <span className="font-bold text-slate-200">~{previewDuration} mins</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-slate-800">
                  <span className="text-white">Updated Total Bill:</span>
                  <span className="text-emerald-400 font-mono text-base">{formatCurrency(previewTotal)}</span>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsAddServicesModalOpen(false)}
              disabled={isUpdatingServices}
              className="flex-1 min-h-[44px] rounded-xl border-slate-700 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpdateServices}
              disabled={isUpdatingServices}
              className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              {isUpdatingServices ? "Saving..." : "Confirm & Update"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* 7. CANCEL CONFIRMATION DIALOG */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogClose onClose={() => setIsCancelConfirmOpen(false)} />
        <div className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              <span>Cancel Queue Ticket?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Are you sure you want to cancel ticket #{myTicket?.ticketNumber}? Your place in line will be surrendered.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsCancelConfirmOpen(false)}
              disabled={cancelling}
              className="flex-1 min-h-[44px] rounded-xl border-slate-700 text-slate-300"
            >
              Keep My Spot
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancelMyTicket}
              disabled={cancelling}
              className="flex-1 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
