"use client";

import React, { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api";
import type { Salon, Ticket } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, maskPhone } from "@/lib/utils";
import { LiveServiceTimer } from "@/components/live-service-timer";
import { ConnectionPill } from "@/components/connection-pill";
import {
  Scissors,
  Armchair,
  Clock,
  Users,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Wifi,
  RefreshCw,
  Megaphone,
} from "lucide-react";

// Zero Server Waste (Rule 1): Dual-Tone Airport Chime via Web Audio API (in-memory client synthesis)
function playAirportChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    // Airport Departure Harmonic: F5 (698.46 Hz) -> C5 (523.25 Hz)
    playTone(698.46, now, 0.55);
    playTone(523.25, now + 0.35, 0.75);
  } catch (err) {
    console.warn("Client Web Audio chime synthesis failed:", err);
  }
}

// Zero Server Waste (Rule 1): Client-side Web Speech API Announcement
function announceTicketVoice(ticketNumber: number, customerName: string, stylistName?: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const destination = stylistName ? `with ${stylistName}` : "to the active chair";
    const text = `Ticket number ${ticketNumber}, ${customerName}, please step ${destination}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis announcement skipped:", err);
  }
}

export default function TvClient({ slug }: { slug: string }) {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [lastSummoned, setLastSummoned] = useState<Ticket | null>(null);
  const [showSummonFlash, setShowSummonFlash] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const prevCalledIdRef = useRef<string | null>(null);

  // Digital clock running in client RAM
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate Door QR Code client-side
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;
    const origin = window.location.origin;
    const joinUrl = `${origin}/s/${slug}`;
    QRCode.toDataURL(joinUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn("Failed to generate door QR for TV:", err));
  }, [slug]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Trigger audio & visual spotlight alert for newly called ticket
  const triggerSummonAlert = (ticket: Ticket) => {
    setLastSummoned(ticket);
    setShowSummonFlash(true);

    if (soundEnabled) {
      playAirportChime();
      setTimeout(() => {
        announceTicketVoice(
          ticket.ticketNumber,
          ticket.customerName,
          (ticket as any).stylistName
        );
      }, 650);
    }

    // Auto-dismiss the highlight banner after 12s
    setTimeout(() => {
      setShowSummonFlash(false);
    }, 12000);
  };

  const fetchQueueData = async () => {
    try {
      setIsRefreshing(true);
      const salonRes = await api.salons.get(slug).catch(() => null);

      if (salonRes && salonRes.salon) {
        setSalon(salonRes.salon);
        const queueRes = await api.queue.getActive(salonRes.salon.id).catch(() => ({ tickets: [] }));
        const tickets = queueRes?.tickets || [];
        setActiveTickets(tickets);

        const called = tickets.find((t) => t.status === "CALLED" || t.status === "SUMMONED");
        if (called) {
          if (prevCalledIdRef.current !== called.id) {
            prevCalledIdRef.current = called.id;
            triggerSummonAlert(called);
          }
        } else {
          prevCalledIdRef.current = null;
        }
      } else {
        // Fallback for demo or custom slugs (e.g. 'royal')
        const formattedName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) + " Salon" : "Salon Lounge";
        setSalon((prev) => prev || {
          id: `salon-${slug}`,
          name: formattedName,
          slug,
          phone: "+91 98765 00000",
          currency: "INR",
          countryCode: "IN",
          stylists: [],
          services: [],
        });
        setActiveTickets([]);
      }
    } catch (err) {
      console.warn("TV queue fetch error (graceful fallback active):", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, [slug]);

  // Real-time WebSocket connection
  const { isConnected, status, reconnectAttempts } = useSalonSocket(salon?.id, (event) => {
    fetchQueueData();

    if (event.type === "TICKET_CALLED" || event.type === "TICKET_SUMMONED") {
      const ticket = event.ticket || (event as any).payload?.ticket;
      if (ticket) {
        prevCalledIdRef.current = ticket.id;
        triggerSummonAlert(ticket);
      }
    }
  });

  const currentlyServing = activeTickets.filter(
    (t) =>
      t.status === "IN_SERVICE" ||
      t.status === "IN_CHAIR" ||
      t.status === "CALLED" ||
      t.status === "SUMMONED"
  );
  const nextInLine = activeTickets.filter(
    (t) => t.status === "WAITING" || t.status === "SOFT_BUMPED"
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden p-4 sm:p-8 select-none">
      {/* 1. TOP AIRPORT DEPARTURE HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b-2 border-slate-800">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-xl shadow-amber-500/20 shrink-0">
            <Scissors className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase">
                {salon?.name || "Salon Waiting Lounge"}
              </h1>
              <Badge variant="success" className="text-[11px] font-bold px-2.5 py-0.5 uppercase tracking-wider">
                Live TV
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                AIRPORT DEPARTURE QUEUE BOARD
              </span>
              <ConnectionPill isConnected={isConnected} status={status} reconnectAttempts={reconnectAttempts} />
            </div>
          </div>
        </div>

        {/* Action Controls & Digital Clock */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Audio Chime Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playAirportChime();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              soundEnabled
                ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title="Click to toggle airport departure chime"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span>Chime Active</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-slate-500" />
                <span>Enable Sound</span>
              </>
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span>Fullscreen</span>
              </>
            )}
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchQueueData}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
            title="Refresh Queue Board"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <div className="h-10 w-px bg-slate-800 hidden sm:block" />

          {/* Waiting in Lounge Counter */}
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold block">
              Waiting Guests
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              {activeTickets.length}
            </span>
          </div>

          {/* Real-time Clock */}
          <div className="text-right font-mono">
            <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold block">
              Current Time
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white">
              {currentTime || "--:--:--"}
            </span>
          </div>
        </div>
      </header>

      {/* 2. SPOTLIGHT FLASH BANNER (WHEN TICKET SUMMONED) */}
      {showSummonFlash && lastSummoned && (
        <div className="my-4 p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 animate-pulse border-4 border-amber-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-3xl shadow-lg shrink-0">
              #{lastSummoned.ticketNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-slate-950" />
                <span className="text-xs uppercase font-black tracking-widest text-slate-900">
                  NOW CALLING TO CHAIR
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                {lastSummoned.customerName}
              </h2>
            </div>
          </div>

          <div className="text-right">
            <Badge variant="outline" className="bg-slate-950 text-amber-300 border-slate-950 font-bold text-sm px-4 py-1.5">
              STEP TO CHAIR &rarr;
            </Badge>
            <p className="text-xs font-bold text-slate-900 mt-1">Please proceed to your stylist</p>
          </div>
        </div>
      )}

      {/* 3. SPLIT AIRPORT BOARD (NOW SERVING vs NEXT IN LINE) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-start">
        {/* LEFT COLUMN: ACTIVE CHAIRS / NOW SERVING (5 COLS) */}
        <section className="lg:col-span-5 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/20 rounded-3xl border-2 border-emerald-500/40 p-5 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <Armchair className="h-6 w-6 text-emerald-400" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-emerald-400">
                Now Serving
              </h2>
            </div>
            <Badge variant="success" className="text-xs px-3 py-1 font-bold">
              {currentlyServing.length} ACTIVE
            </Badge>
          </div>

          {currentlyServing.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Armchair className="h-12 w-12 mx-auto stroke-1 opacity-50 text-emerald-400" />
              <p className="text-base font-semibold text-slate-400">
                Stylist chairs are ready and preparing for next guests.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {currentlyServing.map((t) => (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl border-2 transition-all shadow-xl ${
                    t.status === "CALLED" || t.status === "SUMMONED"
                      ? "bg-amber-500/10 border-amber-400 shadow-amber-500/10 animate-pulse"
                      : "bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-widest font-black text-slate-400 flex items-center gap-1.5">
                      {t.status === "CALLED" || t.status === "SUMMONED" ? (
                        <>
                          <Megaphone className="h-3.5 w-3.5 text-amber-400 animate-bounce" />
                          <span className="text-amber-300">SUMMONED TO CHAIR</span>
                        </>
                      ) : (
                        <>
                          <Armchair className="h-3.5 w-3.5 text-emerald-400" />
                          <span>IN SERVICE</span>
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-2">
                      {(t.status === "IN_SERVICE" || t.status === "IN_CHAIR") && (
                        <LiveServiceTimer
                          startedTime={(t as any).startedTime || (t as any).seatedAt || t.createdAt}
                          variant="badge"
                        />
                      )}
                      <Badge
                        variant={
                          t.status === "CALLED" || t.status === "SUMMONED" ? "warning" : "success"
                        }
                        className="text-xs font-bold"
                      >
                        {t.status === "CALLED" || t.status === "SUMMONED"
                          ? "STEP FORWARD"
                          : "IN PROGRESS"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg font-mono shrink-0">
                        #{t.ticketNumber}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">{t.customerName}</h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {t.customerPhone ? maskPhone(t.customerPhone) : "Walk-in Guest"}
                        </p>
                      </div>
                    </div>

                    {(t as any).stylistName && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">
                          Stylist
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {(t as any).stylistName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: NEXT IN LINE (7 COLS) */}
        <section className="lg:col-span-7 bg-slate-900/60 rounded-3xl border-2 border-slate-800 p-5 sm:p-7 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                Next In Line
              </h2>
            </div>
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Dynamic Wait Estimation
            </span>
          </div>

          {nextInLine.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Users className="h-12 w-12 mx-auto stroke-1 opacity-50 text-blue-400" />
              <p className="text-base font-semibold text-slate-400">
                Queue is clear! Please scan the Door QR to enter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {nextInLine.map((t, idx) => (
                <div
                  key={t.id}
                  className="py-3.5 flex items-center justify-between hover:bg-slate-800/40 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-base font-bold text-slate-500 font-mono w-6">
                      #{idx + 1}
                    </span>
                    <div className="h-11 w-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 text-lg font-mono shrink-0">
                      #{t.ticketNumber}
                    </div>
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-white">{t.customerName}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {t.customerPhone ? maskPhone(t.customerPhone) : "Walk-in Guest"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-sky-400 font-mono">
                      ~{t.estimatedWaitMinutes}m
                    </span>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      Estimated Wait
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 4. LOWER-THIRD BANNER WITH CLIENT-SIDE DOOR QR CODE & LOUNGE WI-FI */}
      <footer className="pt-4 border-t-2 border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-4">
          {/* Dynamic Scannable Door QR Code */}
          {qrDataUrl && (
            <div className="p-1.5 rounded-xl bg-white border border-slate-300 shrink-0 shadow-lg">
              <img
                src={qrDataUrl}
                alt="Door QR Code"
                className="w-14 h-14 object-contain rounded-md"
              />
            </div>
          )}

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="text-slate-950 font-black text-[10px]">
                SELF CHECK-IN
              </Badge>
              <span className="text-white font-bold">
                Scan with phone camera to join queue or track ticket
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Privacy Protected: All phone numbers masked • Live state synchronized in client RAM
            </p>
          </div>
        </div>

        {/* Lounge Amenities (Wi-Fi) */}
        {salon?.wifiSsid && (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Wifi className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-400 font-normal">Lounge Wi-Fi: </span>
              <strong className="text-white font-bold">{salon.wifiSsid}</strong>
              {salon.wifiPassword && (
                <>
                  <span className="text-slate-500 mx-1.5">•</span>
                  <span className="text-slate-400 font-normal">Pass: </span>
                  <strong className="text-white font-bold">{salon.wifiPassword}</strong>
                </>
              )}
            </div>
          </div>
        )}

        <div className="text-slate-500 text-[11px] hidden lg:block">
          Engine Que System • Zero Waiting Hassle
        </div>
      </footer>
    </div>
  );
}
