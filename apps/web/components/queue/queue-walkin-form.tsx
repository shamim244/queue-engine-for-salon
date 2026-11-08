import React from "react";
import type { Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { QueueLoadMetrics } from "./queue-helpers";
import { Zap, Scissors, CheckCircle2, Clock } from "lucide-react";

interface QueueWalkinFormProps {
  salon: Salon | null;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  selectedServiceId: string;
  setSelectedServiceId: (v: string) => void;
  selectedStylistId: string | null;
  setSelectedStylistId: (v: string | null) => void;
  queueLoadMetrics: QueueLoadMetrics;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function QueueWalkinForm({
  salon,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  selectedServiceId,
  setSelectedServiceId,
  selectedStylistId,
  setSelectedStylistId,
  queueLoadMetrics,
  submitting,
  onSubmit,
}: QueueWalkinFormProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/70 shadow-2xl">
      <CardHeader className="pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Zap className="h-4 w-4 fill-amber-400" />
          <span>Instant Walk-In Check-In</span>
        </div>
        <CardTitle className="text-2xl font-black text-white mt-1">
          Join {salon?.name || "the Salon"} Live Queue
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-slate-400">
          Reserve your spot from your phone. Watch your countdown in real time and step into the chair without waiting around.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Your Full Name <span className="text-rose-400">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Ramesh Kumar"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-12 bg-slate-950/80 border-slate-700 text-white rounded-xl text-base px-3.5 focus:border-amber-400"
            />
          </div>

          {/* Mobile Phone (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Mobile Phone Number <span className="text-slate-500 font-normal">(optional - for SMS call-up)</span>
            </label>
            <Input
              type="tel"
              placeholder="e.g. 98765 43210 (or leave blank for walk-in)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-12 bg-slate-950/80 border-slate-700 text-white rounded-xl text-base px-3.5 focus:border-amber-400"
            />
          </div>

          {/* Select Service */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Select Desired Service <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {salon?.services?.map((srv) => (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => setSelectedServiceId(srv.id)}
                  className={`min-h-[56px] p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    selectedServiceId === srv.id
                      ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xl">{srv.icon || "✂️"}</span>
                    <div className="truncate">
                      <p className="text-xs sm:text-sm font-bold truncate">{srv.name}</p>
                      <p className="text-[11px] text-slate-400">~{srv.estimatedDurationMinutes} mins</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-bold text-amber-400 shrink-0 ml-2">
                    {formatCurrency(srv.basePrice)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Barber Preference & Real-time Load Distribution */}
          {salon?.stylists && salon.stylists.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 block">
                  Barber Preference &amp; Live Line Load
                </label>
                <span className="text-[11px] text-slate-400">
                  {queueLoadMetrics.activeChairs} chairs active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. FASTEST AVAILABLE (AUTO-ASSIGN POOL) */}
                <button
                  type="button"
                  onClick={() => setSelectedStylistId(null)}
                  className={`min-h-[58px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    selectedStylistId === null
                      ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold">Fastest Available Chair (Auto-Assign)</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 font-bold">
                      ~{queueLoadMetrics.automated.estWaitMin}m Wait
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between w-full mt-2 text-[11px]">
                    <span className="text-slate-400">
                      {queueLoadMetrics.automated.freeChairs > 0 && queueLoadMetrics.automated.waitingCount === 0 ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                          Chair open right now
                        </span>
                      ) : (
                        <span>{queueLoadMetrics.automated.waitingCount} in general line</span>
                      )}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-300">Fastest Lane</span>
                  </div>
                </button>

                {/* 2. SPECIFIC BARBER CARDS (Strict FIFO accurate metrics) */}
                {salon.stylists.map((st) => {
                  const metric = queueLoadMetrics.byStylist[st.id] || {
                    waitingCount: 0,
                    isInChair: false,
                    estWaitMin: 20,
                    diffFromAuto: 0,
                    isFreeNow: true,
                    dedicatedCount: 0,
                    universalShare: 0,
                  };

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStylistId(st.id)}
                      className={`min-h-[58px] p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        selectedStylistId === st.id
                          ? "bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5 truncate">
                          <Scissors className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-bold truncate">{st.name}</span>
                        </div>
                        <span className="text-xs font-bold font-mono text-slate-200 shrink-0 ml-1">
                          ~{metric.estWaitMin}m
                        </span>
                      </div>

                      <div className="flex items-center justify-between w-full mt-2 text-[11px]">
                        <span className="text-slate-400 truncate">
                          {metric.isFreeNow ? (
                            <span className="text-emerald-400 font-medium">Chair Ready (0 waiting)</span>
                          ) : metric.isInChair ? (
                            <span>In Chair • {metric.waitingCount} ahead</span>
                          ) : (
                            <span>{metric.waitingCount} ahead for {st.name.split(" ")[0]}</span>
                          )}
                        </span>

                        {metric.diffFromAuto > 5 ? (
                          <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                            +{metric.diffFromAuto}m vs auto
                          </span>
                        ) : metric.isFreeNow ? (
                          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            Ready
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 3. REAL-TIME ROUTING & WAIT COMPARISON BANNER */}
              <div className="p-3.5 rounded-xl border bg-slate-950/70 border-slate-800 transition-all text-xs">
                {selectedStylistId === null ? (
                  <div className="flex items-start gap-2.5 text-emerald-300">
                    <Zap className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold text-white">Automated First-Available Line Selected</p>
                      <p className="text-slate-300 mt-0.5 leading-relaxed">
                        You will be assigned to whichever chair finishes first. There are currently{" "}
                        <strong className="text-white">{queueLoadMetrics.automated.waitingCount}</strong> client(s) waiting in queue across all active chairs, with an estimated wait of{" "}
                        <strong className="text-amber-400">~{queueLoadMetrics.automated.estWaitMin} mins</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const st = salon.stylists.find((s) => s.id === selectedStylistId);
                    const stMetric = st ? queueLoadMetrics.byStylist[st.id] : null;
                    const name = st?.name || "Selected Barber";

                    if (stMetric?.isFreeNow) {
                      return (
                        <div className="flex items-start gap-2.5 text-emerald-300">
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-bold text-white">Dedicated Line: {name} is Ready!</p>
                            <p className="text-slate-300 mt-0.5 leading-relaxed">
                              {name}&apos;s chair is currently open with 0 clients waiting. You will be seated right away upon arrival!
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="flex items-start gap-2.5 text-amber-300">
                        <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold text-white">Dedicated Line Locked to {name}</p>
                          <p className="text-slate-300 mt-0.5 leading-relaxed">
                            There are <strong className="text-white">{stMetric?.waitingCount || 0}</strong> client(s) ahead for this chair (including earlier universal arrivals). Estimated wait is{" "}
                            <strong className="text-amber-400">~{stMetric?.estWaitMin || 20} mins</strong>
                            {stMetric && stMetric.diffFromAuto > 0 ? (
                              <span> ({stMetric.diffFromAuto} mins longer than Fastest Available).</span>
                            ) : (
                              <span> (same as automated line).</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* Submit Action */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[52px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/25 gap-2 active:scale-98 transition-transform"
          >
            <Zap className="h-5 w-5 fill-slate-950" />
            <span>{submitting ? "Securing Your Spot..." : "Join Live Queue Now"}</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
