"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Salon, Ticket } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth-context";
import { SalonNavbar } from "@/components/salon/salon-navbar";
import { SalonServicesList } from "@/components/salon/salon-services-list";
import { SalonStylists } from "@/components/salon/salon-stylists";
import { SalonReviews } from "@/components/salon/salon-reviews";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  Clock,
  Users,
  CheckCircle2,
  Armchair,
  Sparkles,
  Zap,
  MapPin,
  Calendar,
  ShieldCheck,
  Star,
  Check,
  Navigation,
  Phone,
  MessageCircle,
  Mail,
  Instagram,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export default function CustomerStorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();

  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSalonAndQueue = async () => {
    try {
      const salonRes = await api.salons.get(slug);
      if (salonRes.salon) {
        setSalon(salonRes.salon);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(`salon_cache_${slug}`, JSON.stringify(salonRes.salon));
          } catch {}
        }
      }

      const queueRes = await api.queue.getActive(salonRes.salon.id);
      setActiveTickets(queueRes.tickets || []);
    } catch (err) {
      console.error("Failed to load salon storefront:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // SWR Instant Pre-warm
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`salon_cache_${slug}`);
        if (cached) {
          setSalon(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}
    }
    fetchSalonAndQueue();
  }, [slug]);

  // Real-time WebSocket hook
  useSalonSocket(salon?.id, () => {
    fetchSalonAndQueue();
  });

  const chairsServing = activeTickets.filter(
    (t) => t.status === "IN_CHAIR" || t.status === "IN_SERVICE"
  );
  const waitingSequence = activeTickets.filter(
    (t) => t.status === "WAITING" || t.status === "SUMMONED" || t.status === "CALLED"
  );
  const totalWaitMinutes = waitingSequence.length * 15;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 scroll-smooth">
      {/* 1. TOP NAVBAR (Clean, modular, flat links, no enclosed container box) */}
      <SalonNavbar slug={slug} salon={salon} user={user} activeRoute="home" />

      {/* 2. MAIN STOREFRONT CONTENT */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 space-y-12 flex-1">
        {/* HERO SECTION */}
        <section
          id="hero"
          className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-6 sm:p-10 shadow-2xl scroll-mt-24"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning" className="text-xs px-3 py-0.5">
                  ⭐ 4.9 RATED SALON
                </Badge>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Accepting Walk-ins
                </span>
                <span className="text-xs text-blue-400 font-medium bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                  🚀 No-Wait Engine
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                {salon?.name || "Professional Salon & Grooming"}
              </h2>

              <p className="text-base sm:text-lg text-amber-300/90 font-medium">
                {salon?.tagline || "Precision Barbering, Beard Architecture & Luxury Spa Services"}
              </p>

              {user ? (
                <p className="text-xs sm:text-sm text-slate-300">
                  👋 Welcome back, <strong className="text-white">{user.fullName || user.username}</strong>! Skip the wait and reserve your spot in today&apos;s live queue.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Join the queue directly from your phone, relax at a nearby cafe, and walk in right as your barber chair opens up!
                </p>
              )}

              {/* Quick Info Chips */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs text-slate-400">
                {salon?.address && (
                  <span className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800">
                    <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="truncate max-w-[220px]">{salon.address}</span>
                  </span>
                )}

                {salon?.phone && (
                  <a
                    href={`tel:${salon.phone}`}
                    className="flex items-center gap-1.5 bg-slate-950/70 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{salon.phone}</span>
                  </a>
                )}

                <span className="flex items-center gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>{salon?.operatingHours?.split("|")[0] || "8:00 AM – 9:00 PM"}</span>
                </span>
              </div>
            </div>

            {/* REAL-TIME WAIT & PRIMARY ACTION CARD (Optimized for Android touch) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-4 md:min-w-[320px]">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Live Queue Wait Time
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tight">
                    ~{totalWaitMinutes}m
                  </span>
                  <span className="text-xs text-slate-400">
                    ({waitingSequence.length} waiting)
                  </span>
                </div>
                {totalWaitMinutes > 0 && (
                  <span className="text-[11px] text-amber-300/80 font-medium flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-amber-400 inline shrink-0" />
                    <span>Expected chair turn if you join now: ~{new Date(Date.now() + totalWaitMinutes * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">Active Barbers</span>
                  <span className="font-bold text-white">{salon?.stylists?.length || 1} Stylists</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-medium">In Service</span>
                  <span className="font-bold text-emerald-400">{chairsServing.length} Chairs</span>
                </div>
              </div>

              {/* High-Converting CTA Button (min-height 52px for thumbs) */}
              <Link
                href={`/s/${slug}/queue`}
                className="w-full min-h-[52px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-98 transition-transform"
              >
                <Zap className="h-4 w-4 fill-slate-950" />
                <span>Join Live Queue Now</span>
              </Link>

              <div className="text-center">
                <Link
                  href={`/s/${slug}/services`}
                  className="text-xs text-slate-400 hover:text-amber-400 transition-colors underline underline-offset-4"
                >
                  Explore Full Services &amp; Prices →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 3. MODULAR SERVICES SECTION */}
        <SalonServicesList services={salon?.services || []} slug={slug} showAllLink={true} />

        {/* 4. MODULAR MASTER STYLISTS & BARBERS SECTION */}
        <SalonStylists stylists={salon?.stylists || []} chairsServing={chairsServing} />

        {/* 5. MODULAR CUSTOMER REVIEWS */}
        <SalonReviews />

        {/* 6. ABOUT US & AMENITIES */}
        <section id="about" className="space-y-6 pt-2 scroll-mt-24">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Our Story &amp; Craft
                  </Badge>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  About {salon?.name || "Our Salon"}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {salon?.about ||
                    "Welcome to our modern grooming studio! We bring together old-school barber craft and contemporary styling techniques in an elevated, welcoming space. Whether you need a quick professional taper, classic hot-towel shave, or complete hair styling, our dedicated artists deliver precision perfection every single time."}
                </p>
              </div>

              {/* Trust Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-3 shrink-0 md:w-64">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <ShieldCheck className="h-4 w-4" />
                    <span>UV Sterilization</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Blades, scissors &amp; combs sterilized before every client.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Zap className="h-4 w-4" />
                    <span>Zero In-Shop Wait</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Queue from your phone; relax until summoned to the chair.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                    <Star className="h-4 w-4" />
                    <span>Master Stylists</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Certified barbers passionate about contemporary grooming.
                  </p>
                </div>
              </div>
            </div>

            {/* Salon Amenities Showcase */}
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block mb-3">
                Studio Amenities &amp; Guest Comforts
              </span>
              <div className="flex flex-wrap gap-2">
                {(salon?.amenities && salon.amenities.length > 0
                  ? salon.amenities
                  : [
                      "Air Conditioned",
                      "High-Speed Wi-Fi",
                      "Complimentary Chai",
                      "100% Sanitized Tools",
                      "UPI & Cards Accepted",
                      "Comfortable Waiting Lounge",
                    ]
                ).map((amenity, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-medium"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{amenity}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. CONTACT & LOCATION */}
        <section id="contact" className="space-y-6 pt-2 scroll-mt-24">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-400" />
              <span>Contact Us, Hours &amp; Location</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Drop by for a fresh cut or reach out directly with any special requests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Operating Hours</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Always welcoming walk-ins during open hours</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-mono">
                  {salon?.operatingHours || "Mon - Sat: 8:00 AM – 9:00 PM\nSunday: 8:00 AM – 2:00 PM"}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold pt-2 border-t border-slate-800/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Open for Appointments &amp; Walk-ins</span>
              </div>
            </Card>

            <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Salon Location</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Visit our clean studio</p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {salon?.address || "Station Road, Main Bazaar, India"}
                </p>
              </div>

              {salon?.googleMapsUrl ? (
                <a
                  href={salon.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5 text-amber-400" />
                  <span>Get Directions on Google Maps</span>
                </a>
              ) : (
                <div className="text-[11px] text-slate-500 italic">Directions available at reception</div>
              )}
            </Card>

            <Card className="bg-slate-900/60 border-slate-800 p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Direct Channels</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Call or message reception anytime</p>
                </div>

                <div className="space-y-2">
                  {salon?.phone && (
                    <a
                      href={`tel:${salon.phone}`}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{salon.phone}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Call Now</span>
                    </a>
                  )}

                  {salon?.whatsappPhone && (
                    <a
                      href={`https://wa.me/${salon.whatsappPhone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                        <span>WhatsApp Chat</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold">Instant</span>
                    </a>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                Managed securely by Queue Engine Platform
              </div>
            </Card>
          </div>
        </section>
      </main>

      {/* 8. FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-10 px-4 sm:px-8 mt-12 text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
              <Scissors className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-white">{salon?.name || "Salon Engine"}</span>
            <span className="text-slate-600">•</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href={`/s/${slug}/queue`} className="hover:text-amber-400 transition-colors">
              Live Queue
            </Link>
            <Link href={`/s/${slug}/services`} className="hover:text-amber-400 transition-colors">
              Services Menu
            </Link>
            <Link href={`/s/${slug}/tv`} target="_blank" className="hover:text-white transition-colors">
              Lobby TV
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Staff / Owner Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
