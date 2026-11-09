"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Organization, WalletTransaction, WalletType } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Wallet,
  Plus,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function SalonWalletsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [balance, setBalance] = useState<number>(0);
  const [passbook, setPassbook] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPassbook, setLoadingPassbook] = useState(false);

  // Credit modal
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(500);
  const [creditReason, setCreditReason] = useState("Admin promotional bonus");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function init() {
      try {
        const res = await api.salons.getOrganizations();
        if (res && res.organizations && res.organizations.length > 0) {
          setOrganizations(res.organizations);
          setSelectedOrgId(res.organizations[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const loadWalletDetails = async (orgId: string) => {
    if (!orgId) return;
    setLoadingPassbook(true);
    try {
      const [balRes, passRes] = await Promise.all([
        api.wallets.getBalance("OWNER", orgId),
        api.wallets.getPassbook("OWNER", orgId, undefined, 50),
      ]);
      if (balRes && balRes.balance !== undefined) setBalance(balRes.balance);
      if (passRes && passRes.transactions) setPassbook(passRes.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPassbook(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId) {
      loadWalletDetails(selectedOrgId);
    }
  }, [selectedOrgId]);

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || creditAmount <= 0) return;
    setIsSubmittingCredit(true);
    try {
      const res = await api.wallets.credit({
        walletType: "OWNER",
        identifier: selectedOrgId,
        amount: creditAmount,
        reason: creditReason,
      });
      if (res && res.success) {
        showToast("success", `Credited ${formatCurrency(creditAmount)} to salon wallet!`);
        setIsCreditModalOpen(false);
        loadWalletDetails(selectedOrgId);
      } else {
        showToast("error", "Failed to credit wallet");
      }
    } catch (err: any) {
      showToast("error", err.message || "Error crediting wallet");
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin" className="hover:text-slate-200">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-emerald-400 font-medium">Salon Wallets</span>
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            👛 Salon Wallets & Double-Entry Passbook
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit B2B salon subscription balances, referral commission credits, and consumer loyalty passbooks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsCreditModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 gap-1.5 text-xs shadow-md shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            Credit Salon Wallet
          </Button>
        </div>
      </div>

      {/* Salon Selector & Balance KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-800 bg-slate-900/60 md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white">Select Tenant Salon</CardTitle>
            <CardDescription className="text-xs">Inspect individual salon wallet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 text-xs outline-none cursor-pointer"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.slug})
                </option>
              ))}
            </select>

            {selectedOrg && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
                <div className="text-slate-400">Org ID: <span className="font-mono text-slate-300">{selectedOrg.id}</span></div>
                <div className="text-slate-400">Tier: <strong className="text-blue-400">{selectedOrg.tier}</strong></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-slate-900/80 md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                Current Wallet Balance
              </span>
              <Wallet className="h-5 w-5 text-emerald-400" />
            </div>
            <CardTitle className="text-4xl font-black text-white mt-1">
              {formatCurrency(balance)}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Can be redeemed against monthly/annual subscription plan renewals.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadWalletDetails(selectedOrgId)}
                className="border-slate-700 hover:bg-slate-800 text-xs text-slate-200 h-8 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${loadingPassbook ? "animate-spin" : ""}`} />
                Sync Passbook
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Double-Entry Passbook Ledger */}
      <Card className="border-slate-800 bg-slate-900/50 overflow-hidden">
        <CardHeader className="border-b border-slate-800 py-3 px-4">
          <CardTitle className="text-sm text-white">Wallet Passbook Ledger</CardTitle>
          <CardDescription className="text-xs text-slate-400">Chronological list of all debits and credits</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Balance After</th>
                <th className="py-3 px-4">Reason / Description</th>
                <th className="py-3 px-4">Reference ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loadingPassbook ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 text-blue-400 animate-spin mx-auto mb-2" />
                    Loading passbook entries...
                  </td>
                </tr>
              ) : passbook.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No wallet transactions recorded for this salon.
                  </td>
                </tr>
              ) : (
                passbook.map((tx) => {
                  const isCredit = tx.type === "CREDIT";

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString("en-IN")}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            isCredit
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]"
                          }
                        >
                          {isCredit ? "+ CREDIT" : "- DEBIT"}
                        </Badge>
                      </td>

                      <td className={`py-3 px-4 font-mono font-bold whitespace-nowrap ${isCredit ? "text-emerald-400" : "text-rose-400"}`}>
                        {isCredit ? "+" : "-"}{formatCurrency(tx.amount)}
                      </td>

                      <td className="py-3 px-4 font-mono text-white whitespace-nowrap">
                        {formatCurrency(tx.balanceAfter)}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-200">
                        {tx.reason}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {tx.referenceId || "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Credit Modal */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleAddCredit}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Credit Salon Wallet</h3>
                <p className="text-xs text-slate-400">Tenant: {selectedOrg?.name}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Credit Amount (₹)</label>
              <Input
                type="number"
                min={1}
                value={creditAmount}
                onChange={(e) => setCreditAmount(Number(e.target.value))}
                className="bg-slate-950 border-slate-700 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Reason / Reference Note</label>
              <Input
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="e.g. Compensation credit / Referral bonus"
                className="bg-slate-950 border-slate-700 text-white text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCredit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5"
              >
                {isSubmittingCredit && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm Credit Deposit
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}