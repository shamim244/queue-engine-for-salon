"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { adminPartnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Smartphone,
  Building2,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function AdminPartnerPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Settlement Modal State
  const [settlingPayout, setSettlingPayout] = useState<any | null>(null);
  const [utrReference, setUtrReference] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rejection Modal State
  const [rejectingPayout, setRejectingPayout] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadPayouts = async () => {
    try {
      const res = await adminPartnerApi.listPayouts();
      if (res.success) {
        setPayouts(res.payouts);
      }
    } catch (err) {
      console.error("Error loading payouts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingPayout || !utrReference.trim()) return;

    setIsSubmitting(true);
    try {
      await adminPartnerApi.settlePayout(settlingPayout.id, {
        utrReference: utrReference.trim(),
        adminNotes: adminNotes.trim() || undefined,
      });
      setSettlingPayout(null);
      setUtrReference("");
      setAdminNotes("");
      await loadPayouts();
    } catch (err) {
      console.error("Error settling payout:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPayout || !rejectReason.trim()) return;

    setIsSubmitting(true);
    try {
      await adminPartnerApi.rejectPayout(rejectingPayout.id, rejectReason.trim());
      setRejectingPayout(null);
      setRejectReason("");
      await loadPayouts();
    } catch (err) {
      console.error("Error rejecting payout:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  const requestedCount = payouts.filter((p) => p.status === "REQUESTED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/partners"
          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Partner Directory</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-xs mb-1.5">
              Treasury Settlement
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Partner Payout Processing ({payouts.length})
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Transfer UPI funds to partners and record transaction UTR references.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 w-fit">
        {[
          { id: "ALL", label: `All (${payouts.length})` },
          { id: "REQUESTED", label: `Pending Action (${requestedCount})` },
          {
            id: "PAID",
            label: `Settled (${payouts.filter((p) => p.status === "PAID").length})`,
          },
          {
            id: "REJECTED",
            label: `Rejected (${payouts.filter((p) => p.status === "REJECTED").length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payouts Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {filteredPayouts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No withdrawal requests in this filter category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4">Partner</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method & Target</th>
                  <th className="py-3 px-4">Requested At</th>
                  <th className="py-3 px-4">Status & UTR</th>
                  <th className="py-3 px-4 text-right">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPayouts.map((p) => {
                  const isRequested = p.status === "REQUESTED";

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{p.partnerName}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{p.partnerPhone}</div>
                      </td>

                      <td className="py-3 px-4 font-extrabold text-sm text-emerald-400">
                        ₹{p.amount}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-200 font-mono font-semibold">
                          {p.payoutMethod === "UPI" ? (
                            <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span>{p.payoutTarget}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {new Date(p.requestedAt).toLocaleString("en-IN")}
                      </td>

                      <td className="py-3 px-4">
                        {p.status === "PAID" && (
                          <div>
                            <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] mb-1">
                              SETTLED / PAID
                            </Badge>
                            <div className="text-[11px] font-mono text-slate-400">
                              UTR: {p.utrReference}
                            </div>
                          </div>
                        )}
                        {p.status === "REQUESTED" && (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]">
                            ACTION REQUIRED
                          </Badge>
                        )}
                        {p.status === "REJECTED" && (
                          <div>
                            <Badge variant="destructive" className="text-[10px] mb-0.5">
                              REJECTED
                            </Badge>
                            <div className="text-[11px] text-slate-500">{p.adminNotes}</div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isRequested ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSettlingPayout(p);
                                setUtrReference("");
                                setAdminNotes("");
                              }}
                              className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3"
                            >
                              Settle (UTR)
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRejectingPayout(p);
                                setRejectReason("");
                              }}
                              className="h-8 rounded-lg text-xs px-2.5"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settlement Modal */}
      {settlingPayout && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-white mb-1">Record Settlement UTR</h2>
            <p className="text-xs text-slate-400 mb-4">
              Enter the bank/UPI reference number confirming transfer of{" "}
              <span className="text-emerald-400 font-bold">₹{settlingPayout.amount}</span> to{" "}
              <span className="font-mono text-white">{settlingPayout.payoutTarget}</span>.
            </p>

            <form onSubmit={handleSettle} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  UTR / Reference Number <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. HDFC-UPI-9988776655"
                  value={utrReference}
                  onChange={(e) => setUtrReference(e.target.value)}
                  className="h-12 rounded-xl bg-slate-950 border-slate-700 text-white font-mono text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Admin Notes (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Paid from HDFC Current Account"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="h-12 rounded-xl bg-slate-950 border-slate-700 text-white text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettlingPayout(null)}
                  className="flex-1 h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !utrReference.trim()}
                  className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Settlement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingPayout && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-white mb-1">Reject Payout Request</h2>
            <p className="text-xs text-slate-400 mb-4">
              Rejecting this payout of <span className="text-amber-400 font-bold">₹{rejectingPayout.amount}</span> will instantly refund the funds back to the partner&apos;s Available balance.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Invalid UPI VPA handle or bank account inactive"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="h-12 rounded-xl bg-slate-950 border-slate-700 text-white text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectingPayout(null)}
                  className="flex-1 h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="flex-1 h-11 rounded-xl font-bold text-xs"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
