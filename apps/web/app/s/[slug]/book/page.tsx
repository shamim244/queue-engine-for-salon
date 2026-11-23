"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, isSalonNotFoundError, type Salon, type Service, type Stylist, type AppointmentSlot } from "@/lib/api";
import { SalonNotFound } from "@/components/salon/salon-not-found";
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
  Coins,
  SlidersHorizontal,
  Check,
  Info,
  Zap,
  TicketPercent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";

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
  const [isNotFound, setIsNotFound] = useState(false);

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

  const getLocalDateString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerCountryCode, setCustomerCountryCode] = useState<string>("+91");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  // Payment Choice: strictly 2 primary options: "PARTIAL" (enforcing owner's minimum rule & customizable) vs "FULL" (100% full prepayment)
  const [paymentChoice, setPaymentChoice] = useState<"PARTIAL" | "FULL">("PARTIAL");
  // Partial advance amount chosen by customer (bounded: minRequiredAdvance <= partialAmount <= totalPrice)
  const [partialAmount, setPartialAmount] = useState<number>(0);

  // Promotional Coupon Code State
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number;
  } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState<boolean>(false);

  // Slots State
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Fetch Salon Catalog and Dynamic Booking Policy
  useEffect(() => {
    let isMounted = true;
    setIsNotFound(false);
    setSalon(null);
    setLoadingSalon(true);
    Promise.all([
      api.salons.get(slug),
      api.appointments.getPolicy(slug).catch(() => null),
    ])
      .then(([salonRes, policyRes]) => {
        if (!isMounted) return;
        if (salonRes?.salon) {
          setSalon(salonRes.salon);
          setIsNotFound(false);
          if (salonRes.salon.services?.length > 0) {
            setSelectedServiceId(salonRes.salon.services[0].id);
          }
        } else {
          setIsNotFound(true);
          setSalon(null);
        }
        if (policyRes?.policy) {
          setPolicy(policyRes.policy);
          if (policyRes.policy.policyType === "FULL") {
            setPaymentChoice("FULL");
          } else {
            setPaymentChoice("PARTIAL");
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load salon for booking:", err);
        if (isSalonNotFoundError(err)) {
          setIsNotFound(true);
          setSalon(null);
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem(`salon_cache_${slug}`);
            } catch {}
          }
        }
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
  const discountedPrice = Math.max(0, totalPrice - couponDiscount);

  // Auto-apply coupon from URL if available (e.g. /s/[slug]/book?coupon=CODE)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("coupon");
    if (codeParam && salon?.id && totalPrice > 0 && !appliedCoupon) {
      setCouponInput(codeParam.trim().toUpperCase());
      api.coupons
        .apply({
          code: codeParam.trim().toUpperCase(),
          targetType: "SALON_SERVICE",
          orderAmount: totalPrice,
          salonId: salon.id,
        })
        .then((res) => {
          if (res.valid && res.coupon) {
            setAppliedCoupon(res.coupon);
            setCouponDiscount(res.discountAmount);
          }
        })
        .catch(() => {});
    }
  }, [salon?.id, totalPrice, appliedCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim() || !salon?.id) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.coupons.apply({
        code: couponInput.trim().toUpperCase(),
        targetType: "SALON_SERVICE",
        orderAmount: totalPrice,
        salonId: salon.id,
      });
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponDiscount(res.discountAmount);
      } else {
        setCouponError(res.message || "Invalid coupon code for this salon.");
      }
    } catch (err: any) {
      setCouponError(err.message || "Could not apply coupon.");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError(null);
    setCouponInput("");
  };

  // Dynamically recalculate coupon discount whenever user changes selected service before booking
  useEffect(() => {
    if (appliedCoupon && totalPrice >= 0) {
      if (appliedCoupon.minOrderAmount && totalPrice < appliedCoupon.minOrderAmount) {
        setCouponDiscount(0);
        setCouponError(`Min order of ₹${appliedCoupon.minOrderAmount} required for coupon ${appliedCoupon.code}`);
        return;
      }
      setCouponError(null);
      let discount = 0;
      if (appliedCoupon.discountType === "PERCENT") {
        discount = (totalPrice * appliedCoupon.discountValue) / 100;
        if (appliedCoupon.maxDiscountAmount) {
          discount = Math.min(discount, appliedCoupon.maxDiscountAmount);
        }
      } else {
        discount = appliedCoupon.discountValue;
        if (appliedCoupon.maxDiscountAmount) {
          discount = Math.min(discount, appliedCoupon.maxDiscountAmount);
        }
      }
      const capped = Math.min(Math.round(discount * 100) / 100, totalPrice);
      setCouponDiscount(capped);
    }
  }, [totalPrice, appliedCoupon]);

  // Minimum required advance deposit computed from policy set by salon owner / admin
  const minRequiredAdvance = useMemo(() => {
    if (!policy.enabled || policy.policyType === "FREE") return 0;
    if (policy.policyType === "FULL") return discountedPrice;
    if (policy.policyType === "PERCENTAGE") {
      const pct = typeof policy.percentage === "number" ? policy.percentage : 50;
      return Math.max(0, Math.round((discountedPrice * pct) / 100));
    }
    // FIXED_TOKEN
    const token = typeof policy.tokenAmount === "number" ? policy.tokenAmount : 100;
    return token === 0 ? 0 : Math.min(discountedPrice, token);
  }, [policy, discountedPrice]);

  // Auto-sync partial amount when minRequiredAdvance or discountedPrice changes
  useEffect(() => {
    setPartialAmount((prev) => {
      if (prev < minRequiredAdvance || prev > discountedPrice || prev === 0) {
        return minRequiredAdvance;
      }
      return prev;
    });
  }, [minRequiredAdvance, discountedPrice]);

  const currentPartialAmount = Math.max(
    minRequiredAdvance,
    Math.min(discountedPrice, partialAmount || minRequiredAdvance)
  );

  // Dynamic payable amount based on user choice (Partial vs 100% Full)
  const payableAmount = useMemo(() => {
    if (policy.policyType === "FULL" || paymentChoice === "FULL") {
      return discountedPrice + (policy.convenienceFee || 0);
    }
    return currentPartialAmount + (policy.convenienceFee || 0);
  }, [policy, discountedPrice, paymentChoice, currentPartialAmount]);

  const isFreeBooking = payableAmount === 0;
  const balanceAtChair = Math.max(0, discountedPrice - Math.max(0, payableAmount - (policy.convenienceFee || 0)));
  const partialPct = discountedPrice > 0 ? Math.round((currentPartialAmount / discountedPrice) * 100) : 0;
  const minPct = policy.policyType === "PERCENTAGE"
    ? (policy.percentage || 50)
    : discountedPrice > 0
    ? Math.round((minRequiredAdvance / discountedPrice) * 100)
    : 0;

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) {
      setErrorMsg("Please select a service, date, and guaranteed time slot.");
      return;
    }

    const cleanDigits = customerPhone.replace(/\D/g, "");
    if (!customerName.trim() || cleanDigits.length !== 10) {
      setErrorMsg("Please enter your name and an exact 10-digit phone number.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      // 1. Determine advanceType payload for backend
      const advanceTypePayload = paymentChoice === "FULL" ? "FULL" : "PARTIAL";

      // 2. Initiate booking & lock slot
      const initRes = await api.appointments.initiate({
        salonSlug: slug,
        serviceId: selectedService.id,
        stylistId: selectedStylistId,
        date: selectedDate,
        slotTime: selectedSlot,
        customerName: customerName.trim(),
        customerPhone: `${customerCountryCode}${cleanDigits}`,
        advanceType: advanceTypePayload,
        customAdvanceAmount: paymentChoice === "PARTIAL" ? currentPartialAmount : undefined,
        couponCode: appliedCoupon?.code || undefined,
      });

      if (!initRes.success || !initRes.appointmentId) {
        throw new Error((initRes as any).error || "Slot reservation failed.");
      }

      // 3. If advance > 0, verify payment; if free (₹0), it's already confirmed!
      if (!initRes.isFree && initRes.advanceAmount > 0) {
        const confirmRes = await api.appointments.confirm({
          appointmentId: initRes.appointmentId,
          paymentId: "pay_" + Math.random().toString(36).substring(2, 10),
        });

        if (!confirmRes.success) {
          throw new Error("Payment verification failed.");
        }
      }

      // 4. Cache contact for instant /me pass recovery
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("customer_phone", customerPhone.trim());
          localStorage.setItem("customer_name", customerName.trim());
        } catch {}
      }

      // 5. Redirect to digital booking pass
      router.push(`/s/${slug}/appointment/${initRes.appointmentId}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to book appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isNotFound) {
    return <SalonNotFound slug={slug} />;
  }

  if (loadingSalon) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!policy.enabled) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Clock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Appointments Currently Paused</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {salon?.name || "This salon"} is currently accepting walk-in clients only via their live queue. You can join the live queue right now from your phone.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href={`/s/${slug}/queue`}
              className="w-full min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Zap className="h-4 w-4 fill-slate-950" />
              <span>Join Live Walk-in Queue</span>
            </Link>
            <Link
              href={`/s/${slug}`}
              className="w-full min-h-[44px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center transition-all active:scale-95"
            >
              <span>Back to Salon Frontpage</span>
            </Link>
          </div>
        </div>
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
                  {couponDiscount > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="line-through text-slate-500 text-xs">₹{totalPrice}</span>
                      <span className="font-bold font-mono text-amber-400">₹{discountedPrice}</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded">
                        -₹{couponDiscount}
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold font-mono text-amber-400">₹{totalPrice}</span>
                  )}
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
                  maxLength={80}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-all"
                />
                <PhoneInput
                  value={customerPhone}
                  onChange={setCustomerPhone}
                  countryCode={customerCountryCode}
                  onCountryCodeChange={setCustomerCountryCode}
                  placeholder="9876543210"
                  showDigitCounter={true}
                  required
                />
              </div>
            </div>

            {/* Promo / Coupon Code Section */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <TicketPercent className="h-4 w-4 text-amber-400" />
                  <span>Promotional Coupon Code</span>
                </label>
                {appliedCoupon && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                    ✓ Applied: {appliedCoupon.code}
                  </Badge>
                )}
              </div>

              {appliedCoupon ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        {appliedCoupon.code}
                      </span>
                      <span className="text-xs text-emerald-300 font-semibold">
                        (Saved ₹{couponDiscount})
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {appliedCoupon.discountType === "PERCENT"
                        ? `${appliedCoupon.discountValue}% discount applied`
                        : `₹${appliedCoupon.discountValue} flat discount applied`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 min-h-[36px]"
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. DIWALI25, FIRSTCUT"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 font-mono text-sm uppercase focus:outline-none focus:border-amber-500"
                    />
                    <Button
                      type="button"
                      disabled={applyingCoupon || !couponInput.trim()}
                      onClick={handleApplyCoupon}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold min-h-[44px] px-4"
                    >
                      {applyingCoupon ? "Applying..." : "Apply"}
                    </Button>
                  </div>

                  {couponError && (
                    <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-0.5 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{couponError}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Advance Deposit Policy Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-amber-400" />
                  <span>Payment &amp; Advance Option</span>
                </label>
                {minRequiredAdvance > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
                    Min. Required: ₹{minRequiredAdvance}
                  </Badge>
                )}
              </div>

              {policy.policyType === "FULL" ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-left space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <span>100% Full Prepayment Required</span>
                    </span>
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      ₹{totalPrice}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    This salon requires 100% prepayment before arrival. Zero balance left to settle at salon checkout.
                  </p>
                </div>
              ) : (
                /* EXACTLY TWO BUTTONS: 1. Pay Partial (with Owner Minimum Rule) & 2. Pay in Full (100%) */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* BUTTON 1: Pay Partial Deposit (Applies Owner's Minimum Rule) */}
                    <button
                      type="button"
                      onClick={() => setPaymentChoice("PARTIAL")}
                      className={`min-h-[66px] p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-95 ${
                        paymentChoice === "PARTIAL"
                          ? "bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Coins className="h-3.5 w-3.5 text-amber-400" />
                          <span>Pay Partial</span>
                        </span>
                        <span className="text-xs font-extrabold text-amber-400 font-mono">
                          ₹{currentPartialAmount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full text-[10px] text-slate-400">
                        <span className="text-amber-400/90 font-medium font-mono">
                          {partialPct}% Advance
                        </span>
                        <span className="text-slate-300 font-mono">
                          ₹{totalPrice - currentPartialAmount} at chair
                        </span>
                      </div>
                    </button>

                    {/* BUTTON 2: Pay in Full (100%) */}
                    <button
                      type="button"
                      onClick={() => setPaymentChoice("FULL")}
                      className={`min-h-[66px] p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-95 ${
                        paymentChoice === "FULL"
                          ? "bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Pay in Full (100%)</span>
                        </span>
                        <span className="text-xs font-extrabold text-emerald-400 font-mono">
                          ₹{totalPrice}
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full text-[10px] text-slate-400">
                        <span className="text-emerald-400/90 font-medium">100% Prepayment</span>
                        <span className="text-slate-300">₹0 at chair</span>
                      </div>
                    </button>
                  </div>

                  {/* INLINE PARTIAL AMOUNT ADJUSTER (Revealed when Button 1 is active) */}
                  {paymentChoice === "PARTIAL" && (
                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 animate-in fade-in-50 duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
                          <span>Custom Partial Advance</span>
                        </span>
                        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono">
                          {partialPct}% of Bill (₹{currentPartialAmount})
                        </Badge>
                      </div>

                      {/* Smooth Slider Bounded strictly by [minRequiredAdvance, totalPrice] */}
                      <div className="space-y-1.5">
                        <input
                          type="range"
                          min={minRequiredAdvance}
                          max={totalPrice}
                          step={1}
                          value={currentPartialAmount}
                          onChange={(e) => setPartialAmount(Number(e.target.value))}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span className="text-amber-400/90 font-semibold">
                            Min Rule: ₹{minRequiredAdvance} ({minPct}%)
                          </span>
                          <span className="text-slate-300">Max: ₹{totalPrice} (100%)</span>
                        </div>
                      </div>

                      {/* Stepper & Number Controls + Quick Presets */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setPartialAmount(minRequiredAdvance)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                              currentPartialAmount === minRequiredAdvance
                                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                            }`}
                          >
                            Min ({minPct}%)
                          </button>

                          {[60, 75, 80, 90]
                            .filter((pct) => pct > minPct && pct < 100)
                            .map((pct) => {
                              const amt = Math.round((totalPrice * pct) / 100);
                              const isSelected = currentPartialAmount === amt;
                              return (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setPartialAmount(amt)}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                                    isSelected
                                      ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {pct}%
                                </button>
                              );
                            })}
                        </div>

                        {/* +/- Stepper for exact Rupee adjustment */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={currentPartialAmount <= minRequiredAdvance}
                            onClick={() =>
                              setPartialAmount((prev) => Math.max(minRequiredAdvance, prev - 5))
                            }
                            className="h-7 px-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                          >
                            -5
                          </button>
                          <span className="font-mono text-xs font-bold text-white px-1">
                            ₹{currentPartialAmount}
                          </span>
                          <button
                            type="button"
                            disabled={currentPartialAmount >= totalPrice}
                            onClick={() =>
                              setPartialAmount((prev) => Math.min(totalPrice, prev + 5))
                            }
                            className="h-7 px-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                          >
                            +5
                          </button>
                        </div>
                      </div>

                      {/* Rule Explanation Note */}
                      <p className="text-[10px] text-slate-500 leading-tight">
                        * Owner Rule: You cannot pay less than ₹{minRequiredAdvance} ({minPct}% minimum
                        deposit). You can pay any custom amount up to ₹{totalPrice}.
                      </p>
                    </div>
                  )}
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
                  {isFreeBooking ? "Payable Now" : paymentChoice === "FULL" ? "Total (100% Full)" : "Minimum Deposit"}
                </span>
                <p className="text-sm font-extrabold text-amber-400 truncate font-mono">
                  {isFreeBooking ? "₹0 (Pay at Salon)" : `₹${payableAmount}`}
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
                  <Check className="h-4 w-4" />
                  <span>Confirm Booking (Pay at Salon)</span>
                </>
              ) : paymentChoice === "FULL" ? (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Pay ₹{payableAmount} (100% Full)</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  <span>Pay ₹{payableAmount} &amp; Confirm Slot</span>
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
