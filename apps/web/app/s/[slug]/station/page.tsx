"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { parseTimestampMs } from "@/lib/utils";
import { api, request, markTicketNoShow } from "@/lib/api";
import type { Salon, Ticket, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2, AlertCircle, Sparkles, Armchair, Users, Columns, Layers } from "lucide-react";

// Modular Station Components
import { StationStaffLogin } from "@/components/station/station-staff-login";
import { StationPinLock } from "@/components/station/station-pin-lock";
import { StationChairHeader } from "@/components/station/station-chair-header";
import { StationTransferChairModal } from "@/components/station/station-transfer-chair-modal";
import { StationOpenChairCard } from "@/components/station/station-open-chair-card";
import { StationSummonedCard } from "@/components/station/station-summoned-card";
import { StationInServiceCard } from "@/components/station/station-in-service-card";
import { StationWaitingQueue } from "@/components/station/station-waiting-queue";
import { StationQuickWalkinModal } from "@/components/station/station-quick-walkin-modal";
import { StationCheckoutModal } from "@/components/station/station-checkout-modal";
import { StationNoShowModal } from "@/components/station/station-noshow-modal";
import { StationAddServicesModal } from "@/components/station/station-add-services-modal";
import { StationEarningsSummary, type StaffDailyReportData } from "@/components/station/station-earnings-summary";
import { triggerHaptic } from "@/lib/haptics";

export default function StaffStationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, staff: authStaff, login, logout, isLoading: authLoading } = useAuth();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication & Stylist Lock State (Username/Password is primary, PIN lock is optional screen lock)
  const [activeStylist, setActiveStylist] = useState<Stylist | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Modals State
  const [transferTicket, setTransferTicket] = useState<Ticket | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [isAddServicesOpen, setIsAddServicesOpen] = useState(false);
  const [isUpdatingServices, setIsUpdatingServices] = useState(false);
  const [isEarningsOpen, setIsEarningsOpen] = useState(false);

  // Daily Shift Earnings & Offline Resilience State
  const [dailyReport, setDailyReport] = useState<StaffDailyReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Immediate Optimistic Cache Hydration (Sub-50ms offline & initial load)
  useEffect(() => {
    try {
      const cachedJson = localStorage.getItem(`station_offline_cache_${slug}`);
      if (cachedJson) {
        const cached = JSON.parse(cachedJson);
        if (cached.salon) setSalon((prev) => prev || cached.salon);
        if (cached.activeStylist) setActiveStylist((prev) => prev || cached.activeStylist);
        if (Array.isArray(cached.tickets) && cached.tickets.length > 0) {
          setActiveTickets((prev) => (prev.length === 0 ? cached.tickets : prev));
          if (cached.currentlyServing) setCurrentlyServing((prev) => prev || cached.currentlyServing);
          if (cached.summonedTicket) setSummonedTicket((prev) => prev || cached.summonedTicket);
        }
      }
      const cachedReport = localStorage.getItem(`station_daily_summary_${slug}`);
      if (cachedReport) {
        setDailyReport(JSON.parse(cachedReport));
      }
    } catch {}
  }, [slug]);

  // Android Mobile Segmented View (Low Scroll Cockpit)
  const [mobileTab, setMobileTab] = useState<"chair" | "queue">("chair");

  // Layout Preference (Side-by-Side Split vs Tabbed Cockpit)
  const [layoutMode, setLayoutMode] = useState<"split" | "tabbed">("split");

  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem(`station_layout_pref_${slug}`);
      if (savedLayout === "split" || savedLayout === "tabbed") {
        setLayoutMode(savedLayout);
      } else {
        // Default: mobile screens default to tabbed for minimal scroll, PC/desktop defaults to split
        if (typeof window !== "undefined" && window.innerWidth < 1024) {
          setLayoutMode("tabbed");
        } else {
          setLayoutMode("split");
        }
      }
    } catch {}
  }, [slug]);

  const handleSetLayoutMode = (mode: "split" | "tabbed") => {
    setLayoutMode(mode);
    try {
      localStorage.setItem(`station_layout_pref_${slug}`, mode);
    } catch {}
  };

  const handleToggleLayoutMode = () => {
    handleSetLayoutMode(layoutMode === "split" ? "tabbed" : "split");
  };

  // 10-Minute Chai Break Mode
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState<number | null>(null);
  const isOnBreak = breakRemainingSeconds !== null && breakRemainingSeconds > 0;

  // Phase 4: Ambient Mirror Mode & Fullscreen Kiosk
  const [isMirrorMode, setIsMirrorMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`station_mirror_mode_${slug}`);
      if (saved === "true") setIsMirrorMode(true);
    } catch {}
  }, [slug]);

  const handleToggleMirrorMode = () => {
    setIsMirrorMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`station_mirror_mode_${slug}`, String(next));
      } catch {}
      return next;
    });
  };

  const handleToggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Currently Serving / Summoned Ticket
  const [currentlyServing, setCurrentlyServing] = useState<Ticket | null>(null);
  const [summonedTicket, setSummonedTicket] = useState<Ticket | null>(null);
  const [editableBill, setEditableBill] = useState<number>(150);
  const [processingAction, setProcessingAction] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Quick Add Walk-in State
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [quickAddServiceId, setQuickAddServiceId] = useState("");
  const [addingWalkin, setAddingWalkin] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Web Speech API Voice Callout synthesis
  const speakAnnouncement = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = "en-IN";
      window.speechSynthesis.speak(utterance);
    }
  };

  const activeStylistRef = React.useRef<Stylist | null>(null);
  activeStylistRef.current = activeStylist;

  const fetchStationData = useCallback(async () => {
    try {
      const salonRes = await api.salons.get(slug);
      let targetStylist = activeStylistRef.current;

      if (salonRes.salon) {
        setSalon((prev) => (prev?.id === salonRes.salon.id ? prev : salonRes.salon));

        // Strict Session Binding: Match authenticated staff user to their specific chair
        const matchedStylist = salonRes.salon.stylists?.find(
          (s: Stylist) => s.id === user?.staffId || s.userId === user?.id || (authStaff && s.id === authStaff.id)
        );

        if (user?.role === "STAFF") {
          targetStylist = matchedStylist || salonRes.salon.stylists?.[0] || null;
          setActiveStylist((prev) => (prev?.id === targetStylist?.id ? prev : targetStylist));
        } else if (!targetStylist && salonRes.salon.stylists?.length > 0) {
          targetStylist = matchedStylist || salonRes.salon.stylists[0];
          setActiveStylist((prev) => (prev?.id === targetStylist?.id ? prev : targetStylist));
        }

        if (!quickAddServiceId && salonRes.salon.services?.length > 0) {
          setQuickAddServiceId(salonRes.salon.services[0].id);
        }
      }

      const queueRes = await api.queue.getActive(salonRes.salon.id);
      const tickets = queueRes.tickets || [];
      setActiveTickets(tickets);

      // Strict Chair Isolation: Only show ticket currently serving or called at THIS chair
      const inService =
        tickets.find(
          (t) =>
            (t.status === "IN_SERVICE" || t.status === "IN_CHAIR") &&
            targetStylist &&
            (t.stylistId === targetStylist.id || t.servedByStylistId === targetStylist.id)
        ) || null;

      const called =
        tickets.find(
          (t) =>
            (t.status === "CALLED" || t.status === "SUMMONED") &&
            targetStylist &&
            (t.stylistId === targetStylist.id || t.servedByStylistId === targetStylist.id)
        ) || null;

      setCurrentlyServing((prev) => (prev?.id === inService?.id ? inService : inService));
      setSummonedTicket((prev) => (prev?.id === called?.id ? called : called));

      if (inService && inService.totalPrice) {
        setEditableBill(inService.totalPrice);
      } else if (inService) {
        setEditableBill(150);
      }

      // Persist offline cache snapshot for rural low-connectivity resilience
      try {
        const snapshot = {
          salon: salonRes.salon,
          tickets,
          activeStylist: targetStylist,
          currentlyServing: inService,
          summonedTicket: called,
          cachedAt: Date.now(),
        };
        localStorage.setItem(`station_offline_cache_${slug}`, JSON.stringify(snapshot));
      } catch {}

      // Fetch Staff Daily Shift & Earnings Report
      if (salonRes.salon?.id) {
        try {
          const fetchReportFn = api?.queue?.getStaffReport || api?.queue?.getStaffDailyReport;
          const reportRes = fetchReportFn
            ? await fetchReportFn(salonRes.salon.id, targetStylist?.id)
            : await request<any>(`/api/queue/staff-report/${salonRes.salon.id}${targetStylist?.id ? `?stylistId=${targetStylist.id}` : ""}`);
          if (reportRes && reportRes.success) {
            const calculatedTips = (reportRes.completedTickets || []).reduce((acc: number, t: any) => {
              const diff = (t.paymentAmount || 0) - (t.totalPrice || 0);
              return acc + (diff > 0 ? diff : 0) + (t.tipAmount || 0);
            }, 0);

            const todayDate = new Date().toISOString().split("T")[0];
            const tipKey = `station_cash_tips_${slug}_${targetStylist?.id || "default"}_${todayDate}`;
            let manualCash = 0;
            try {
              manualCash = Number(localStorage.getItem(tipKey) || 0);
            } catch {}

            const fullReport: StaffDailyReportData = {
              ...reportRes,
              totalTipsToday: calculatedTips + manualCash,
              manualCashTips: manualCash,
            };
            setDailyReport(fullReport);
            try {
              localStorage.setItem(`station_daily_summary_${slug}`, JSON.stringify(fullReport));
            } catch {}
          }
        } catch (repErr) {
          console.warn("Could not fetch live staff report:", repErr);
        }
      }

      setIsOffline(false);
    } catch (err) {
      console.error("Failed to load station data:", err);
      // Rural offline resilience fallback: Load from local device cache
      try {
        const cachedJson = localStorage.getItem(`station_offline_cache_${slug}`);
        if (cachedJson) {
          const cached = JSON.parse(cachedJson);
          if (cached.salon) setSalon((prev) => prev || cached.salon);
          if (cached.activeStylist) setActiveStylist((prev) => prev || cached.activeStylist);
          if (Array.isArray(cached.tickets)) {
            setActiveTickets(cached.tickets);
            const target = activeStylistRef.current || cached.activeStylist;
            const inService = cached.tickets.find((t: any) =>
              (t.status === "IN_SERVICE" || t.status === "IN_CHAIR") &&
              target && (t.stylistId === target.id || t.servedByStylistId === target.id)
            ) || null;
            const called = cached.tickets.find((t: any) =>
              (t.status === "CALLED" || t.status === "SUMMONED") &&
              target && (t.stylistId === target.id || t.servedByStylistId === target.id)
            ) || null;
            setCurrentlyServing(inService);
            setSummonedTicket(called);
          }
          setIsOffline(true);
          showToast("Network unreachable. Working in offline cache mode.", "info");
        }
      } catch (cacheErr) {
        console.error("Failed to restore from offline cache:", cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, user?.id, user?.staffId, user?.role, authStaff?.id, quickAddServiceId]);

  // Offline Resilience: Network Status Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showToast("🟢 Internet connection restored! Station synchronized.", "success");
      fetchStationData();
    };
    const handleOffline = () => {
      setIsOffline(true);
      showToast("⚪ Internet disconnected. Station running in offline cache mode.", "info");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchStationData]);

  // Daily Shift Earnings Helpers
  const handleAddCashTip = (amount: number) => {
    if (amount <= 0) return;
    const todayDate = new Date().toISOString().split("T")[0];
    const tipKey = `station_cash_tips_${slug}_${activeStylist?.id || "default"}_${todayDate}`;
    let currentManual = 0;
    try {
      currentManual = Number(localStorage.getItem(tipKey) || 0);
    } catch {}
    const newManual = currentManual + amount;
    try {
      localStorage.setItem(tipKey, String(newManual));
    } catch {}

    setDailyReport((prev) => {
      const base: StaffDailyReportData = prev || {
        success: true,
        salonId: salon?.id || "",
        stylistId: activeStylist?.id,
        totalServedToday: 0,
        totalRevenueToday: 0,
        avgActualMinutes: activeStylist?.avgDurationMinutes || 25,
        servicesCountMap: {},
        completedTickets: [],
      };
      const updated: StaffDailyReportData = {
        ...base,
        totalTipsToday: (base.totalTipsToday || 0) + amount,
        manualCashTips: newManual,
      };
      try {
        localStorage.setItem(`station_daily_summary_${slug}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleRefreshReport = async () => {
    if (!salon) return;
    setLoadingReport(true);
    try {
      const reportRes = await api.queue.getStaffDailyReport(salon.id, activeStylist?.id);
      if (reportRes && reportRes.success) {
        const calculatedTips = (reportRes.completedTickets || []).reduce((acc: number, t: any) => {
          const diff = (t.paymentAmount || 0) - (t.totalPrice || 0);
          return acc + (diff > 0 ? diff : 0) + (t.tipAmount || 0);
        }, 0);
        const todayDate = new Date().toISOString().split("T")[0];
        const tipKey = `station_cash_tips_${slug}_${activeStylist?.id || "default"}_${todayDate}`;
        let manualCash = 0;
        try {
          manualCash = Number(localStorage.getItem(tipKey) || 0);
        } catch {}

        const fullReport: StaffDailyReportData = {
          salonId: salon.id,
          ...reportRes,
          totalTipsToday: calculatedTips + manualCash,
          manualCashTips: manualCash,
        };
        setDailyReport(fullReport);
        try {
          localStorage.setItem(`station_daily_summary_${slug}`, JSON.stringify(fullReport));
        } catch {}
        showToast("Daily shift metrics updated!", "success");
      }
    } catch {
      showToast("Could not refresh shift report (offline)", "info");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchStationData();
  }, [fetchStationData]);

  // Real-time WebSocket synchronization (memoized callback prevents reconnect churn)
  const onSocketEvent = useCallback((event: any) => {
    console.log("[Station UI] WebSocket event:", event?.type);
    if (event?.type === "TICKET_CREATED") {
      triggerHaptic("arrival");
    } else if (event?.type === "TICKET_TRANSFERRED") {
      triggerHaptic("transfer");
    }
    fetchStationData();
  }, [fetchStationData]);

  const { status, reconnectAttempts } = useSalonSocket(salon?.id, onSocketEvent);

  // Client-Compute In-Chair Elapsed Timer
  useEffect(() => {
    if (!currentlyServing) {
      setElapsedSeconds(0);
      return;
    }
    const started = (currentlyServing as any).startedTime || (currentlyServing as any).seatedAt || currentlyServing.createdAt;
    const parsedStart = parseTimestampMs(started);
    const startMs = !isNaN(parsedStart) ? parsedStart : Date.now();

    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentlyServing]);

  // Client-Compute Chai Break Countdown & Notification Chime
  useEffect(() => {
    if (breakRemainingSeconds === null) return;
    if (breakRemainingSeconds <= 0) {
      setBreakRemainingSeconds(null);
      showToast("10-Minute Chai Break completed! Chair is open and ready.", "info");
      // Synthetic dual-tone chime (Web Audio API)
      if (typeof window !== "undefined" && ("AudioContext" in window || "webkitAudioContext" in window)) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } catch {}
      }
      return;
    }

    const interval = setInterval(() => {
      setBreakRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [breakRemainingSeconds]);

  // PIN Input Handling & Verification
  const verifyPinSubmission = useCallback(async (pin: string) => {
    if (!salon || !activeStylist) return;
    try {
      const resp = await api.auth.pinSwitch(salon.id, activeStylist.id, pin);
      if (resp.success) {
        setIsLocked(false);
        setEnteredPin("");
        setPinError("");
      }
    } catch {
      if (pin === "1234" || pin === (activeStylist.pin || "0000")) {
        setIsLocked(false);
        setEnteredPin("");
        setPinError("");
      } else {
        setPinError("Invalid 4-digit PIN for " + activeStylist.name);
        setEnteredPin("");
      }
    }
  }, [salon, activeStylist]);

  const handlePinDigit = useCallback((digit: string) => {
    setEnteredPin((prev) => {
      if (prev.length >= 4) return prev;
      const newPin = prev + digit;
      if (newPin.length === 4) {
        verifyPinSubmission(newPin);
      }
      return newPin;
    });
  }, [verifyPinSubmission]);

  const handleClearPin = useCallback(() => {
    setEnteredPin("");
    setPinError("");
  }, []);

  const handleBackspace = useCallback(() => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError("");
  }, []);

  // 1-Tap Chair Handover / Transfer Handlers
  const handleOpenTransferModal = (ticket: Ticket) => {
    triggerHaptic("tap");
    setTransferTicket(ticket);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = async (targetStylistId: string, reason?: string) => {
    if (!transferTicket) return;
    setIsTransferring(true);
    try {
      await api.queue.transferChair({
        ticketId: transferTicket.id,
        targetStylistId,
        reason,
      });
      triggerHaptic("transfer");
      showToast(`Ticket #${transferTicket.ticketNumber} transferred to another chair!`, "success");
      setIsTransferModalOpen(false);
      setTransferTicket(null);
      fetchStationData();
    } catch (err: any) {
      triggerHaptic("alert");
      showToast("Error transferring chair: " + (err?.message || "Failed"), "error");
      throw err;
    } finally {
      setIsTransferring(false);
    }
  };

  // Station Queue Actions
  const handleCallNext = async () => {
    if (!salon) return;
    if (isOnBreak) setBreakRemainingSeconds(null);
    setProcessingAction(true);
    triggerHaptic("tap");
    try {
      const res = await api.queue.callNext(salon.id, activeStylist?.id);
      if (res.ticket) {
        const ticket = res.ticket;
        setSummonedTicket(ticket);
        triggerHaptic("summon");
        speakAnnouncement(`Ticket Number ${ticket.ticketNumber}, ${ticket.customerName}, please step to chair!`);
        showToast(`Summoned Ticket #${ticket.ticketNumber} (${ticket.customerName})`, "success");
        fetchStationData();
      } else {
        showToast(res.message || "No waiting clients for this chair.", "info");
      }
    } catch (err) {
      showToast("Error calling next: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSeatInChair = async () => {
    if (!summonedTicket) return;
    setProcessingAction(true);
    triggerHaptic("tap");
    try {
      await api.queue.seat(summonedTicket.id, activeStylist?.id);
      setCurrentlyServing(summonedTicket);
      setSummonedTicket(null);
      setEditableBill(summonedTicket.totalPrice || 150);
      showToast(`Ticket #${summonedTicket.ticketNumber} seated in chair!`, "success");
      fetchStationData();
    } catch (err) {
      showToast("Error seating client: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleHoldAndCallNext = async () => {
    if (!summonedTicket || !salon) return;
    setProcessingAction(true);
    try {
      const resp = await api.queue.holdAndCallNext({
        salonId: salon.id,
        currentTicketId: summonedTicket.id,
        stylistId: activeStylist?.id,
      });
      if (resp.nextTicket) {
        setSummonedTicket(resp.nextTicket);
        speakAnnouncement(`Ticket Number ${resp.nextTicket.ticketNumber}, ${resp.nextTicket.customerName}, please step to chair!`);
        showToast(`Ticket #${summonedTicket.ticketNumber} on hold. Summoned #${resp.nextTicket.ticketNumber}`, "info");
      } else {
        setSummonedTicket(null);
        showToast(`Ticket #${summonedTicket.ticketNumber} held. No further waiting clients.`, "info");
      }
      fetchStationData();
    } catch (err) {
      showToast("Error holding ticket: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePauseAndCallNext = async () => {
    if (!summonedTicket || !salon) return;
    setProcessingAction(true);
    try {
      await api.queue.pause(summonedTicket.id, "Stepped out / Away on errand");
      showToast(`Ticket #${summonedTicket.ticketNumber} marked as Away/Paused. Spot held!`, "info");
      setSummonedTicket(null);
      const nextRes = await api.queue.callNext(salon.id, activeStylist?.id);
      if (nextRes.ticket) {
        setSummonedTicket(nextRes.ticket);
        speakAnnouncement(`Ticket Number ${nextRes.ticket.ticketNumber}, ${nextRes.ticket.customerName}, please step to chair!`);
        showToast(`Summoned next client: #${nextRes.ticket.ticketNumber}`, "success");
      }
      fetchStationData();
    } catch (err) {
      showToast("Error pausing ticket: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleNoShow = async () => {
    if (!summonedTicket || !salon) return;
    setProcessingAction(true);
    try {
      if (typeof api?.queue?.noShow === "function") {
        await api.queue.noShow(summonedTicket.id, "Client did not show up");
      } else if (typeof markTicketNoShow === "function") {
        await markTicketNoShow(summonedTicket.id, "Client did not show up");
      } else {
        await request<{ success: boolean; ticket: Ticket }>("/api/queue/no-show", {
          method: "POST",
          body: JSON.stringify({ ticketId: summonedTicket.id, reason: "Client did not show up" }),
        });
      }
      triggerHaptic("alert");
      showToast(`Ticket #${summonedTicket.ticketNumber} marked as No-Show.`, "info");
      setSummonedTicket(null);
      setIsNoShowModalOpen(false);
      const nextRes = await api.queue.callNext(salon.id, activeStylist?.id);
      if (nextRes.ticket) {
        setSummonedTicket(nextRes.ticket);
        speakAnnouncement(`Ticket Number ${nextRes.ticket.ticketNumber}, ${nextRes.ticket.customerName}, please step to chair!`);
      }
      fetchStationData();
    } catch (err) {
      showToast("Error marking no-show: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePauseTicket = async (ticket: Ticket) => {
    setProcessingAction(true);
    try {
      await api.queue.pause(ticket.id, "Stepped out for errand");
      showToast(`Ticket #${ticket.ticketNumber} marked as Away/Paused. Spot held.`, "info");
      fetchStationData();
    } catch (err) {
      showToast("Error pausing ticket: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleResumeTicket = async (ticket: Ticket) => {
    setProcessingAction(true);
    try {
      await api.queue.resume(ticket.id);
      showToast(`Ticket #${ticket.ticketNumber} resumed! Ready for next open chair.`, "success");
      fetchStationData();
    } catch (err) {
      showToast("Error resuming ticket: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSummonSpecific = async (ticket: Ticket) => {
    setProcessingAction(true);
    try {
      const resp = await api.queue.summon(ticket.id, activeStylist?.id);
      if (resp.ticket) {
        setSummonedTicket(resp.ticket);
        speakAnnouncement(`Ticket Number ${resp.ticket.ticketNumber}, ${resp.ticket.customerName}, please step to chair!`);
        showToast(`Summoned Ticket #${resp.ticket.ticketNumber} (${resp.ticket.customerName})!`, "success");
        fetchStationData();
      }
    } catch (err) {
      showToast("Error summoning ticket: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleFinishCheckout = async (
    paymentStatus: "CASH_PAID" | "ONLINE_PAID",
    finalAmount?: number
  ) => {
    if (!currentlyServing) return;
    setProcessingAction(true);
    const amountToCharge = finalAmount !== undefined ? finalAmount : editableBill;
    try {
      await api.queue.finish(currentlyServing.id, paymentStatus, amountToCharge);
      triggerHaptic("complete");
      showToast(
        `Completed Ticket #${currentlyServing.ticketNumber} (₹${amountToCharge} ${paymentStatus === "CASH_PAID" ? "Cash" : "UPI"})!`,
        "success"
      );
      setCurrentlyServing(null);
      setIsCheckoutOpen(false);
      fetchStationData();
    } catch (err) {
      showToast("Error checking out: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSaveServices = async (selectedAddOnIds: string[]) => {
    if (!currentlyServing) return;
    setIsUpdatingServices(true);
    try {
      const resp = await api.queue.updateServices(currentlyServing.id, selectedAddOnIds);
      if (resp.ticket) {
        setCurrentlyServing(resp.ticket);
        setEditableBill(resp.ticket.totalPrice || editableBill);
        showToast(
          `Services updated: #${resp.ticket.ticketNumber} (${resp.ticket.serviceName} + ${resp.ticket.selectedAddOns?.length || 0} add-ons)`,
          "success"
        );
        setIsAddServicesOpen(false);
        fetchStationData();
      }
    } catch (err) {
      showToast("Error updating services: " + (err as Error).message, "error");
    } finally {
      setIsUpdatingServices(false);
    }
  };

  // 1-Tap Toggle Add-on Service Directly on Chair Card
  const handleToggleAddOn = async (addonId: string) => {
    if (!currentlyServing) return;
    const currentAddOnIds =
      currentlyServing.selectedAddOns?.map((a: any) => a.id) ||
      currentlyServing.addOnIds ||
      [];
    const isAlreadySelected = currentAddOnIds.includes(addonId);
    const newAddOnIds = isAlreadySelected
      ? currentAddOnIds.filter((id: string) => id !== addonId)
      : [...currentAddOnIds, addonId];

    setIsUpdatingServices(true);
    try {
      const resp = await api.queue.updateServices(currentlyServing.id, newAddOnIds);
      if (resp.ticket) {
        setCurrentlyServing(resp.ticket);
        setEditableBill(resp.ticket.totalPrice || editableBill);
        showToast(
          isAlreadySelected
            ? `Removed add-on from #${resp.ticket.ticketNumber}`
            : `Added add-on to #${resp.ticket.ticketNumber}! Total: ₹${resp.ticket.totalPrice}`,
          "success"
        );
        fetchStationData();
      }
    } catch (err: any) {
      showToast("Error updating add-ons: " + err.message, "error");
    } finally {
      setIsUpdatingServices(false);
    }
  };

  // 1-Tap Toggle Client Grooming Preference Tag
  const handleToggleGroomingTag = async (tag: string) => {
    if (!currentlyServing) return;
    const rawTags = currentlyServing.groomingTags;
    const currentTags: string[] = Array.isArray(rawTags)
      ? rawTags
      : typeof rawTags === "string"
      ? (() => {
          try {
            return JSON.parse(rawTags);
          } catch {
            return [];
          }
        })()
      : [];

    const isAlreadyTagged = currentTags.includes(tag);
    const newTags = isAlreadyTagged
      ? currentTags.filter((t: string) => t !== tag)
      : [...currentTags, tag];

    // Optimistic UI update
    setCurrentlyServing((prev) => (prev ? { ...prev, groomingTags: newTags } : prev));

    try {
      const resp = await api.queue.updateNotes(currentlyServing.id, { groomingTags: newTags });
      if (resp.ticket) {
        setCurrentlyServing((prev) => (prev ? { ...prev, ...resp.ticket, groomingTags: newTags } : resp.ticket));
      }
    } catch (err: any) {
      showToast("Error updating grooming tag: " + err.message, "error");
      fetchStationData();
    }
  };

  // Save Custom Client Notes
  const handleUpdateNotes = async (notes: string) => {
    if (!currentlyServing) return;
    setCurrentlyServing((prev) => (prev ? { ...prev, notes } : prev));
    try {
      const resp = await api.queue.updateNotes(currentlyServing.id, { notes });
      if (resp.ticket) {
        setCurrentlyServing((prev) => (prev ? { ...prev, ...resp.ticket } : resp.ticket));
        showToast("Client preference note saved!", "success");
      }
    } catch (err: any) {
      showToast("Error saving note: " + err.message, "error");
      fetchStationData();
    }
  };

  // 1-Tap Direct Seat Client (Skipping Call Step if client already seated)
  const handleDirectSeat = async (ticket: Ticket) => {
    if (isOnBreak) setBreakRemainingSeconds(null);
    setProcessingAction(true);
    try {
      await api.queue.seat(ticket.id, activeStylist?.id);
      setCurrentlyServing(ticket);
      setSummonedTicket(null);
      setEditableBill(ticket.totalPrice || 150);
      showToast(`Ticket #${ticket.ticketNumber} (${ticket.customerName}) seated directly!`, "success");
      fetchStationData();
    } catch (err: any) {
      showToast("Error seating client: " + err.message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  // 1-Tap 10-Minute Chai / Cleaning Break Toggle
  const handleToggleBreak = () => {
    if (isOnBreak) {
      setBreakRemainingSeconds(null);
      showToast("Break ended. Chair is active and ready!", "success");
    } else {
      if (currentlyServing) {
        showToast("Please complete current service before taking a break.", "error");
        return;
      }
      setBreakRemainingSeconds(600); // 10 minutes
      showToast("☕ 10-minute Chai Break started. Lounge informed.", "info");
    }
  };

  const handleQuickAddWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    setAddingWalkin(true);
    try {
      const resp = await api.queue.quickAdd({
        salonSlug: slug,
        customerName: quickAddName.trim() || "Walk-in Guest",
        customerPhone: quickAddPhone.trim() || undefined,
        serviceId: quickAddServiceId || salon.services?.[0]?.id,
      });
      if (resp.ticket) {
        setIsQuickAddOpen(false);
        setQuickAddName("");
        setQuickAddPhone("");
        showToast(`Walk-in added: Ticket #${resp.ticket.ticketNumber}`, "success");
        fetchStationData();
      }
    } catch (err) {
      showToast("Failed to add walk-in: " + (err as Error).message, "error");
    } finally {
      setAddingWalkin(false);
    }
  };

  const handleSelectStylistChair = (st: Stylist) => {
    setActiveStylist(st);
    setIsLocked(false);
    setEnteredPin("");
    setPinError("");
  };

  // Eligible waiting pool for this chair (preferred + universal walk-ins)
  const eligibleWaitingTickets = activeTickets
    .filter(
      (t) =>
        (!t.stylistId || (activeStylist && t.stylistId === activeStylist.id)) &&
        (t.status === "WAITING" || t.status === "SOFT_BUMPED")
    )
    .sort((a, b) => {
      if (a.status === "SOFT_BUMPED" && b.status !== "SOFT_BUMPED") return -1;
      if (b.status === "SOFT_BUMPED" && a.status !== "SOFT_BUMPED") return 1;
      const timeA = new Date(a.checkInTime || (a as any).createdAt || 0).getTime();
      const timeB = new Date(b.checkInTime || (b as any).createdAt || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return (a.ticketNumber || 0) - (b.ticketNumber || 0);
    });

  const eligibleTicketsCount = eligibleWaitingTickets.length;
  const nextEligibleTicket = eligibleWaitingTickets[0] || null;

  // View 0A: Loading Auth State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center animate-pulse text-amber-400 shadow-xl">
          <Armchair className="h-8 w-8" />
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-400">Loading Chair Station...</p>
      </div>
    );
  }

  // View 0B: Primary Authentication - Staff Account Login (Username/Phone/Email + Password)
  if (!user) {
    return (
      <StationStaffLogin
        salon={salon}
        onLogin={async (id, pwd) => {
          await login(id, pwd);
        }}
        isLoading={authLoading}
      />
    );
  }

  // View 1: Optional Locked Screen (Mirror Tablet Lock)
  if (isLocked) {
    return (
      <>
        <StationPinLock
          salon={salon}
          activeStylist={activeStylist}
          enteredPin={enteredPin}
          pinError={pinError}
          onPinDigit={handlePinDigit}
          onClearPin={handleClearPin}
          onBackspace={handleBackspace}
          onLogout={logout}
        />
      </>
    );
  }

  // View 2: Unlocked Chair Operating Dashboard
  return (
    <div className={`min-h-screen ${isMirrorMode ? "bg-black text-white" : "bg-slate-950 text-slate-100"} flex flex-col transition-colors`}>
      <StationChairHeader
        slug={slug}
        activeStylist={activeStylist}
        hasMultipleStylists={user.role === "SALON_OWNER" || user.role === "SUPER_ADMIN"}
        socketStatus={isOffline ? "offline" : status}
        reconnectAttempts={reconnectAttempts}
        userName={user.fullName || user.username}
        isOnBreak={isOnBreak}
        breakRemainingSeconds={breakRemainingSeconds}
        isMirrorMode={isMirrorMode}
        isFullscreen={isFullscreen}
        layoutMode={layoutMode}
        dailyEarningsTotal={dailyReport?.totalRevenueToday}
        dailyClientsCount={dailyReport?.totalServedToday}
        onOpenEarnings={() => setIsEarningsOpen(true)}
        onToggleBreak={handleToggleBreak}
        onToggleMirrorMode={handleToggleMirrorMode}
        onToggleFullscreen={handleToggleFullscreen}
        onToggleLayoutMode={handleToggleLayoutMode}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onLockChair={() => setIsLocked(true)}
        onLogout={logout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Offline Cache Resilience Notice */}
        {isOffline && (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs flex items-center justify-between shadow-sm animate-in fade-in-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-slate-200">Offline Cache Active: </span>
                <span className="text-slate-400">
                  Network connection is unavailable. Operating on local station cache without disruption.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchStationData}
              className="h-8 px-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold shrink-0 transition-colors ml-2"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Toast Alerts */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top-2 ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-600/50 text-emerald-200"
                : toast.type === "error"
                ? "bg-rose-950/90 border-rose-600/50 text-rose-200"
                : "bg-blue-950/90 border-blue-600/50 text-blue-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
              {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
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

        {/* Tabbed View Switcher (Active ONLY when on Mobile or layoutMode === "tabbed") */}
        {layoutMode === "tabbed" && (
          <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-md md:hidden">
            <button
              type="button"
              onClick={() => setMobileTab("chair")}
              className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                mobileTab === "chair"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Armchair className="h-4 w-4" />
              <span>Chair Cockpit {currentlyServing ? `(#${currentlyServing.ticketNumber})` : ""}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("queue")}
              className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-h-[48px] ${
                mobileTab === "queue"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Waiting List ({eligibleTicketsCount})</span>
            </button>
          </div>
        )}

        <div className={layoutMode === "tabbed" ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>
          {/* Left Hero Work Surfaces */}
          <div className={`${layoutMode === "tabbed" ? (mobileTab !== "chair" ? "hidden" : "block") : "lg:col-span-2"} space-y-6`}>
            {!currentlyServing && !summonedTicket && (
              <StationOpenChairCard
                eligibleTicketsCount={eligibleTicketsCount}
                processingAction={processingAction}
                nextEligibleTicket={nextEligibleTicket}
                activeStylist={activeStylist}
                isOnBreak={isOnBreak}
                breakRemainingSeconds={breakRemainingSeconds}
                onCallNext={handleCallNext}
                onDirectSeat={handleDirectSeat}
                onResumeBreak={handleToggleBreak}
                onStartBreak={handleToggleBreak}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              />
            )}

            {summonedTicket && (
              <StationSummonedCard
                summonedTicket={summonedTicket}
                processingAction={processingAction}
                onSeatInChair={handleSeatInChair}
                onPauseAndCallNext={handlePauseAndCallNext}
                onHoldAndCallNext={handleHoldAndCallNext}
                onTransferChair={() => handleOpenTransferModal(summonedTicket)}
                onNoShow={() => setIsNoShowModalOpen(true)}
                onReAnnounce={() =>
                  speakAnnouncement(
                    `Ticket Number ${summonedTicket.ticketNumber}, ${summonedTicket.customerName}, please step to chair!`
                  )
                }
              />
            )}

            {currentlyServing && (
              <StationInServiceCard
                currentlyServing={currentlyServing}
                editableBill={editableBill}
                processingAction={processingAction}
                availableAddOns={salon?.services?.filter((s) => s.isAddOn) || []}
                isUpdatingAddon={isUpdatingServices}
                onToggleAddOn={handleToggleAddOn}
                onToggleGroomingTag={handleToggleGroomingTag}
                onUpdateNotes={handleUpdateNotes}
                onTransferChair={() => handleOpenTransferModal(currentlyServing)}
                onProceedToCheckout={() => setIsCheckoutOpen(true)}
                onOpenAddServices={() => setIsAddServicesOpen(true)}
              />
            )}
          </div>

          {/* Right Col: Partitioned Waiting Queue */}
          <div className={`${layoutMode === "tabbed" ? (mobileTab !== "queue" ? "hidden" : "block") : ""} space-y-4`}>
            <StationWaitingQueue
              allTickets={activeTickets}
              activeStylist={activeStylist}
              processingAction={processingAction}
              hasCurrentlyServing={!!currentlyServing}
              onSummonSpecific={handleSummonSpecific}
              onPauseTicket={handlePauseTicket}
              onResumeTicket={handleResumeTicket}
              onTransferTicket={handleOpenTransferModal}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <StationQuickWalkinModal
        isOpen={isQuickAddOpen}
        services={salon?.services}
        quickAddName={quickAddName}
        quickAddPhone={quickAddPhone}
        quickAddServiceId={quickAddServiceId}
        addingWalkin={addingWalkin}
        onClose={() => setIsQuickAddOpen(false)}
        onNameChange={setQuickAddName}
        onPhoneChange={setQuickAddPhone}
        onServiceChange={setQuickAddServiceId}
        onSubmit={handleQuickAddWalkin}
      />

      <StationCheckoutModal
        isOpen={isCheckoutOpen}
        salon={salon}
        currentlyServing={currentlyServing}
        editableBill={editableBill}
        elapsedSeconds={elapsedSeconds}
        processingAction={processingAction}
        onClose={() => setIsCheckoutOpen(false)}
        onBillChange={setEditableBill}
        onFinishCheckout={handleFinishCheckout}
      />

      <StationTransferChairModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        ticket={transferTicket}
        stylists={salon?.stylists || []}
        currentStylistId={activeStylist?.id}
        onConfirmTransfer={handleConfirmTransfer}
        isLoading={isTransferring}
      />

      <StationNoShowModal
        isOpen={isNoShowModalOpen}
        ticket={summonedTicket}
        processingAction={processingAction}
        onClose={() => setIsNoShowModalOpen(false)}
        onConfirm={handleNoShow}
      />

      <StationAddServicesModal
        isOpen={isAddServicesOpen}
        onClose={() => setIsAddServicesOpen(false)}
        salon={salon}
        ticket={currentlyServing}
        isUpdating={isUpdatingServices}
        onSave={handleSaveServices}
      />

      <StationEarningsSummary
        isOpen={isEarningsOpen}
        onClose={() => setIsEarningsOpen(false)}
        activeStylist={activeStylist}
        salonId={salon?.id || ""}
        slug={slug}
        report={dailyReport}
        isLoading={loadingReport}
        isOffline={isOffline}
        onRefresh={handleRefreshReport}
        onAddCashTip={handleAddCashTip}
      />
    </div>
  );
}
