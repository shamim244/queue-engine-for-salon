"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { api, Salon, Ticket, Service, Stylist } from "@/lib/api";
import { useSalonSocket } from "@/lib/socket";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency, maskPhone } from "@/lib/utils";
import {
  Scissors,
  Clock,
  Users,
  CheckCircle2,
  Armchair,
  Coffee,
  Sparkles,
  ChevronRight,
  User,
  Phone,
  Bookmark,
  BellRing,
  ExternalLink,
} from "lucide-react";

export default function CustomerDoorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [salon, setSalon] = useState<Salon | null>(null);
  const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // My Ticket (if checked in on this device)
  const [myTicket, setMyTicket] = useState<Ticket | null>(null);

  // Check-In Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Audio Chime notification
  const playChime = () => {
    try {
      if (typeof window !== "undefined") {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {}
  };

  const fetchSalonAndQueue = async () => {
    try {
      const salonRes = await api.salons.get(slug);
      if (salonRes.salon) {
        setSalon(salonRes.salon);
        if (!selectedServiceId && salonRes.salon.services?.length > 0) {
          setSelectedServiceId(salonRes.salon.services[0].id);
        }
      }

      const queueRes = await api.queue.getActive(salonRes.salon.id);
      const tickets = queueRes.tickets || [];
      setActiveTickets(tickets);

      // Check if user has an existing saved ticket in localStorage
      if (typeof window !== "undefined") {
        const storedTicketId = localStorage.getItem(`ticket_${slug}`);
        if (storedTicketId) {
          const matching = tickets.find((t) => t.id === storedTicketId);
          if (matching) {
            if (myTicket && myTicket.status !== "CALLED" && matching.status === "CALLED") {
              playChime();
            }
            setMyTicket(matching);
          } else if (myTicket && myTicket.id === storedTicketId) {
            // Ticket completed or cleared
            setMyTicket(null);
            localStorage.removeItem(`ticket_${slug}`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load customer queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalonAndQueue();
  }, [slug]);

  // Real-time WebSocket hook
  useSalonSocket(salon?.id, (event) => {
    console.log("[Customer Board] Event:", event.type);
    fetchSalonAndQueue();
  });

  const handleJoinQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !selectedServiceId) {
      alert("Please enter your name and choose a service");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await api.queue.checkIn({
        salonSlug: slug,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || "+91 98765 00000",
        serviceId: selectedServiceId,
        stylistId: selectedStylistId,
      });

      if (resp.ticket) {
        setMyTicket(resp.ticket);
        if (typeof window !== "undefined") {
          localStorage.setItem(`ticket_${slug}`, resp.ticket.id);
        }
        fetchSalonAndQueue();
      }
    } catch (err) {
      alert("Failed to join queue: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedService = salon?.services?.find((s) => s.id === selectedServiceId);
  const chairsServing = activeTickets.filter((t) => t.status === "IN_SERVICE");
  const waitingSequence = activeTickets.filter((t) => t.status === "WAITING" || t.status === "CALLED");

  // Calculate my position and people ahead
  const myIndex = myTicket
    ? waitingSequence.findIndex((t) => t.id === myTicket.id)
    : -1;
  const peopleAhead = myIndex > 0 ? myIndex : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-40 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Scissors className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white leading-tight">
                {salon?.name || "Salon Queue"}
              </h1>
              <p className="text-[11px] text-slate-400">Live Pocket Queue Board</p>
            </div>
          </div>

          <Link
            href={`/s/${slug}/tv`}
            target="_blank"
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 font-medium bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60"
          >
            <span>Lobby TV</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-6">
        {/* VIEW 1: NOT CHECKED IN YET -> LIGHTWEIGHT SELF CHECK-IN FORM */}
        {!myTicket ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Salon Banner */}
            <div className="text-center space-y-1.5 pt-2">
              <Badge variant="warning" className="text-xs px-3 py-0.5">
                ⚡ ZERO-FRICTION CHECK-IN
              </Badge>
              <h2 className="text-2xl font-black text-white">Join Today's Queue</h2>
              <p className="text-xs text-slate-400">
                Pick your haircut, grab a tea nearby, and we will alert you when your chair is ready!
              </p>
            </div>

            <Card className="border-slate-800 shadow-2xl">
              <CardContent className="p-5 space-y-5">
                <form onSubmit={handleJoinQueue} className="space-y-5">
                  {/* Name Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Your Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="e.g. Rahul Sharma"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="pl-10"
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Mobile Number (For WhatsApp / SMS Alerts)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="+91 98765 43210"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      We only message you when you are next in line.
                    </span>
                  </div>

                  {/* Service Selection Chips */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2">
                      Select Service *
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {salon?.services?.map((srv) => {
                        const isSelected = selectedServiceId === srv.id;
                        return (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => setSelectedServiceId(srv.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500"
                                : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700"
                            }`}
                          >
                            <span className="text-xl block mb-1">{srv.icon || "✂️"}</span>
                            <p className="font-bold text-xs truncate text-white">{srv.name}</p>
                            <div className="flex items-center justify-between text-[11px] mt-1 text-slate-400">
                              <span className="text-emerald-400 font-semibold">
                                {formatCurrency(srv.basePrice)}
                              </span>
                              <span>{srv.estimatedDurationMinutes}m</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stylist Selection (Optional) */}
                  {salon?.stylists && salon.stylists.length > 1 && (
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">
                        Stylist Preference
                      </label>
                      <select
                        className="flex h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        value={selectedStylistId || ""}
                        onChange={(e) => setSelectedStylistId(e.target.value || null)}
                      >
                        <option value="">⚡ Fastest Available Barber</option>
                        {salon.stylists.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} ({st.avgDurationMinutes || 25}m avg pace)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full h-13 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base shadow-lg shadow-amber-500/20"
                  >
                    {submitting ? "Securing Your Spot..." : "🎟️ Get My Digital Ticket"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* VIEW 2: CHECKED IN -> DUAL-VIEW (MY TICKET ON TOP + FULL SALON POCKET TV BELOW) */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* TOP CARD: PERSONAL LIVE TICKET TRACKER */}
            <Card className="border-2 border-amber-500 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 shadow-2xl p-6 text-center space-y-5">
              <div className="flex items-center justify-between">
                <Badge
                  variant={
                    myTicket.status === "CALLED"
                      ? "warning"
                      : myTicket.status === "IN_SERVICE"
                      ? "success"
                      : "default"
                  }
                  className="px-3 py-1 font-bold text-xs"
                >
                  {myTicket.status === "CALLED"
                    ? "📢 STEP TO CHAIR NOW!"
                    : myTicket.status === "IN_SERVICE"
                    ? "💺 CURRENTLY IN CHAIR"
                    : "🎟️ IN QUEUE"}
                </Badge>

                <span className="text-xs text-slate-400 font-mono">
                  {myTicket.customerPhone ? maskPhone(myTicket.customerPhone) : ""}
                </span>
              </div>

              {/* Big Ticket Number */}
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  Your Ticket Number
                </span>
                <div className="text-6xl font-black text-amber-400 tracking-tight">
                  #{myTicket.ticketNumber}
                </div>
                <h3 className="text-lg font-bold text-white mt-1">{myTicket.customerName}</h3>
              </div>

              {/* People Ahead & Wait Time Countdown */}
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-slate-800">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">People Ahead</span>
                  <span className="text-2xl font-black text-white">{peopleAhead}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Est. Wait Time</span>
                  <span className="text-2xl font-black text-blue-400">
                    ~{myTicket.estimatedWaitMinutes}m
                  </span>
                </div>
              </div>

              {/* Reassuring Chai Prompt */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 text-left flex items-start gap-3">
                <Coffee className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Feel free to grab tea or relax nearby!</strong> We will alert you with a WhatsApp notification and sound chime when you are summoned.
                </p>
              </div>

              {/* Shortcut: Save to Profile */}
              <Link href="/me" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-dashed border-slate-700 hover:border-amber-400/60 text-slate-300 gap-1.5"
                >
                  <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                  <span>Save this haircut to my profile for 1-tap next time</span>
                </Button>
              </Link>
            </Card>

            {/* BOTTOM CARD: LIVE SALON QUEUE BOARD (POCKET TV VIEW) */}
            <Card className="border-slate-800 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    <span>Live Salon Queue Board</span>
                  </CardTitle>
                  <span className="text-[11px] text-slate-400">
                    {activeTickets.length} total tickets
                  </span>
                </div>
                <CardDescription className="text-xs">
                  Full status of the salon right in your pocket.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 1. In Chair Now */}
                {chairsServing.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                      <Armchair className="h-3.5 w-3.5" />
                      Currently in Chair
                    </span>
                    <div className="space-y-1.5">
                      {chairsServing.map((t) => (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-emerald-400 font-mono">
                              #{t.ticketNumber}
                            </span>
                            <span className="font-medium text-white">{t.customerName}</span>
                          </div>
                          <Badge variant="success" className="text-[10px]">
                            In Service
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Next in Line Waiting Sequence */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    Next in Line
                  </span>

                  <div className="divide-y divide-slate-800/80">
                    {waitingSequence.map((t, idx) => {
                      const isMe = myTicket.id === t.id;
                      return (
                        <div
                          key={t.id}
                          className={`py-2.5 px-3 rounded-xl flex items-center justify-between text-xs transition-colors ${
                            isMe
                              ? "bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold"
                              : "hover:bg-slate-800/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`font-mono font-bold ${isMe ? "text-amber-300" : "text-slate-400"}`}>
                              #{t.ticketNumber}
                            </span>
                            <div>
                              <p className={`font-medium ${isMe ? "text-amber-200" : "text-white"}`}>
                                {t.customerName} {isMe && "(YOU 👈)"}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {t.customerPhone ? maskPhone(t.customerPhone) : "Guest"}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-blue-400 font-semibold font-mono">
                              ~{t.estimatedWaitMinutes}m
                            </span>
                            <p className="text-[10px] text-slate-500">Pos #{idx + 1}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="p-4 text-center text-[11px] text-slate-500 border-t border-slate-800/60 max-w-md mx-auto w-full">
        <span>{salon?.name || "Salon"} · Powered by Engine Que System</span>
      </footer>
    </div>
  );
}
