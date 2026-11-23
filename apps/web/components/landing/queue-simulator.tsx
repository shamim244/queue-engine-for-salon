"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MessageSquare, Armchair, ExternalLink, Play, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

export const QueueSimulator: React.FC<SectionProps> = ({ config }) => {
  const [currentServing, setCurrentServing] = useState(103);
  const [customerName, setCustomerName] = useState("Vikram");
  const [nextTicket, setNextTicket] = useState(104);
  const [nextName, setNextName] = useState("Amit Sharma");
  const [alertDispatched, setAlertDispatched] = useState(false);

  const handleCallNext = () => {
    setAlertDispatched(true);
    setCurrentServing(nextTicket);
    setCustomerName(nextName);
    setNextTicket((prev) => prev + 1);
    setNextName(
      ["Pooja Rao", "Rohan Mehta", "Deepak Verma", "Karan Patel"][
        Math.floor(Math.random() * 4)
      ]
    );

    setTimeout(() => {
      setAlertDispatched(false);
    }, 4000);
  };

  const handleReset = () => {
    setCurrentServing(103);
    setCustomerName("Vikram");
    setNextTicket(104);
    setNextName("Amit Sharma");
    setAlertDispatched(false);
  };

  return (
    <section id="simulator" className="py-20 bg-slate-900/50 border-y border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Interactive Operational Sandbox
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Test the Real-Time Queue Engine Live
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Click &ldquo;Call Next Customer&rdquo; below to simulate a barber tapping their chair tablet. Watch how customer pocket tickets and WhatsApp alerts synchronize in real time.
          </p>
        </div>

        {/* Simulator Card */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-white">Barber Cutting Station Chair #1</h4>
                <p className="text-xs text-slate-400">Stylist: Ramesh Kumar (Active)</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleCallNext}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 text-xs h-10 px-4 shadow-lg shadow-emerald-600/25"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Call Next Customer
              </Button>
              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="border-slate-800 text-slate-400 hover:text-white text-xs h-10 px-3"
                title="Reset Simulation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Dual Panel Simulation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Chair Status & Live Bill */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                  Station Touch Panel
                </span>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                  Chair Seated
                </Badge>
              </div>

              <div>
                <p className="text-xs text-slate-400">Currently in Chair</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-white">#{currentServing}</span>
                  <span className="text-base font-semibold text-slate-300">{customerName}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Services in Progress:</span>
                <span className="text-slate-200 font-medium">Haircut + Beard Trim</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Live Bill Total:</span>
                <span className="text-emerald-400 font-bold text-sm">₹140 (Cash / UPI)</span>
              </div>
            </div>

            {/* Right: Next Customer Pocket Ticket & WhatsApp Alert */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
                  Next Customer Telemetry
                </span>
                {alertDispatched ? (
                  <Badge variant="default" className="text-[10px] bg-emerald-500/20 text-emerald-300 animate-pulse">
                    ⚡ WhatsApp Alert Sent!
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                    Waiting Nearby
                  </Badge>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400">Next Ticket in Queue</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-white">#{nextTicket}</span>
                  <span className="text-base font-semibold text-slate-300">{nextName}</span>
                </div>
              </div>

              {/* Dynamic Notification Bubble */}
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Automated WhatsApp Dispatch:</span>
                </div>
                <p className="text-[11px] text-slate-300 italic">
                  &ldquo;Namaste {nextName}! Your chair is ready with Ramesh Kumar. Please step in within 3 minutes! ✂️&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
