import React, { useState, useEffect, useMemo } from "react";
import { api, type Ticket, type Salon } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateUpiUri, formatCurrency } from "@/lib/utils";
import QRCode from "qrcode";
import { Smartphone, Banknote, CheckCircle2, Heart, ArrowRight, AlertCircle, TicketPercent } from "lucide-react";

interface StationCheckoutModalProps {
  isOpen: boolean;
  salon: Salon | null;
  currentlyServing: Ticket | null;
  editableBill: number;
  elapsedSeconds: number;
  processingAction: boolean;
  onClose: () => void;
  onBillChange: (val: number) => void;
  onFinishCheckout: (
    paymentStatus: "CASH_PAID" | "ONLINE_PAID",
    finalAmount?: number,
    couponCode?: string,
    couponDiscount?: number
  ) => void;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const TIP_PRESETS = [0, 20, 50, 100];

export function StationCheckoutModal({
  isOpen,
  salon,
  currentlyServing,
  editableBill,
  elapsedSeconds,
  processingAction,
  onClose,
  onBillChange,
  onFinishCheckout,
}: StationCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CASH">("CASH");
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [tenderedAmount, setTenderedAmount] = useState<number>(editableBill);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [generatingQr, setGeneratingQr] = useState(false);

  // Client Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number;
  } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Initialize or reset coupon when modal opens / closes
  useEffect(() => {
    if (isOpen && currentlyServing?.couponCode) {
      setCouponCodeInput(currentlyServing.couponCode);
      const discountType = currentlyServing.couponDiscountType || (currentlyServing.couponDiscount ? "FLAT" : "PERCENT");
      const discountValue = currentlyServing.couponDiscountValue ?? (currentlyServing.couponDiscount || 0);
      const maxDiscount = currentlyServing.couponMaxDiscount ?? null;

      const couponObj = {
        id: currentlyServing.couponId || "pre-applied",
        code: currentlyServing.couponCode,
        discountType,
        discountValue,
        maxDiscountAmount: maxDiscount,
      };
      setAppliedCoupon(couponObj);

      let initDiscount = currentlyServing.couponDiscount || 0;
      if (editableBill > 0) {
        if (discountType === "PERCENT") {
          initDiscount = (editableBill * discountValue) / 100;
          if (maxDiscount) initDiscount = Math.min(initDiscount, maxDiscount);
        } else {
          initDiscount = discountValue;
        }
        initDiscount = Math.min(Math.round(initDiscount * 100) / 100, editableBill);
      }
      setCouponDiscount(initDiscount);
      setCouponFeedback({
        message: `Voucher "${currentlyServing.couponCode}" active: ₹${initDiscount} saved on current bill`,
        success: true,
      });
    } else if (!isOpen) {
      setCouponCodeInput("");
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponFeedback(null);
    }
  }, [isOpen, currentlyServing?.id, currentlyServing?.couponCode]);

  // DYNAMIC COUPON RECALCULATION: Automatically updates discount whenever editableBill or services change
  useEffect(() => {
    if (isOpen && appliedCoupon && editableBill >= 0) {
      if (appliedCoupon.minOrderAmount && editableBill < appliedCoupon.minOrderAmount) {
        setCouponDiscount(0);
        setCouponFeedback({
          message: `Min bill of ₹${appliedCoupon.minOrderAmount} required for coupon ${appliedCoupon.code}`,
          success: false,
        });
        return;
      }

      let discount = 0;
      if (appliedCoupon.discountType === "PERCENT") {
        discount = (editableBill * appliedCoupon.discountValue) / 100;
        if (appliedCoupon.maxDiscountAmount) {
          discount = Math.min(discount, appliedCoupon.maxDiscountAmount);
        }
      } else {
        discount = appliedCoupon.discountValue;
      }
      const capped = Math.min(Math.round(discount * 100) / 100, editableBill);
      setCouponDiscount(capped);
      setCouponFeedback({
        message: `Voucher "${appliedCoupon.code}" applied: ₹${capped} saved (${appliedCoupon.discountType === "PERCENT" ? `${appliedCoupon.discountValue}% off` : "flat off"})`,
        success: true,
      });
    }
  }, [isOpen, editableBill, appliedCoupon]);

  // Effective Total with Tip & Coupon Discount
  const effectiveTotal = useMemo(() => {
    return Math.max(0, (editableBill || 0) + tipAmount - couponDiscount);
  }, [editableBill, tipAmount, couponDiscount]);

  // Sync tendered amount when bill or tip changes
  useEffect(() => {
    setTenderedAmount(effectiveTotal);
  }, [effectiveTotal, isOpen]);

  // Generate NPCI Dynamic UPI QR Code client-side
  useEffect(() => {
    if (!isOpen || paymentMethod !== "UPI" || !currentlyServing || !salon) return;
    setGeneratingQr(true);

    const upiId =
      salon.upiPaymentId ||
      (salon.phone ? `${salon.phone.replace(/[^0-9]/g, "")}@upi` : "salon@upi");

    const upiUri = generateUpiUri({
      upiId,
      payeeName: salon.name || "Salon",
      amount: effectiveTotal,
      note: `Ticket #${currentlyServing.ticketNumber} Haircut & Grooming`,
    });

    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        setQrCodeDataUrl(url);
        setGeneratingQr(false);
      })
      .catch((err) => {
        console.error("Failed to generate UPI QR:", err);
        setGeneratingQr(false);
      });
  }, [isOpen, paymentMethod, effectiveTotal, currentlyServing, salon]);

  // Change Return Calculation
  const changeToReturn = tenderedAmount - effectiveTotal;
  const isExactCash = changeToReturn === 0;
  const hasChange = changeToReturn > 0;
  const isShortage = changeToReturn < 0;

  // Smart Currency Note Presets based on bill
  const cashPresets = useMemo(() => {
    const list = [effectiveTotal];
    if (effectiveTotal < 100) list.push(100);
    if (effectiveTotal < 200) list.push(200);
    if (effectiveTotal < 500) list.push(500);
    if (effectiveTotal >= 500 && effectiveTotal < 1000) list.push(1000);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [effectiveTotal]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogClose onClose={onClose} />
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-black text-white">
          <span>💳 Wet-Hands Fast Checkout</span>
          {currentlyServing && (
            <Badge variant="warning" className="text-xs">
              Ticket #{currentlyServing.ticketNumber}
            </Badge>
          )}
        </DialogTitle>
        <DialogDescription>
          Collect payment and confirm to immediately free chair for next client.
        </DialogDescription>
      </DialogHeader>

      {currentlyServing && (
        <div className="space-y-4 my-2">
          {/* Customer & Service Summary Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-white text-base">{currentlyServing.customerName}</p>
              <p className="text-slate-400 mt-0.5">
                {currentlyServing.serviceName || "Haircut Service"}
                {currentlyServing.selectedAddOns && currentlyServing.selectedAddOns.length > 0 && (
                  <span className="text-emerald-400 ml-1">
                    (+{currentlyServing.selectedAddOns.length} add-ons)
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Chair Duration</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Editable Base Bill Input */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Service Bill Amount (₹)
              </label>
              <span className="text-[11px] text-slate-400">Tap to adjust if modified</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-lg font-black text-emerald-400">₹</span>
              <Input
                type="number"
                min={0}
                step={10}
                value={editableBill}
                onChange={(e) => onBillChange(Math.max(0, Number(e.target.value)))}
                className="pl-8 text-2xl font-black text-white h-13 rounded-xl bg-slate-900 border-slate-700"
              />
            </div>

            {/* Barber Tip / Gratuity Pills */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Heart className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span>Barber Tip / Gratuity:</span>
                </span>
                {tipAmount > 0 && (
                  <span className="text-xs font-bold text-amber-300 font-mono">
                    +₹{tipAmount} Tip
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {TIP_PRESETS.map((amount) => {
                  const isSelected = tipAmount === amount;
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTipAmount(amount)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 select-none active:scale-95 ${
                        isSelected
                          ? "bg-amber-500/25 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 shadow-md"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {amount === 0 ? "No Tip" : `+ ₹${amount}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Promotional Coupon Code Input for Chair / Counter Checkout */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <TicketPercent className="h-4 w-4 text-amber-400" />
                <span>Client Coupon / Voucher Code</span>
              </span>
              {appliedCoupon && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                  ✓ {appliedCoupon.code} (-₹{couponDiscount})
                </Badge>
              )}
            </div>

            {appliedCoupon ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs gap-2">
                <div>
                  <span className="text-emerald-300 font-semibold block">
                    🎉 Discount of ₹{couponDiscount} applied
                  </span>
                  {(appliedCoupon.code.toUpperCase().startsWith("REW_") || effectiveTotal <= 0) && (
                    <span className="text-[10px] text-amber-300/90 block mt-0.5">
                      Reward redemption / ₹0 bill — does not add a loyalty stamp for next cycle.
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCouponDiscount(0);
                    setCouponFeedback(null);
                  }}
                  className="text-rose-400 hover:text-rose-300 text-xs font-bold px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon (e.g. DIWALI25)"
                  value={couponCodeInput}
                  onChange={(e) => {
                    setCouponCodeInput(e.target.value.toUpperCase());
                    setCouponFeedback(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                    }
                  }}
                  className="font-mono text-xs uppercase h-10 bg-slate-900 border-slate-700"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={applyingCoupon || !couponCodeInput.trim() || editableBill <= 0}
                  onClick={async () => {
                    if (!salon?.id) return;
                    setApplyingCoupon(true);
                    setCouponFeedback(null);
                    try {
                      const res = await api.coupons.apply({
                        code: couponCodeInput.trim().toUpperCase(),
                        targetType: "SALON_SERVICE",
                        orderAmount: editableBill,
                        salonId: salon.id,
                      });
                      if (res.valid && res.coupon) {
                        setAppliedCoupon(res.coupon);
                        setCouponDiscount(res.discountAmount);
                        setCouponFeedback({
                          message: `Coupon ${res.coupon.code} applied! Saved ₹${res.discountAmount}`,
                          success: true,
                        });
                      } else {
                        setCouponFeedback({
                          message: res.message || "Invalid coupon code for this salon.",
                          success: false,
                        });
                      }
                    } catch (err: any) {
                      setCouponFeedback({
                        message: err.message || "Failed to validate coupon.",
                        success: false,
                      });
                    } finally {
                      setApplyingCoupon(false);
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-10 px-3 text-xs"
                >
                  {applyingCoupon ? "..." : "Apply"}
                </Button>
              </div>
            )}

            {couponFeedback && !appliedCoupon && (
              <p className="text-[11px] text-rose-400 font-medium">{couponFeedback.message}</p>
            )}
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("CASH")}
              className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all select-none active:scale-98 ${
                paymentMethod === "CASH"
                  ? "border-emerald-500 bg-emerald-500/20 text-white ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-500/15"
                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
              }`}
            >
              <Banknote className="h-5 w-5 text-emerald-400" />
              <span>💵 Cash Payment</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("UPI")}
              className={`p-3.5 rounded-2xl border flex items-center justify-center gap-2.5 font-bold text-sm transition-all select-none active:scale-98 ${
                paymentMethod === "UPI"
                  ? "border-blue-500 bg-blue-500/20 text-white ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/15"
                  : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="h-5 w-5 text-blue-400" />
              <span>📱 Online UPI QR</span>
            </button>
          </div>

          {/* TAB 1: FAST CASH PAYMENT WITH CHANGE CALCULATOR */}
          {paymentMethod === "CASH" && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total to Collect
                  </span>
                  <div className="text-3xl font-black text-white">
                    ₹{effectiveTotal}
                  </div>
                </div>
                {tipAmount > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">
                    Incl. ₹{tipAmount} Tip
                  </Badge>
                )}
              </div>

              {/* Quick Cash Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer Tendered Currency (1-Tap)
                </span>
                <div className="flex flex-wrap gap-2">
                  {cashPresets.map((amount) => {
                    const isSelected = tenderedAmount === amount;
                    return (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setTenderedAmount(amount)}
                        className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-black border transition-all flex items-center gap-1.5 select-none active:scale-95 ${
                          isSelected
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30"
                            : "bg-slate-950 border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white"
                        }`}
                      >
                        {amount === effectiveTotal ? `Exact (₹${amount})` : `₹${amount}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Tendered Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 shrink-0">Other Tendered:</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">₹</span>
                  <Input
                    type="number"
                    min={0}
                    step={10}
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(Math.max(0, Number(e.target.value)))}
                    className="pl-7 h-9 text-base font-bold bg-slate-950 border-slate-800 text-white rounded-lg"
                  />
                </div>
              </div>

              {/* LIVE CHANGE CALCULATOR RESULT BOX */}
              {hasChange && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/70 to-emerald-900/50 border-2 border-emerald-400/80 text-emerald-100 space-y-1 shadow-lg animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-emerald-400" />
                      <span>Return Change to Customer</span>
                    </span>
                    <span className="text-xs text-emerald-400/80 font-mono">
                      (₹{tenderedAmount} - ₹{effectiveTotal})
                    </span>
                  </div>
                  <div className="text-3xl font-black text-emerald-300">
                    ₹{changeToReturn}
                  </div>
                </div>
              )}

              {isExactCash && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Exact cash received · No change needed!</span>
                </div>
              )}

              {isShortage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>Shortage: ₹{Math.abs(changeToReturn)} still due from customer!</span>
                </div>
              )}

              <Button
                size="lg"
                onClick={() => onFinishCheckout("CASH_PAID", effectiveTotal, appliedCoupon?.code, couponDiscount)}
                disabled={processingAction || isShortage}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base h-14 rounded-2xl gap-2 shadow-xl shadow-emerald-600/25 active:scale-98"
              >
                <Banknote className="h-6 w-6" />
                <span>💵 Confirm ₹{effectiveTotal} Cash Received & Free Chair</span>
              </Button>
            </div>
          )}

          {/* TAB 2: DYNAMIC NPCI UPI QR CODE */}
          {paymentMethod === "UPI" && (
            <div className="p-5 rounded-2xl bg-white text-slate-950 text-center space-y-3.5 shadow-2xl">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block">
                  NPCI Dynamic UPI QR
                </span>
                <div className="text-3xl font-black text-slate-950">
                  Scan & Pay ₹{effectiveTotal}
                </div>
                {tipAmount > 0 && (
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                    (Bill ₹{editableBill} + Tip ₹{tipAmount})
                  </span>
                )}
                <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                  GPay · PhonePe · Paytm · BHIM
                </p>
              </div>

              <div className="flex justify-center p-2 bg-white rounded-xl">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="UPI Payment QR Code"
                    className="w-52 h-52 object-contain rounded-xl border border-slate-200 shadow-inner"
                  />
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center bg-slate-100 rounded-xl text-slate-400 text-xs font-medium">
                    {generatingQr ? "Generating QR..." : "QR Unavailable"}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-600 font-mono border-t border-slate-200 pt-2">
                <span>Payee: {salon?.name || "Salon"}</span>
                <span className="block text-slate-500 truncate">
                  UPI ID: {salon?.upiPaymentId || (salon?.phone ? `${salon.phone.replace(/[^0-9]/g, "")}@upi` : "salon@upi")}
                </span>
              </div>

              <Button
                size="lg"
                onClick={() => onFinishCheckout("ONLINE_PAID", effectiveTotal, appliedCoupon?.code, couponDiscount)}
                disabled={processingAction}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-base h-14 rounded-2xl gap-2 shadow-xl shadow-blue-600/30 active:scale-98"
              >
                <CheckCircle2 className="h-6 w-6" />
                <span>✅ Confirm ₹{effectiveTotal} UPI Received & Free Chair</span>
              </Button>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white"
        >
          Back to Active Service
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
