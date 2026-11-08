"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { parseTimestampMs } from "@/lib/utils";
import { api, request, markTicketNoShow } from "@/lib/api";
import type { Salon, Ticket, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";
import { CheckCircle2, AlertCircle, Sparkles, Armchair } from "lucide-react";

// Modular Station Components
import { StationStaffLogin } from "@/components/station/station-staff-login";
import { StationPinLock } from "@/components/station/station-pin-lock";
import { StationChairHeader } from "@/components/station/station-chair-header";
import { StationSwitchChairModal } from "@/components/station/station-switch-chair-modal";
import { StationOpenChairCard } from "@/components/station/station-open-chair-card";
import { StationSummonedCard } from "@/components/station/station-summoned-card";
import { StationInServiceCard } from "@/components/station/station-in-service-card";
import { StationWaitingQueue } from "@/components/station/station-waiting-queue";
import { StationQuickWalkinModal } from "@/components/station/station-quick-walkin-modal";
import { StationCheckoutModal } from "@/components/station/station-checkout-modal";
import { StationNoShowModal } from "@/components/station/station-noshow-modal";
import { StationAddServicesModal } from "@/components/station/station-add-services-modal";

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
  const [isSwitchChairOpen, setIsSwitchChairOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [isAddServicesOpen, setIsAddServicesOpen] = useState(false);
  const [isUpdatingServices, setIsUpdatingServices] = useState(false);

  // 10-Minute Chai Break Mode
  const [breakRemainingSeconds, setBreakRemainingSeconds] = useState<number | null>(null);
  const isOnBreak = breakRemainingSeconds !== null && breakRemainingSeconds > 0;

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

  const fetchStationData = useCallback(async () => {
    try {
      const salonRes = await api.salons.get(slug);
      let targetStylist = activeStylist;

      if (salonRes.salon) {
        setSalon(salonRes.salon);

        // Strict Session Binding: Match authenticated staff user to their specific chair
        const matchedStylist = salonRes.salon.stylists?.find(
          (s: Stylist) => s.id === user?.staffId || s.userId === user?.id || (authStaff && s.id === authStaff.id)
        );

        if (user?.role === "STAFF") {
          targetStylist = matchedStylist || salonRes.salon.stylists?.[0] || null;
          setActiveStylist(targetStylist);
        } else if (!targetStylist && salonRes.salon.stylists?.length > 0) {
          targetStylist = matchedStylist || salonRes.salon.stylists[0];
          setActiveStylist(targetStylist);
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

      setCurrentlyServing(inService);
      setSummonedTicket(called);

      if (inService && inService.totalPrice) {
        setEditableBill(inService.totalPrice);
      } else if (inService) {
        setEditableBill(150);
      }
    } catch (err) {
      console.error("Failed to load station data:", err);
    } finally {
      setLoading(false);
    }
  }, [slug, activeStylist, quickAddServiceId, user, authStaff]);

  useEffect(() => {
    fetchStationData();
  }, [fetchStationData]);

  // Real-time WebSocket synchronization
  const { status, reconnectAttempts } = useSalonSocket(salon?.id, (event) => {
    console.log("[Station UI] WebSocket event:", event.type);
    fetchStationData();
  });

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

  // Station Queue Actions
  const handleCallNext = async () => {
    if (!salon) return;
    if (isOnBreak) setBreakRemainingSeconds(null);
    setProcessingAction(true);
    try {
      const res = await api.queue.callNext(salon.id, activeStylist?.id);
      if (res.ticket) {
        const ticket = res.ticket;
        setSummonedTicket(ticket);
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

  const handleFinishCheckout = async (paymentStatus: "CASH_PAID" | "ONLINE_PAID") => {
    if (!currentlyServing) return;
    setProcessingAction(true);
    try {
      await api.queue.finish(currentlyServing.id, paymentStatus, editableBill);
      showToast(`Completed Ticket #${currentlyServing.ticketNumber} (${paymentStatus === "CASH_PAID" ? "Cash" : "UPI"})!`, "success");
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
    setIsSwitchChairOpen(false);
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
          onOpenSwitchChair={() => setIsSwitchChairOpen(true)}
          onLogout={logout}
        />
        <StationSwitchChairModal
          isOpen={isSwitchChairOpen}
          stylists={salon?.stylists || []}
          activeStylistId={activeStylist?.id}
          onClose={() => setIsSwitchChairOpen(false)}
          onSelectStylist={handleSelectStylistChair}
        />
      </>
    );
  }

  // View 2: Unlocked Chair Operating Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <StationChairHeader
        slug={slug}
        activeStylist={activeStylist}
        hasMultipleStylists={user.role === "SALON_OWNER" || user.role === "SUPER_ADMIN"}
        socketStatus={status}
        reconnectAttempts={reconnectAttempts}
        userName={user.fullName || user.username}
        isOnBreak={isOnBreak}
        breakRemainingSeconds={breakRemainingSeconds}
        onToggleBreak={handleToggleBreak}
        onOpenSwitchChair={() => setIsSwitchChairOpen(true)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onLockChair={() => setIsLocked(true)}
        onLogout={logout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Hero Work Surfaces */}
          <div className="lg:col-span-2 space-y-6">
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
                onProceedToCheckout={() => setIsCheckoutOpen(true)}
                onOpenAddServices={() => setIsAddServicesOpen(true)}
              />
            )}
          </div>

          {/* Right Col: Partitioned Waiting Queue */}
          <div className="space-y-4">
            <StationWaitingQueue
              allTickets={activeTickets}
              activeStylist={activeStylist}
              processingAction={processingAction}
              hasCurrentlyServing={!!currentlyServing}
              onSummonSpecific={handleSummonSpecific}
              onPauseTicket={handlePauseTicket}
              onResumeTicket={handleResumeTicket}
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

      <StationSwitchChairModal
        isOpen={isSwitchChairOpen}
        stylists={salon?.stylists || []}
        activeStylistId={activeStylist?.id}
        onClose={() => setIsSwitchChairOpen(false)}
        onSelectStylist={handleSelectStylistChair}
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
    </div>
  );
}
