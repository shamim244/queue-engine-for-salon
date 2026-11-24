"use client";

import React, { useState, useEffect } from "react";
import { QrCode, Zap, CheckCircle2, ShieldCheck, IndianRupee, Smartphone, Sparkles, Check, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateUpiUri } from "@/lib/utils";
import QRCode from "qrcode";
import type { SectionProps } from "./types";

export const UpiShowcase: React.FC<SectionProps> = ({ config }) => {
  const [billAmount, setBillAmount] = useState(250);
  const [selectedService, setSelectedService] = useState("Classic Fade + Beard Sculpt");
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const packages = [
    { name: "Haircut & Wash", amount: 180 },
    { name: "Classic Fade + Beard Sculpt", amount: 250 },
    { name: "De-Tan Facial + Charcoal Scrub", amount: 450 },
    { name: "Royal Wedding Grooming", amount: 750 },
  ];

  // Dynamic NPCI-compliant UPI QR Code generation client-side
  useEffect(() => {
    const upiUri = generateUpiUri({
      upiId: "ramesh.salon@okhdfcbank",
      payeeName: "Ramesh Traditional Barber",
      amount: billAmount,
      note: `${selectedService} - Chair #1`,
    });

    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [billAmount, selectedService]);

  // Synthesize soft pleasant payment ping via Web Audio API (Zero server waste)
  const playPaymentPing = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Pleasant high C ping: 1046.5 Hz (C6) -> 1318.5 Hz (E6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1318.5, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // AudioContext policy
    }
  };

  const handleSimulatePayment = () => {
    setIsSimulatingPayment(true);
    setTimeout(() => {
      setIsSimulatingPayment(false);
      setPaymentSuccess(true);
      playPaymentPing();

      setTimeout(() => {
        setPaymentSuccess(false);
      }, 4000);
    }, 1200);
  };

  return (
    <section id="upi" className="py-24 bg-[#080d0a] border-y border-slate-800/80 relative overflow-hidden">
      {/* Warm Ambient Studio Halos */}
      <div className="absolute top-1/2 right-1/4 w-[550px] h-[350px] bg-gradient-to-r from-amber-600/10 via-emerald-600/15 to-transparent blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40"
          >
            💈 Dynamic NPCI QR · 0% Payment Deduction
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Dynamic Salon Bill QR With 0% Gateway Fees
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            Every ticket automatically renders an exact-amount UPI QR code client-side. Customers scan with Google Pay, PhonePe, or Paytm—funds credit straight to your salon bank account with zero middleman deductions.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: Interactive Bill Adjuster */}
          <div className="space-y-6">
            <div className="p-6 rounded-[2rem] bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#080d0a] border-2 border-slate-800/90 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5" />
                  Stylist Chair Billing
                </span>
                <span className="text-xs text-slate-400 font-mono">Chair #1</span>
              </div>

              <div>
                <p className="text-xs text-slate-400">Select Common Grooming Package:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.name}
                      onClick={() => {
                        setBillAmount(pkg.amount);
                        setSelectedService(pkg.name);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        billAmount === pkg.amount && selectedService === pkg.name
                          ? "border-amber-400 bg-amber-500/15 shadow-md shadow-amber-950/40"
                          : "border-slate-800 bg-slate-950 hover:border-slate-700"
                      }`}
                    >
                      <p className="text-xs font-bold text-white leading-tight">{pkg.name}</p>
                      <p className="text-sm font-black text-emerald-400 font-mono mt-1">₹{pkg.amount}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-300 font-semibold">Custom Service Amount:</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">₹{billAmount}</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1500}
                  step={10}
                  value={billAmount}
                  onChange={(e) => setBillAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Direct-To-Bank Credit</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  NPCI standard URI connects directly to <code className="text-slate-300">ramesh.salon@okhdfcbank</code>. Zero merchant gateway escrow.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Scannable Dynamic NPCI QR Code */}
          <div className="flex flex-col items-center">
            <div className="p-6 rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#080d0a] border-2 border-emerald-500/50 shadow-2xl relative w-full max-w-sm text-center overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  Pocket Ticket Pay
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/40 text-emerald-300 bg-emerald-500/10 font-mono"
                >
                  Live Scannable
                </Badge>
              </div>

              {/* QR Container */}
              <div className="bg-white p-3.5 rounded-2xl shadow-inner inline-block mx-auto border-2 border-slate-200">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Live NPCI UPI QR Code"
                    className="w-52 h-52 object-contain"
                  />
                ) : (
                  <div className="w-52 h-52 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                    Generating UPI QR...
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-1">
                <p className="text-sm font-bold text-white">Ramesh Traditional Barber</p>
                <p className="text-xs text-slate-400 font-mono">Scan with GPay, PhonePe, Paytm</p>
                <div className="text-2xl font-black text-emerald-400 font-mono mt-1">₹{billAmount}.00</div>
              </div>

              {paymentSuccess ? (
                <div className="mt-4 p-3 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 animate-bounce shadow-lg shadow-emerald-950/80">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Payment Confirmed! Audio Ping Played.</span>
                </div>
              ) : (
                <Button
                  onClick={handleSimulatePayment}
                  disabled={isSimulatingPayment}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 text-xs gap-1.5 shadow-md shadow-emerald-600/25 min-h-[44px]"
                >
                  {isSimulatingPayment ? (
                    <span>Verifying Banking Network...</span>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>Simulate UPI Payment Success</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
