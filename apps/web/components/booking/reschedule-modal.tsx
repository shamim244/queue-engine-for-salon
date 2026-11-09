"use client";

import React, { useState, useEffect } from "react";
import { api, type Appointment, type AppointmentSlot } from "@/lib/api";
import { SlotGrid } from "./slot-grid";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  salonSlug: string;
  onSuccess: (updated: Appointment) => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  salonSlug,
  onSuccess,
}: RescheduleModalProps) {
  // Generate next 7 days for date picker
  const [availableDates, setAvailableDates] = useState<
    Array<{ dateStr: string; label: string; dayName: string }>
  >([]);
  const [selectedDate, setSelectedDate] = useState<string>(appointment.scheduledDate);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const dates: Array<{ dateStr: string; label: string; dayName: string }> = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dates.push({ dateStr, label, dayName });
    }

    setAvailableDates(dates);
  }, []);

  // Fetch slots whenever selected date changes
  useEffect(() => {
    if (!isOpen || !selectedDate) return;

    let isMounted = true;
    setLoadingSlots(true);
    setErrorMessage("");
    setSelectedSlot(null);

    api.appointments
      .getSlots(salonSlug, selectedDate, appointment.stylistId || undefined)
      .then((res) => {
        if (isMounted) {
          setSlots(res.slots || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("[RescheduleModal] Failed to load slots:", err);
          setErrorMessage("Failed to load available slots. Please try again.");
        }
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedDate, salonSlug, appointment.stylistId]);

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await api.appointments.reschedule(appointment.id, {
        newDate: selectedDate,
        newSlotTime: selectedSlot,
        newStylistId: appointment.stylistId,
      });

      if (res.success && res.appointment) {
        onSuccess(res.appointment);
        onClose();
      } else {
        setErrorMessage("Reschedule failed. Please try a different slot.");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Could not reschedule appointment. Please check slot availability."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} className="sm:max-w-md bg-slate-900 border-slate-800 text-white p-6 max-h-[90vh] overflow-y-auto">
      <DialogClose onClose={onClose} />
      <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-amber-400">
            <RotateCcw className="h-5 w-5" />
            <span>Reschedule Appointment</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Shift your slot with ₹0 penalty. Your prepaid deposit rolls over seamlessly.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Date Selector Chips */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <span>Select New Date</span>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {availableDates.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(item.dateStr)}
                  className={`min-w-[80px] min-h-[48px] py-2 px-3 rounded-2xl flex flex-col items-center justify-center border transition-all text-xs active:scale-95 ${
                    isSelected
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-500/20"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span className="font-semibold">{item.dayName}</span>
                  <span className="text-[10px] opacity-80">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Slot Grid */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Select New Time Slot</span>
          </label>
          <SlotGrid
            slots={slots}
            selectedSlot={selectedSlot}
            onSelectSlot={(slot) => setSelectedSlot(slot)}
            isLoading={loadingSlots}
          />
        </div>

        {/* Confirm Action CTA (min 48px touch target) */}
        <div className="pt-4 space-y-2">
          <Button
            type="button"
            disabled={!selectedSlot || submitting}
            onClick={handleConfirmReschedule}
            className="w-full min-h-[48px] rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            {submitting ? "Rescheduling..." : `Confirm New Slot (${selectedSlot || "Select Time"})`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-2xl text-slate-400 hover:text-white text-xs"
          >
            Keep Original Slot
          </Button>
        </div>
    </Dialog>
  );
}
