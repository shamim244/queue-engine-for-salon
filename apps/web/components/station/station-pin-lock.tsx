import React from "react";
import type { Stylist, Salon } from "@/lib/api";
import { Armchair, Delete } from "lucide-react";

interface StationPinLockProps {
  salon: Salon | null;
  activeStylist: Stylist | null;
  enteredPin: string;
  pinError: string;
  onPinDigit: (digit: string) => void;
  onClearPin: () => void;
  onBackspace: () => void;
  onOpenSwitchChair: () => void;
}

export function StationPinLock({
  salon,
  activeStylist,
  enteredPin,
  pinError,
  onPinDigit,
  onClearPin,
  onBackspace,
  onOpenSwitchChair,
}: StationPinLockProps) {
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
              onClick={() => onPinDigit(digit)}
              className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 active:scale-95 text-2xl font-bold text-white transition-all shadow-md select-none"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={onClearPin}
            className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800 active:scale-95 text-xs uppercase font-bold text-slate-400 transition-all select-none"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => onPinDigit("0")}
            className="h-16 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 active:scale-95 text-2xl font-bold text-white transition-all shadow-md select-none"
          >
            0
          </button>

          <button
            type="button"
            onClick={onBackspace}
            className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800 active:scale-95 flex items-center justify-center text-slate-300 transition-all select-none"
            aria-label="Delete last digit"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>

        <div className="pt-4 space-y-2">
          {salon?.stylists && salon.stylists.length > 1 && (
            <div>
              <button
                type="button"
                onClick={onOpenSwitchChair}
                className="text-xs text-slate-400 hover:text-white"
              >
                🔄 Switch Stylist Chair
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
