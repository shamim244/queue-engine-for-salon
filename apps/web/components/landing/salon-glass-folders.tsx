"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Folder,
  Scissors,
  Sparkles,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalonBackgroundPattern } from "./salon-vector-art";
import type { SectionProps } from "./types";

interface ServiceFile {
  name: string;
  price: string;
  duration: string;
  stylist: string;
  margin: string;
}

interface GlassFolder {
  id: string;
  title: string;
  colorScheme: "emerald" | "amber" | "sapphire";
  tabLabel: string;
  description: string;
  services: ServiceFile[];
}

export const SalonGlassFolders: React.FC<SectionProps> = ({ config }) => {
  const [activeFolderId, setActiveFolderId] = useState<string>("folder-1");
  const [selectedService, setSelectedService] = useState<string>("Classic Fade");

  const folders: GlassFolder[] = [
    {
      id: "folder-1",
      title: "Signature Cuts & Fades",
      colorScheme: "emerald",
      tabLabel: "High Volume · Daily Bread",
      description: "Quick 20–35 min chair turnarounds that drive 65% of salon footfall.",
      services: [
        {
          name: "Classic Fade",
          price: "₹180",
          duration: "25m",
          stylist: "Rahul V.",
          margin: "82% Gross",
        },
        {
          name: "Beard Sculpting",
          price: "₹120",
          duration: "15m",
          stylist: "Ramesh Kumar",
          margin: "88% Gross",
        },
        {
          name: "Classic Fade + Beard Sculpt",
          price: "₹250",
          duration: "35m",
          stylist: "Ramesh Kumar",
          margin: "85% Gross",
        },
      ],
    },
    {
      id: "folder-2",
      title: "Spa & Skin Rituals",
      colorScheme: "sapphire",
      tabLabel: "High Margin · Up-Sells",
      description: "Relaxation therapies that double ticket averages during weekday lulls.",
      services: [
        {
          name: "De-Tan Facial + Charcoal Scrub",
          price: "₹450",
          duration: "40m",
          stylist: "Suresh P.",
          margin: "78% Gross",
        },
        {
          name: "Keratin Hair Spa",
          price: "₹999",
          duration: "55m",
          stylist: "Pooja Rao",
          margin: "80% Gross",
        },
        {
          name: "Herbal Oil Head Massage",
          price: "₹350",
          duration: "30m",
          stylist: "Deepak Verma",
          margin: "90% Gross",
        },
      ],
    },
    {
      id: "folder-3",
      title: "Royal VIP Grooming",
      colorScheme: "amber",
      tabLabel: "Bespoke VIP Packages",
      description: "Luxury wedding and special occasion packages with master barber dedication.",
      services: [
        {
          name: "Groom Royal Wedding Package",
          price: "₹1,500",
          duration: "90m",
          stylist: "Senior Master",
          margin: "75% Gross",
        },
        {
          name: "Pre-Bridal Radiance Glow",
          price: "₹2,200",
          duration: "120m",
          stylist: "Senior Stylist",
          margin: "76% Gross",
        },
        {
          name: "VIP Styling Bay Half-Day",
          price: "₹3,500",
          duration: "180m",
          stylist: "Salon Owner",
          margin: "85% Gross",
        },
      ],
    },
  ];

  return (
    <section id="services-vault" className="py-24 bg-[#080d0a] relative overflow-hidden">
      {/* Background Illustrated Pattern */}
      <SalonBackgroundPattern opacity={0.14} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Warm Ambient Studio Halos */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[400px] bg-gradient-to-r from-amber-600/10 via-emerald-600/15 to-transparent blur-[160px] pointer-events-none rounded-full z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40 font-mono"
          >
            💈 21st.dev Glass Folder Architecture · Frosted Glass Vault
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Menu Vaults: Glass Folder Architecture for Salon Services
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            Organize your grooming packages into frosted glassmorphic vaults. Hover or tap any glass folder to fan out service cards, live margins, and automated chair duration allocations.
          </p>
        </div>

        {/* 3 Frosted Glass Folders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {folders.map((folder) => {
            const isActive = folder.id === activeFolderId;
            return (
              <div
                key={folder.id}
                onMouseEnter={() => setActiveFolderId(folder.id)}
                onClick={() => setActiveFolderId(folder.id)}
                className={`relative rounded-[2.5rem] p-6 sm:p-7 transition-all duration-500 cursor-pointer group flex flex-col justify-between ${
                  isActive
                    ? "bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#0b1410] border-2 border-emerald-400 shadow-2xl shadow-emerald-950/70 -translate-y-2"
                    : "bg-slate-950/75 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                }`}
                style={{
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                }}
              >
                {/* Frosted Folder Tab Poking Out Top */}
                <div
                  className={`absolute -top-3.5 left-7 px-4 py-1 rounded-t-xl text-[10px] font-mono font-bold uppercase tracking-wider border-t border-x transition-colors ${
                    isActive
                      ? "bg-slate-900 border-emerald-400 text-emerald-300 shadow-md"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {folder.tabLabel}
                </div>

                <div>
                  {/* Folder Header */}
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Folder className="h-3.5 w-3.5" />
                      {folder.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {folder.services.length} Services
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                    {folder.description}
                  </p>

                  {/* Fanned-Out Service Cards (Stack Effect) */}
                  <div className="space-y-3">
                    {folder.services.map((svc, sIdx) => {
                      const isSvcSelected = selectedService === svc.name;
                      return (
                        <div
                          key={svc.name}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedService(svc.name);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between group/card ${
                            isSvcSelected
                              ? "bg-slate-900 border-amber-400 shadow-lg shadow-amber-950/40 translate-x-1"
                              : "bg-slate-950/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"
                          }`}
                          style={{
                            transform: isActive
                              ? `translateY(${sIdx * -2}px) rotate(${sIdx === 0 ? -1 : sIdx === 1 ? 1 : 0}deg)`
                              : "none",
                          }}
                        >
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                              <span>{svc.name}</span>
                              {isSvcSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>⏱️ {svc.duration}</span>
                              <span>·</span>
                              <span>Stylist: {svc.stylist}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-base font-black text-emerald-400 font-mono">
                              {svc.price}
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {svc.margin}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Folder Footer */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    Auto-Dispatches to Chair #1
                  </span>
                  <Link
                    href="/s/ramesh-barber/services"
                    className="text-amber-300 hover:text-white font-semibold text-xs flex items-center gap-1 transition-colors"
                  >
                    <span>View Menu</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
