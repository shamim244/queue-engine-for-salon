"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { api, Salon, Ticket, Service, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";
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
  Clock,
  Users,
  CheckCircle2,
  Armchair,
  Coffee,
  Sparkles,
  ChevronRight,
  User as UserIcon,
  Phone,
  Bookmark,
  BellRing,
  ExternalLink,
  Trash2,
  Volume2,
  Zap,
  MapPin,
  Store,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Star,
  Check,
  Navigation,
  AlertCircle,
} from "lucide-react";

export default function CustomerDoorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // My Ticket (if checked in on this device)
  const [myTicket, setMyTicket] = useState<Ticket | null>(null);

  // Check-In Modal & Form State
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Service Catalog Category Filter
  const [serviceCategory, setServiceCategory] = useState<string>("ALL");

  // In-App Toast & Confirmation State
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

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
          setSelectedServiceId(salonRes.salon.services[0].id);
        }
      }

      const queueRes = await api.queue.getActive(salonRes.salon.id);
      const tickets = queueRes.tickets || [];
      setActiveTickets(tickets);

      // Check if user has an existing saved ticket in localStorage
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
            // Ticket completed or cleared
            setMyTicket(null);
            localStorage.removeItem(`ticket_${slug}`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load customer queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // SWR Pre-warming from localStorage for <10ms instant render
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`salon_cache_${slug}`);
        if (cached) {
          const parsed = JSON.parse(cached) as Salon;
          setSalon(parsed);
          if (parsed.services?.length > 0) {
            setSelectedServiceId(parsed.services[0].id);
          }
          setLoading(false);
        }
        // Auto-open checkin modal if URL contains checkin=true or #checkin
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("checkin") === "true" || window.location.hash === "#checkin") {
          setIsCheckinOpen(true);
        }
      } catch {}
    }
    fetchSalonAndQueue();
  }, [slug]);

  // Real-time WebSocket hook
  const { isConnected, status, reconnectAttempts } = useSalonSocket(salon?.id, (event) => {
    console.log("[Customer Board] Event:", event.type);
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
        customerPhone: customerPhone.trim() || "+91 98765 00000",
        serviceId: selectedServiceId,
        stylistId: selectedStylistId,
      });

      if (resp.ticket) {
        setMyTicket(resp.ticket);
        if (typeof window !== "undefined") {
          localStorage.setItem(`ticket_${slug}`, resp.ticket.id);
        }
        setIsCheckinOpen(false);
        showToast(`Joined queue! You are Ticket #${resp.ticket.ticketNumber}`, "success");
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
      showToast("Your queue spot has been cancelled.", "info");
      fetchSalonAndQueue();
    } catch (err) {
      showToast("Failed to cancel ticket: " + (err as Error).message, "error");
    } finally {
      setCancelling(false);
    }
  };

  // Open check-in with pre-selected service
  const handleSelectServiceAndOpen = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setIsCheckinOpen(true);
  };

  const selectedService = salon?.services?.find((s) => s.id === selectedServiceId);
  const chairsServing = activeTickets.filter((t) => t.status === "IN_SERVICE" || t.status === "IN_CHAIR");
  const waitingSequence = activeTickets.filter(
    (t) => t.status === "WAITING" || t.status === "CALLED" || t.status === "SUMMONED" || t.status === "SOFT_BUMPED"
  );

  // Calculate my position and people ahead
  const myIndex = myTicket
    ? waitingSequence.findIndex((t) => t.id === myTicket.id)
    : -1;
  const peopleAhead = myIndex > 0 ? myIndex : 0;
  const displayWait = myTicket
    ? (myTicket.estimatedWaitMinutes > 0
        ? myTicket.estimatedWaitMinutes
        : (peopleAhead > 0 ? Math.max(5, peopleAhead * 15) : 3))
    : 0;

  // General estimated wait for visitors
  const totalWaitMinutes = waitingSequence.length > 0
    ? Math.max(5, Math.ceil((waitingSequence.length * 15) / Math.max(1, salon?.stylists?.length || 1)))
    : 0;

  // Filter services by category if any
  const filteredServices = useMemo(() => {
    if (!salon?.services) return [];
    if (serviceCategory === "ALL") return salon.services;
    if (serviceCategory === "ADDONS") return salon.services.filter((s) => s.isAddOn);
    if (serviceCategory === "CORE") return salon.services.filter((s) => !s.isAddOn);
    return salon.services;
  }, [salon?.services, serviceCategory]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* 1. TOP NAVBAR / BRAND HEADER */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                  {salon?.name || "Salon Digital Storefront"}
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  Verified Partner
                </Badge>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Digital Storefront &amp; Live Queue</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium">Open Today</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ConnectionPill isConnected={isConnected} status={status} reconnectAttempts={reconnectAttempts} />
            <Link
              href={`/s/${slug}/tv`}
              target="_blank"
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 font-medium bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">Lobby TV</span>
            </Link>

            {user ? (
              <Link href="/me" className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
                My Profile
              </Link>
            ) : (
              <Link href="/login" className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN STOREFRONT CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Toast Alert Banner */}
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between shadow-xl transition-all animate-in slide-in-from-top-2 ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-600/50 text-emerald-200"
                : toast.type === "error"
                ? "bg-rose-950/90 border-rose-600/50 text-rose-200"
                : "bg-blue-950/90 border-blue-600/50 text-blue-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
              {toast.type === "error" && <Trash2 className="h-5 w-5 text-rose-400 shrink-0" />}
              {toast.type === "info" && <Sparkles className="h-5 w-5 text-blue-400 shrink-0" />}
              <span className="text-sm font-semibold">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-xs opacity-70 hover:opacity-100 p-1 rounded transition-opacity"
            >
              ✕
            </button>
          </div>
        )}

        {/* 3. HERO / STOREFRONT BANNER WITH PERSONALIZED WELCOME */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="text-xs px-3 py-0.5">
                  ⭐ 4.9 RATED SALON
                </Badge>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Accepting Walk-ins
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {salon?.name || "Professional Salon & Grooming"}
              </h2>

              {/* Personalized Customer Greeting */}
              {user ? (
                <p className="text-sm sm:text-base text-amber-200 font-medium">
                  👋 Welcome back, <strong className="text-white">{user.fullName || user.username}</strong>! Skip the wait and claim your chair.
                </p>
              ) : (
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Experience seamless queue-free grooming. Join the line from anywhere, grab a tea nearby, and step into the chair right when called!
                </p>
              )}

              {/* Salon Quick Info Chips */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  {salon?.address || "Main Street Central Studio"}
                </span>

                {salon?.phone && (
                  <a
                    href={`tel:${salon.phone}`}
                    className="flex items-center gap-1.5 bg-slate-950/60 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    {salon.phone}
                  </a>
                )}

                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  8:00 AM – 9:00 PM
                </span>
              </div>
            </div>

            {/* Real-time Wait & Action Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-4 md:min-w-[280px]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Live Queue Wait Time
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                    ~{totalWaitMinutes}m
                  </span>
                  <span className="text-xs text-slate-400">
                    ({waitingSequence.length} ahead)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Active Chairs</span>
                  <span className="font-bold text-white">{salon?.stylists?.length || 1} Stylists</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">In Service</span>
                  <span className="font-bold text-emerald-400">{chairsServing.length} Chairs</span>
                </div>
              </div>

              <Button
                onClick={() => setIsCheckinOpen(true)}
                className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 gap-2"
              >
                <Zap className="h-4 w-4" />
                <span>Join Live Queue Now</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 4. ACTIVE TICKET STICKY CARD (WHEN CHECKED IN ON THIS DEVICE) */}
        {myTicket && (
          <Card className="border-2 border-amber-500 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 shadow-2xl p-6 text-center space-y-5 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between">
              <Badge
                variant={
                  myTicket.status === "CALLED" || myTicket.status === "SUMMONED"
                    ? "warning"
                    : myTicket.status === "IN_SERVICE" || myTicket.status === "IN_CHAIR"
                    ? "success"
                    : "secondary"
                }
                className="px-3 py-1 font-bold text-xs"
              >
                {myTicket.status === "CALLED" || myTicket.status === "SUMMONED"
                  ? "📢 STEP TO CHAIR NOW!"
                  : myTicket.status === "IN_SERVICE" || myTicket.status === "IN_CHAIR"
                  ? "💺 CURRENTLY IN CHAIR"
                  : myTicket.status === "SOFT_BUMPED"
                  ? "⏳ 3-MIN HOLD"
                  : "🎟️ YOUR LIVE TICKET"}
              </Badge>

              <span className="text-xs text-slate-400 font-mono">
                {myTicket.customerPhone ? maskPhone(myTicket.customerPhone) : ""}
              </span>
            </div>

            {/* Big Ticket Number */}
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                Your Ticket Number
              </span>
              <div className="text-6xl font-black text-amber-400 tracking-tight">
                #{myTicket.ticketNumber}
              </div>
              <h3 className="text-lg font-bold text-white mt-1">{myTicket.customerName}</h3>
            </div>

            {/* CHAIR READY PULSATING ALERT BANNER */}
            {(myTicket.status === "CALLED" || myTicket.status === "SUMMONED") && (
              <div className="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-200 text-sm font-bold text-center space-y-2 animate-pulse">
                <div className="flex items-center justify-center gap-2 text-lg text-amber-300">
                  <Volume2 className="h-6 w-6" />
                  <span>YOUR CHAIR IS READY!</span>
                </div>
                <p className="text-xs text-amber-100 font-normal">
                  Please step up to the mirror chair. Your barber is ready to begin your cut!
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={playChime}
                  className="text-xs border-amber-400 text-amber-300 gap-1.5"
                >
                  <BellRing className="h-3.5 w-3.5" />
                  <span>Replay Audio Alert</span>
                </Button>
              </div>
            )}

            {/* If in chair: Live Service Progress. If waiting: People Ahead & Wait Time Countdown */}
            {myTicket.status === "IN_SERVICE" || myTicket.status === "IN_CHAIR" ? (
              <LiveServiceTimer
                startedTime={(myTicket as any).startedTime || (myTicket as any).seatedAt || myTicket.createdAt}
                estimatedDurationMinutes={myTicket.estimatedWaitMinutes || 20}
                variant="customer"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-800">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block">People Ahead of You</span>
                  <span className="text-3xl font-black text-white">{peopleAhead}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Estimated Wait</span>
                  <span className="text-3xl font-black text-blue-400">
                    ~{displayWait}m
                  </span>
                </div>
              </div>
            )}

            {/* Reassuring Chai Prompt */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 text-left flex items-start gap-3">
              <Coffee className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong>Feel free to grab tea or relax nearby!</strong> We will alert you with a WhatsApp notification and sound chime when your turn arrives.
              </p>
            </div>

            {/* Shortcut: Save to Profile / View Portal & Leave Queue */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <Link href="/me" className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-dashed border-slate-700 hover:border-amber-400/60 text-slate-300 gap-1.5"
                >
                  <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                  <span>My Customer Portal</span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Leave Queue</span>
              </Button>
            </div>
          </Card>
        )}

        {/* 5. SERVICES & PRICING MENU SECTION */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Scissors className="h-5 w-5 text-amber-400" />
                <span>Service Menu &amp; Transparent Pricing</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Select any haircut, beard, or spa service to join today's queue.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "ALL", label: "All Services" },
                { id: "CORE", label: "Hair & Beard" },
                { id: "ADDONS", label: "Add-Ons & Spa" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setServiceCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    serviceCategory === cat.id
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((srv) => (
              <Card
                key={srv.id}
                className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl">{srv.icon || "✂️"}</span>
                    <Badge variant={srv.isAddOn ? "purple" : "secondary"} className="text-[10px]">
                      {srv.isAddOn ? "Add-On" : `${srv.estimatedDurationMinutes} mins`}
                    </Badge>
                  </div>
                  <CardTitle className="text-base text-white mt-2 font-bold">{srv.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Professional salon finish with hot towel clean up.
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-bold block">Price</span>
                      <span className="text-xl font-black text-amber-400">
                        {formatCurrency(srv.basePrice)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleSelectServiceAndOpen(srv.id)}
                      className="text-xs bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold gap-1 rounded-lg border border-slate-700 transition-colors"
                    >
                      <span>Select &amp; Join</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 6. ACTIVE STYLISTS & CHAIR FLOOR */}
        {salon?.stylists && salon.stylists.length > 0 && (
          <section className="space-y-4 pt-2">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Armchair className="h-5 w-5 text-blue-400" />
                <span>Active Chairs &amp; Stylists on Floor</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Our team is actively servicing appointments and walk-in clients.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {salon.stylists.map((st, idx) => {
                const isServing = chairsServing.some((t) => t.stylistId === st.id);
                return (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5"
                  >
                    <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate">{st.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">~{st.avgDurationMinutes || 20}m pace</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${isServing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                        <span className={isServing ? "text-amber-300 font-medium" : "text-emerald-400 font-medium"}>
                          {isServing ? "In Chair" : "Ready Next"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 7. LIVE QUEUE DEPARTURE BOARD (POCKET TV VIEW) */}
        <section className="space-y-4 pt-2">
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>Live Queue Flow &amp; Active Turn</span>
                </CardTitle>
                <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                  {activeTickets.length} Total Registered
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Transparent live board updated in real time via WebSockets.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Currently Serving in Chairs */}
              {chairsServing.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                    <Armchair className="h-3.5 w-3.5" />
                    Currently In Chair
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chairsServing.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-emerald-400 font-mono text-sm">
                            #{t.ticketNumber}
                          </span>
                          <div>
                            <span className="font-semibold text-white block">{t.customerName}</span>
                            <span className="text-[10px] text-slate-400">{t.serviceName || "Haircut"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <LiveServiceTimer
                            startedTime={(t as any).startedTime || (t as any).seatedAt || t.createdAt}
                            variant="badge"
                          />
                          <Badge variant="success" className="text-[10px]">
                            In Chair
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
                  <p>All chairs are currently open and sanitized for the next walk-in client!</p>
                </div>
              )}

              {/* Waiting Line */}
              {waitingSequence.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    Next in Line ({waitingSequence.length})
                  </span>

                  <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-xl border border-slate-800/80 px-3">
                    {waitingSequence.slice(0, 5).map((t, idx) => {
                      const isMe = myTicket?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          className={`py-2.5 flex items-center justify-between text-xs ${
                            isMe ? "text-amber-300 font-bold" : "text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-400">
                              #{t.ticketNumber}
                            </span>
                            <span>
                              {t.customerName} {isMe && "(YOU 👈)"}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-blue-400 font-mono">
                              ~{t.estimatedWaitMinutes > 0 ? t.estimatedWaitMinutes : Math.max(5, (idx + 1) * 15)}m
                            </span>
                            <span className="text-[10px] text-slate-500">Pos #{idx + 1}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 8. SALON AMENITIES & REASSURANCES */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Zero App Download</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Instant door check-in runs right in your phone's browser with zero installs.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">WhatsApp Summon Alerts</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                We notify you on WhatsApp when you are next in line so you never wait inside.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Chai-Friendly Waiting</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Grab a tea or shop nearby—your queue position is securely reserved.
              </p>
            </div>
          </div>
        </section>

        {/* 9. CHECK-IN MODAL DIALOG */}
        <Dialog open={isCheckinOpen} onOpenChange={setIsCheckinOpen}>
          <DialogClose onClose={() => setIsCheckinOpen(false)} />
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Zap className="h-4 w-4" />
                <span>Instant Walk-In Check-In</span>
              </div>
              <DialogTitle className="text-xl text-white">
                Join Queue at {salon?.name || "Salon"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Enter your details to receive live WhatsApp updates when your chair is ready.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleJoinQueue} className="space-y-4 pt-2">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Your Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Mobile Number (For WhatsApp / SMS Alerts)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="+91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-9 bg-slate-950 border-slate-800"
                  />
                </div>
                <span className="text-[10px] text-slate-500 block">
                  We alert you when you are next in line.
                </span>
              </div>

              {/* Service Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  Select Service <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {salon?.services?.map((srv) => {
                    const isSelected = selectedServiceId === srv.id;
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-500"
                            : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="text-lg block mb-0.5">{srv.icon || "✂️"}</span>
                        <p className="font-bold text-xs truncate text-white">{srv.name}</p>
                        <div className="flex items-center justify-between text-[10px] mt-1 text-slate-400">
                          <span className="text-amber-400 font-semibold">{formatCurrency(srv.basePrice)}</span>
                          <span>{srv.estimatedDurationMinutes}m</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stylist Selection if >1 Stylist */}
              {salon?.stylists && salon.stylists.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Barber Preference
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStylistId(null)}
                      className={`p-2 rounded-xl border text-left text-xs ${
                        selectedStylistId === null
                          ? "border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500 font-bold"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                      }`}
                    >
                      ⚡ Fastest Chair
                    </button>
                    {salon.stylists.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStylistId(st.id)}
                        className={`p-2 rounded-xl border text-left text-xs truncate ${
                          selectedStylistId === st.id
                            ? "border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500 font-bold"
                            : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                        }`}
                      >
                        ✂️ {st.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Summary */}
              {selectedService && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Selected Service:</span>
                    <strong className="text-white block">{selectedService.name}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Price:</span>
                    <strong className="text-amber-400 text-sm block">
                      {formatCurrency(selectedService.basePrice)}
                    </strong>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCheckinOpen(false)}
                  className="border-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black gap-1.5"
                >
                  {submitting ? "Securing Spot..." : "🎟️ Get My Digital Ticket"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </Dialog>

        {/* 10. MODAL: CONFIRM CANCEL QUEUE SPOT */}
        <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
          <DialogClose onClose={() => setIsCancelConfirmOpen(false)} />
          <div>
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-500" />
                Cancel Queue Spot?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your queue ticket{" "}
                <strong className="text-white">#{myTicket?.ticketNumber}</strong>? Your position will be released to other waiting clients.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelConfirmOpen(false)}
                disabled={cancelling}
              >
                Keep My Spot
              </Button>
              <Button
                type="button"
                onClick={handleConfirmCancelMyTicket}
                disabled={cancelling}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel My Spot"}
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      </main>

      {/* 11. FOOTER BRANDING */}
      <footer className="p-6 text-center text-xs text-slate-500 border-t border-slate-800/60 max-w-5xl mx-auto w-full space-y-1">
        <p className="font-semibold text-slate-400">{salon?.name || "Salon"} · Digital Storefront &amp; Real-Time Queue Engine</p>
        <p className="text-[11px] text-slate-600">Built with Bun v1.4, Next.js 15, and WebSocket Core</p>
      </footer>
    </div>
  );
}
