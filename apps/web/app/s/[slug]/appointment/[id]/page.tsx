"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Appointment, type Salon } from "@/lib/api";
import { BookingPassCard } from "@/components/booking/booking-pass-card";
import { RescheduleModal } from "@/components/booking/reschedule-modal";
import {
  ArrowLeft,
  Share2,
  CheckCircle2,
  AlertCircle,
  Home,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppointmentPassPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = use(params);
  const router = useRouter();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchAppointment = async () => {
    try {
      const res = await api.appointments.getById(id);
      if (res.success && res.appointment) {
        setAppointment(res.appointment);
        setSalon(res.salon);
      }
    } catch (err) {
      console.error("[AppointmentPassPage] Failed to load appointment:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const handleCheckIn = async () => {
    if (!appointment) return;
    setCheckingIn(true);
    try {
      const res = await api.appointments.checkIn(appointment.id);
      if (res.success && res.appointment) {
        setAppointment(res.appointment);
        setToastMessage("Checked in successfully! Please take a seat in the lounge.");
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err: any) {
      console.error("Check-in error:", err);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!appointment || typeof window === "undefined") return;
    const url = window.location.href;
    const text = `💈 My Salon Booking Pass for ${appointment.serviceName} at ${appointment.slotStartTime} (${appointment.scheduledDate}): ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-rose-400" />
        <h1 className="text-xl font-bold">Booking Not Found</h1>
        <p className="text-xs text-slate-400 max-w-xs">
          We could not locate this appointment pass. It may have expired or been removed.
        </p>
        <Link
          href={`/s/${slug}`}
          className="min-h-[48px] px-6 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
        >
          <Home className="h-4 w-4" />
          <span>Return to Salon</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
        <Link
          href={`/s/${slug}`}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-slate-800 text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <h1 className="font-bold text-sm sm:text-base text-white tracking-tight">
            Digital Booking Pass
          </h1>
          <p className="text-[11px] text-amber-400 font-medium">{salon?.name || "Salon"}</p>
        </div>
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 pb-20 space-y-4">
        {toastMessage && (
          <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-xs font-semibold text-emerald-300 flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        <BookingPassCard
          appointment={appointment}
          salon={salon}
          onRescheduleClick={() => setIsRescheduleOpen(true)}
          onCheckInClick={handleCheckIn}
          checkingIn={checkingIn}
        />

        {/* Action Link to Live Queue */}
        <div className="text-center pt-2">
          <Link
            href={`/s/${slug}/queue`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 font-medium transition-colors"
          >
            <span>View Live Salon Waiting Floor</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </main>

      {/* 1-Tap Reschedule Modal */}
      {isRescheduleOpen && (
        <RescheduleModal
          isOpen={isRescheduleOpen}
          onClose={() => setIsRescheduleOpen(false)}
          appointment={appointment}
          salonSlug={slug}
          onSuccess={(updated) => {
            setAppointment(updated);
            setToastMessage("Slot rescheduled successfully! Updated pass is ready.");
            setTimeout(() => setToastMessage(null), 4000);
          }}
        />
      )}
    </div>
  );
}
