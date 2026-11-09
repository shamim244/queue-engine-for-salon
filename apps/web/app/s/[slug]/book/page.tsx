"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Salon, type Service, type Stylist, type AppointmentSlot } from "@/lib/api";
import { SlotGrid } from "@/components/booking/slot-grid";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Scissors,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CreditCard,
  QrCode,
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

  const [salon, setSalon] = useState<Salon | null>(null);
  const [loadingSalon, setLoadingSalon] = useState(true);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [advanceType, setAdvanceType] = useState<"TOKEN" | "FULL">("TOKEN");

  // Slots State
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Available Dates (Today + 6 days)
  const [availableDates, setAvailableDates] = useState<
    Array<{ dateStr: string; label: string; dayName: string }>
  >([]);

  useEffect(() => {
    const dates: Array<{ dateStr: string; label: string; dayName: string }> = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName =
        i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dates.push({ dateStr, label, dayName });
    }

    setAvailableDates(dates);
  }, []);

  // Fetch Salon Catalog
  useEffect(() => {
    let isMounted = true;
    api.salons
      .get(slug)
      .then((res) => {
        if (isMounted && res.salon) {
          setSalon(res.salon);
          if (res.salon.services?.length > 0) {
            setSelectedServiceId(res.salon.services[0].id);
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
    if (!slug || !selectedDate) return;

    let isMounted = true;
    setLoadingSlots(true);
    setErrorMsg("");
    setSelectedSlot(null);

    api.appointments
      .getSlots(slug, selectedDate, selectedStylistId || undefined)
      .then((res) => {
        if (isMounted) {
          setSlots(res.slots || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to fetch slots:", err);
          setErrorMsg("Failed to load available slots. Please try again.");
        }
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug, selectedDate, selectedStylistId]);

  const selectedService = salon?.services?.find((s) => s.id === selectedServiceId);
  const totalPrice = selectedService?.basePrice || 0;
  const advanceAmount =
    advanceType === "FULL" ? totalPrice : Math.min(totalPrice, Math.max(50, Math.min(100, totalPrice)));

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) {
      setErrorMsg("Please select a service and an available time slot.");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMsg("Please enter your name and 10-digit mobile number.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

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

      // 2. Instant Payment Confirmation Simulation (Prepaid Platform Escrow)
      const confirmRes = await api.appointments.confirm({
        appointmentId: initRes.appointmentId,
        paymentId: "pay_" + Math.random().toString(36).substring(2, 10),
      });

      if (!confirmRes.success) {
        throw new Error("Payment verification failed.");
      }

      // 3. Redirect to digital booking pass
      router.push(`/s/${slug}/appointment/${initRes.appointmentId}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book appointment. Please try again.");
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Mobile-First App Header (Touch Target >= 48px) */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
        <Link
          href={`/s/${slug}`}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <h1 className="font-bold text-sm sm:text-base text-white tracking-tight">
            Book Appointment
          </h1>
          <p className="text-[11px] text-amber-400 font-medium">{salon?.name || "Salon"}</p>
        </div>
        <div className="w-12 flex justify-end">
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
            VIP Pass
          </Badge>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">
        {errorMsg && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-300 flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleBookAppointment} className="space-y-6">
          {/* Step 1: Select Service */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <Scissors className="h-3.5 w-3.5 text-amber-400" />
              <span>1. Choose Service</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(salon?.services || []).map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`min-h-[52px] p-3 rounded-2xl border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{service.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {service.estimatedDurationMinutes} mins
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-amber-400">
                        ₹{service.basePrice}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Choose Stylist (Optional) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <User className="h-3.5 w-3.5 text-amber-400" />
              <span>2. Select Stylist</span>
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedStylistId(null)}
                className={`min-h-[48px] px-4 rounded-2xl border text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  selectedStylistId === null
                    ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                    : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                ⚡ Any Available Stylist
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
                      className={`min-h-[48px] px-4 rounded-2xl border text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {stylist.name}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Step 3: Select Date */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span>3. Choose Date</span>
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {availableDates.map((item) => {
                const isSelected = selectedDate === item.dateStr;
                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`min-w-[82px] min-h-[50px] py-2 px-3 rounded-2xl flex flex-col items-center justify-center border transition-all text-xs active:scale-95 ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="font-semibold">{item.dayName}</span>
                    <span className="text-[10px] opacity-80">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Time Slot Grid */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>4. Pick Guaranteed Slot</span>
            </label>
            <SlotGrid
              slots={slots}
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
              isLoading={loadingSlots}
            />
          </div>

          {/* Step 5: Customer Details */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <User className="h-3.5 w-3.5 text-amber-400" />
              <span>5. Your Contact Information</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="10-digit WhatsApp Phone"
                required
                maxLength={10}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                className="w-full min-h-[48px] px-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Step 6: Advance Option */}
          <div className="space-y-2.5 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>6. Payment Deposit (Escrow Protected)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdvanceType("TOKEN")}
                className={`min-h-[50px] p-3 rounded-2xl border text-left flex flex-col justify-center transition-all active:scale-95 ${
                  advanceType === "TOKEN"
                    ? "bg-amber-500/10 border-amber-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <span className="text-xs font-bold">Booking Deposit</span>
                <span className="text-xs text-amber-400 font-mono font-semibold">
                  ₹{Math.min(totalPrice, Math.max(50, Math.min(100, totalPrice)))} Advance
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAdvanceType("FULL")}
                className={`min-h-[50px] p-3 rounded-2xl border text-left flex flex-col justify-center transition-all active:scale-95 ${
                  advanceType === "FULL"
                    ? "bg-amber-500/10 border-amber-500 text-white"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <span className="text-xs font-bold">Pay Full in Advance</span>
                <span className="text-xs text-emerald-400 font-mono font-semibold">
                  ₹{totalPrice} Total
                </span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 px-1">
              100% refundable if cancelled &gt; 2 hours before your appointment.
            </p>
          </div>

          {/* Sticky Bottom Checkout Bar (Android Thumb Reach >= 50px) */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 p-4 backdrop-blur-xl">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Advance Payable Now
                </span>
                <span className="text-xl font-bold font-mono text-amber-400">
                  ₹{advanceAmount}
                </span>
              </div>

              <Button
                type="submit"
                disabled={!selectedSlot || submitting}
                className="flex-1 min-h-[50px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm sm:text-base shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Securing Slot...</span>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span>Pay ₹{advanceAmount} & Confirm</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
