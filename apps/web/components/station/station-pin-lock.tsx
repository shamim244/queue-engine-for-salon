import React, { useEffect, useState } from "react";
import type { Stylist, Salon } from "@/lib/api";
import { Armchair, Delete, Keyboard } from "lucide-react";

interface StationPinLockProps {
  salon: Salon | null;
  activeStylist: Stylist | null;
  enteredPin: string;
  pinError: string;
  onPinDigit: (digit: string) => void;
  onClearPin: () => void;
  onBackspace: () => void;
  onOpenSwitchChair: () => void;
  onLogout?: () => void;
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
  onLogout,
}: StationPinLockProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Physical Keyboard & Numpad Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an explicit input/textarea has focus elsewhere
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      // Check numeric keys 0-9 (standard number row & numpad)
      let digit: string | null = null;
      if (e.key >= "0" && e.key <= "9") {
        digit = e.key;
      } else if (e.code && e.code.startsWith("Numpad") && e.code.length === 7) {
        const num = e.code.slice(6);
        if (num >= "0" && num <= "9") {
          digit = num;
        }
      }

      if (digit !== null) {
        e.preventDefault();
        setActiveKey(digit);
        setTimeout(() => setActiveKey(null), 150);
        onPinDigit(digit);
        return;
      }

      // Backspace
      if (e.key === "Backspace") {
        e.preventDefault();
        setActiveKey("backspace");
        setTimeout(() => setActiveKey(null), 150);
        onBackspace();
        return;
      }

      // Clear (Escape, Delete, or C/c)
      if (e.key === "Escape" || e.key === "Delete" || e.key.toLowerCase() === "c") {
        e.preventDefault();
        setActiveKey("clear");
        setTimeout(() => setActiveKey(null), 150);
        onClearPin();
        return;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") || "";
      const digits = text.replace(/\D/g, "");
      if (digits.length > 0) {
        e.preventDefault();
        onClearPin();
        const toAdd = digits.slice(0, 4);
        for (const d of toAdd) {
          onPinDigit(d);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("paste", handlePaste);
    };
  }, [onPinDigit, onBackspace, onClearPin]);

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

        {/* Tactile Touch & Physical Keyboard Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => {
            const isKeyActive = activeKey === digit;
            return (
              <button
                key={digit}
                type="button"
                onClick={() => onPinDigit(digit)}
                className={`h-16 rounded-2xl border transition-all shadow-md select-none text-2xl font-bold ${
                  isKeyActive
                    ? "bg-amber-500/25 border-amber-400 text-amber-300 scale-95 ring-2 ring-amber-400/50"
                    : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 active:scale-95 text-white"
                }`}
              >
                {digit}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onClearPin}
            className={`h-16 rounded-2xl border transition-all select-none text-xs uppercase font-bold ${
              activeKey === "clear"
                ? "bg-slate-700 border-slate-600 text-white scale-95"
                : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 active:scale-95 text-slate-400"
            }`}
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => onPinDigit("0")}
            className={`h-16 rounded-2xl border transition-all shadow-md select-none text-2xl font-bold ${
              activeKey === "0"
                ? "bg-amber-500/25 border-amber-400 text-amber-300 scale-95 ring-2 ring-amber-400/50"
                : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 active:scale-95 text-white"
            }`}
          >
            0
          </button>

          <button
            type="button"
            onClick={onBackspace}
            className={`h-16 rounded-2xl border transition-all select-none flex items-center justify-center ${
              activeKey === "backspace"
                ? "bg-slate-700 border-slate-600 text-white scale-95"
                : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 active:scale-95 text-slate-300"
            }`}
            aria-label="Delete last digit"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>

        {/* Physical Keyboard Helper Indicator */}
        <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
          <Keyboard className="h-3.5 w-3.5 text-slate-400" />
          <span>Physical keyboard, numpad &amp; touch supported</span>
        </p>

        <div className="pt-2 space-y-2">
          {onLogout && (
            <div>
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Sign Out / Switch Staff Account
              </button>
            </div>
          )}
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
