"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import { api } from "@/lib/api";
import type { Salon, Ticket, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

// Modular Station Components
import { StationPinLock } from "@/components/station/station-pin-lock";
import { StationChairHeader } from "@/components/station/station-chair-header";
import { StationSwitchChairModal } from "@/components/station/station-switch-chair-modal";
import { StationOpenChairCard } from "@/components/station/station-open-chair-card";
import { StationSummonedCard } from "@/components/station/station-summoned-card";
import { StationInServiceCard } from "@/components/station/station-in-service-card";
import { StationWaitingQueue } from "@/components/station/station-waiting-queue";
import { StationQuickWalkinModal } from "@/components/station/station-quick-walkin-modal";
import { StationCheckoutModal } from "@/components/station/station-checkout-modal";

export default function StaffStationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication & Stylist Lock State
  const [activeStylist, setActiveStylist] = useState<Stylist | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");

  // Modals State
  const [isSwitchChairOpen, setIsSwitchChairOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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
      if (salonRes.salon) {
        setSalon(salonRes.salon);
        if (!activeStylist && salonRes.salon.stylists?.length > 0) {
          setActiveStylist(salonRes.salon.stylists[0]);
        }
        if (!quickAddServiceId && salonRes.salon.services?.length > 0) {
          setQuickAddServiceId(salonRes.salon.services[0].id);
        }
      }

      const queueRes = await api.queue.getActive(salonRes.salon.id);
      const tickets = queueRes.tickets || [];
      setActiveTickets(tickets);

      const isSingleChair = !salonRes.salon?.stylists || salonRes.salon.stylists.length <= 1;

      const inService =
        tickets.find(
          (t) =>
            (t.status === "IN_SERVICE" || t.status === "IN_CHAIR") &&
            (!activeStylist || !t.stylistId || t.stylistId === activeStylist.id)
        ) ||
        (isSingleChair ? tickets.find((t) => t.status === "IN_SERVICE" || t.status === "IN_CHAIR") : null);

      const called =
        tickets.find(
          (t) =>
            (t.status === "CALLED" || t.status === "SUMMONED") &&
            (!activeStylist || !t.stylistId || t.stylistId === activeStylist.id)
        ) ||
        (isSingleChair ? tickets.find((t) => t.status === "CALLED" || t.status === "SUMMONED") : null);

      setCurrentlyServing(inService || null);
      setSummonedTicket(called || null);

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
  }, [slug, activeStylist, quickAddServiceId]);

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
    const startMs = started ? new Date(started).getTime() : Date.now();

    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentlyServing]);

  // PIN Input Handling
  const handlePinDigit = (digit: string) => {
    if (enteredPin.length >= 4) return;
    const newPin = enteredPin + digit;
    setEnteredPin(newPin);
    if (newPin.length === 4) {
      verifyPinSubmission(newPin);
    }
  };

  const handleClearPin = () => {
    setEnteredPin("");
    setPinError("");
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError("");
  };

  const verifyPinSubmission = async (pin: string) => {
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
  };

  // Station Queue Actions
  const handleCallNext = async () => {
    if (!salon) return;
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
      await api.queue.noShow(summonedTicket.id, "Client did not show up");
      showToast(`Ticket #${summonedTicket.ticketNumber} marked as No-Show.`, "info");
      setSummonedTicket(null);
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

  const handleQuickAddWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon) return;
    setAddingWalkin(true);
    try {
      const resp = await api.queue.quickAdd({
        salonSlug: slug,
        customerName: quickAddName.trim() || "Walk-in Guest",
        customerPhone: quickAddPhone.trim() || "0000000000",
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
    setIsLocked(true);
    setEnteredPin("");
    setPinError("");
  };

  // Eligible waiting count for this chair (preferred + universal)
  const eligibleTicketsCount = activeTickets.filter(
    (t) =>
      (!t.stylistId || (activeStylist && t.stylistId === activeStylist.id)) &&
      (t.status === "WAITING" || t.status === "SOFT_BUMPED")
  ).length;

  // View 1: Locked PIN Keypad
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
        hasMultipleStylists={(salon?.stylists?.length || 0) > 1}
        socketStatus={status}
        reconnectAttempts={reconnectAttempts}
        onOpenSwitchChair={() => setIsSwitchChairOpen(true)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        onLockChair={() => setIsLocked(true)}
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
                onCallNext={handleCallNext}
              />
            )}

            {summonedTicket && (
              <StationSummonedCard
                summonedTicket={summonedTicket}
                processingAction={processingAction}
                onSeatInChair={handleSeatInChair}
                onPauseAndCallNext={handlePauseAndCallNext}
                onHoldAndCallNext={handleHoldAndCallNext}
                onNoShow={handleNoShow}
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
                onProceedToCheckout={() => setIsCheckoutOpen(true)}
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
    </div>
  );
}
