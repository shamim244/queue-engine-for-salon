"use client";

import React from "react";
import { Scissors, Sparkles, Clock, Check, Star, ShieldCheck, Armchair, Flame } from "lucide-react";
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
      image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80",
      alt: "Barber performing classic fade haircut with precision clippers",
    },
    {
      name: "Beard Sculpting & Razor Finish",
      category: "Beard & Shave",
      price: "₹120",
      duration: "15 mins",
      stylist: "Ramesh Kumar",
      tag: "Express Service",
      image: "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80",
      alt: "Hot towel straight razor beard sculpting in vintage barber chair",
    },
    {
      name: "Classic Fade & Beard Sculpt Combo",
      category: "Signature Combo",
      price: "₹250",
      duration: "35 mins",
      stylist: "Ramesh Kumar",
      tag: "Best Value",
      image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
      alt: "Full haircut and beard trim styling station with illuminated vanity mirror",
    },
    {
      name: "De-Tan Facial + Charcoal Scrub",
      category: "Skin Treatment",
      price: "₹450",
      duration: "40 mins",
      stylist: "Suresh P.",
      tag: "High Margin",
      image: "https://images.unsplash.com/photo-1512290900672-1f4190885e3d?auto=format&fit=crop&w=600&q=80",
      alt: "Salon revitalizing facial mask and skin treatment",
    },
    {
      name: "Keratin Hair Spa Treatment",
      category: "Deep Conditioning",
      price: "₹999",
      duration: "60 mins",
      stylist: "Pooja Rao",
      tag: "Luxury Salon",
      image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
      alt: "Deep conditioning keratin hair spa and wash basin",
    },
    {
      name: "Head Massage & De-Tan Facial",
      category: "Relaxation Combo",
      price: "₹450",
      duration: "45 mins",
      stylist: "Deepak V.",
      tag: "Weekend Favorite",
      image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80",
      alt: "Aromatic herbal oil head massage and wellness session",
    },
    {
      name: "Bride / Groom Royal Wedding Package",
      category: "Bridal / Groom",
      price: "₹1,500",
      duration: "90 mins",
      stylist: "Master Stylist",
      tag: "Full Studio VIP",
      image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80",
      alt: "Luxury royal grooming package with master barber styling",
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
    <section className="py-24 bg-[#0a0f0d] border-y border-slate-800/80 relative overflow-hidden">
      {/* Warm Ambient Salon Halos */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-r from-amber-600/10 via-emerald-600/15 to-transparent blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-amber-500/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge
            variant="outline"
            className="mb-3 px-3.5 py-1 text-xs border-amber-500/40 text-amber-300 bg-amber-500/10 shadow-lg shadow-amber-950/40"
          >
            💈 Authentic Grooming Packages · 3D Menu Ribbon
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Designed for Real Salon Catalogs &amp; Combos
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
            From ₹180 quick fades to ₹1,500 bridal grooming packages, our engine calculates queue durations dynamically based on the exact services selected by walk-in guests.
          </p>
        </div>

        {/* 3D Perspective Marquee Ribbon with Authentic Salon Photography */}
        <div
          className="relative py-4"
          style={{
            perspective: "1200px",
          }}
        >
          <div
            style={{
              transform: "rotateX(6deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <Marquee pauseOnHover className="[--duration:36s]">
              {servicePackages.map((pkg, idx) => (
                <div
                  key={idx}
                  className="w-72 sm:w-80 mx-3 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-950 to-[#080d0a] border-2 border-slate-800/90 hover:border-amber-500/60 transition-all duration-300 shadow-2xl flex flex-col justify-between overflow-hidden group hover:scale-[1.02]"
                >
                  {/* Photo Vignette */}
                  <div className="relative h-36 w-full overflow-hidden bg-slate-900">
                    <img
                      src={pkg.image}
                      alt={pkg.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    <div className="absolute top-2.5 left-2.5">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950/80 border border-amber-500/40 text-amber-300 backdrop-blur-md">
                        {pkg.category}
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="text-xs font-bold text-white bg-emerald-600/90 px-2 py-0.5 rounded-md backdrop-blur-md">
                        {pkg.duration}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
                        <span className="flex items-center gap-1">
                          <Scissors className="h-3.5 w-3.5" />
                          <span>{pkg.tag}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Stylist: {pkg.stylist}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-200 transition-colors">
                        {pkg.name}
                      </h4>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xl font-black text-emerald-400 font-mono">
                        {pkg.price}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>Dynamic Queue Time</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </Marquee>
          </div>
        </div>

        {/* Real Indian Salon Owner Testimonials */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 p-6 flex flex-col justify-between space-y-4 shadow-xl hover:border-emerald-500/40 transition-colors relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Scissors className="h-3.5 w-3.5 text-amber-400" />
                    {t.salon}
                  </span>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, sIdx) => (
                      <Star key={sIdx} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 italic leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-white">{t.owner}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{t.location}</p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] border-emerald-500/40 text-emerald-300 bg-emerald-500/10 font-mono font-semibold"
                >
                  {t.metric}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
