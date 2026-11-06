"use client";

import React from "react";
import type { Stylist, Ticket } from "@/lib/api";
import { Armchair } from "lucide-react";

interface SalonStylistsProps {
  stylists: Stylist[];
  chairsServing?: Ticket[];
}

export function SalonStylists({ stylists, chairsServing = [] }: SalonStylistsProps) {
  if (!stylists || stylists.length === 0) return null;

  return (
    <section id="team" className="space-y-4 pt-2 scroll-mt-24">
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <Armchair className="h-5 w-5 text-blue-400" />
          <span>Our Master Stylists &amp; Barbers</span>
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Hand-picked grooming specialists dedicated to craft and cleanliness.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {stylists.map((st, idx) => {
          const isServing = chairsServing.some((t) => t.stylistId === st.id);
          return (
            <div
              key={st.id}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5 hover:border-slate-700 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 shrink-0">
                #{idx + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs truncate">{st.name}</span>
                </div>
                <p className="text-[11px] text-slate-400">~{st.avgDurationMinutes || 20}m pace</p>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isServing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  <span
                    className={
                      isServing ? "text-amber-300 font-medium" : "text-emerald-400 font-medium"
                    }
                  >
                    {isServing ? "In Chair" : "Ready Next"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
