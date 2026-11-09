"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Salon, type Service, type Stylist, type AppointmentSlot } from "@/lib/api";
import { SlotGrid } from "@/components/booking/slot-grid";
import { WeekCalendarStrip } from "@/components/booking/week-calendar-strip";
import {
  ArrowLeft,
  Calendar,
  CalendarDays,
  Clock,
  Scissors,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Banknote,
  Check,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BookAppointmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();

  // Navigation Steps: 1 = Service & Stylist, 2 = Date & Slot, 3 = Details & Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [salon, setSalon] = useState<Salon | null>(null);
  const [loadingSalon, setLoadingSalon] = useState(true);

  // Dynamic Booking Policy from Admin / Salon Settings
  const [policy, setPolicy] = useState<{
    enabled: boolean;
    policyType: "FREE" | "FIXED_TOKEN" | "PERCENTAGE" | "FULL";
    tokenAmount: number;
    percentage?: number;
    convenienceFee: number;
    allowFreeBooking: boolean;
    cancellationCutoffHours: number;
  }>({
    enabled: true,
    policyType: "FIXED_TOKEN",
    tokenAmount: 100,
    percentage: 50,
    convenienceFee: 0,
    allowFreeBooking: true,
    cancellationCutoffHours: 2,
  });

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [advanceType, setAdvanceType] = useState<"TOKEN" | "FULL" | "FREE">("TOKEN");

  // Slots State
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Fetch Salon Catalog and Dynamic Booking Policy
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.salons.get(slug),
      api.appointments.getPolicy(slug).catch(() => null),
    ])
      .then(([salonRes, policyRes]) => {
        if (!isMounted) return;
        if (salonRes.salon) {
          setSalon(salonRes.salon);
          if (salonRes.salon.services?.length > 0) {
            setSelectedServiceId(salonRes.salon.services[0].id);
          }
        }
        if (policyRes?.policy) {
          setPolicy(policyRes.policy);
          if (policyRes.policy.policyType === "FREE") {
            setAdvanceType("FREE");
          } else if (policyRes.policy.policyType === "FULL") {
            setAdvanceType("FULL");
          } else {
            setAdvanceType("TOKEN");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load salon for booking:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingSalon(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Fetch Slots when Date or Stylist changes
  useEffect(() => {
    if (!slug) return;
    setLoadingSlots(true);
    setSelectedSlot(null);

    api.appointments
      .getSlots(slug, selectedDate, selectedStylistId || undefined)
      .then((res) => {
        setSlots(res.slots || []);
      })
      .catch((err) => {
        console.error("Failed to load appointment slots:", err);
        setSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [slug, selectedDate, selectedStylistId]);

  const selectedService = salon?.services.find((s) => s.id === selectedServiceId);
  const selectedStylist = salon?.stylists.find((s) => s.id === selectedStylistId);
  const totalPrice = selectedService ? selectedService.basePrice : 0;

  // Calculate dynamic advance amount
  const computeAdvanceAmount = () => {
    if (advanceType === "FREE" || policy.policyType === "FREE") return 0;
    if (advanceType === "FULL" || policy.policyType === "FULL") {
      return totalPrice + (policy.convenienceFee || 0);
    }
    if (policy.policyType === "PERCENTAGE") {
      const pct = policy.percentage || 50;
      return Math.max(0, Math.round((totalPrice * pct) / 100)) + (policy.convenienceFee || 0);
    }
    // FIXED_TOKEN
    const token = typeof policy.tokenAmount === "number" ? policy.tokenAmount : 100;
    if (token === 0) return 0;
    return Math.min(totalPrice, token) + (policy.convenienceFee || 0);
  };

  const advanceAmount = computeAdvanceAmount();
  const isFreeBooking = advanceAmount === 0;

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) {
      setErrorMsg("Please select a service, date, and guaranteed time slot.");
      return;
    }

    if (!customerName.trim() || customerPhone.trim().length < 10) {
      setErrorMsg("Please enter your name and a valid 10-digit phone number.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      // 1. Initiate booking & lock slot
      const initRes = await api.appointments.initiate({
        salonSlug: slug,
        serviceId: selectedService.id,
        stylistId: selectedStylistId,
        date: selectedDate,
        slotTime: selectedSlot,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        advanceType,
      });

      if (!initRes.success || !initRes.appointmentId) {
        throw new Error((initRes as any).error || "Slot reservation failed.");
      }

      // 2. If advance > 0, verify payment; if free (₹0), it's already confirmed!
      if (!initRes.isFree && initRes.advanceAmount > 0) {
        const confirmRes = await api.appointments.confirm({
          appointmentId: initRes.appointmentId,
          paymentId: "pay_" + Math.random().toString(36).substring(2, 10),
        });

        if (!confirmRes.success) {
          throw new Error("Payment verification failed.");
        }
      }

      // 3. Redirect to digital booking pass
      router.push(`/s/${slug}/appointment/${initRes.appointmentId}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSalon) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* 1. TOP MOBILE-FIRST APP HEADER (Touch Target >= 48px) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-slate-800 backdrop-blur-xl px-4 py-3 flex items-center justify-between shadow-lg shadow-black/40">
        <Link
          href={`/s/${slug}`}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="text-center">
          <h1 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
            Book Guaranteed Slot
          </h1>
          <p className="text-[11px] text-amber-400 font-medium truncate max-w-[200px]">
            {salon?.name || "Salon"}
          </p>
        </div>

        <Link
          href="/me"
          className="min-h-[48px] px-3 flex items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all active:scale-95"
        >
          My Passes
        </Link>
      </header>

      {/* 2. PROGRESS STEPPER (Clutter-free tab bar) */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {[
            { step: 1, label: "Service", icon: Scissors },
            { step: 2, label: "Date & Time", icon: Clock },
            { step: 3, label: "Confirm", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            const isDone = currentStep > item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => {
                  if (item.step < currentStep || (item.step === 2 && selectedServiceId) || (item.step === 3 && selectedSlot)) {
                    setCurrentStep(item.step as any);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : isDone
                    ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN FORM CONTENT (Step-based view) */}
      <main className="flex-1 max-w-lg w-full mx-auto p-3 sm:p-4 pb-28 space-y-4">
        {errorMsg && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-300 flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: SERVICE & STYLIST ================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Service Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-amber-400" />
                  <span>Choose Your Service</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {salon?.services?.length || 0} Available
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {(salon?.services || []).map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`min-h-[58px] p-4 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.99] ${
                        isSelected
                          ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{service.name}</span>
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-amber-400 inline-block animate-ping" />
                          )}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>{service.estimatedDurationMinutes} mins duration</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-base font-extrabold text-amber-400">
                          ₹{service.basePrice}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stylist Preference */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-amber-400" />
                <span>Select Stylist (Optional)</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedStylistId(null)}
                  className={`min-h-[52px] p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all active:scale-95 ${
                    selectedStylistId === null
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <div className="text-xs leading-tight">
                    <p className="font-bold">Any Available</p>
                    <p className="text-[10px] opacity-80">Earliest Opening</p>
                  </div>
                </button>

                {(salon?.stylists || [])
                  .filter((s) => s.isActive)
                  .map((stylist) => {
                    const isSelected = selectedStylistId === stylist.id;
                    return (
                      <button
                        key={stylist.id}
                        type="button"
                        onClick={() => setSelectedStylistId(stylist.id)}
                        className={`min-h-[52px] p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all active:scale-95 ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20"
                            : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <User className="h-4 w-4 shrink-0" />
                        <div className="text-xs leading-tight truncate">
                          <p className="font-bold truncate">{stylist.name}</p>
                          <p className="text-[10px] opacity-80">Master Stylist</p>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: DATE & TIME SLOT ================= */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Apple / Fresha Style 7-Day Week Calendar Strip (Zero Horizontal Scrollbar, Zero Overflow) */}
            <WeekCalendarStrip
              selectedDate={selectedDate}
              onSelectDate={(newDate) => setSelectedDate(newDate)}
              minDate={todayStr}
              maxDaysAhead={60}
            />

            {/* Time Slot Grid */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Choose Chair Time Slot</span>
                </label>
                {selectedSlot && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                    ✓ Slot: {selectedSlot}
                  </Badge>
                )}
              </div>

              <SlotGrid
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => setSelectedSlot(slot)}
                isLoading={loadingSlots}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 3: DETAILS & CONFIRMATION ================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Booking Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Reservation Summary
                </span>
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                  Guaranteed Seat
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Service</span>
                  <span className="font-bold text-white">{selectedService?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Price</span>
                  <span className="font-bold font-mono text-amber-400">₹{totalPrice}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Stylist</span>
                  <span className="font-semibold text-slate-200">
                    {selectedStylist ? selectedStylist.name : "Any Available"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Date &amp; Time</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {selectedDate} @ {selectedSlot}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-amber-400" />
                <span>Your Contact Information</span>
              </label>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-all"
                />
                <input
                  type="tel"
                  placeholder="10-digit WhatsApp Phone Number"
                  required
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Advance Deposit Policy Options */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                <span>Payment &amp; Advance Option</span>
              </label>

              {policy.policyType === "FREE" || policy.allowFreeBooking ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdvanceType("FREE")}
                    className={`min-h-[56px] p-3 rounded-2xl border text-left flex flex-col justify-center transition-all active:scale-95 ${
                      advanceType === "FREE"
                        ? "bg-emerald-500/10 border-emerald-500 text-white shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5 text-emerald-400" />
                      Free Reservation
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold font-mono">
                      ₹0 Now (Pay at Salon)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvanceType("TOKEN")}
                    className={`min-h-[56px] p-3 rounded-2xl border text-left flex flex-col justify-center transition-all active:scale-95 ${
                      advanceType === "TOKEN"
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">Prepay Advance</span>
                    <span className="text-[11px] text-amber-400 font-semibold font-mono">
                      ₹{Math.min(totalPrice, policy.tokenAmount || 100)} Advance
                    </span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAdvanceType("TOKEN")}
                    className={`min-h-[56px] p-3 rounded-2xl border text-left flex flex-col justify-center transition-all active:scale-95 ${
                      advanceType === "TOKEN"
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">Booking Deposit</span>
                    <span className="text-[11px] text-amber-400 font-semibold font-mono">
                      ₹{Math.min(totalPrice, policy.tokenAmount || 100)} Advance
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvanceType("FULL")}
                    className={`min-h-[56px] p-3 rounded-2xl border text-left flex flex-col justify-center transition-all active:scale-95 ${
                      advanceType === "FULL"
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    <span className="text-xs font-bold text-white">Pay Full Now</span>
                    <span className="text-[11px] text-emerald-400 font-semibold font-mono">
                      ₹{totalPrice} Total
                    </span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  100% refundable if rescheduled or cancelled &gt; {policy.cancellationCutoffHours || 2} hours before your slot.
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. FLOATING SMART ACTION DOCK (Sticky Bottom Navigation Bar) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 p-3 sm:p-4 backdrop-blur-2xl shadow-2xl shadow-black">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          {/* Back Step Button */}
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep - 1) as any)}
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95 shrink-0"
              title="Previous Step"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Dynamic Summary Chip */}
          <div className="flex-1 min-w-0">
            {currentStep === 1 && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                  Selected Service
                </span>
                <p className="text-sm font-bold text-white truncate">
                  {selectedService ? selectedService.name : "Choose a service"}
                  {selectedService && (
                    <span className="text-amber-400 font-mono ml-2">₹{selectedService.basePrice}</span>
                  )}
                </p>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                  Selected Slot
                </span>
                <p className="text-sm font-bold text-emerald-400 truncate font-mono">
                  {selectedSlot ? `${selectedDate} @ ${selectedSlot}` : "Pick a time slot"}
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                  {isFreeBooking ? "Payable Now" : "Advance Deposit"}
                </span>
                <p className="text-sm font-extrabold text-amber-400 truncate font-mono">
                  {isFreeBooking ? "₹0 (Free Booking)" : `₹${advanceAmount}`}
                </p>
              </div>
            )}
          </div>

          {/* Primary Action Button (Touch Target >= 48px) */}
          {currentStep === 1 && (
            <Button
              type="button"
              disabled={!selectedServiceId}
              onClick={() => setCurrentStep(2)}
              className="min-h-[48px] px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Next: Pick Slot</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {currentStep === 2 && (
            <Button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setCurrentStep(3)}
              className="min-h-[48px] px-5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Next: Details</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {currentStep === 3 && (
            <Button
              type="button"
              disabled={submitting}
              onClick={handleBookAppointment}
              className="min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-2 shrink-0"
            >
              {submitting ? (
                <span>Confirming...</span>
              ) : isFreeBooking ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Book Free Slot</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Pay ₹{advanceAmount} &amp; Confirm</span>
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
