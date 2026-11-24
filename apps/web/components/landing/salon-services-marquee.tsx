"use client";

import React from "react";
import { Scissors, Sparkles, Clock, Check, Star, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Marquee } from "@/components/ui/marquee";
import type { SectionProps } from "./types";

export const SalonServicesMarquee: React.FC<SectionProps> = ({ config }) => {
  const servicePackages = [
    {
      name: "Classic Fade & Haircut",
      category: "Haircare",
      price: "₹180",
      duration: "25 mins",
      stylist: "Rahul V.",
      tag: "Top Walk-In Choice",
    },
    {
      name: "Beard Sculpting & Razor Finish",
      category: "Beard & Shave",
      price: "₹120",
      duration: "15 mins",
      stylist: "Ramesh Kumar",
      tag: "Express Service",
    },
    {
      name: "Haircut + Beard Styling Combo",
      category: "Signature Combo",
      price: "₹250",
      duration: "35 mins",
      stylist: "Ramesh Kumar",
      tag: "Best Value",
    },
    {
      name: "De-Tan Facial + Charcoal Scrub",
      category: "Skin Treatment",
      price: "₹450",
      duration: "40 mins",
      stylist: "Suresh P.",
      tag: "High Margin",
    },
    {
      name: "Keratin Hair Spa Treatment",
      category: "Deep Conditioning",
      price: "₹999",
      duration: "60 mins",
      stylist: "Pooja Rao",
      tag: "Luxury Salon",
    },
    {
      name: "Aromatic Hot Oil Head Massage",
      category: "Relaxation",
      price: "₹350",
      duration: "30 mins",
      stylist: "Deepak V.",
      tag: "Weekend Favorite",
    },
    {
      name: "Royal Groom & Wedding Package",
      category: "Bridal / Groom",
      price: "₹1,800",
      duration: "90 mins",
      stylist: "Master Stylist",
      tag: "Full Studio",
    },
  ];

  const testimonials = [
    {
      salon: "Ramesh Traditional Barber",
      location: "Indiranagar, Bengaluru",
      owner: "Ramesh Kumar",
      quote:
        "Weekend walk-outs dropped from 12 clients a day to almost zero. Customers step out for chai and walk back in when their phone buzzes.",
      metric: "+₹18,500 / month recovered",
    },
    {
      salon: "Aura Unisex Luxury Lounge",
      location: "Bandra West, Mumbai",
      owner: "Vikram Malhotra",
      quote:
        "The waiting lounge TV screen changed our salon atmosphere completely. No more crowded reception counter or customers asking whose turn it is.",
      metric: "100% peaceful waiting lounge",
    },
    {
      salon: "Modern Cuts & Spa",
      location: "Koregaon Park, Pune",
      owner: "Pooja Shinde",
      quote:
        "Barbers love the mirror touch numpad. In 2 taps with their PIN, the next customer is called and UPI bill is calculated.",
      metric: "<15ms chair turnover",
    },
  ];

  return (
    <section className="py-20 bg-slate-900/40 border-y border-slate-800/80 relative overflow-hidden">
      {/* Subtle Glows */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-600/10 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge
            variant="outline"
            className="mb-3 px-3 py-1 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          >
            Customized Service Engine
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered For Authentic Indian Salon Services
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
            From quick 15-minute beard trims to 90-minute royal grooming combos, the queue engine auto-calculates dynamic wait times based on services selected at the chair.
          </p>
        </div>

        {/* Row 1: Services Stream */}
        <div className="relative mb-6">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

          <Marquee pauseOnHover className="[--duration:35s]">
            {servicePackages.map((pkg, idx) => (
              <div
                key={idx}
                className="w-72 sm:w-80 rounded-2xl bg-slate-950/90 border border-slate-800 p-4 shadow-xl hover:border-emerald-500/40 transition-colors mx-2 shrink-0 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    {pkg.category}
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-medium">
                    {pkg.tag}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {pkg.name}
                </h4>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-400" />
                    {pkg.duration}
                  </span>
                  <span className="text-base font-black text-white font-mono">
                    {pkg.price}
                  </span>
                </div>
              </div>
            ))}
          </Marquee>
        </div>

        {/* Row 2: Testimonials & Proof Stream */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

          <Marquee reverse pauseOnHover className="[--duration:45s]">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="w-80 sm:w-96 rounded-2xl bg-slate-950/90 border border-slate-800 p-5 shadow-xl hover:border-teal-500/40 transition-colors mx-2 shrink-0"
              >
                <div className="flex items-center gap-1 text-amber-400 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>

                <p className="text-xs text-slate-300 italic leading-relaxed mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white text-xs">{t.owner}</p>
                    <p className="text-[10px] text-slate-400">{t.salon} · {t.location}</p>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    {t.metric}
                  </span>
                </div>
              </div>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
};
