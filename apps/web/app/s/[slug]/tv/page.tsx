"use client";

import React, { useEffect, useState, use } from "react";
import { api, Salon, Ticket } from "@/lib/api";
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
  Tv,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function SalonLobbyTvPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [lastSummoned, setLastSummoned] = useState<Ticket | null>(null);

  // Digital clock update
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

  const fetchQueueData = async () => {
    try {
      const salonRes = await api.salons.get(slug);
      if (salonRes.salon) setSalon(salonRes.salon);

      const queueRes = await api.queue.getActive(salonRes.salon.id);
      const tickets = queueRes.tickets || [];
      setActiveTickets(tickets);

      const called = tickets.find((t) => t.status === "CALLED" || t.status === "SUMMONED");
      if (called) setLastSummoned(called);
    } catch (err) {
      console.error("TV queue fetch error:", err);
    }
  };

  useEffect(() => {
    fetchQueueData();
  }, [slug]);

  // Real-time WebSocket connection
  const { isConnected, status, reconnectAttempts } = useSalonSocket(salon?.id, (event) => {
    console.log("[Lobby TV Board] Socket event:", event.type);
    fetchQueueData();
  });

  const currentlyServing = activeTickets.filter(
    (t) =>
      t.status === "IN_SERVICE" ||
      t.status === "IN_CHAIR" ||
      t.status === "CALLED" ||
      t.status === "SUMMONED"
  );
  const nextInLine = activeTickets.filter((t) => t.status === "WAITING" || t.status === "SOFT_BUMPED");


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden p-6 sm:p-10 select-none">
      {/* 1. TV BOARD TOP BANNER */}
      <header className="flex items-center justify-between pb-6 border-b-2 border-slate-800">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Scissors className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
              {salon?.name || "Salon Waiting Lounge"}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">AIRPORT DEPARTURE QUEUE BOARD</span>
              <ConnectionPill isConnected={isConnected} status={status} reconnectAttempts={reconnectAttempts} />
            </div>
          </div>
        </div>

        {/* Digital Time & Total in Waiting */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">
              Waiting in Lounge
            </span>
            <span className="text-3xl font-black text-amber-400">
              {activeTickets.length} <span className="text-base text-slate-500 font-medium">Guests</span>
            </span>
          </div>

          <div className="h-14 w-px bg-slate-800" />

          <div className="text-right font-mono">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">
              Live Time
            </span>
            <span suppressHydrationWarning className="text-3xl font-black text-white">{currentTime || "--:--:--"}</span>
          </div>
        </div>
      </header>

      {/* 2. AIRPORT-STYLE SPLIT BOARD */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-start">
        {/* LEFT COLUMN: NOW SERVING (5 COLS) */}
        <section className="lg:col-span-5 bg-gradient-to-br from-slate-900/90 to-emerald-950/20 rounded-3xl border-2 border-emerald-500/40 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
            <div className="flex items-center gap-3">
              <Armchair className="h-7 w-7 text-emerald-400" />
              <h2 className="text-2xl font-black uppercase tracking-wider text-emerald-400">
                Now Serving
              </h2>
            </div>
            <Badge variant="success" className="text-xs px-3 py-1 font-bold">
              ACTIVE CHAIRS
            </Badge>
          </div>

          {currentlyServing.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Armchair className="h-12 w-12 mx-auto stroke-1 opacity-50" />
              <p className="text-base font-semibold">Chairs are currently preparing for next guests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentlyServing.map((t) => (
                <div
                  key={t.id}
                  className={`p-6 rounded-2xl border-2 transition-all shadow-xl ${
                    t.status === "CALLED" || t.status === "SUMMONED"
                      ? "bg-amber-500/10 border-amber-400 animate-pulse"
                      : "bg-slate-900/90 border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest font-black text-slate-400">
                      {t.status === "CALLED" || t.status === "SUMMONED"
                        ? "📢 SUMMONED TO CHAIR"
                        : "💺 IN SERVICE"}
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
                      >
                        {t.status === "CALLED" || t.status === "SUMMONED"
                          ? "STEP TO CHAIR"
                          : "IN PROGRESS"}
                      </Badge>
                    </div>
                  </div>


                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-amber-500 text-slate-950 font-black text-3xl flex items-center justify-center shadow-lg">
                        #{t.ticketNumber}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white">{t.customerName}</h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {t.customerPhone ? maskPhone(t.customerPhone) : "Guest"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: NEXT IN LINE DEPARTURE TABLE (7 COLS) */}
        <section className="lg:col-span-7 bg-slate-900/60 rounded-3xl border-2 border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Clock className="h-7 w-7 text-blue-400" />
              <h2 className="text-2xl font-black uppercase tracking-wider text-white">
                Next In Line
              </h2>
            </div>
            <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
              Dynamic Wait Estimation
            </span>
          </div>

          {nextInLine.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Users className="h-12 w-12 mx-auto stroke-1 opacity-50" />
              <p className="text-base font-semibold">Queue is clear! Please scan the Door QR to enter.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {nextInLine.map((t, idx) => (
                <div
                  key={t.id}
                  className="py-4 flex items-center justify-between hover:bg-slate-800/40 px-3 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-5">
                    <span className="text-lg font-bold text-slate-500 font-mono w-6">
                      #{idx + 1}
                    </span>
                    <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 text-xl font-mono">
                      #{t.ticketNumber}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{t.customerName}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {t.customerPhone ? maskPhone(t.customerPhone) : "Walk-in Guest"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xl font-black text-blue-400 font-mono">
                      ~{t.estimatedWaitMinutes}m
                    </span>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                      Estimated Wait
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 3. TV LOWER-THIRD SPONSORED TICKER / QR INVITATION */}
      <footer className="pt-4 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-3">
          <Badge variant="warning" className="text-slate-950 font-bold">
            DOOR QR
          </Badge>
          <span>Scan the QR code at the mirror to check in & track your ticket on your own phone!</span>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <span>Privacy Protected: All phone numbers masked</span>
          <span>•</span>
          <span>Engine Que System v1.4.3</span>
        </div>
      </footer>
    </div>
  );
}
