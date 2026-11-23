"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SectionProps } from "./types";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "Do my customers need to download an app to join the queue?",
    a: "No! Customers simply open their standard phone camera and scan the printed A4 QR poster at your entrance. Their digital ticket opens instantly in their browser in under 1 second with zero app downloads.",
  },
  {
    q: "How does the system handle elderly or non-smartphone walk-ins?",
    a: "Barbers can tap the 'Quick Walk-In' button on their chair tablet or phone. Enter the customer's name, and they are added to the live queue immediately with an assigned ticket number.",
  },
  {
    q: "Can stylists use the mirror station with wet or soapy hands?",
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
];

export const FaqAccordion: React.FC<SectionProps> = ({ config }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge variant="outline" className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            Frequently Answered Questions
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Common Questions From Salon Owners
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3">
            Everything you need to know about setting up {config.brandName} in your salon.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-bold text-white hover:text-emerald-400 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
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
