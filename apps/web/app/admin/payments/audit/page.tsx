"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { PaymentOrder } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Search,
  UserCheck,
  Building,
} from "lucide-react";

export default function PaymentAuditTrailPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterReview, setFilterReview] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getAllTransactions({ limit: 100 });
      if (res.success && res.orders) {
        // filter to those reviewed
        setOrders(res.orders.filter((o) => o.reviewedBy || o.status === "COMPLETED" || o.status === "REJECTED"));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  const filtered = orders.filter((o) => {
    if (filterReview === "APPROVED") return o.status === "COMPLETED";
    if (filterReview === "REJECTED") return o.status === "REJECTED";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/admin/payments" className="hover:text-slate-200">Payments & Gateway</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-amber-400 font-medium">Audit Trail</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            📜 Payment & Gateway Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of all administrative actions: manual UTR approvals, rejections with logged reasoning, and operator identity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAudit}
            disabled={loading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            Refresh Log
          </Button>
          <Link href="/admin/payments/transactions">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 h-9"
            >
              Transactions
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {(["ALL", "APPROVED", "REJECTED"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterReview(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterReview === tab
                ? "bg-slate-800 text-white border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab === "ALL" ? `All Audit Events (${orders.length})` : tab === "APPROVED" ? "Approved Only" : "Rejected Only"}
          </button>
        ))}
      </div>

      {/* Audit Log Timeline */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-0">
          <div className="divide-y divide-slate-800/80">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mx-auto mb-2" />
                Loading audit logs...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No audit logs found for the selected filter.
              </div>
            ) : (
              filtered.map((item) => {
                const isApproved = item.status === "COMPLETED";

                return (
                  <div key={item.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isApproved
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {isApproved ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {isApproved ? "Manual Payment Order Approved" : "Payment Order Rejected"}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              isApproved
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]"
                                : "bg-rose-500/10 text-rose-300 border-rose-500/30 text-[10px]"
                            }
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {item.reviewedAt
                            ? new Date(item.reviewedAt).toLocaleString("en-IN")
                            : new Date(item.updatedAt).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>Salon: <strong className="text-slate-300">{item.organizationName || item.organizationId}</strong></span>
                        <span>Amount: <strong className="text-emerald-400">{formatCurrency(item.amount)}</strong></span>
                        <span>Gateway: <strong className="text-purple-400">{item.provider}</strong></span>
                        {item.utrNumber && <span>UTR: <strong className="text-slate-200 font-mono">{item.utrNumber}</strong></span>}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                        <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                        <span>Action Operator: <strong className="text-white font-mono">{item.reviewedBy || "system_admin"}</strong></span>
                      </div>

                      {item.rejectionReason && (
                        <div className="mt-2 p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300">
                          <strong>Rejection Note: </strong>
                          <span>{item.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}