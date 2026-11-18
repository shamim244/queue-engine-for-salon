"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PaymentOrder } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  QrCode,
  Banknote,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Building,
} from "lucide-react";

export default function ManualApprovalsPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Approval / Rejection state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<PaymentOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getPendingPayments();
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to load pending payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      const res = await api.admin.approvePayment(orderId, "admin_super");
      if (res.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        showToast("success", `Order ${orderId} approved successfully! Subscription is active.`);
      } else {
        showToast("error", res.message || "Failed to approve payment");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error approving payment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingOrder) return;
    if (!rejectionReason.trim()) {
      showToast("error", "Please provide a reason for rejecting this transaction");
      return;
    }
    const orderId = rejectingOrder.id;
    setProcessingId(orderId);
    try {
      const res = await api.admin.rejectPayment(orderId, rejectionReason.trim(), "admin_super");
      if (res.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setRejectingOrder(null);
        setRejectionReason("");
        showToast("info", `Order ${orderId} marked as rejected.`);
      } else {
        showToast("error", res.message || "Failed to reject order");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error rejecting payment");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (providerFilter !== "ALL" && o.provider !== providerFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchUtr = o.utrNumber?.toLowerCase().includes(s);
      const matchId = o.id.toLowerCase().includes(s);
      const matchOrg = o.organizationName?.toLowerCase().includes(s);
      const matchProof = o.paymentProofNote?.toLowerCase().includes(s);
      return matchUtr || matchId || matchOrg || matchProof;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : toast.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-blue-950/90 border-blue-500/50 text-blue-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/admin/payments" className="hover:text-slate-200">Payments & Gateway</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-amber-400 font-medium">Manual Approvals</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            ⏳ Manual Payment Approvals
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs px-2.5 py-0.5">
              {orders.length} Pending
            </Badge>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verify 12-digit UPI UTR reference numbers or cash counter receipts before activating salon subscription tiers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadPending}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
          <Link href="/admin/payments/settings">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
            >
              Gateway Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by 12-digit UTR, Salon Name, Order ID, or note..."
            className="pl-9 bg-slate-900/70 border-slate-700 text-slate-100 placeholder:text-slate-500 h-10"
          />
        </div>
        <div className="sm:col-span-4 flex items-center gap-1.5 bg-slate-900/70 p-1 rounded-xl border border-slate-800">
          {(["ALL", "UPI_QR", "CASH"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setProviderFilter(filter)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                providerFilter === filter
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {filter === "ALL" ? "All Gateways" : filter === "UPI_QR" ? "UPI QR" : "Cash Desk"}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Items List */}
      {loading ? (
        <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-900/40">
          <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">Loading pending verification requests...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40 p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-bold text-white mb-1">Queue is 100% Clear!</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {searchTerm || providerFilter !== "ALL"
              ? "No pending approvals match your search or filter criteria."
              : "All customer UPI and Cash payments have been verified and settled. No manual approvals pending."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isUpi = order.provider === "UPI_QR";
            const isProcessing = processingId === order.id;

            return (
              <Card
                key={order.id}
                className="border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all shadow-md"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Organization & Target Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            isUpi
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/30 gap-1 text-[11px]"
                              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 gap-1 text-[11px]"
                          }
                        >
                          {isUpi ? <QrCode className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                          {isUpi ? "Manual UPI QR" : "Cash Settlement"}
                        </Badge>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                          Awaiting Verification
                        </Badge>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {new Date(order.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-bold text-white text-base truncate">
                          {order.organizationName || "Unknown Salon"}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">({order.organizationId || "N/A"})</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>Target: <strong className="text-slate-300">{order.metadata?.planName || order.targetType}</strong></span>
                        {(order.metadata?.billingCycle || order.metadata?.cycle) && (
                          <span>Cycle: <strong className="text-blue-400 uppercase">{order.metadata?.billingCycle || order.metadata?.cycle}</strong></span>
                        )}
                        {order.metadata?.partnerCode && (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] font-semibold">
                            🤝 Partner: {order.metadata.partnerCode}
                          </Badge>
                        )}
                        <span>Order Ref: <span className="font-mono text-slate-400">{order.id}</span></span>
                      </div>

                      {/* Payment Proof / Note / UTR Display */}
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                        {isUpi && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-400 font-medium">12-Digit UTR:</span>
                            {order.utrNumber ? (
                              <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                <span className="font-mono font-bold text-emerald-400 tracking-wider">
                                  {order.utrNumber}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(order.utrNumber!, `utr-${order.id}`)}
                                  className="text-slate-400 hover:text-white p-0.5"
                                  title="Copy UTR"
                                >
                                  {copiedId === `utr-${order.id}` ? (
                                    <Check className="h-3 w-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-rose-400 italic">No UTR submitted yet</span>
                            )}
                          </div>
                        )}
                        {order.paymentProofNote && (
                          <div className="text-slate-400">
                            <span className="text-slate-500">Payer Note: </span>
                            <span className="text-slate-200 italic font-sans">{order.paymentProofNote}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle: Amount */}
                    <div className="text-left lg:text-right px-2 lg:px-4 shrink-0">
                      <div className="text-xs text-slate-400 uppercase font-semibold">Total Payable</div>
                      <div className="text-2xl font-black text-emerald-400">
                        {formatCurrency(order.amount)}
                      </div>
                      <span className="text-[11px] text-slate-500">Gross Settlement</span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => {
                          setRejectingOrder(order);
                          setRejectionReason("");
                        }}
                        className="h-10 px-3.5 border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 gap-1.5 text-xs font-semibold"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleApprove(order.id)}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs font-bold shadow-md shadow-emerald-600/20"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Approve & Activate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Reject Payment Order</h3>
                <p className="text-xs text-slate-400">Order ID: {rejectingOrder.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Please enter the reason for rejecting this payment (e.g. invalid UTR, payment not credited in bank, wrong amount). This note will be recorded in the audit trail.
            </p>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. UTR 432198765432 was not found in ICICI bank credit statement..."
                rows={3}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectingOrder(null)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim() || processingId === rejectingOrder.id}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold gap-1.5"
              >
                {processingId === rejectingOrder.id && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}