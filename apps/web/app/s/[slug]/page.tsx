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
  Megaphone,
  Menu,
  X,
  MessageCircle,
  Mail,
  Instagram,
  QrCode,
  Wifi,
  Wind,
  Copy,
} from "lucide-react";

export default function CustomerDoorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Mobile navigation drawer toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Announcement dismiss state
  const [dismissAnnouncement, setDismissAnnouncement] = useState(false);

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

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, "success");
    }
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

  const navMenuItems = [
    { label: "Home", href: "#hero" },
    { label: "Live Queue", href: "#queue" },
    { label: "Services", href: "#services" },
    { label: "Stylists", href: "#team" },
    { label: "About Us", href: "#about" },
    { label: "Contact & Hours", href: "#contact" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 scroll-smooth">
      {/* 0. DYNAMIC TOP ANNOUNCEMENT BANNER */}
      {salon?.announcementActive && salon?.announcement && !dismissAnnouncement && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 py-2.5 px-4 font-semibold text-xs sm:text-sm border-b border-amber-400 shadow-md transition-all">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 truncate">
              <span className="p-1 rounded-full bg-slate-950/20 text-slate-950 shrink-0">
                <Megaphone className="h-4 w-4" />
              </span>
              <Badge variant="outline" className="border-slate-950/30 text-[10px] uppercase font-black bg-slate-950/10 shrink-0">
                Notice
              </Badge>
              <span className="truncate">{salon.announcement}</span>
            </div>
            <button
              onClick={() => setDismissAnnouncement(true)}
              className="text-slate-950/70 hover:text-slate-950 p-1 rounded transition-colors shrink-0 font-bold"
              aria-label="Dismiss Notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP NAVBAR / BRAND HEADER & NAVIGATION MENU */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3 transition-all shadow-lg shadow-black/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Salon Identity */}
          <Link href="#hero" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-white leading-tight group-hover:text-amber-400 transition-colors">
                  {salon?.name || "Salon Digital Storefront"}
                </h1>
                <Badge variant="outline" className="hidden lg:inline-flex text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  Verified
                </Badge>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>{salon?.tagline || "Digital Storefront & Live Queue"}</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-emerald-400 font-medium hidden sm:inline">Open Today</span>
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/50 p-1 rounded-2xl border border-slate-800/80 text-xs font-semibold">
            {navMenuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Quick Actions & Connection Status */}
          <div className="flex items-center gap-2">
            <ConnectionPill isConnected={isConnected} status={status} reconnectAttempts={reconnectAttempts} />

            <Link
              href={`/s/${slug}/tv`}
              target="_blank"
              className="text-xs text-slate-300 hover:text-white hidden sm:flex items-center gap-1.5 font-medium bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
              <span>Lobby TV</span>
            </Link>

            {user ? (
              <Link
                href="/me"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 transition-colors"
              >
                My Account
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t border-slate-800/80 mt-3 space-y-2 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
              {navMenuItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/60 transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2 border-t border-slate-800/60">
              <Button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCheckinOpen(true);
                }}
                className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl"
              >
                ⚡ Join Live Queue
              </Button>
              <Link
                href={`/s/${slug}/tv`}
                target="_blank"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                <span>TV</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. MAIN STOREFRONT CONTENT */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
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
        <section
          id="hero"
          className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-6 sm:p-10 shadow-2xl scroll-mt-24"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3.5 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning" className="text-xs px-3 py-0.5">
                  ⭐ 4.9 RATED SALON
                </Badge>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Accepting Walk-ins
                </span>
                <span className="text-xs text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                  🚀 No-Wait Engine
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                {salon?.name || "Professional Salon & Grooming"}
              </h2>

              <p className="text-base sm:text-lg text-amber-300/90 font-medium">
                {salon?.tagline || "Precision Barbering, Beard Architecture & Luxury Spa Services"}
              </p>

              {/* Personalized Customer Greeting */}
              {user ? (
                <p className="text-xs sm:text-sm text-slate-300">
                  👋 Welcome back, <strong className="text-white">{user.fullName || user.username}</strong>! Skip the wait and reserve your spot in today's live queue.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Join the queue directly from your phone, relax at a nearby cafe, and walk in right as your barber chair opens up!
                </p>
              )}

              {/* Salon Quick Info Chips */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs text-slate-400">
                {salon?.address && (
                  <span className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate max-w-[220px]">{salon.address}</span>
                  </span>
                )}

                {salon?.phone && (
                  <a
                    href={`tel:${salon.phone}`}
                    className="flex items-center gap-1.5 bg-slate-950/70 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{salon.phone}</span>
                  </a>
                )}

                <span className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>{salon?.operatingHours?.split("|")[0] || "8:00 AM – 9:00 PM"}</span>
                </span>
              </div>

              {/* Quick Jump Action Links */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="#services"
                  className="text-xs font-semibold text-slate-300 hover:text-white underline underline-offset-4 decoration-amber-500/50 hover:decoration-amber-400 transition-colors"
                >
                  View Service Menu &amp; Prices ↓
                </a>
                <span className="text-slate-600">•</span>
                <a
                  href="#about"
                  className="text-xs font-semibold text-slate-300 hover:text-white underline underline-offset-4 decoration-slate-600 hover:decoration-slate-400 transition-colors"
                >
                  About Our Studio &amp; Amenities ↓
                </a>
              </div>
            </div>

            {/* Real-time Wait & Action Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-4 md:min-w-[300px]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Live Queue Wait Time
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                    ~{totalWaitMinutes}m
                  </span>
                  <span className="text-xs text-slate-400">
                    ({waitingSequence.length} waiting)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Active Chairs</span>
                  <span className="font-bold text-white">{salon?.stylists?.length || 1} Stylists</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">In Service</span>
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
        </section>

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

        {/* 5. LIVE QUEUE DEPARTURE BOARD (POCKET TV VIEW) */}
        <section id="queue" className="space-y-4 scroll-mt-24">
          <Card className="border-slate-800 bg-slate-900/60 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span>Live Queue Flow &amp; Chair Floor</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
                    {activeTickets.length} Registered Today
                  </Badge>
                  <Link
                    href={`/s/${slug}/tv`}
                    target="_blank"
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
                  >
                    <span>Lobby TV View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Transparent live board updated in real time via WebSockets. No guesswork, no crowded waits.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Currently Serving in Chairs */}
              <div className="space-y-2.5">
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                  <Armchair className="h-4 w-4" />
                  Currently In Service ({chairsServing.length})
                </span>

                {chairsServing.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {chairsServing.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs"
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
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
                    <p>All chairs are currently open and sanitized for the next walk-in client!</p>
                  </div>
                )}
              </div>

              {/* Waiting Line */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-400" />
                  Next in Line ({waitingSequence.length})
                </span>

                {waitingSequence.length > 0 ? (
                  <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-xl border border-slate-800/80 px-4">
                    {waitingSequence.slice(0, 6).map((t, idx) => {
                      const isMe = myTicket?.id === t.id;
                      return (
                        <div
                          key={t.id}
                          className={`py-3 flex items-center justify-between text-xs ${
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
                            <span className="text-[10px] text-slate-500">Queue #{idx + 1}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
                    <p>Zero wait right now! Join now to be served immediately.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 6. SERVICES & PRICING MENU SECTION */}
        <section id="services" className="space-y-5 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Scissors className="h-5 w-5 text-amber-400" />
                <span>Service Menu &amp; Transparent Pricing</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Every service includes consultation, sterile equipment, and precision finishing.
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
                      ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
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
                className="bg-slate-900/60 border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between hover:shadow-lg group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{srv.icon || "✂️"}</span>
                    <Badge variant={srv.isAddOn ? "purple" : "secondary"} className="text-[10px]">
                      {srv.isAddOn ? "Add-On" : `${srv.estimatedDurationMinutes} mins`}
                    </Badge>
                  </div>
                  <CardTitle className="text-base text-white mt-2 font-bold group-hover:text-amber-400 transition-colors">
                    {srv.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Professional salon finish with hot towel clean up and style guidance.
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

        {/* 7. ACTIVE STYLISTS & CHAIR FLOOR */}
        {salon?.stylists && salon.stylists.length > 0 && (
          <section id="team" className="space-y-4 pt-2 scroll-mt-24">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Armchair className="h-5 w-5 text-blue-400" />
                <span>Our Master Stylists &amp; Barbers</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Hand-picked grooming specialists dedicated to craft and cleanliness.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {salon.stylists.map((st, idx) => {
                const isServing = chairsServing.some((t) => t.stylistId === st.id);
                return (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5 hover:border-slate-700 transition-colors"
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

        {/* 8. RICH ABOUT US & CRAFT STORY SECTION */}
        <section id="about" className="space-y-6 pt-4 scroll-mt-24">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Our Story &amp; Craft
                  </Badge>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  About {salon?.name || "Our Salon"}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {salon?.about ||
                    "Welcome to our modern grooming studio! We bring together old-school barber craft and contemporary styling techniques in an elevated, welcoming space. Whether you need a quick professional taper, classic hot-towel shave, or complete hair styling, our dedicated artists deliver precision perfection every single time."}
                </p>
              </div>

              {/* Three Trust Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-3 shrink-0 md:w-64">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <ShieldCheck className="h-4 w-4" />
                    <span>UV Sterilization</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Blades, scissors &amp; combs sterilized before every client.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Zap className="h-4 w-4" />
                    <span>Zero In-Shop Wait</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Queue from your phone; relax until summoned to the chair.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                    <Star className="h-4 w-4" />
                    <span>Master Stylists</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Certified barbers passionate about contemporary grooming.
                  </p>
                </div>
              </div>
            </div>

            {/* Salon Amenities Showcase */}
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block mb-3">
                Studio Amenities &amp; Guest Comforts
              </span>
              <div className="flex flex-wrap gap-2">
                {(salon?.amenities && salon.amenities.length > 0
                  ? salon.amenities
                  : [
                      "Air Conditioned",
                      "High-Speed Wi-Fi",
                      "Complimentary Chai",
                      "100% Sanitized Tools",
                      "UPI & Cards Accepted",
                      "Comfortable Waiting Lounge",
                    ]
                ).map((amenity, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-medium"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{amenity}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 9. RICH CONTACT, LOCATION & OPERATING HOURS SECTION */}
        <section id="contact" className="space-y-6 pt-4 scroll-mt-24">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-400" />
              <span>Contact Us, Hours &amp; Location</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Drop by for a fresh cut or reach out directly with any special requests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Operating Hours Card */}
            <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Operating Hours</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Always welcoming walk-ins during open hours</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-mono">
                  {salon?.operatingHours || "Mon - Sat: 8:00 AM – 9:00 PM\nSunday: 8:00 AM – 2:00 PM"}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-2 border-t border-slate-800/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Open for Appointments &amp; Walk-ins</span>
              </div>
            </Card>

            {/* 2. Address & Google Maps Navigation */}
            <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Salon Location</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Easy parking and central connectivity</p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  {salon?.address || "Main Street Central Studio, Opp City Plaza"}
                </p>
              </div>

              {salon?.googleMapsUrl ? (
                <a
                  href={salon.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition-colors"
                >
                  <Navigation className="h-4 w-4" />
                  <span>Open in Google Maps</span>
                  <ExternalLink className="h-3 w-3 opacity-70" />
                </a>
              ) : (
                <div className="text-[11px] text-slate-500 text-center">
                  Landmark directions available on phone
                </div>
              )}
            </Card>

            {/* 3. Direct Contact & Chat */}
            <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Direct Contact</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Call or WhatsApp our reception desk</p>
                </div>

                <div className="space-y-2 text-xs">
                  {salon?.phone && (
                    <a
                      href={`tel:${salon.phone}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{salon.phone}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Call</span>
                    </a>
                  )}

                  {salon?.whatsappPhone && (
                    <a
                      href={`https://wa.me/${salon.whatsappPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Hi ${salon.name || "Salon"}, I have a question about queue availability!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 hover:border-emerald-500 text-emerald-300 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                        <span>WhatsApp Chat</span>
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {salon?.email && (
                    <a
                      href={`mailto:${salon.email}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white transition-colors truncate"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                        <span className="truncate">{salon.email}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Mail</span>
                    </a>
                  )}

                  {salon?.instagramHandle && (
                    <a
                      href={`https://instagram.com/${salon.instagramHandle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 text-purple-300 hover:text-purple-200 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Instagram className="h-3.5 w-3.5 text-purple-400" />
                        <span>{salon.instagramHandle.startsWith("@") ? salon.instagramHandle : `@${salon.instagramHandle}`}</span>
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {salon?.upiPaymentId && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5 text-amber-400" />
                    <span>UPI: <strong className="text-white">{salon.upiPaymentId}</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(salon.upiPaymentId!, "UPI ID")}
                    className="p-1 hover:text-white text-slate-500 transition-colors"
                    title="Copy UPI ID"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </Card>
          </div>
        </section>

        {/* 10. CHECK-IN MODAL DIALOG */}
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

        {/* 11. MODAL: CONFIRM CANCEL QUEUE SPOT */}
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

      {/* 12. ENHANCED FOOTER WITH NAVIGATION & STOREFRONT LINKS */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-10 px-4 sm:px-8 mt-12 text-xs text-slate-400">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Column 1: Salon Identity */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Scissors className="h-4 w-4" />
                </div>
                <span className="font-extrabold text-white text-sm">{salon?.name || "Salon"}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {salon?.tagline || "Digital storefront & live wait management for modern grooming studios."}
              </p>
              {salon?.phone && (
                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{salon.phone}</span>
                </p>
              )}
            </div>

            {/* Column 2: Navigation Links */}
            <div className="space-y-2.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-white block">
                Quick Navigation
              </span>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#hero" className="hover:text-amber-400 transition-colors">Home Top</a></li>
                <li><a href="#queue" className="hover:text-amber-400 transition-colors">Live Queue Board</a></li>
                <li><a href="#services" className="hover:text-amber-400 transition-colors">Services &amp; Pricing</a></li>
                <li><a href="#team" className="hover:text-amber-400 transition-colors">Stylists &amp; Chairs</a></li>
                <li><a href="#about" className="hover:text-amber-400 transition-colors">About Our Craft</a></li>
                <li><a href="#contact" className="hover:text-amber-400 transition-colors">Hours &amp; Location</a></li>
              </ul>
            </div>

            {/* Column 3: Live Queue Experience */}
            <div className="space-y-2.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-white block">
                Live Displays &amp; Portal
              </span>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link href={`/s/${slug}/tv`} target="_blank" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                    <span>Lobby TV View</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => setIsCheckinOpen(true)}
                    className="hover:text-amber-400 transition-colors text-left"
                  >
                    Check In Online Now
                  </button>
                </li>
                <li>
                  <Link href="/me" className="hover:text-amber-400 transition-colors">
                    Customer History &amp; Profile
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Salon Owner Administration */}
            <div className="space-y-2.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-white block">
                Owner Management
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Manage salon hours, services, announcements, and queue from the owner portal.
              </p>
              <div className="pt-1 flex flex-col gap-1.5">
                <Link
                  href="/owner/storefront"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Customize Storefront</span>
                </Link>
                <Link
                  href="/owner"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Owner Dashboard</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <p>© {new Date().getFullYear()} {salon?.name || "Salon"}. All rights reserved.</p>
            <p className="text-slate-400">
              Powered by Queue Engine Enterprise · Built with Next.js 15 &amp; Bun
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
