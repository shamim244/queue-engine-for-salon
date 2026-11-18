"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { partnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Lock,
  ArrowUpRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Loader2,
  Check,
  Building2,
  Smartphone,
  ExternalLink,
} from "lucide-react";

export default function PartnerWalletPage() {
  const [wallet, setWallet] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payout Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(500);
  const [payoutMethod, setPayoutMethod] = useState<"UPI" | "BANK_TRANSFER">("UPI");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      const meRes = await partnerApi.getMe();
      if (meRes.success) {
        setPartner(meRes.partner);
        // Default to whichever method is saved
        if (meRes.partner.payoutUpiId) {
          setPayoutMethod("UPI");
        } else if (meRes.partner.payoutBankAccount) {
          setPayoutMethod("BANK_TRANSFER");
        }
      }
      const ledgerRes = await partnerApi.getLedger();
      if (ledgerRes.success) {
        setWallet(ledgerRes.wallet);
        setLedger(ledgerRes.ledger);
        setPayouts(ledgerRes.payouts);
      }
    } catch (err) {
      console.error("Error loading wallet:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutMessage(null);

    if (withdrawAmount < 500) {
      setPayoutMessage({ type: "error", text: "Minimum withdrawal amount is ₹500." });
      return;
    }

    if (withdrawAmount > (wallet?.availableBalance ?? 0)) {
      setPayoutMessage({ type: "error", text: "Insufficient available balance for this withdrawal." });
      return;
    }

    if (payoutMethod === "UPI" && !partner?.payoutUpiId) {
      setPayoutMessage({
        type: "error",
        text: "Your UPI ID is not configured. Please add it in your Partner Profile Settings.",
      });
      return;
    }

    if (payoutMethod === "BANK_TRANSFER" && (!partner?.payoutBankAccount || !partner?.payoutBankIfsc)) {
      setPayoutMessage({
        type: "error",
        text: "Your Bank Account is not configured. Please add it in your Partner Profile Settings.",
      });
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const res = await partnerApi.requestPayout({
        amount: Number(withdrawAmount),
        payoutMethod,
      });

      if (res.success) {
        setPayoutMessage({
          type: "success",
          text: `Withdrawal request for ₹${withdrawAmount} submitted! Super Admin will settle via ${payoutMethod === "UPI" ? "UPI" : "Bank Transfer"} with a UTR within 24 hours.`,
        });
        await loadData();
      } else {
        setPayoutMessage({ type: "error", text: res.message || "Failed to submit request." });
      }
    } catch (err: any) {
      setPayoutMessage({ type: "error", text: err?.message || "Failed to submit withdrawal request." });
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  const hasUpi = Boolean(partner?.payoutUpiId);
  const hasBank = Boolean(partner?.payoutBankAccount && partner?.payoutBankIfsc);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-xs mb-1.5">
          Double-Entry Earnings Ledger
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Partner Wallet & Payouts
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Review net commissions, milestone releases, and withdraw your earnings directly to your verified destinations.
        </p>
      </div>

      {/* 4 Balances Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Available Balance */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-emerald-400">Available Balance</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            ₹{wallet?.availableBalance ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium">
            Withdrawable anytime (min ₹500)
          </div>
        </div>

        {/* Pending Lock */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Pending Lock</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            ₹{wallet?.pendingLockedBalance ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Unlocks at 15 tickets / paid plan
          </div>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Withdrawn</span>
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            ₹{wallet?.totalWithdrawn ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Paid out via UPI / NEFT
          </div>
        </div>

        {/* Lifetime Earnings */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Lifetime Earnings</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            ₹{wallet?.lifetimeEarnings ?? 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            All-time net commissions
          </div>
        </div>
      </div>

      {/* Withdrawal Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <span>Request UPI Withdrawal</span>
          </h2>
          <p className="text-xs text-slate-400">
            Minimum withdrawal amount is <span className="text-amber-400 font-semibold">₹500</span>. Verified details are read securely from your profile without re-typing.
          </p>
        </div>

        {payoutMessage && (
          <div
            className={`p-4 rounded-xl text-xs leading-relaxed flex items-start gap-2 ${
              payoutMessage.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
            }`}
          >
            {payoutMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <span>{payoutMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleWithdrawal} className="space-y-5">
          {/* Amount Input */}
          <div className="space-y-1.5 max-w-xs">
            <label className="block text-xs font-semibold text-slate-300">
              Withdrawal Amount (INR) <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <Input
                type="number"
                min={500}
                step={50}
                max={wallet?.availableBalance || 500}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                disabled={isSubmittingPayout || (wallet?.availableBalance || 0) < 500}
                className="h-12 pl-8 rounded-xl bg-slate-950 border-slate-700 text-white font-bold text-base min-h-[48px]"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Max available: ₹{wallet?.availableBalance || 0}
            </p>
          </div>

          {/* Option-Based Payout Destination Selector (No raw account input!) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Select Saved Destination Method
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Saved UPI */}
              <div
                onClick={() => hasUpi && setPayoutMethod("UPI")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  !hasUpi
                    ? "opacity-50 cursor-not-allowed bg-slate-950/40 border-slate-800"
                    : payoutMethod === "UPI"
                    ? "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">Instant UPI Settlement</span>
                  </div>
                  <input
                    type="radio"
                    name="payoutMethod"
                    checked={payoutMethod === "UPI"}
                    onChange={() => setPayoutMethod("UPI")}
                    disabled={!hasUpi}
                    className="accent-emerald-500 w-4 h-4"
                  />
                </div>
                {hasUpi ? (
                  <p className="text-xs font-mono text-emerald-400 truncate">
                    {partner?.payoutUpiId}
                  </p>
                ) : (
                  <p className="text-xs text-amber-400">Not configured in profile</p>
                )}
              </div>

              {/* Option B: Saved Bank Account */}
              <div
                onClick={() => hasBank && setPayoutMethod("BANK_TRANSFER")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  !hasBank
                    ? "opacity-50 cursor-not-allowed bg-slate-950/40 border-slate-800"
                    : payoutMethod === "BANK_TRANSFER"
                    ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-bold text-white">Indian Bank Transfer</span>
                  </div>
                  <input
                    type="radio"
                    name="payoutMethod"
                    checked={payoutMethod === "BANK_TRANSFER"}
                    onChange={() => setPayoutMethod("BANK_TRANSFER")}
                    disabled={!hasBank}
                    className="accent-blue-500 w-4 h-4"
                  />
                </div>
                {hasBank ? (
                  <p className="text-xs font-mono text-blue-300 truncate">
                    {partner?.payoutBankName || "Bank"} ••••{partner?.payoutBankAccount?.slice(-4)} ({partner?.payoutBankIfsc})
                  </p>
                ) : (
                  <p className="text-xs text-amber-400">Not configured in profile</p>
                )}
              </div>
            </div>

            {(!hasUpi && !hasBank) && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
                <span>You have not configured any verified payout methods yet.</span>
                <Link
                  href="/partner/profile"
                  className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 shrink-0"
                >
                  Configure in Profile <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmittingPayout || (wallet?.availableBalance || 0) < 500 || (!hasUpi && !hasBank)}
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 min-h-[48px] flex items-center justify-center gap-2"
            >
              {isSubmittingPayout ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Request ₹{withdrawAmount} Withdrawal</span>
                </>
              )}
            </Button>

            <Link href="/partner/profile">
              <Button variant="ghost" className="text-xs text-slate-400 hover:text-white min-h-[48px]">
                Manage Payout Methods →
              </Button>
            </Link>
          </div>
        </form>
      </div>

      {/* Payout History */}
      {payouts.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4">Payout Withdrawal History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">UTR Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-3 text-slate-300">
                      {new Date(p.requestedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">₹{p.amount}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{p.payoutTarget}</td>
                    <td className="py-3 px-3">
                      {p.status === "PAID" && (
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                          PAID
                        </Badge>
                      )}
                      {p.status === "REQUESTED" && (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]">
                          REQUESTED
                        </Badge>
                      )}
                      {p.status === "REJECTED" && (
                        <Badge variant="destructive" className="text-[10px]">
                          REJECTED
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {p.utrReference || "Pending Admin Settlement"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Double-Entry Earnings Ledger Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-4">Earnings Ledger Passbook</h2>
        {ledger.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No transactions yet. Complete an assisted onboarding or share your link to start earning!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Net Paid</th>
                  <th className="py-2.5 px-3">Commission</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(entry.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-200">
                      {entry.description}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {entry.netPaidAmount > 0 ? `₹${entry.netPaidAmount}` : "—"}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      +₹{entry.commissionAmount}
                    </td>
                    <td className="py-3 px-3">
                      {entry.balanceType === "AVAILABLE" ? (
                        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                          AVAILABLE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]">
                          LOCKED (15 Tix)
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
