"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { adminPartnerApi } from "@/lib/partner-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Wallet,
  Store,
  ExternalLink,
  CreditCard,
  Edit,
  Loader2,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  UserPlus,
  Sparkles,
  Compass,
  Briefcase,
  RefreshCw,
} from "lucide-react";

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPersona, setFilterPersona] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Password Management Modal State
  const [passwordModalPartner, setPasswordModalPartner] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const special = "@#$!";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pwd += special.charAt(Math.floor(Math.random() * special.length));
    pwd += Math.floor(10 + Math.random() * 90);
    setNewPassword(pwd);
    setCopied(false);
    setPasswordSuccessMessage(null);
    setPasswordErrorMessage(null);
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalPartner) return;
    if (newPassword.trim().length < 8) {
      setPasswordErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsSettingPassword(true);
    setPasswordErrorMessage(null);
    setPasswordSuccessMessage(null);
    try {
      const res = await adminPartnerApi.setPassword(passwordModalPartner.id, newPassword.trim());
      if (res.success) {
        setPasswordSuccessMessage(`Password set successfully for ${passwordModalPartner.fullName}!`);
        await loadPartners();
      } else {
        setPasswordErrorMessage(res.message || "Failed to set password.");
      }
    } catch (err: any) {
      setPasswordErrorMessage(err?.message || "Failed to set password.");
    } finally {
      setIsSettingPassword(false);
    }
  };

  const loadPartners = async () => {
    try {
      const res = await adminPartnerApi.listPartners();
      if (res.success) {
        setPartners(res.partners);
      }
    } catch (err) {
      console.error("Error loading partners:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    setActionLoadingId(id);
    try {
      await adminPartnerApi.updateStatus(id, status);
      await loadPartners();
    } catch (err) {
      console.error("Error updating partner status:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredPartners = partners.filter((p) => {
    const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;
    const matchesPersona = filterPersona === "ALL" || p.persona === filterPersona;
    const matchesSearch =
      !searchQuery.trim() ||
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.referralCode.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesPersona && matchesSearch;
  });

  const pendingCount = partners.filter((p) => p.status === "PENDING_REVIEW").length;
  const activeCount = partners.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-xs mb-1.5">
            Super Admin Governance
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Partner & Affiliate Directory ({partners.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Approve applicants, adjust recurring % and bounties, and audit net earnings.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/partners/new">
            <Button
              className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 min-h-[44px] shadow-lg shadow-amber-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Onboard Partner</span>
            </Button>
          </Link>

          <Link href="/admin/partners/payouts">
            <Button className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 min-h-[44px]">
              <CreditCard className="w-4 h-4" />
              <span>Withdrawal Requests</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Total Partners</div>
          <div className="text-2xl font-extrabold text-white mt-1">{partners.length}</div>
        </div>
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4">
          <div className="text-xs text-amber-400 font-semibold">Pending Review</div>
          <div className="text-2xl font-extrabold text-amber-300 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4">
          <div className="text-xs text-emerald-400 font-semibold">Active Partners</div>
          <div className="text-2xl font-extrabold text-emerald-300 mt-1">{activeCount}</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400">Total Salons Attributed</div>
          <div className="text-2xl font-extrabold text-white mt-1">
            {partners.reduce((sum, p) => sum + (p.salonCount || 0), 0)}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          {["ALL", "PENDING_REVIEW", "ACTIVE", "PAUSED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === st
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {st === "ALL" ? "All Statuses" : st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full md:w-72 relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search name, phone, city, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Partners Directory Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {filteredPartners.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No partners found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4">Partner</th>
                  <th className="py-3 px-4">Persona & City</th>
                  <th className="py-3 px-4">Referral Code</th>
                  <th className="py-3 px-4">Model & Terms</th>
                  <th className="py-3 px-4">Salons</th>
                  <th className="py-3 px-4">Wallet</th>
                  <th className="py-3 px-4">Auth</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPartners.map((p) => {
                  const isPending = p.status === "PENDING_REVIEW";
                  const isActive = p.status === "ACTIVE";
                  const isPaused = p.status === "PAUSED";
                  const isBusy = actionLoadingId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{p.fullName}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{p.phone}</div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px] mb-0.5">
                          {p.persona}
                        </Badge>
                        <div className="text-slate-400 text-[11px]">{p.city}</div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-400">
                        {p.referralCode}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {p.commissionPercent}% Recurring
                        </div>
                        {p.bountyAmount > 0 && (
                          <div className="text-[10px] text-amber-400 font-medium">
                            +₹{p.bountyAmount} Bounty
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500">{p.durationType}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{p.salonCount || 0}</div>
                        <div className="text-[10px] text-emerald-400">
                          {p.qualifiedSalonCount || 0} Qualified
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-emerald-400">
                          ₹{p.wallet?.availableBalance ?? 0}
                        </div>
                        {p.wallet?.pendingLockedBalance > 0 && (
                          <div className="text-[10px] text-amber-400">
                            ₹{p.wallet.pendingLockedBalance} locked
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {p.hasPassword ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] flex items-center gap-1 w-fit">
                            <KeyRound className="w-3 h-3" />
                            <span>Password Set</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-rose-500/40 text-rose-400 bg-rose-500/10 text-[10px] flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            <span>No Password</span>
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {p.status === "ACTIVE" && (
                          <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                            ACTIVE
                          </Badge>
                        )}
                        {p.status === "PENDING_REVIEW" && (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-[10px]">
                            PENDING
                          </Badge>
                        )}
                        {p.status === "PAUSED" && (
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 text-[10px]">
                            PAUSED
                          </Badge>
                        )}
                        {p.status === "REJECTED" && (
                          <Badge variant="destructive" className="text-[10px]">
                            REJECTED
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Set/Reset Password Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPasswordModalPartner(p);
                              setNewPassword("");
                              setPasswordSuccessMessage(null);
                              setPasswordErrorMessage(null);
                              setCopied(false);
                            }}
                            className="h-8 rounded-lg border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 text-[11px] px-2 flex items-center gap-1"
                            title="Set or Reset Partner Password"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                            <span className="hidden sm:inline">Set Pwd</span>
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                disabled={isBusy}
                                onClick={() => handleUpdateStatus(p.id, "ACTIVE")}
                                className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-2.5"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={isBusy}
                                onClick={() => handleUpdateStatus(p.id, "REJECTED")}
                                className="h-8 rounded-lg text-[11px] px-2.5"
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(p.id, "PAUSED")}
                              className="h-8 rounded-lg border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-[11px] px-2.5"
                            >
                              Pause
                            </Button>
                          )}

                          {isPaused && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleUpdateStatus(p.id, "ACTIVE")}
                              className="h-8 rounded-lg border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 text-[11px] px-2.5"
                            >
                              Resume
                            </Button>
                          )}

                          <Link href={`/admin/partners/${p.id}`}>
                            <button
                              type="button"
                              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Edit Terms & Contract"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Set / Reset Password Modal Dialog */}
      {passwordModalPartner && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Set Partner Password</h3>
                  <p className="text-[11px] text-slate-400">Configure credentials for login</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPasswordModalPartner(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Partner Snapshot */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Partner:</span>
                <span className="font-bold text-white">{passwordModalPartner.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mobile / Login ID:</span>
                <span className="font-mono text-slate-200">{passwordModalPartner.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Referral Code:</span>
                <span className="font-mono font-bold text-amber-400">{passwordModalPartner.referralCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Auth:</span>
                <span className="text-[10px]">
                  {passwordModalPartner.hasPassword ? (
                    <span className="text-emerald-400 font-semibold">● Password Already Set</span>
                  ) : (
                    <span className="text-rose-400 font-semibold">● No Password Configured</span>
                  )}
                </span>
              </div>
            </div>

            {passwordErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordErrorMessage}</span>
              </div>
            )}

            {passwordSuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs mb-4 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{passwordSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    New Password <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold hover:underline"
                  >
                    + Generate Strong Password
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showModalPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-9 pr-20 h-11 bg-slate-950 border-slate-700 text-white rounded-xl placeholder:text-slate-500 text-xs"
                    required
                    minLength={8}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="p-1 text-slate-400 hover:text-white"
                      tabIndex={-1}
                      title={showModalPassword ? "Hide" : "Show"}
                    >
                      {showModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    {newPassword && (
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="p-1 text-slate-400 hover:text-amber-400"
                        tabIndex={-1}
                        title="Copy to Clipboard"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                {copied && (
                  <p className="text-[10px] text-emerald-400 font-medium">Copied password to clipboard!</p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                <span className="font-bold text-amber-300">Admin Tip:</span> Share this password securely with the partner via WhatsApp or phone. They will log in using their mobile phone or email at <span className="font-mono text-slate-300">/partner/login</span>.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordModalPartner(null)}
                  className="flex-1 h-11 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={isSettingPassword || !newPassword.trim()}
                  className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isSettingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Password</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
