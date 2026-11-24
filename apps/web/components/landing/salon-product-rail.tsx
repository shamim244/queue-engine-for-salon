"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Armchair,
  Smartphone,
  QrCode,
  Tv,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalonBackgroundPattern } from "./salon-vector-art";
import type { SectionProps } from "./types";

interface RailItem {
  id: string;
  name: string;
  category: string;
  tag: string;
  image: string;
  priceNote: string;
  spec1: string;
  spec2: string;
  description: string;
}

export const SalonProductRail: React.FC<SectionProps> = ({ config }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);

  const railItems: RailItem[] = [
    {
      id: "rail-1",
      name: "Hydraulic Chair Bay",
      category: "Styling Station",
      tag: "Core Revenue Anchor",
      image: "/landing/barber_chair.jpg",
      priceNote: "₹400 / hour active revenue rate",
      spec1: "Vintage Emerald Leather & Chrome Base",
      spec2: "Zero Idle Gap with Auto-Queuing",
      description: "Heavy-duty hydraulic styling chair with smooth 360° rotation and adjustable headrest.",
    },
    {
      id: "rail-2",
      name: "Mirror Stylist Touchpad",
      category: "Barber Station Terminal",
      tag: "Sub-15ms WebSocket",
      image: "/landing/barber_station_mirror_touchpad.jpg",
      priceNote: "1-Tap PIN: 1234 Access",
      spec1: "Wet-Thumb Resistant Mirror Mount",
      spec2: "Instant Haircut Timer & Live Bill",
      description: "Mounted directly onto the styling mirror frame. Allows barbers to summon customers with soapy hands in 0.4s.",
    },
    {
      id: "rail-3",
      name: "Acrylic Door QR Stand",
      category: "Entrance Hardware",
      tag: "Zero-App Check-In",
      image: "/landing/hero_salon_station_2_5d.jpg",
      priceNote: "1-Scan Instant Pocket Ticket",
      spec1: "Laser Engraved Acrylic + QR Stand",
      spec2: "100% Works with Native Phone Camera",
      description: "Heavy acrylic desk or glass-door stand placed at your entrance for immediate walk-in registration.",
    },
    {
      id: "rail-4",
      name: "Waiting Lounge 65″ OLED Departure TV",
      category: "Lobby Display",
      tag: "Airport-Grade Kiosk",
      image: "/landing/salon_lounge_departure_tv.jpg",
      priceNote: "Eliminates 100% of Desk Inquiries",
      spec1: "Real-Time 4-Chair Status Display",
      spec2: "Customer Phone Number Privacy Masking",
      description: "Turns any smart TV or Firestick into an airport departure board that keeps waiting customers calm and happy.",
    },
    {
      id: "rail-5",
      name: "0% Fee NPCI Soundbox Counter",
      category: "Billing Station",
      tag: "Direct-To-Bank",
      image: "/landing/salon_counter_upi_stand.jpg",
      priceNote: "Zero Middleman Escrow",
      spec1: "Dynamic Exact-Amount UPI QR Generator",
      spec2: "Instant Audio Payment Voice Ping",
      description: "Acrylic billing stand connected to your salon UPI ID. Payments credit straight to your bank account with zero deductions.",
    },
  ];

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 360;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section id="hardware-rail" className="py-24 bg-[#0a0f0d] relative overflow-hidden border-t border-slate-800/80">
      {/* Background Illustrated Pattern */}
      <SalonBackgroundPattern opacity={0.12} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Warm Ambient Studio Halos */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[850px] h-[400px] bg-gradient-to-r from-teal-600/10 via-emerald-600/15 to-transparent blur-[160px] pointer-events-none rounded-full z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <Badge
              variant="outline"
              className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40 font-mono"
            >
              💈 21st.dev Product Rail Gallery · Interactive Rail Gallery
            </Badge>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Salon Hardware &amp; Station Rail
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-3 max-w-2xl leading-relaxed">
              Explore the physical touchpoints that power your salon. Swipe or glide across the brass rail to inspect station mounts, tablets, TV mirrors, and check-in hardware.
            </p>
          </div>

          {/* Rail Slider Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleScroll("left")}
              className="border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white h-11 w-11 p-0 rounded-full shadow-lg"
              title="Previous Hardware"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleScroll("right")}
              className="border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white h-11 w-11 p-0 rounded-full shadow-lg"
              title="Next Hardware"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Physical Brass & Walnut Top Rail Simulation */}
        <div className="relative max-w-7xl mx-auto">
          {/* Top Rail Bar */}
          <div className="h-3 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-700 rounded-full shadow-lg shadow-amber-950/60 mb-6 relative z-10">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-amber-200/50 -translate-y-1/2 blur-[1px]" />
          </div>

          {/* Rail Gallery Track */}
          <div
            ref={scrollRef}
            className="flex items-stretch gap-6 overflow-x-auto pb-8 pt-2 no-scrollbar scroll-smooth"
          >
            {railItems.map((item, idx) => {
              const isSelected = idx === activeItemIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveItemIndex(idx)}
                  className={`min-w-[300px] sm:min-w-[340px] max-w-[360px] rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#080d0a] border-2 transition-all duration-500 cursor-pointer flex flex-col justify-between shadow-2xl relative overflow-hidden group shrink-0 ${
                    isSelected
                      ? "border-amber-400 shadow-amber-950/60 scale-[1.02]"
                      : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                  style={{
                    transform: isSelected ? "perspective(1000px) rotateY(-2deg)" : "none",
                  }}
                >
                  {/* Brass Ring Hanging Bracket From Rail */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-5 border-2 border-amber-400 bg-slate-950 rounded-b-full shadow-md z-20 pointer-events-none" />

                  <div>
                    {/* Item Image with Walnut Scrim */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-[2.3rem] bg-slate-950">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-950/90 text-amber-300 border-amber-500/40 font-mono backdrop-blur-md"
                        >
                          {item.tag}
                        </Badge>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-6">
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <h3 className="text-lg font-bold text-white group-hover:text-amber-200 transition-colors mt-0.5">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono">
                        <div className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{item.spec1}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{item.spec2}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="p-6 pt-0">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-bold font-mono">
                        {item.priceNote}
                      </span>
                      <span className="text-slate-400 text-[10px] font-mono">
                        Plug &amp; Play
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
