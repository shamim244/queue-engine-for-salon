"use client";

import React, { useState, useEffect } from "react";
import { QrCode, Zap, CheckCircle2, ShieldCheck, IndianRupee, Smartphone, Sparkles, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateUpiUri } from "@/lib/utils";
import QRCode from "qrcode";
import type { SectionProps } from "./types";

export const UpiShowcase: React.FC<SectionProps> = ({ config }) => {
  const [billAmount, setBillAmount] = useState(250);
  const [selectedService, setSelectedService] = useState("Haircut + Beard Styling");
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const packages = [
    { name: "Haircut & Wash", amount: 180 },
    { name: "Haircut + Beard Styling", amount: 250 },
    { name: "De-Tan Facial + Massage", amount: 450 },
    { name: "Full Wedding Grooming", amount: 750 },
  ];

  // Dynamic NPCI-compliant UPI QR Code generation client-side
  useEffect(() => {
    const upiUri = generateUpiUri({
      upiId: "ramesh.salon@okhdfcbank",
      payeeName: "Ramesh Traditional Barber",
      amount: billAmount,
      note: `${selectedService} - Table Chair #1`,
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
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
    <section className="py-20 bg-slate-900/40 border-y border-slate-800/80 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 right-1/4 w-[500px] h-[300px] bg-emerald-600/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Zero Payment Friction
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Dynamic NPCI UPI QR Codes With 0% Gateway Fees
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Every ticket automatically renders an exact-amount UPI QR code client-side. Customers scan with Google Pay, PhonePe, or Paytm—funds credit straight to your salon bank account.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: Interactive Bill Adjuster */}
          <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                Exact-Amount UPI Checkout
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                Customize Service Bill at Chair
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Stylist adds a service or combo? Tap below to adjust. The customer&apos;s mobile screen re-renders the dynamic QR in &lt;50ms.
              </p>
            </div>

            {/* Quick Bill Selectors */}
            <div>
              <label className="text-xs text-slate-400 block mb-2 font-medium">Select Sample Service Package:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.name}
                    onClick={() => {
                      setBillAmount(pkg.amount);
                      setSelectedService(pkg.name);
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-left transition-all min-h-[44px] ${
                      billAmount === pkg.amount
                        ? "bg-emerald-600/20 border-emerald-500 text-white shadow-md shadow-emerald-600/20"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="text-xs font-bold">{pkg.name}</div>
                    <div className="text-[11px] font-mono text-emerald-400 font-semibold mt-0.5">₹{pkg.amount}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Zero PG deductions (You keep 100% of every Rupee)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Instant sound chime via browser Web Audio API</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>No expensive ₹2,000 POS soundbox hardware required</span>
              </div>
            </div>
          </div>

          {/* Right: Dynamic QR Render Card with Laser Scan Simulator */}
          <div className="rounded-3xl bg-slate-950 border-2 border-emerald-500/40 p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-2xl relative overflow-hidden">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs">
              Live Client Render · NPCI Standard
            </Badge>

            {/* QR Frame with Viewfinder and Laser Scan */}
            <div className="relative p-4 rounded-2xl bg-white shadow-2xl inline-block group">
              {/* Camera Viewfinder Corners */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500 z-20 pointer-events-none" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500 z-20 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500 z-20 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500 z-20 pointer-events-none" />

              {/* Animated Laser Scanline */}
              <div
                className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-lg shadow-emerald-500 z-10 pointer-events-none animate-pulse"
                style={{
                  top: isSimulatingPayment ? "50%" : "25%",
                  transition: "top 0.8s ease-in-out",
                }}
              />

              <div className="h-44 w-44 rounded-xl border-4 border-slate-900 bg-white flex flex-col items-center justify-center p-2 relative overflow-hidden">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="NPCI Dynamic UPI QR"
                    className="h-36 w-36 object-contain"
                  />
                ) : (
                  <QrCode className="h-32 w-32 text-slate-900 animate-pulse" />
                )}
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mt-0.5">
                  NPCI · BHIM UPI
                </span>
              </div>
            </div>

            {/* Amount and Status */}
            <div>
              <p className="text-xs text-slate-400">{selectedService}</p>
              <p className="text-3xl font-black text-white mt-1 tracking-tight">
                ₹{billAmount}.00
              </p>
              <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                VPA: ramesh.salon@okhdfcbank · Direct Bank Settlement
              </p>
            </div>

            {/* Simulated Payment Action */}
            <div className="w-full pt-2">
              {paymentSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-xs text-emerald-300 font-bold flex items-center justify-center gap-2 animate-bounce">
                  <Check className="h-4 w-4" />
                  <span>₹{billAmount} Received! 0% Fees Deducted.</span>
                </div>
              ) : (
                <Button
                  onClick={handleSimulatePayment}
                  disabled={isSimulatingPayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 text-xs gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Smartphone className="h-4 w-4" />
                  {isSimulatingPayment ? "Scanning UPI QR..." : "Simulate Customer Phone Scan"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
