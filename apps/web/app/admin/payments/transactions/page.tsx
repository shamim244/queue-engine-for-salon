"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PaymentOrder } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  QrCode,
  Banknote,
  Zap,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  Download,
  Building,
} from "lucide-react";

export default function AllTransactionsPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [providerFilter, setProviderFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getAllTransactions({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        provider: providerFilter !== "ALL" ? providerFilter : undefined,
        limit: 100,
      });
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (err: any) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [statusFilter, providerFilter]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics
  const totalVolume = orders.reduce((sum, o) => sum + (o.status === "COMPLETED" ? o.amount : 0), 0);
  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
  const pendingCount = orders.filter((o) => o.status === "PENDING_APPROVAL").length;
  const rejectedCount = orders.filter((o) => o.status === "REJECTED").length;

  const filteredOrders = orders.filter((o) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchUtr = o.utrNumber?.toLowerCase().includes(s);
      const matchRef = o.transactionRef?.toLowerCase().includes(s);
      const matchId = o.id.toLowerCase().includes(s);
      const matchOrg = o.organizationName?.toLowerCase().includes(s);
      const matchPlan = o.metadata?.planName?.toLowerCase().includes(s);
      return matchUtr || matchRef || matchId || matchOrg || matchPlan;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/admin/payments" className="hover:text-slate-200">Payments & Gateway</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white font-medium">All Transactions</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            📑 Universal Transactions Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete historical audit and settlement trail of all UPI, Cash, and Razorpay subscription & wallet transactions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactions}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/admin/payments/approvals">
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white h-9 gap-1.5 text-xs font-semibold"
            >
              <Clock className="h-4 w-4" />
              Approvals ({pendingCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Settled GMV</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-2">
              {formatCurrency(totalVolume)}
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">{completedCount} successful settlements</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Pending Approvals</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-2">
              {pendingCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Requires admin review</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Completed Orders</span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-400 mt-2">
              {completedCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">100% verified</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Rejected</span>
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-2">
              {rejectedCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Invalid UTR / Cash</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Order ID, 12-digit UTR, Salon name, or plan..."
            className="pl-9 bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 h-9 text-xs"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "COMPLETED", "PENDING_APPROVAL", "REJECTED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-800/60"
              }`}
            >
              {st === "ALL"
                ? "All Status"
                : st === "PENDING_APPROVAL"
                ? "Pending Approval"
                : st}
            </button>
          ))}
        </div>

        {/* Provider Filters */}
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-3 py-2 outline-none"
        >
          <option value="ALL">All Gateways</option>
          <option value="UPI_QR">UPI QR</option>
          <option value="CASH">Cash / Desk</option>
          <option value="RAZORPAY">Razorpay</option>
        </select>
      </div>

      {/* Transactions Table */}
      <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Salon / Organization</th>
                <th className="py-3 px-4">Target Plan / Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Gateway</th>
                <th className="py-3 px-4">UTR / Transaction Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reviewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mx-auto mb-2" />
                    Loading transactions ledger...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No transactions found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isUpi = order.provider === "UPI_QR";
                  const isCash = order.provider === "CASH";
                  const isRazorpay = order.provider === "RAZORPAY";

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        <div className="text-[10px] text-slate-500">
                          {new Date(order.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Salon */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white truncate max-w-[180px]">
                          {order.organizationName || "Direct / Global"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                          {order.organizationId || order.customerId || "N/A"}
                        </div>
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {order.metadata?.planName || order.targetType}
                        </div>
                        {order.metadata?.cycle && (
                          <span className="text-[10px] text-blue-400 uppercase font-semibold">
                            {order.metadata.cycle} billing
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        {formatCurrency(order.amount)}
                      </td>

                      {/* Gateway */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            isUpi
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px] gap-1"
                              : isCash
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px] gap-1"
                              : "bg-blue-500/10 text-blue-300 border-blue-500/30 text-[10px] gap-1"
                          }
                        >
                          {isUpi && <QrCode className="h-3 w-3" />}
                          {isCash && <Banknote className="h-3 w-3" />}
                          {isRazorpay && <Zap className="h-3 w-3" />}
                          {isUpi ? "UPI QR" : isCash ? "Cash Desk" : "Razorpay"}
                        </Badge>
                      </td>

                      {/* UTR / Ref */}
                      <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                        {order.utrNumber || order.transactionRef ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-200">
                              {order.utrNumber || order.transactionRef}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  order.utrNumber || order.transactionRef || "",
                                  `ref-${order.id}`
                                )
                              }
                              className="text-slate-500 hover:text-white"
                              title="Copy Reference"
                            >
                              {copiedId === `ref-${order.id}` ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            order.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                              : order.status === "PENDING_APPROVAL"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]"
                              : order.status === "REJECTED"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/30 text-[10px]"
                          }
                        >
                          {order.status}
                        </Badge>
                      </td>

                      {/* Reviewer / Reason */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                        {order.reviewedBy ? (
                          <div>
                            <span className="font-mono text-slate-300">{order.reviewedBy}</span>
                            {order.rejectionReason && (
                              <div className="text-[10px] text-rose-400 max-w-[120px] truncate" title={order.rejectionReason}>
                                {order.rejectionReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}