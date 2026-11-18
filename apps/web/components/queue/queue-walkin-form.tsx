import React from "react";
import type { Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { ServiceIcon } from "@/components/ui/service-icon";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { QueueLoadMetrics } from "./queue-helpers";
import { Zap, Scissors, CheckCircle2, Clock, TicketPercent, AlertCircle } from "lucide-react";

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
  couponCodeInput?: string;
  setCouponCodeInput?: (v: string) => void;
  appliedCoupon?: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number;
  } | null;
  couponDiscount?: number;
  validatingCoupon?: boolean;
  couponError?: string | null;
  onApplyCoupon?: () => void;
  onRemoveCoupon?: () => void;
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
  couponCodeInput = "",
  setCouponCodeInput,
  appliedCoupon,
  couponDiscount = 0,
  validatingCoupon = false,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
}: QueueWalkinFormProps) {
  const selectedService = salon?.services?.find((s) => s.id === selectedServiceId) || salon?.services?.[0];
  const finalPrice = Math.max(0, (selectedService?.basePrice || 0) - (appliedCoupon ? couponDiscount : 0));

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
              maxLength={80}
            />
          </div>

          {/* Mobile Phone (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Mobile Phone Number <span className="text-slate-500 font-normal">(optional - for SMS call-up)</span>
            </label>
            <PhoneInput
              value={customerPhone}
              onChange={setCustomerPhone}
              placeholder="9876543210"
              showDigitCounter={true}
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
                    <div className="h-7 w-7 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center p-0.5 shrink-0">
                      <ServiceIcon icon={srv.icon} size={20} />
                    </div>
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
                  const isOnLeave = st.isActive === false;
                  const metric = queueLoadMetrics.byStylist[st.id] || {
                    waitingCount: 0,
                    isInChair: false,
                    estWaitMin: 20,
                    diffFromAuto: 0,
                    isFreeNow: true,
                    dedicatedCount: 0,
                    universalShare: 0,
                  };

                  if (isOnLeave) {
                    return (
                      <div
                        key={st.id}
                        className="min-h-[58px] p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 opacity-60 text-left flex flex-col justify-between cursor-not-allowed select-none"
                        title={`${st.name} is currently on leave / unavailable today.`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 truncate">
                            <Scissors className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span className="text-xs font-semibold text-slate-400 truncate">{st.name}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30"
                          >
                            🏖️ On Leave Today
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between w-full mt-2 text-[11px] text-slate-500 italic">
                          <span>Unavailable • Choose Fastest Available Chair</span>
                        </div>
                      </div>
                    );
                  }

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

          {/* 4. Optional Client Coupon / Voucher Code */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <TicketPercent className="h-4 w-4 text-amber-400" />
                <span>Have a Salon Coupon Code?</span>
              </label>
              {appliedCoupon && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  ✓ {appliedCoupon.code} (-₹{couponDiscount})
                </Badge>
              )}
            </div>

            {appliedCoupon ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-emerald-300 font-bold block">
                      🎉 ₹{couponDiscount} discount applied!
                    </span>
                    <span className="text-emerald-400/80 text-[11px]">
                      Locked into your queue pass · automatically credited at station checkout.
                    </span>
                  </div>
                </div>
                {onRemoveCoupon && (
                  <button
                    type="button"
                    onClick={onRemoveCoupon}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coupon (e.g. WELCOME20)"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput && setCouponCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (onApplyCoupon) onApplyCoupon();
                      }
                    }}
                    className="font-mono text-xs uppercase h-11 bg-slate-900 border-slate-700 text-white rounded-xl"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={validatingCoupon || !couponCodeInput.trim() || !selectedService}
                    onClick={onApplyCoupon}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 h-11 rounded-xl shrink-0 active:scale-95 transition-transform"
                  >
                    {validatingCoupon ? "Checking..." : "Apply"}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1.5 font-medium pt-0.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{couponError}</span>
                  </p>
                )}
                {!customerPhone.trim() && couponCodeInput.trim() && !couponError && (
                  <p className="text-[10px] text-amber-400/90 flex items-center gap-1 font-medium pt-0.5">
                    <span>📱 Note: Enter your 10-digit mobile number above to claim coupon discounts.</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit Action */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[52px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/25 gap-2 active:scale-98 transition-transform"
          >
            <Zap className="h-5 w-5 fill-slate-950" />
            <span>
              {submitting
                ? "Securing Your Spot..."
                : appliedCoupon && couponDiscount > 0
                ? `Join Live Queue Now • ₹${finalPrice} (₹${couponDiscount} OFF with ${appliedCoupon.code})`
                : "Join Live Queue Now"}
            </span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
