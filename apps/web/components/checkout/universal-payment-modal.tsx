"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  X,
  QrCode,
  Banknote,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Tag,
  TicketPercent,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  PaymentProvider,
  PaymentOrderResult,
  PaymentGatewayConfig,
  OrganizationSubscription,
  SubscriptionPlan,
  BillingCycle,
} from "@/lib/api";

interface UniversalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan;
  cycle: BillingCycle;
  amount: number;
  organizationId: string;
  salonId?: string;
  initialCouponCode?: string;
  onSuccess: (subscription: OrganizationSubscription) => void;
}

export function playSuccessChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Audio restricted or uninitialized, ignore
  }
}

export function UniversalPaymentModal({
  isOpen,
  onClose,
  plan,
  cycle,
  amount,
  organizationId,
  salonId,
  initialCouponCode,
  onSuccess,
}: UniversalPaymentModalProps) {
  const [activeTab, setActiveTab] = useState<PaymentProvider>("UPI_QR");
  const [order, setOrder] = useState<PaymentOrderResult | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [transactionRefInput, setTransactionRefInput] = useState("");
  const [cashNotesInput, setCashNotesInput] = useState("");
  const [successResult, setSuccessResult] = useState<{
    transactionRef: string;
    subscription: OrganizationSubscription;
  } | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: "PERCENT" | "FLAT";
    discountValue: number;
    maxDiscountAmount?: number | null;
  } | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; success: boolean } | null>(null);

  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig | null>(null);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [submittedPending, setSubmittedPending] = useState<{
    provider: "UPI_QR" | "CASH";
    utrNumber?: string;
    notes?: string;
    orderId: string;
  } | null>(null);

  // Dual-Wallet State & Deduction Switch
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState<boolean>(true);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Deduction Math
  const priceAfterCoupon = Math.max(0, amount - couponDiscount);
  const walletDeduction = useWallet ? Math.min(walletBalance, priceAfterCoupon) : 0;
  const netPayable = Math.max(0, priceAfterCoupon - walletDeduction);
  const isZeroPayable = netPayable === 0;
  const effectiveProvider = isZeroPayable ? "WALLET" : activeTab;

  // Fetch Wallet Balance on Modal Open
  useEffect(() => {
    if (!isOpen || !organizationId) {
      setWalletBalance(0);
      return;
    }

    let isMounted = true;
    async function fetchWallet() {
      setLoadingWallet(true);
      try {
        const res = await api.wallets.getBalance("OWNER", organizationId);
        if (isMounted && res.success) {
          setWalletBalance(res.balance);
        }
      } catch (err) {
        console.warn("Could not fetch wallet balance:", err);
      } finally {
        if (isMounted) setLoadingWallet(false);
      }
    }

    fetchWallet();
    return () => {
      isMounted = false;
    };
  }, [isOpen, organizationId]);

  const handleApplyCoupon = async (codeToApply?: string | React.MouseEvent) => {
    const raw = typeof codeToApply === "string" ? codeToApply : couponCodeInput;
    const cleanCode = raw.trim().toUpperCase();
    if (!cleanCode) return;
    setApplyingCoupon(true);
    setCouponFeedback(null);
    try {
      const res = await api.coupons.apply({
        code: cleanCode,
        targetType: "SUBSCRIPTION",
        orderAmount: amount,
        organizationId,
        salonId,
      });

      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponDiscount(res.discountAmount);
        setCouponCodeInput(cleanCode);
        setCouponFeedback({
          success: true,
          message: `Coupon "${cleanCode}" applied! Saved ${formatCurrency(res.discountAmount)}.`,
        });
      } else {
        setCouponFeedback({
          success: false,
          message: res.message || "Invalid coupon code.",
        });
      }
    } catch (err: any) {
      setCouponFeedback({
        success: false,
        message: err.message || "Could not apply coupon.",
      });
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Auto-apply initial coupon code if provided (e.g. partner referral)
  useEffect(() => {
    if (isOpen && initialCouponCode && !appliedCoupon) {
      setCouponCodeInput(initialCouponCode);
      handleApplyCoupon(initialCouponCode);
    }
  }, [isOpen, initialCouponCode]);

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCodeInput("");
    setCouponFeedback(null);
  };

  // Fetch Gateway Configuration on Modal Open
  useEffect(() => {
    if (!isOpen) {
      setSubmittedPending(null);
      return;
    }

    let isMounted = true;
    api.payments
      .getConfig()
      .then((res) => {
        if (isMounted && res.success && res.config) {
          setGatewayConfig(res.config);
          if (!res.config.upiManualEnabled && activeTab === "UPI_QR") {
            if (res.config.cashEnabled) setActiveTab("CASH");
            else if (res.config.razorpayEnabled) setActiveTab("RAZORPAY");
          }
        }
      })
      .catch((err) => console.warn("Failed to load payment gateway config:", err));

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 1. Create Order whenever activeTab, plan, cycle, or amount changes
  useEffect(() => {
    if (!isOpen) {
      setOrder(null);
      setSuccessResult(null);
      setSubmittedPending(null);
      setErrorMessage(null);
      setTransactionRefInput("");
      setCashNotesInput("");
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setCouponCodeInput("");
      setCouponFeedback(null);
      return;
    }

    let isMounted = true;

    async function initOrder() {
      setLoadingOrder(true);
      setErrorMessage(null);
      try {
        const cycleMonths = cycle === "3m" ? 3 : cycle === "6m" ? 6 : cycle === "1y" ? 12 : 1;
        const fullPrice = (plan.price1m || 0) * cycleMonths;
        const cycleDiscountAmount = Math.max(0, fullPrice - amount);

        const res = await api.payments.createOrder({
          targetType: "SUBSCRIPTION",
          targetId: plan.id,
          amount: netPayable,
          provider: effectiveProvider as any,
          organizationId,
          salonId: salonId || null,
          metadata: {
            planName: plan.name,
            planSlug: plan.slug,
            cycle,
            basePrice: amount,
            originalAmount: fullPrice > 0 ? fullPrice : amount,
            subscriptionDiscount: cycleDiscountAmount,
            friendDiscount: couponDiscount,
            couponId: appliedCoupon?.id || null,
            couponDiscount,
            couponCode: appliedCoupon?.code || null,
            partnerCode: initialCouponCode || appliedCoupon?.code || null,
            walletDeducted: walletDeduction,
          },
        });

        if (isMounted) {
          if (res.success && res.order) {
            setOrder(res.order);
            const expSec = Math.max(
              0,
              Math.floor(
                (new Date(res.order.expiresAt).getTime() - Date.now()) / 1000
              )
            );
            setSecondsRemaining(expSec > 0 ? expSec : 600);
          } else {
            setErrorMessage("Failed to initialize payment order.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || "Could not connect to payment gateway.");
        }
      } finally {
        if (isMounted) setLoadingOrder(false);
      }
    }

    initOrder();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    effectiveProvider,
    plan.id,
    cycle,
    amount,
    netPayable,
    walletDeduction,
    organizationId,
    salonId,
    appliedCoupon?.id,
  ]);

  // 2. Client-Side QR Code Rendering (Zero Server Waste)
  useEffect(() => {
    if (activeTab === "UPI_QR" && order?.paymentData?.upiString && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, order.paymentData.upiString, {
        width: 220,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
      }).catch((err) => {
        console.error("QR Code Render Error:", err);
      });
    }
  }, [activeTab, order]);

  // 3. Client Hardware Countdown Timer
  useEffect(() => {
    if (!isOpen || !order || successResult) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, order, successResult]);

  const handleCopyVpa = () => {
    const vpa = order?.paymentData?.vpa || "salonpayments@icici";
    navigator.clipboard.writeText(vpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleVerify = async (providedRef?: string) => {
    if (!order) return;
    setVerifying(true);
    setErrorMessage(null);

    const ref = providedRef || transactionRefInput.trim();

    try {
      const res = await api.payments.verify({
        orderId: order.orderId,
        provider: effectiveProvider as any,
        transactionRef: ref || (isZeroPayable ? "WALLET_100_CREDIT" : undefined),
        notes: activeTab === "CASH" ? cashNotesInput : undefined,
      });

      if (res.success && res.subscription) {
        playSuccessChime();
        setSuccessResult({
          transactionRef: res.transactionRef,
          subscription: res.subscription,
        });
        onSuccess(res.subscription);
      } else {
        setErrorMessage(res.message || "Payment verification failed. Please check transaction details.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error verifying payment.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateSandbox = async () => {
    if (!order) return;
    setVerifying(true);
    try {
      const simulatedPaymentId = `pay_sandbox_${Date.now()}`;
      const res = await api.payments.verify({
        orderId: order.orderId,
        provider: "RAZORPAY",
        razorpayPaymentId: simulatedPaymentId,
      });

      if (res.success && res.subscription) {
        playSuccessChime();
        setSuccessResult({
          transactionRef: res.transactionRef,
          subscription: res.subscription,
        });
        onSuccess(res.subscription);
      } else {
        setErrorMessage(res.message || "Sandbox verification failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Sandbox payment error.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmitManual = async (provider: "UPI_QR" | "CASH") => {
    if (!order) return;
    setSubmittingManual(true);
    setErrorMessage(null);
    try {
      const utr = transactionRefInput.trim();
      if (provider === "UPI_QR" && (!utr || utr.length < 6)) {
        setErrorMessage("Please enter a valid 12-digit UPI reference number (UTR).");
        setSubmittingManual(false);
        return;
      }
      const res = await api.payments.submitManual({
        orderId: order.orderId,
        provider,
        utrNumber: provider === "UPI_QR" ? utr : undefined,
        notes: provider === "CASH" ? cashNotesInput.trim() : undefined,
      });

      if (res.success) {
        playSuccessChime();
        setSubmittedPending({
          provider,
          utrNumber: utr,
          notes: cashNotesInput.trim(),
          orderId: order.orderId,
        });
      } else {
        setErrorMessage(res.message || "Failed to submit payment details.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error submitting payment for admin review.");
    } finally {
      setSubmittingManual(false);
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                Secure Checkout
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {timeFormatted}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Activate {plan.name} ({cycle.toUpperCase()})
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Checkout"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {successResult ? (
          <div className="p-6 text-center space-y-5 animate-in zoom-in-95 duration-200 flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
              <p className="text-sm text-slate-400 mt-1">
                Your subscription to <span className="text-white font-medium">{plan.name}</span> has been activated.
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid</span>
                <span className="font-semibold text-emerald-400">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Billing Cycle</span>
                <span className="font-medium text-white">{cycle.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Reference</span>
                <span className="font-mono text-xs text-slate-300 truncate max-w-[200px]">
                  {successResult.transactionRef}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valid Until</span>
                <span className="font-medium text-white">
                  {new Date(successResult.subscription.expiresAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
            >
              Continue to Dashboard
            </Button>
          </div>
        ) : submittedPending ? (
          <div className="p-6 text-center space-y-5 animate-in zoom-in-95 duration-200 flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Clock className="w-10 h-10 animate-pulse" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Awaiting Admin Verification</span>
              </div>
              <h3 className="text-xl font-bold text-white">Payment Proof Submitted</h3>
              <p className="text-sm text-slate-300 mt-1 max-w-sm mx-auto">
                Thank you! Your payment details have been sent to SuperAdmin for manual verification.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Order ID</span>
                <span className="font-mono text-xs text-slate-200">{submittedPending.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Plan</span>
                <span className="font-medium text-white">{plan.name} ({cycle.toUpperCase()})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Amount</span>
                <span className="font-bold text-emerald-400">{formatCurrency(netPayable)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method</span>
                <span className="font-medium text-blue-400">
                  {submittedPending.provider === "UPI_QR" ? "UPI QR (Manual)" : "Cash / Counter"}
                </span>
              </div>
              {submittedPending.utrNumber && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">Submitted UTR</span>
                  <span className="font-mono font-bold text-xs bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-amber-300">
                    {submittedPending.utrNumber}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Your subscription and branch quotas will activate automatically as soon as SuperAdmin verifies this payment (usually 15-30 minutes).
            </p>

            <Button
              onClick={onClose}
              className="w-full min-h-[48px] bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
            >
              Close & Return to Dashboard
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Amount Banner with Strike-Through if Coupon or Wallet Applied */}
            <div className="bg-gradient-to-r from-blue-900/30 via-slate-800/40 to-indigo-900/30 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium">Total Payable Amount</p>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <p className="text-2xl font-black text-white tracking-tight">
                    {formatCurrency(netPayable)}
                  </p>
                  {(couponDiscount > 0 || walletDeduction > 0) && (
                    <span className="text-sm line-through text-slate-500 font-semibold">
                      {formatCurrency(amount)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {appliedCoupon && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Saved {formatCurrency(couponDiscount)} ({appliedCoupon.code})
                    </span>
                  )}
                  {walletDeduction > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-bold bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full">
                      <Wallet className="w-3 h-3" />
                      {formatCurrency(walletDeduction)} from Wallet
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded-md font-mono">
                  {cycle === "1m"
                    ? "1 Month"
                    : cycle === "3m"
                    ? "3 Months"
                    : cycle === "6m"
                    ? "6 Months"
                    : "1 Year"}
                </span>
              </div>
            </div>

            {/* Omni-Channel Coupon Code Box */}
            <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <TicketPercent className="w-4 h-4 text-indigo-400" />
                  Have a Promo / Discount Code?
                </span>
                {appliedCoupon && (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Enter Coupon (e.g. WELCOME50)"
                    value={couponCodeInput}
                    disabled={!!appliedCoupon || applyingCoupon}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold tracking-wide text-white uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-h-[44px] disabled:opacity-60"
                  />
                  {appliedCoupon && (
                    <Check className="w-4 h-4 text-emerald-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                {!appliedCoupon && (
                  <Button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCodeInput.trim()}
                    className="min-h-[44px] px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                  >
                    {applyingCoupon ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
                  </Button>
                )}
              </div>

              {couponFeedback && (
                <p
                  className={`text-[11px] font-medium flex items-center gap-1 ${
                    couponFeedback.success ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {couponFeedback.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {couponFeedback.message}
                </p>
              )}
            </div>

            {/* Salon Owner Wallet Deduction Switch Box */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                useWallet && walletDeduction > 0
                  ? "bg-purple-950/30 border-purple-500/40"
                  : "bg-slate-950/80 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg ${
                      walletBalance > 0
                        ? "bg-purple-500/20 text-purple-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Salon Owner Wallet</span>
                      <span className="text-[11px] font-semibold text-purple-400 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full">
                        {loadingWallet ? "..." : `Available: ${formatCurrency(walletBalance)}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {walletBalance > 0
                        ? `Apply up to ${formatCurrency(Math.min(walletBalance, priceAfterCoupon))} from referral credits`
                        : "Earn ₹500 credits by referring other salon owners"}
                    </p>
                  </div>
                </div>

                {walletBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setUseWallet(!useWallet)}
                    aria-label="Toggle Wallet Credits"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[30px] items-center ${
                      useWallet ? "bg-purple-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        useWallet ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                )}
              </div>

              {useWallet && walletDeduction > 0 && (
                <div className="mt-2.5 pt-2.5 border-t border-purple-500/20 flex items-center justify-between text-xs text-purple-300">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Wallet Credit Applied:
                  </span>
                  <span className="font-bold text-emerald-400">-{formatCurrency(walletDeduction)}</span>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-600/40 rounded-xl text-rose-300 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isZeroPayable ? (
              /* Instant 1-Tap Wallet Settlement when Net Payable is ₹0 */
              <div className="p-6 text-center space-y-4 bg-gradient-to-b from-purple-950/40 to-slate-950 border border-purple-500/30 rounded-2xl">
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-500/10">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Full Balance Settlement</h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                    Your wallet balance and discounts cover this subscription completely. Net payable is ₹0.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => handleVerify("WALLET_FULL_CREDIT")}
                  disabled={verifying}
                  className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 text-sm"
                >
                  {verifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Complete 1-Tap Activation (₹0)
                </Button>
              </div>
            ) : (
              <>
                {/* Payment Provider Segmented Tabs (Rule 7: Mobile touch >= 48px) */}
                <div className="flex gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
                  {(!gatewayConfig || gatewayConfig.upiManualEnabled) && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("UPI_QR")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition min-h-[44px] ${
                        activeTab === "UPI_QR"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>UPI QR (Manual)</span>
                    </button>
                  )}
                  {(!gatewayConfig || gatewayConfig.cashEnabled) && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("CASH")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition min-h-[44px] ${
                        activeTab === "CASH"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cash Counter</span>
                    </button>
                  )}
                  {gatewayConfig?.razorpayEnabled && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("RAZORPAY")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition min-h-[44px] ${
                        activeTab === "RAZORPAY"
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Card Sandbox</span>
                    </button>
                  )}
                </div>

            {loadingOrder ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
                <p className="text-sm">Preparing secure payment session...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: UPI QR & Android Intent */}
                {activeTab === "UPI_QR" && (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner mx-auto max-w-[240px]">
                      <canvas ref={canvasRef} className="rounded-lg" />
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        Scan with GPay, PhonePe, Paytm, or BHIM
                      </p>
                    </div>

                    {/* VPA Copy Bar */}
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">UPI ID (VPA)</span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {order?.paymentData?.vpa || "salonpayments@icici"}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyVpa}
                        className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-700/60 rounded-lg transition flex items-center gap-1.5 min-h-[44px] px-3"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUpi ? "Copied" : "Copy"}</span>
                      </button>
                    </div>

                    {/* Android 1-Tap UPI Intent Button */}
                    {order?.paymentData?.upiIntentUrl && (
                      <a
                        href={order.paymentData.upiIntentUrl}
                        className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-sm transition"
                      >
                        <span>Open in UPI App (Google Pay / PhonePe)</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    {/* UTR Verification Section */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <label className="text-xs text-slate-300 font-medium block">
                        Enter 12-Digit UPI Reference (UTR) after payment:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 412345678901"
                          value={transactionRefInput}
                          onChange={(e) => setTransactionRefInput(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono min-h-[48px]"
                        />
                        <Button
                          type="button"
                          onClick={() => handleSubmitManual("UPI_QR")}
                          disabled={submittingManual || !transactionRefInput.trim()}
                          className="min-h-[48px] px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                        >
                          {submittingManual ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Submit UTR"}
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Scan & pay in your UPI app, then submit the 12-digit UTR from your receipt for SuperAdmin approval.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 2: CASH / COUNTER SETTLEMENT */}
                {activeTab === "CASH" && (
                  <div className="space-y-4">
                    <div className="bg-amber-950/20 border border-amber-600/30 rounded-xl p-4 text-amber-200 text-sm space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-amber-300">
                        <Banknote className="w-5 h-5" />
                        <span>Counter / Manual Cash Settlement</span>
                      </div>
                      <p className="text-xs text-amber-200/80 leading-relaxed">
                        {gatewayConfig?.cashInstructions ||
                          order?.paymentData?.cashInstructions ||
                          "Collect cash at the salon reception desk or record direct offline settlement."}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-300 font-medium block">
                        Receipt / Audit Note (Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Handed cash to receptionist"
                        value={cashNotesInput}
                        onChange={(e) => setCashNotesInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 min-h-[48px]"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleSubmitManual("CASH")}
                      disabled={submittingManual}
                      className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                    >
                      {submittingManual ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Submit Cash Request for Admin Approval
                    </Button>
                  </div>
                )}

                {/* TAB 3: CARD / RAZORPAY SANDBOX */}
                {activeTab === "RAZORPAY" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Sandbox Order ID:</span>
                        <span className="font-mono text-slate-200 font-semibold">
                          {order?.paymentData?.razorpayOrderId || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Merchant API Key:</span>
                        <span className="font-mono text-xs text-blue-400">
                          {order?.paymentData?.razorpayKeyId || "rzp_test_..."}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Environment:</span>
                        <span className="text-emerald-400 font-semibold">Test Sandbox (0% Risk)</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      This sandbox simulates Razorpay's online card/netbanking flow. Click below to simulate an instant
                      successful test transaction.
                    </p>

                    <Button
                      onClick={handleSimulateSandbox}
                      disabled={verifying}
                      className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20"
                    >
                      {verifying ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Simulate Test Card Payment
                    </Button>
                  </div>
                )}
              </>
            )}
            </>
            )}
          </div>
        )}

        {/* Footer Security Badges */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            256-Bit SSL Encrypted
          </span>
          <span>•</span>
          <span>NPCI UPI Standards</span>
          <span>•</span>
          <span>Zero Server Waste</span>
        </div>
      </div>
    </div>
  );
}
