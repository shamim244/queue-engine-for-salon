"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { adminPartnerApi } from "@/lib/partner-api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Building2,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  ExternalLink,
  Percent,
  Award,
  Sliders,
  Check,
  X,
  Loader2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  ChevronRight,
} from "lucide-react";

export default function AdminAttributionsPage() {
  const [attributions, setAttributions] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [salons, setSalons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  // Reassign Modal
  const [reassigningAttr, setReassigningAttr] = useState<any | null>(null);
  const [targetPartnerId, setTargetPartnerId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignError, setReassignError] = useState("");

  // Manual Attribution Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualSalonId, setManualSalonId] = useState("");
  const [manualPartnerId, setManualPartnerId] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attrRes, partnersRes, salonsRes] = await Promise.all([
        adminPartnerApi.listAttributions(),
        adminPartnerApi.listPartners(),
        api.salons.getAll().catch(() => []),
      ]);

      if (attrRes.success) {
        setAttributions(attrRes.attributions || []);
      }
      if (partnersRes.success) {
        setPartners(partnersRes.partners || []);
      }
      if (Array.isArray(salonsRes)) {
        setSalons(salonsRes);
      }
    } catch (err) {
      console.error("Error loading attribution data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered attributions
  const filteredAttributions = attributions.filter((attr) => {
    if (statusFilter !== "ALL" && attr.status !== statusFilter) return false;
    if (sourceFilter !== "ALL" && attr.attributionSource !== sourceFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSalon =
        attr.salonName?.toLowerCase().includes(q) ||
        attr.salonPhone?.toLowerCase().includes(q) ||
        attr.salonId?.toLowerCase().includes(q);
      const matchPartner =
        attr.partnerName?.toLowerCase().includes(q) ||
        attr.partnerCode?.toLowerCase().includes(q) ||
        attr.partnerPhone?.toLowerCase().includes(q);
      if (!matchSalon && !matchPartner) return false;
    }
    return true;
  });

  // Calculate quick stats
  const totalAttributions = attributions.length;
  const qualifiedCount = attributions.filter((a) => a.status === "QUALIFIED").length;
  const totalCommissionGenerated = attributions.reduce(
    (sum, a) => sum + (Number(a.commissionEarnedTotal) || 0) + (Number(a.bountyEarnedTotal) || 0),
    0
  );

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningAttr || !targetPartnerId) return;

    setIsReassigning(true);
    setReassignError("");
    try {
      const res = await adminPartnerApi.reassignAttribution(reassigningAttr.id, targetPartnerId);
      if (res.success) {
        setReassigningAttr(null);
        setTargetPartnerId("");
        await loadData();
      } else {
        setReassignError(res.message || "Failed to reassign attribution");
      }
    } catch (err: any) {
      setReassignError(err.message || "Server error while reassigning attribution");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleManualAttribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSalonId || !manualPartnerId) return;

    setIsSubmittingManual(true);
    setManualError("");
    try {
      const res = await adminPartnerApi.manualAttribution(manualSalonId, manualPartnerId);
      if (res.success) {
        setIsManualModalOpen(false);
        setManualSalonId("");
        setManualPartnerId("");
        await loadData();
      } else {
        setManualError(res.message || "Failed to attribute salon");
      }
    } catch (err: any) {
      setManualError(err.message || "Server error while creating manual attribution");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "LINK":
        return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px]">Invite Link</Badge>;
      case "PROMO_CODE":
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px]">Promo Code</Badge>;
      case "ASSISTED_ONBOARDING":
        return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">Assisted Field</Badge>;
      case "ADMIN_ASSIGNED":
        return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">Admin Assigned</Badge>;
      default:
        return <Badge className="bg-slate-700 text-slate-300 text-[10px]">{source || "DIRECT"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/partners" className="hover:text-white transition-colors">
              Partner Hub
            </Link>
            <span>/</span>
            <span className="text-white">Attributions & Milestones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Salon Attributions</span>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-500/10 text-xs">
              Milestone Audit
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track attributed salon accounts, verify ticket qualification milestones, and reassign partner ownership.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => setIsManualModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 shadow-lg shadow-blue-600/20 gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Attribute Manually</span>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Attributed Salons</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalAttributions}</div>
          <div className="text-[11px] text-slate-500 mt-1">Salons registered via partner codes & field kits</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Qualified Salons</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{qualifiedCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalAttributions > 0
              ? `${Math.round((qualifiedCount / totalAttributions) * 100)}% conversion to active usage`
              : "No salons attributed yet"}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Partner Value Generated</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            ₹{totalCommissionGenerated.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Commissions & qualification bounties credited</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by salon name, partner name, phone or code..."
            className="pl-9 h-10 bg-slate-950/80 border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
            {(["ALL", "QUALIFIED", "UNQUALIFIED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {st === "ALL" ? "All Status" : st === "QUALIFIED" ? "Qualified" : "In Progress"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
            {(["ALL", "LINK", "PROMO_CODE", "ASSISTED_ONBOARDING", "ADMIN_ASSIGNED"] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setSourceFilter(sc)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  sourceFilter === sc
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {sc === "ALL"
                  ? "All Sources"
                  : sc === "LINK"
                  ? "Link"
                  : sc === "PROMO_CODE"
                  ? "Code"
                  : sc === "ASSISTED_ONBOARDING"
                  ? "Field"
                  : "Admin"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attributions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Salon Identity</th>
                <th className="py-3.5 px-4">Attributed Partner</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Milestone Progress</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Total Value</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400 mb-2" />
                    <span>Loading attribution records...</span>
                  </td>
                </tr>
              ) : filteredAttributions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-semibold text-slate-300">No salon attributions found</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Salons onboarded via referral codes or field links will automatically appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAttributions.map((attr) => {
                  const completed = attr.completedTicketsCount || 0;
                  const threshold = attr.qualificationTicketsThreshold || 15;
                  const pct = Math.min(100, Math.round((completed / threshold) * 100));
                  const isQualified = attr.status === "QUALIFIED";

                  return (
                    <tr key={attr.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Salon */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{attr.salonName || "Salon #" + attr.salonId.slice(0, 8)}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {attr.salonPhone || "No phone registered"}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {attr.salonId}</div>
                      </td>

                      {/* Partner */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{attr.partnerName || "Unknown Partner"}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {attr.partnerCode || "NO_CODE"}
                          </span>
                          <span className="text-[11px] text-slate-400">{attr.partnerPhone}</span>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">{getSourceBadge(attr.attributionSource)}</td>

                      {/* Milestone Progress */}
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] font-medium mb-1">
                          <span className={isQualified ? "text-emerald-400 font-bold" : "text-slate-300"}>
                            {completed} / {threshold} Tickets
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isQualified ? "bg-emerald-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {isQualified ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Qualified</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>In Progress</span>
                          </Badge>
                        )}
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-200">
                          ₹{((Number(attr.commissionEarnedTotal) || 0) + (Number(attr.bountyEarnedTotal) || 0)).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Comms: ₹{Number(attr.commissionEarnedTotal || 0).toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {attr.createdAt ? new Date(attr.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReassigningAttr(attr);
                            setTargetPartnerId("");
                            setReassignError("");
                          }}
                          className="h-8 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white gap-1"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-blue-400" />
                          <span>Reassign</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REASSIGN PARTNER MODAL */}
      {reassigningAttr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Reassign Salon Partner</h3>
              </div>
              <button
                type="button"
                onClick={() => setReassigningAttr(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <div className="text-slate-400">Salon Name:</div>
                <div className="font-bold text-white text-sm">{reassigningAttr.salonName || reassigningAttr.salonId}</div>
                <div className="text-slate-500 font-mono text-[11px]">ID: {reassigningAttr.salonId}</div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <div className="text-slate-400">Current Partner:</div>
                <div className="font-semibold text-amber-300">
                  {reassigningAttr.partnerName} ({reassigningAttr.partnerCode})
                </div>
              </div>

              {reassignError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reassignError}</span>
                </div>
              )}

              <form onSubmit={handleReassign} className="space-y-4 pt-1">
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Select New Target Partner <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={targetPartnerId}
                    onChange={(e) => setTargetPartnerId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose New Partner --</option>
                    {partners
                      .filter((p) => p.id !== reassigningAttr.partnerId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.referralCode}) - {p.phone}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                  Notice: All future recurring commissions and ticket milestone bounties from this salon will be credited to the newly selected partner.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReassigningAttr(null)}
                    disabled={isReassigning}
                    className="border-slate-700 hover:bg-slate-800 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isReassigning || !targetPartnerId}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5"
                  >
                    {isReassigning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Reassigning...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Reassignment</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ATTRIBUTION MODAL */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Manual Salon Attribution</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Manually link an existing salon to a field partner so that subscription commissions and ticket milestones are tracked.
              </p>

              {manualError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <form onSubmit={handleManualAttribution} className="space-y-4 pt-1">
                {/* Select Salon */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Select Salon <span className="text-rose-400">*</span>
                  </label>
                  {salons.length > 0 ? (
                    <select
                      value={manualSalonId}
                      onChange={(e) => setManualSalonId(e.target.value)}
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose Salon --</option>
                      {salons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.slug}) - {s.phone || "No phone"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={manualSalonId}
                      onChange={(e) => setManualSalonId(e.target.value)}
                      placeholder="Enter exact Salon ID"
                      required
                      className="bg-slate-950 border-slate-800 text-xs text-white"
                    />
                  )}
                </div>

                {/* Select Partner */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">
                    Select Partner <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={manualPartnerId}
                    onChange={(e) => setManualPartnerId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Partner --</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.referralCode}) - {p.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] leading-relaxed">
                  Source will be marked as <span className="font-bold">ADMIN_ASSIGNED</span>. The partner will immediately begin receiving commissions for this salon.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsManualModalOpen(false)}
                    disabled={isSubmittingManual}
                    className="border-slate-700 hover:bg-slate-800 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingManual || !manualSalonId || !manualPartnerId}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs gap-1.5"
                  >
                    {isSubmittingManual ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Attributing...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Create Attribution</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
