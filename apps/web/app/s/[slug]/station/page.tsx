"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { api, Salon, Ticket, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { formatCurrency, maskPhone } from "@/lib/utils";
import {
  Armchair,
  Volume2,
  CheckCircle2,
  Clock,
  RotateCcw,
  KeyRound,
  Users,
  Banknote,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  Settings,
  Tv,
  ArrowRight,
  Sparkles,
  Delete,
  X,
  UserCheck,
  AlertCircle,
} from "lucide-react";

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

  // Chair Switch Modal
  const [isSwitchChairOpen, setIsSwitchChairOpen] = useState(false);

  // Currently Serving / Summoned Ticket
  const [currentlyServing, setCurrentlyServing] = useState<Ticket | null>(null);
  const [summonedTicket, setSummonedTicket] = useState<Ticket | null>(null);
  const [editableBill, setEditableBill] = useState<number>(150);
  const [processingAction, setProcessingAction] = useState(false);

  // In-App Toast Alert State
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Quick Add Walk-in Modal
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPhone, setQuickAddPhone] = useState("");
  const [quickAddServiceId, setQuickAddServiceId] = useState("");
  const [addingWalkin, setAddingWalkin] = useState(false);

  // Voice Callout synthesis
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

      // Detect currently serving or summoned ticket for this stylist/chair
      // In solo mode, ticket might not have stylistId assigned yet. In multi-station mode, enforce strict chair isolation.
      const isSolo = !salonRes.salon?.stylists || salonRes.salon.stylists.length <= 1;

      const inService =
        tickets.find(
          (t) =>
            (t.status === "IN_SERVICE" || t.status === "IN_CHAIR") &&
            (!activeStylist || !t.stylistId || t.stylistId === activeStylist.id)
        ) ||
        (isSolo ? tickets.find((t) => t.status === "IN_SERVICE" || t.status === "IN_CHAIR") : null);

      const called =
        tickets.find(
          (t) =>
            (t.status === "CALLED" || t.status === "SUMMONED") &&
            (!activeStylist || !t.stylistId || t.stylistId === activeStylist.id)
        ) ||
        (isSolo ? tickets.find((t) => t.status === "CALLED" || t.status === "SUMMONED") : null);

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
  useSalonSocket(salon?.id, (event) => {
    console.log("[Station UI] WebSocket event:", event.type);
    fetchStationData();
  });

  // Handle PIN Numpad Touch Input
  const handlePinDigit = (digit: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + digit;
      setEnteredPin(nextPin);
      setPinError("");
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError("");
  };

  const handleClearPin = () => {
    setEnteredPin("");
    setPinError("");
  };

  const verifyPin = async (pin: string) => {
    if (!salon || !activeStylist) return;
    try {
      // Direct PIN verification or rapid switch
      const resp = await api.auth.pinSwitch(salon.id, activeStylist.id, pin);
      if (resp.success) {
        setIsLocked(false);
        setEnteredPin("");
        setPinError("");
      }
    } catch (err) {
      // Check if rural quick PIN or demo PIN matches
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

  // 1-Tap Quick Unlock for Demo / Owner
  const handleQuickUnlock = () => {
    setIsLocked(false);
    setEnteredPin("");
    setPinError("");
  };

  // 1-Tap [CALL NEXT] Action with Web Speech API Voice synthesis
  const handleCallNext = async () => {
    if (!salon) return;
    setProcessingAction(true);
    try {
      const res = await api.queue.callNext(salon.id, activeStylist?.id);
      if (res.ticket) {
        const ticket = res.ticket;
        setSummonedTicket(ticket);
        // Voice announcement
        const announcement = `Ticket Number ${ticket.ticketNumber}, ${ticket.customerName}, please step to chair!`;
        speakAnnouncement(announcement);
        showToast(`Summoned Ticket #${ticket.ticketNumber} (${ticket.customerName})`, "success");
        fetchStationData();
      } else {
        showToast(res.message || "No waiting clients in the queue.", "info");
      }
    } catch (err) {
      showToast("Error calling next: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  // [SEAT IN CHAIR]
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

  // [3-MINUTE SOFT BUMP]
  const handleSoftBump = async () => {
    if (!summonedTicket) return;
    setProcessingAction(true);
    try {
      await api.queue.softBump(summonedTicket.id);
      setSummonedTicket(null);
      fetchStationData();
      showToast("3-Minute grace hold applied. Ticket moved behind next client.", "info");
    } catch (err) {
      showToast("Error bumping ticket: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  // [FINISH SERVICE & CHECKOUT]
  const handleFinishCheckout = async (paymentStatus: "CASH_PAID" | "ONLINE_PAID") => {
    if (!currentlyServing) return;
    setProcessingAction(true);
    try {
      await api.queue.finish(currentlyServing.id, paymentStatus, editableBill);
      showToast(`Completed Ticket #${currentlyServing.ticketNumber} (${paymentStatus === "CASH_PAID" ? "Cash" : "UPI"})!`, "success");
      setCurrentlyServing(null);
      fetchStationData();
    } catch (err) {
      showToast("Error checking out: " + (err as Error).message, "error");
    } finally {
      setProcessingAction(false);
    }
  };

  // 1-Tap Quick Walk-in Add (For elderly, non-tech or rapid chair entries)
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

  // Rapid Chair Switch Selection
  const handleSelectStylistChair = (st: Stylist) => {
    setActiveStylist(st);
    setIsSwitchChairOpen(false);
    setIsLocked(true);
    setEnteredPin("");
    setPinError("");
  };

  const isRural = salon?.operatingMode === "RURAL_SOLO";

  // LOCKED STATE: Touch-Optimized 4-Digit Quick PIN Keypad
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center font-bold text-white shadow-xl shadow-amber-500/20 mx-auto">
              <Armchair className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black text-white">
              {activeStylist ? `${activeStylist.name}'s Chair` : "Working Chair Station"}
            </h1>
            <p className="text-xs text-slate-400">
              {salon?.name || "Salon Station"} · Enter 4-Digit Mirror PIN
            </p>
          </div>

          {/* PIN Dots Indicator */}
          <div className="flex justify-center items-center gap-4 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = enteredPin.length > idx;
              return (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? "bg-amber-400 scale-125 shadow-md shadow-amber-400/50"
                      : "bg-slate-800 border-2 border-slate-700"
                  }`}
                />
              );
            })}
          </div>

          {pinError && <p className="text-xs text-rose-400 font-semibold animate-shake">{pinError}</p>}

          {/* Tactile Touch Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handlePinDigit(digit)}
                className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 active:scale-95 text-2xl font-bold text-white transition-all shadow-md select-none"
              >
                {digit}
              </button>
            ))}

            <button
              type="button"
              onClick={handleClearPin}
              className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800 active:scale-95 text-xs uppercase font-bold text-slate-400 transition-all select-none"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handlePinDigit("0")}
              className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 active:scale-95 text-2xl font-bold text-white transition-all shadow-md select-none"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800 active:scale-95 flex items-center justify-center text-slate-300 transition-all select-none"
            >
              <Delete className="h-6 w-6" />
            </button>
          </div>

          <div className="pt-4 space-y-2">
            <button
              type="button"
              onClick={handleQuickUnlock}
              className="text-xs text-amber-400/80 hover:text-amber-300 underline underline-offset-4 font-semibold"
            >
              ⚡ Quick 1-Tap Unlock (Demo Mode)
            </button>

            {salon?.stylists && salon.stylists.length > 1 && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsSwitchChairOpen(true)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  🔄 Switch Stylist Chair
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Rapid Chair Switch Modal */}
        <Dialog open={isSwitchChairOpen} onOpenChange={setIsSwitchChairOpen}>
          <DialogClose onClose={() => setIsSwitchChairOpen(false)} />
          <DialogHeader>
            <DialogTitle>Select Stylist Chair</DialogTitle>
            <DialogDescription>Swap active chair on this shared mirror tablet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 my-4">
            {salon?.stylists.map((st) => (
              <button
                key={st.id}
                onClick={() => handleSelectStylistChair(st)}
                className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  activeStylist?.id === st.id
                    ? "border-amber-500 bg-amber-500/10 text-amber-300 font-bold"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div>
                  <p className="font-bold text-base text-white">{st.name}</p>
                  <p className="text-xs text-slate-400">Pace: {st.avgDurationMinutes || 25}m</p>
                </div>
                <Badge variant={st.isAvailable ? "success" : "secondary"}>
                  {st.isAvailable ? "Available" : "In Chair"}
                </Badge>
              </button>
            ))}
          </div>
        </Dialog>
      </div>
    );
  }

  // UNLOCKED STATION PANEL (Chair Operating Dashboard)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Station Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center font-black text-slate-950 shadow-md">
            <Armchair className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">
                {activeStylist?.name || "Barber Station"}
              </span>
              <Badge variant={isRural ? "warning" : "default"} className="text-[10px]">
                {isRural ? "Solo Station" : "Chair #1"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">{salon?.name || "Salon Station"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            size="sm"
            onClick={() => setIsQuickAddOpen(true)}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">+ Walk-in</span>
          </Button>

          {salon?.stylists && salon.stylists.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSwitchChairOpen(true)}
              className="text-xs border-slate-700 hover:border-slate-500 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Swap Chair</span>
            </Button>
          )}


          <Link href="/staff/preferences">
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-slate-300">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preferences</span>
            </Button>
          </Link>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsLocked(true)}
            className="text-xs gap-1.5 border-slate-700"
            title="Lock Mirror Tablet"
          >
            <KeyRound className="h-3.5 w-3.5 text-slate-400" />
            <span>Lock</span>
          </Button>
        </div>
      </header>

      {/* Main Station Work Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Toast Alert Banner */}
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
        {/* Left 2 Cols: Hero Work Surfaces (Summoned or Currently Serving) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. GIANT [CALL NEXT] TRIGGER (Always visible if no client is in chair) */}
          {!currentlyServing && !summonedTicket && (
            <Card className="border-2 border-dashed border-amber-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-8 text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <Badge variant="warning" className="px-3 py-1 text-xs">
                  CHAIR IS READY
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-black text-white">
                  Chair is Open & Available
                </h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  {activeTickets.length > 0
                    ? `${activeTickets.length} clients are waiting in queue. Tap Call Next to summon.`
                    : "No clients waiting. New walk-ins can scan the Door QR to enter queue."}
                </p>
              </div>

              <Button
                size="xl"
                onClick={handleCallNext}
                disabled={processingAction || activeTickets.length === 0}
                className="w-full max-w-md h-20 text-2xl font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 rounded-2xl gap-3 mx-auto transition-all active:scale-95"
              >
                <Volume2 className="h-8 w-8" />
                <span>📢 CALL NEXT CLIENT</span>
              </Button>
            </Card>
          )}

          {/* 2. SUMMONED CARD (Client called, walking in from tea stall) */}
          {summonedTicket && (
            <Card className="border-2 border-amber-500 bg-amber-500/5 p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-4 border-b border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Badge variant="warning" className="animate-pulse text-xs px-3 py-1">
                    CLIENT SUMMONED
                  </Badge>
                  <span className="text-xs text-slate-400">
                    Voice announcement broadcasted
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    speakAnnouncement(
                      `Ticket Number ${summonedTicket.ticketNumber}, ${summonedTicket.customerName}, please step to chair!`
                    )
                  }
                  className="text-xs text-amber-400 gap-1"
                >
                  <Volume2 className="h-4 w-4" />
                  Re-Announce
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-3xl bg-amber-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-xl shadow-amber-500/20">
                    #{summonedTicket.ticketNumber}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{summonedTicket.customerName}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {summonedTicket.customerPhone ? maskPhone(summonedTicket.customerPhone) : "Guest Walk-In"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400">Expected Bill</span>
                  <p className="text-2xl font-black text-emerald-400">
                    {formatCurrency(summonedTicket.totalPrice || 150)}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Seat in Chair vs 3m Soft Bump */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  size="lg"
                  onClick={handleSeatInChair}
                  disabled={processingAction}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg h-14 rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <UserCheck className="h-6 w-6" />
                  <span>💺 Seat In Chair</span>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleSoftBump}
                  disabled={processingAction}
                  className="border-amber-500/60 text-amber-300 hover:bg-amber-500/10 font-bold h-14 rounded-xl gap-2"
                >
                  <Clock className="h-5 w-5 text-amber-400" />
                  <span>⏳ 3m Hold (Tea Break)</span>
                </Button>
              </div>
            </Card>
          )}

          {/* 3. CURRENTLY SERVING BOX (Live Editable Bill & 1-Tap Checkout) */}
          {currentlyServing && (
            <Card className="border-2 border-emerald-500/80 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/30">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                  <Badge variant="success" className="text-xs px-3 py-1 font-bold">
                    CURRENTLY IN CHAIR
                  </Badge>
                </div>
                <span className="text-xs text-slate-400">
                  Seated at {new Date(currentlyServing.seatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-3xl bg-emerald-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
                    #{currentlyServing.ticketNumber}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white">{currentlyServing.customerName}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {currentlyServing.customerPhone ? maskPhone(currentlyServing.customerPhone) : "Walk-in Guest"}
                    </p>
                  </div>
                </div>

                {/* LIVE EDITABLE BILL AMOUNT: ₹[editable] */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 text-right min-w-[200px]">
                  <label className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                    Live Editable Bill
                  </label>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-2xl font-black text-emerald-400">₹</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={editableBill}
                      onChange={(e) => setEditableBill(Number(e.target.value))}
                      className="w-28 text-2xl font-black text-right bg-transparent text-white border-b-2 border-emerald-400 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Editable before checkout
                  </span>
                </div>
              </div>

              {/* 1-TAP CHECKOUT BUTTONS: CASH vs UPI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <Button
                  size="xl"
                  onClick={() => handleFinishCheckout("CASH_PAID")}
                  disabled={processingAction}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl h-16 rounded-2xl gap-3 shadow-xl shadow-emerald-600/20"
                >
                  <Banknote className="h-7 w-7" />
                  <span>💵 ₹{editableBill} Paid (Cash) & Done</span>
                </Button>

                <Button
                  size="xl"
                  onClick={() => handleFinishCheckout("ONLINE_PAID")}
                  disabled={processingAction}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xl h-16 rounded-2xl gap-3 shadow-xl shadow-blue-600/20"
                >
                  <Smartphone className="h-7 w-7" />
                  <span>📱 Online UPI Paid</span>
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Right Col: Live Queue Waiting Board */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-400" />
                  <span>Waiting Clients</span>
                </CardTitle>
                <CardDescription>
                  {activeTickets.length} waiting in line
                </CardDescription>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {activeTickets.length}
              </Badge>
            </CardHeader>
            <CardContent>
              {activeTickets.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Queue is clear! Ready for next guest.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {activeTickets.map((t, idx) => (
                    <div
                      key={t.id}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-amber-400 font-mono text-sm">
                          #{t.ticketNumber}
                        </span>
                        <div>
                          <p className="font-bold text-white text-sm">{t.customerName}</p>
                          <p className="text-[11px] text-slate-400">
                            Est. wait: <span className="text-blue-400">{t.estimatedWaitMinutes}m</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <Badge
                          variant={
                            t.status === "CALLED" || t.status === "SUMMONED"
                              ? "warning"
                              : t.status === "IN_SERVICE" || t.status === "IN_CHAIR"
                              ? "success"
                              : t.status === "SOFT_BUMPED"
                              ? "outline"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {t.status === "SUMMONED" || t.status === "CALLED"
                            ? "SUMMONED"
                            : t.status === "IN_CHAIR" || t.status === "IN_SERVICE"
                            ? "IN CHAIR"
                            : t.status === "SOFT_BUMPED"
                            ? "3m HOLD"
                            : `Pos #${idx + 1}`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>

      {/* Quick Walk-in Add Modal */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogClose onClose={() => setIsQuickAddOpen(false)} />
        <DialogHeader>
          <DialogTitle>1-Tap Quick Add Walk-in</DialogTitle>
          <DialogDescription>
            Add an in-person client directly to the queue without phone QR scan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleQuickAddWalkin} className="space-y-4 my-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Client Name *
            </label>
            <Input
              placeholder="e.g. Walk-in Client or Uncle Ji"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Phone Number (Optional)
            </label>
            <Input
              placeholder="e.g. 9876543210 (Leave blank if none)"
              value={quickAddPhone}
              onChange={(e) => setQuickAddPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Service
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              value={quickAddServiceId}
              onChange={(e) => setQuickAddServiceId(e.target.value)}
            >
              {salon?.services?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatCurrency(s.basePrice)})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQuickAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={addingWalkin}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {addingWalkin ? "Adding to Queue..." : "🎟️ Add to Queue"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

