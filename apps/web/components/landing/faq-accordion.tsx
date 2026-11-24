"use client";

import React, { useState } from "react";
import { ChevronDown, Scissors, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Do my customers need to download an app to join the queue?",
    a: "No! Customers simply open their standard Android or iPhone camera and scan the acrylic QR stand at your entrance. Their live digital pocket ticket opens instantly in their browser in under 1 second with zero app downloads.",
  },
  {
    q: "How does the system handle walk-in customers without smartphones?",
    a: "Barbers or receptionists tap the 'Quick Walk-In' button on their chair tablet. Enter the client's name (e.g. Ramesh / Suresh), and they are assigned a live ticket number on the lobby TV mirror immediately.",
  },
  {
    q: "Can stylists use the chair mirror tablet with wet, oily, or soapy hands?",
    a: "Yes. The station UI features giant, high-contrast touch targets (48px+) and a tactile 4-digit PIN unlock keypad specifically designed for rapid thumb tapping during active hair and shave services.",
  },
  {
    q: "Where do customer UPI payments go?",
    a: "Directly into your own salon bank account. Dynamic NPCI UPI QR codes are rendered client-side on the ticket. There are 0% gateway transaction deductions—you keep 100% of every Rupee.",
  },
  {
    q: "What hardware is required to run the waiting lounge TV screen?",
    a: "Any TV with a browser or connected to an Amazon Fire Stick / Android TV box. Simply open your salon's /tv URL and press fullscreen. It auto-updates over WebSockets with zero page reloads.",
  },
  {
    q: "What happens if our salon internet fluctuates or goes offline?",
    a: "Our client-compute architecture caches your salon catalog and active ticket state directly in local device RAM. Barbers continue managing chairs, and state syncs atomically the moment network reconnects.",
  },
];

export const FaqAccordion: React.FC<SectionProps> = ({ config }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 bg-[#0a0f0d] relative overflow-hidden">
      {/* Background Studio Halos */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-amber-600/10 via-emerald-600/10 to-transparent blur-[150px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40"
          >
            💈 Frequently Answered Questions · Owner Guide
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Common Questions From Salon Owners
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            Everything you need to know about deploying {config.brandName} across your salon chairs, TV mirrors, and door QR stands.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border-2 border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 overflow-hidden transition-all shadow-lg hover:border-amber-500/40"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between text-sm sm:text-base font-bold text-white hover:text-amber-200 transition-colors gap-3"
                >
                  <span className="flex items-center gap-2.5">
                    <Scissors className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>{item.q}</span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-amber-300" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/70">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
