"use client";

import React, { useState } from "react";
import { QrCode, Zap, CheckCircle2, ShieldCheck, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const UpiShowcase: React.FC<SectionProps> = ({ config }) => {
  const [billAmount, setBillAmount] = useState(250);

  return (
    <section className="py-20 bg-slate-900/40 border-y border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Zero Payment Friction
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Dynamic NPCI UPI QR Codes With 0% Gateway Fees
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Every ticket automatically generates an exact-amount UPI QR code client-side. Customers scan with Google Pay, PhonePe, or Paytm—funds credit straight to your salon bank account.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: Interactive Bill Adjuster */}
          <div className="rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                Exact-Amount UPI Checkout
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                Customize Service Bill at Chair
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Stylist adds a shampoo rinse or beard oil? Tap to adjust the bill. The customer's mobile screen re-renders the dynamic QR in &lt;50ms.
              </p>
            </div>

            {/* Quick Bill Selectors */}
            <div>
              <label className="text-xs text-slate-400 block mb-2 font-medium">Select Sample Bill Total:</label>
              <div className="grid grid-cols-3 gap-2">
                {[150, 250, 450].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBillAmount(amt)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      billAmount === amt
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    ₹{amt}
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
                <span>No expensive POS soundbox hardware required</span>
              </div>
            </div>
          </div>

          {/* Right: Dynamic QR Render Card */}
          <div className="rounded-3xl bg-slate-950 border border-emerald-500/30 p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs">
              Live Client Render
            </Badge>

            {/* Simulated QR Code Canvas */}
            <div className="p-4 rounded-2xl bg-white shadow-lg inline-block">
              <div className="h-44 w-44 rounded-xl border-4 border-slate-900 bg-white flex flex-col items-center justify-center p-2 relative">
                <QrCode className="h-32 w-32 text-slate-900" />
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mt-1">
                  NPCI · BHIM UPI
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400">Scan with any UPI App</p>
              <p className="text-2xl font-black text-white mt-1">
                ₹{billAmount}.00
              </p>
              <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                VPA: salon.owner@upi · Zero Gateway Fee
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
