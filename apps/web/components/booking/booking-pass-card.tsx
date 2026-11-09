"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import type { Appointment, Salon } from "@/lib/api";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  QrCode,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BookingPassCardProps {
  appointment: Appointment;
  salon?: Salon | null;
  onRescheduleClick?: () => void;
  onCheckInClick?: () => void;
  checkingIn?: boolean;
}

export function BookingPassCard({
  appointment,
  salon,
  onRescheduleClick,
  onCheckInClick,
  checkingIn = false,
}: BookingPassCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Client-Compute Live Countdown Timer (Zero Server Waste Mandate)
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
    canReschedule: boolean;
  }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
    canReschedule: false,
  });

  useEffect(() => {
    function updateClock() {
      if (!appointment.scheduledDate || !appointment.slotStartTime) return;

      const targetIso = `${appointment.scheduledDate}T${appointment.slotStartTime}:00`;
      const targetMs = new Date(targetIso).getTime();
      const nowMs = Date.now();
      const diffSec = Math.floor((targetMs - nowMs) / 1000);

      const canResched = diffSec >= 3600; // > 1 hr prior

      if (diffSec <= 0) {
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
          canReschedule: false,
        });
        return;
      }

      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;

      setTimeLeft({
        hours,
        minutes,
        seconds,
        isPast: false,
        canReschedule: canResched,
      });
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [appointment.scheduledDate, appointment.slotStartTime]);

  // Client-Side Canvas QR Code Rendering (Zero Server Waste Mandate)
  useEffect(() => {
    if (canvasRef.current && appointment.id) {
      const qrPayload = JSON.stringify({
        action: "CHECK_IN",
        appointmentId: appointment.id,
        salonId: appointment.salonId,
        customerPhone: appointment.customerPhone,
      });

      QRCode.toCanvas(
        canvasRef.current,
        qrPayload,
        {
          width: 170,
          margin: 1.5,
          color: {
            dark: "#090d16",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("[QR Pass] Canvas render error:", error);
        }
      );
    }
  }, [appointment.id, appointment.salonId, appointment.customerPhone]);

  const balanceDue = Math.max(0, appointment.totalPrice - appointment.advanceAmount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold px-2.5 py-1 text-xs">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5 inline" /> Confirmed
          </Badge>
        );
      case "CHECKED_IN":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold px-2.5 py-1 text-xs">
            <Sparkles className="mr-1 h-3.5 w-3.5 inline" /> Checked In
          </Badge>
        );
      case "IN_CHAIR":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold px-2.5 py-1 text-xs">
            In Chair
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-slate-700 text-slate-300 font-semibold px-2.5 py-1 text-xs">
            Completed
          </Badge>
        );
      case "NO_SHOW":
        return (
          <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold px-2.5 py-1 text-xs">
            No Show
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-slate-400 text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Boarding-Pass Styled Digital Card */}
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Pass Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 px-6 py-4 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            <span className="font-bold tracking-tight text-sm uppercase">VIP Priority Pass</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold bg-slate-950/20 px-2.5 py-1 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-950" />
            <span>Prepaid Escrow</span>
          </div>
        </div>

        {/* Live Client Countdown Timer Bar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 text-center">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
            {timeLeft.isPast ? "Appointment Window" : "Your Chair Time Starts In"}
          </span>
          {timeLeft.isPast ? (
            <div className="text-amber-400 font-bold text-sm flex items-center justify-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>Active Slot Window Today</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 font-mono text-xl sm:text-2xl font-black text-white">
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 min-w-[52px]">
                <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-sans font-medium -mt-1">
                  Hrs
                </span>
              </div>
              <span className="text-amber-400 font-bold">:</span>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 min-w-[52px]">
                <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-sans font-medium -mt-1">
                  Mins
                </span>
              </div>
              <span className="text-amber-400 font-bold">:</span>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 min-w-[52px]">
                <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
                <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-sans font-medium -mt-1">
                  Secs
                </span>
              </div>
            </div>
          )}
        </div>

        {/* QR Code & Slot Arrival Check-in Section */}
        <div className="p-6 text-center border-b border-dashed border-slate-800 relative">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-amber-500/40 inline-block">
              <canvas ref={canvasRef} className="rounded-lg block" />
            </div>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Scan at salon mirror or show to receptionist upon arrival
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            {getStatusBadge(appointment.status)}
          </div>
        </div>

        {/* Pass Metadata Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                Date
              </span>
              <p className="font-semibold text-white text-sm">{appointment.scheduledDate}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                Time Slot
              </span>
              <p className="font-semibold text-white text-sm font-mono">
                {appointment.slotStartTime} - {appointment.slotEndTime}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-3 grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Scissors className="h-3.5 w-3.5 text-amber-400" />
                Service
              </span>
              <p className="font-semibold text-white text-sm truncate">{appointment.serviceName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-amber-400" />
                Customer
              </span>
              <p className="font-semibold text-white text-sm truncate">{appointment.customerName}</p>
            </div>
          </div>

          {/* Pricing & Advance Details */}
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400">
              <span>Total Service Cost</span>
              <span className="font-mono text-white font-semibold">₹{appointment.totalPrice}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 inline" />
                Advance Paid (Escrow Held)
              </span>
              <span className="font-mono">-₹{appointment.advanceAmount}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between items-center text-sm font-bold text-white">
              <span>Balance Due at Salon</span>
              <span className="font-mono text-amber-400">₹{balanceDue}</span>
            </div>
          </div>

          {/* Action CTAs (Android Mobile Touch Targets >= 48px) */}
          <div className="space-y-2.5 pt-2">
            {appointment.status === "CONFIRMED" && onCheckInClick && (
              <Button
                type="button"
                onClick={onCheckInClick}
                disabled={checkingIn}
                className="w-full min-h-[50px] rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-bold text-base shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>{checkingIn ? "Checking In..." : "I Have Arrived - Check In"}</span>
              </Button>
            )}

            {appointment.status === "CONFIRMED" && onRescheduleClick && (
              <Button
                type="button"
                onClick={onRescheduleClick}
                disabled={!timeLeft.canReschedule}
                variant="outline"
                className={`w-full min-h-[48px] rounded-2xl border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  timeLeft.canReschedule
                    ? "border-amber-500/40 text-amber-400 hover:bg-amber-500/10 active:scale-[0.98]"
                    : "border-slate-800 text-slate-500 cursor-not-allowed bg-slate-950/40"
                }`}
              >
                <RotateCcw className="h-4 w-4" />
                <span>
                  {timeLeft.canReschedule
                    ? "Reschedule Slot (Zero Fee)"
                    : "Rescheduling Closed (<1 hr to slot)"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
