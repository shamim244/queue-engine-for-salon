"use client";

import React, { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { Salon, Ticket } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";
import { SalonNavbar } from "@/components/salon/salon-navbar";
import { ConnectionPill } from "@/components/connection-pill";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  calculateQueueLoadMetrics,
  calculatePeopleAhead,
  calculateArrivalWindow,
  QueuePocketTicket,
  QueueWalkinForm,
  QueueLiveFloor,
  QueuePreferenceModal,
  QueueAddServicesModal,
  QueueCancelDialog,
  QueueLoungeAmenities,
} from "@/components/queue";

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

  // Mid-Queue Pause / Resume State
  const [pausingTicket, setPausingTicket] = useState(false);
  const [resumingTicket, setResumingTicket] = useState(false);

  // Mid-Queue Add-On Services State
  const [isAddServicesModalOpen, setIsAddServicesModalOpen] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [isUpdatingServices, setIsUpdatingServices] = useState(false);

  // Client Coupon State for Live Queue Check-in
  const [couponCodeInput, setCouponCodeInput] = useState(searchParams?.get("coupon") || "");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number;
  } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [validatingCoupon, setValidatingCoupon] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);

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

  // Haptic Vibration & Chime Alert State (Rule 1 & Rule 7: Android Mobile-First Haptics)
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [supportsVibration, setSupportsVibration] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Screen Wake Lock API State (Rule 1 & Rule 7: Client Hardware Offloading)
  const [wakeLockEnabled, setWakeLockEnabled] = useState<boolean>(false);
  const [supportsWakeLock, setSupportsWakeLock] = useState<boolean>(false);
  const wakeLockSentinelRef = React.useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("queue_vibrate_enabled");
        if (stored !== null) {
          setVibrationEnabled(stored !== "false");
        }
      } catch {}
      setSupportsVibration(typeof navigator !== "undefined" && "vibrate" in navigator);
      setSupportsWakeLock(typeof navigator !== "undefined" && "wakeLock" in navigator);
      try {
        const storedWake = localStorage.getItem("queue_wake_lock_enabled");
        if (storedWake === "true" && "wakeLock" in navigator) {
          setWakeLockEnabled(true);
        }
      } catch {}
    }
  }, []);

  const requestWakeLock = async () => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        wakeLockSentinelRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockSentinelRef.current.addEventListener("release", () => {
          wakeLockSentinelRef.current = null;
        });
      } catch (err) {
        console.warn("Wake lock request failed:", err);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockSentinelRef.current) {
      try {
        wakeLockSentinelRef.current.release();
      } catch {}
      wakeLockSentinelRef.current = null;
    }
  };

  const handleToggleWakeLock = () => {
    setWakeLockEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("queue_wake_lock_enabled", String(next));
        } catch {}
      }
      if (next) {
        requestWakeLock();
        showToast("💡 Screen will stay awake while you wait", "info");
      } else {
        releaseWakeLock();
        showToast("Screen wake-lock released", "info");
      }
      return next;
    });
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (wakeLockEnabled && document.visibilityState === "visible") {
        requestWakeLock();
      }
    };
    if (wakeLockEnabled) {
      requestWakeLock();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [wakeLockEnabled]);

  const handleToggleVibration = () => {
    setVibrationEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("queue_vibrate_enabled", String(next));
        } catch {}
      }
      if (next && supportsVibration) {
        try {
          navigator.vibrate(80);
        } catch {}
      }
      showToast(next ? "📳 Haptic vibration alert enabled" : "🔕 Vibration alert muted", "info");
      return next;
    });
  };

  // Audio Chime notification (Rule 1: Client Web Audio API Synthesis)
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

  const triggerSummonAlert = () => {
    playChime();
    if (vibrationEnabled && supportsVibration) {
      try {
        navigator.vibrate([300, 150, 300, 150, 500]);
      } catch {}
    }
  };

  const handleCopyTicketLink = () => {
    if (typeof window === "undefined") return;
    try {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      showToast("Ticket link copied to clipboard!", "success");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast("Could not copy link", "error");
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window === "undefined" || !myTicket) return;
    const url = window.location.href;
    const salonName = salon?.name || "Salon";
    const waitInfo = estimatedWaitMin > 0 ? `~${estimatedWaitMin} mins` : "Ready Now!";
    const shareMessage = `💈 Ticket #${myTicket.ticketNumber} at ${salonName}\n👤 Name: ${myTicket.customerName}\n✂️ Service: ${myTicket.serviceName}\n⏱️ Est. Wait: ${waitInfo}\n\nTrack my live queue spot in real time:\n${url}`;

    if (navigator.share) {
      navigator
        .share({
          title: `Ticket #${myTicket.ticketNumber} - ${salonName}`,
          text: shareMessage,
          url: url,
        })
        .catch(() => {
          window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
        });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
    }
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
              triggerSummonAlert();
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
  const { isConnected, status, reconnectAttempts } = useSalonSocket(salon?.id, () => {
    fetchSalonAndQueue();
  });

  const handleApplyCoupon = async (codeToUse?: string) => {
    const targetCode = (codeToUse || couponCodeInput).trim().toUpperCase();
    if (!targetCode) {
      setCouponError("Please enter a coupon code");
      return;
    }
    if (!salon?.id) return;

    // Check phone requirement for coupon verification & fraud prevention
    const cleanDigits = customerPhone.replace(/[^0-9]/g, "");
    if (!cleanDigits || cleanDigits.length < 10) {
      setCouponError("Please enter your 10-digit mobile phone number above to verify coupon eligibility.");
      if (typeof document !== "undefined") {
        const phoneInput = document.querySelector<HTMLInputElement>("input[placeholder*='9876543210'], input[type='tel']");
        if (phoneInput) {
          phoneInput.scrollIntoView({ behavior: "smooth", block: "center" });
          phoneInput.focus();
        }
      }
      return;
    }

    const srv = salon.services?.find((s) => s.id === selectedServiceId) || salon.services?.[0];
    const orderAmt = srv ? srv.basePrice : 150;

    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.coupons.apply({
        code: targetCode,
        targetType: "SALON_SERVICE",
        orderAmount: orderAmt,
        salonId: salon.id,
        userId: customerPhone.trim(),
      });
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponDiscount(res.discountAmount);
        setCouponError(null);
        showToast(`Coupon ${res.coupon.code} applied! ₹${res.discountAmount} saved`, "success");
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponError(res.message || "Invalid coupon code for this salon.");
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponError(err.message || "Failed to validate coupon.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError(null);
    setCouponCodeInput("");
  };

  // Dynamically recalculate coupon discount whenever user changes selected service before check-in
  useEffect(() => {
    if (appliedCoupon && salon?.services) {
      const srv = salon.services.find((s) => s.id === selectedServiceId) || salon.services[0];
      const price = srv?.basePrice || 0;
      if (appliedCoupon.minOrderAmount && price < appliedCoupon.minOrderAmount) {
        setCouponDiscount(0);
        setCouponError(`Min order of ₹${appliedCoupon.minOrderAmount} required for coupon ${appliedCoupon.code}`);
        return;
      }
      setCouponError(null);
      let discount = 0;
      if (appliedCoupon.discountType === "PERCENT") {
        discount = (price * appliedCoupon.discountValue) / 100;
        if (appliedCoupon.maxDiscountAmount) {
          discount = Math.min(discount, appliedCoupon.maxDiscountAmount);
        }
      } else {
        discount = appliedCoupon.discountValue;
      }
      const capped = Math.min(Math.round(discount * 100) / 100, price);
      setCouponDiscount(capped);
    }
  }, [selectedServiceId, salon, appliedCoupon]);

  // Auto-apply coupon from URL if present
  useEffect(() => {
    const paramCoupon = searchParams?.get("coupon");
    if (paramCoupon && salon?.id && !appliedCoupon) {
      setCouponCodeInput(paramCoupon.toUpperCase());
      handleApplyCoupon(paramCoupon.toUpperCase());
    }
  }, [salon?.id, searchParams]);

  // Auto-detect loyalty voucher & customer grooming specs for this salon upon entering 10-digit phone
  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "").slice(-10);
    if (digits.length === 10 && salon?.id && !appliedCoupon) {
      api.loyalty
        .getCard(salon.id, digits)
        .then((res) => {
          if (res?.success && res.activeVouchers && res.activeVouchers.length > 0) {
            const topVoucher = res.activeVouchers[0];
            setCouponCodeInput(topVoucher.voucherCode);
            showToast(
              `🎁 Unlocked Free ${topVoucher.rewardServiceName || "Service"} milestone voucher detected! Click Apply to redeem.`,
              "info"
            );
          }
        })
        .catch(() => {});
    }
  }, [customerPhone, salon?.id, appliedCoupon]);

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !selectedServiceId) {
      showToast("Please enter your name and select a service", "error");
      return;
    }

    if (appliedCoupon) {
      const cleanDigits = customerPhone.replace(/[^0-9]/g, "");
      if (!cleanDigits || cleanDigits.length < 10) {
        showToast("Mobile number is required to claim the coupon discount. Please enter your 10-digit number.", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const resp = await api.queue.checkIn({
        salonSlug: slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        serviceId: selectedServiceId,
        stylistId: selectedStylistId,
        couponCode: appliedCoupon?.code || undefined,
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
    if (myTicket.status === "IN_CHAIR" || myTicket.status === "IN_SERVICE") {
      showToast("Cannot cancel ticket: Service is currently in progress in the chair. Please settle checkout with your barber.", "error");
      setIsCancelConfirmOpen(false);
      return;
    }
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

  const handleConfirmUpdateServices = async () => {
    if (!myTicket) return;
    setIsUpdatingServices(true);
    try {
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

      // Optimistic instant state update
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

  // Queue state breakdown
  const chairsServing = activeTickets.filter(
    (t) => t.status === "IN_CHAIR" || t.status === "IN_SERVICE"
  );
  const waitingSequence = activeTickets.filter(
    (t) => t.status === "WAITING" || t.status === "SUMMONED" || t.status === "CALLED" || t.status === "SOFT_BUMPED"
  );

  // Fair FIFO load metrics and barber wait breakdown
  const queueLoadMetrics = useMemo(() => {
    return calculateQueueLoadMetrics(salon?.stylists, activeTickets);
  }, [salon?.stylists, activeTickets]);

  // Fair FIFO people ahead calculation
  const { peopleAhead, myBarberSpecificAhead } = useMemo(() => {
    return calculatePeopleAhead(myTicket, waitingSequence);
  }, [myTicket, waitingSequence]);

  const estimatedWaitMin = myTicket
    ? typeof myTicket.estimatedWaitMinutes === "number"
      ? myTicket.estimatedWaitMinutes
      : peopleAhead >= 0
      ? Math.max(5, (peopleAhead + 1) * 15)
      : 0
    : 0;

  // Real-Time Local Device Clock for Exact Clock-Time Window (Rule 1: Client-Compute Architecture)
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const estimatedEtaWindow = useMemo(() => {
    return calculateArrivalWindow(currentTimeMs, estimatedWaitMin, myTicket);
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
          <QueuePocketTicket
            myTicket={myTicket}
            salon={salon}
            peopleAhead={peopleAhead}
            myBarberSpecificAhead={myBarberSpecificAhead}
            estimatedWaitMin={estimatedWaitMin}
            estimatedEtaWindow={estimatedEtaWindow}
            onPlayChime={triggerSummonAlert}
            vibrationEnabled={vibrationEnabled}
            onToggleVibration={handleToggleVibration}
            supportsVibration={supportsVibration}
            onShareWhatsApp={handleShareWhatsApp}
            onCopyLink={handleCopyTicketLink}
            isCopied={isCopied}
            wakeLockEnabled={wakeLockEnabled}
            onToggleWakeLock={handleToggleWakeLock}
            supportsWakeLock={supportsWakeLock}
            allowWakeLock={salon?.enableScreenWakeLock !== false}
            onOpenAddServices={() => {
              const currentAddOnIds = (myTicket.selectedAddOns || []).map((a: any) => a.id);
              setSelectedAddOnIds(currentAddOnIds);
              setIsAddServicesModalOpen(true);
            }}
            onPauseTicket={handlePauseMyTicket}
            onResumeTicket={handleResumeMyTicket}
            onOpenChangeBarber={() => {
              setNewPreferenceStylistId(myTicket.stylistId || null);
              setIsSwitchPrefModalOpen(true);
            }}
            onOpenCancel={() => setIsCancelConfirmOpen(true)}
            pausingTicket={pausingTicket}
            resumingTicket={resumingTicket}
          />
        ) : (
          /* 5. LIVE WALK-IN CHECK-IN FORM */
          <QueueWalkinForm
            salon={salon}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            selectedServiceId={selectedServiceId}
            setSelectedServiceId={setSelectedServiceId}
            selectedStylistId={selectedStylistId}
            setSelectedStylistId={setSelectedStylistId}
            queueLoadMetrics={queueLoadMetrics}
            submitting={submitting}
            onSubmit={handleJoinQueue}
            couponCodeInput={couponCodeInput}
            setCouponCodeInput={setCouponCodeInput}
            appliedCoupon={appliedCoupon}
            couponDiscount={couponDiscount}
            validatingCoupon={validatingCoupon}
            couponError={couponError}
            onApplyCoupon={() => handleApplyCoupon()}
            onRemoveCoupon={handleRemoveCoupon}
          />
        )}

        {/* 6. LIVE FLOOR & WAITING LIST */}
        <QueueLiveFloor
          activeTickets={activeTickets}
          chairsServing={chairsServing}
          waitingSequence={waitingSequence}
          myTicket={myTicket}
        />

        {/* 7. LOUNGE COMFORT & WI-FI (Conditionally rendered only if Wi-Fi or amenities exist) */}
        <QueueLoungeAmenities salon={salon} />
      </main>

      {/* 7. MODALS & DIALOGS */}
      <QueuePreferenceModal
        isOpen={isSwitchPrefModalOpen}
        onClose={() => setIsSwitchPrefModalOpen(false)}
        salon={salon}
        newPreferenceStylistId={newPreferenceStylistId}
        setNewPreferenceStylistId={setNewPreferenceStylistId}
        queueLoadMetrics={queueLoadMetrics}
        isSwitchingPref={isSwitchingPref}
        onConfirm={handleConfirmSwitchPreference}
      />

      <QueueAddServicesModal
        isOpen={isAddServicesModalOpen}
        onClose={() => setIsAddServicesModalOpen(false)}
        salon={salon}
        myTicket={myTicket}
        selectedAddOnIds={selectedAddOnIds}
        setSelectedAddOnIds={setSelectedAddOnIds}
        isUpdatingServices={isUpdatingServices}
        onConfirm={handleConfirmUpdateServices}
      />

      <QueueCancelDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        myTicket={myTicket}
        cancelling={cancelling}
        onConfirm={handleConfirmCancelMyTicket}
      />
    </div>
  );
}
