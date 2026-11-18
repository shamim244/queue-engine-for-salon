"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Stylist, AuthUser, StaffLeave } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  ShieldAlert,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  Search,
  Calendar,
  XCircle,
  Sparkles,
} from "lucide-react";
import {
  UnlinkedStationsBanner,
  StaffKpiCards,
  StaffRosterCard,
  AddStaffModal,
  EditStaffModal,
  StaffPinModal,
  ResetPasswordModal,
  KillSwitchModal,
  DeleteStaffModal,
  StaffAbsenceRecoveryModal,
  UpgradePlanPromptModal,
  InitialStaffData,
} from "@/components/owner/staff";

function OwnerStaffContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { salon, setSelectedSalon } = useAuth();

  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [staffUsers, setStaffUsers] = useState<AuthUser[]>([]);
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // In-App Toast Banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [killSwitchTarget, setKillSwitchTarget] = useState<AuthUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
  const [selectedStaffUser, setSelectedStaffUser] = useState<AuthUser | null>(null);
  const [absenceTarget, setAbsenceTarget] = useState<{ user: AuthUser; stylist: Stylist | null } | null>(null);
  const [initialCreateData, setInitialCreateData] = useState<InitialStaffData | undefined>(undefined);
  const [isUpgradePromptOpen, setIsUpgradePromptOpen] = useState(false);
  const [hasPartnerDiscount, setHasPartnerDiscount] = useState(false);
  const [quota, setQuota] = useState<{
    allowed: boolean;
    current: number;
    max: number;
    tier: string;
  } | null>(null);

  const currentSlug = salon?.slug || searchParams.get("salon") || "ramesh-barber";

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const salonRes = await api.salons.get(currentSlug);
      if (salonRes.salon) {
        setSelectedSalon(salonRes.salon);
        setStylists(salonRes.salon.stylists || []);

        const staffRes = await api.auth.listStaff(salonRes.salon.id);
        setStaffUsers(staffRes.staffUsers || []);

        try {
          const leavesRes = await api.salons.getStaffLeaves(salonRes.salon.id);
          setLeaves(leavesRes.leaves || []);
        } catch {
          setLeaves([]);
        }

        // Quota telemetry
        try {
          const quotaRes = await api.salons.getQuota(salonRes.salon.id || currentSlug);
          if (quotaRes && quotaRes.success) {
            setQuota({
              allowed: quotaRes.allowed,
              current: quotaRes.current,
              max: quotaRes.max,
              tier: quotaRes.tier,
            });
          }
        } catch (e) {
          console.warn("Could not fetch salon station quota:", e);
        }

        // Check active Partner Referral Discount
        try {
          let cookieCode: string | undefined;
          if (typeof document !== "undefined") {
            const match = document.cookie.match(/(?:^|;\s*)partner_ref=([^;]+)/);
            if (match) cookieCode = decodeURIComponent(match[1]).trim().toUpperCase();
          }
          const autoRef = await api.coupons.getAutoReferral({
            salonId: salonRes.salon.id,
            organizationId: salonRes.salon.organizationId || undefined,
            cookieCode,
          });
          if (autoRef && autoRef.success && autoRef.hasReferralDiscount) {
            setHasPartnerDiscount(true);
          }
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      showToast("Failed to load staff roster: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isStylistOnLeaveToday = (stylistId?: string | null) => {
    if (!stylistId) return false;
    return leaves.some((l) => {
      if (l.stylistId !== stylistId || l.status !== "APPROVED") return false;
      const end = l.endDate || l.leaveDate;
      return todayStr >= l.leaveDate && todayStr <= end;
    });
  };

  useEffect(() => {
    fetchStaffData();
  }, [currentSlug]);

  // Handle returning from dedicated /owner/staff/new page
  useEffect(() => {
    const created = searchParams.get("created");
    if (created) {
      showToast(`Team member "${decodeURIComponent(created)}" registered successfully!`, "success");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("created");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }

    const deleted = searchParams.get("deleted");
    if (deleted) {
      showToast(`Team member "${decodeURIComponent(deleted)}" removed successfully.`, "info");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("deleted");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
  }, [searchParams]);

  // Filter staff by search query
  const filteredStaffUsers = useMemo(() => {
    if (!searchQuery.trim()) return staffUsers;
    const q = searchQuery.toLowerCase();
    return staffUsers.filter(
      (u) =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        u.username.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.pin && u.pin.includes(q))
    );
  }, [staffUsers, searchQuery]);

  // Unlinked legacy stylists (present in stylists array but without an AuthUser account)
  const unlinkedStylists = useMemo(() => {
    return stylists.filter((st) => {
      return !staffUsers.some((u) => u.staffId === st.id || u.id === st.userId);
    });
  }, [stylists, staffUsers]);

  const activeStaffCount = staffUsers.filter((u) => u.status === "ACTIVE").length;
  const configuredPinsCount = staffUsers.filter((u) => Boolean(u.pin)).length;

  const handleOpenAddModal = (data?: InitialStaffData) => {
    // If provisioning login for an existing unlinked stylist station, route to dedicated creation page
    if (data?.staffId) {
      const q = new URLSearchParams({
        salon: currentSlug,
        staffId: data.staffId,
        name: data.fullName || "",
        phone: data.phone || "",
        pace: String(data.pace || 25),
      });
      router.push(`/owner/staff/new?${q.toString()}`);
      return;
    }

    // Gating check: if quota is exhausted (e.g. Free Tier with 1 chair, or max stations reached)
    const isAtLimit = quota ? !quota.allowed : stylists.length >= 1;
    if (isAtLimit) {
      setIsUpgradePromptOpen(true);
      return;
    }

    // Navigate to dedicated staff creation page with full-page error display
    router.push(`/owner/staff/new?salon=${currentSlug}`);
  };

  const handleProvisionLegacyStylist = (st: Stylist) => {
    handleOpenAddModal({
      staffId: st.id,
      fullName: st.name,
      username: st.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      phone: st.phone || "",
      pace: st.avgDurationMinutes || 25,
      pin: st.pin || "",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert Banner */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-600/50 text-emerald-200"
              : toast.type === "error"
              ? "bg-rose-950/90 border-rose-600/50 text-rose-200"
              : "bg-blue-950/90 border-blue-600/50 text-blue-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Users className="h-5 w-5 text-blue-400 shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1 rounded transition-opacity"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Staff & Station Management
            </h1>
            <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">
              {salon?.name || "Salon Branch"}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Provision staff logins, 4-digit mirror PINs, speed calibrations, and instant session security.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStaffData}
            disabled={loading}
            className="gap-2 border-slate-700 bg-slate-900/60 min-h-[44px]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenAddModal()}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20 min-h-[44px]"
          >
            <UserPlus className="h-4 w-4" />
            Add Team Member
          </Button>
        </div>
      </div>

      {/* Free Tier Active Quota Banner */}
      {quota?.tier === "FREE" && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">Free Testing Plan Active</span>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] py-0 px-2 font-mono">
                  {stylists.length} / {quota?.max || 1} Station Configured
                </Badge>
                {hasPartnerDiscount && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] py-0 px-2">
                    10% Partner Referral Saved
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Your salon is testing 1 Master Barber Station. Upgrade your subscription to unlock multiple barber chairs, Departure Lounge TV, and team PINs.
              </p>
            </div>
          </div>
          <Link
            href={`/owner/billing?salon=${currentSlug}`}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shrink-0 min-h-[40px] shadow-sm transition-colors active:scale-[0.98]"
          >
            Upgrade Plan →
          </Link>
        </div>
      )}

      {/* KPI Stats Cards */}
      <StaffKpiCards
        totalStaff={staffUsers.length}
        activeStaffCount={activeStaffCount}
        stylistsCount={stylists.length}
        configuredPinsCount={configuredPinsCount}
      />

      {/* Unlinked Legacy Stylists Alert Banner */}
      <UnlinkedStationsBanner
        unlinkedStylists={unlinkedStylists}
        onProvisionLogin={handleProvisionLegacyStylist}
      />

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name, username, phone, or PIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900/60 border-slate-800 text-sm min-h-[44px]"
          />
        </div>
        <p className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{filteredStaffUsers.length}</span> staff member(s)
        </p>
      </div>

      {/* Staff Roster Cards Grid */}
      {filteredStaffUsers.length === 0 ? (
        <Card className="bg-slate-900/40 border-slate-800 text-center py-12">
          <CardContent className="space-y-3">
            <Users className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-white">No Staff Members Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No staff matching "${searchQuery}". Try clearing your search.`
                : "No staff members registered yet. Click 'Add Team Member' to create authentic credentials."}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => handleOpenAddModal()}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold mt-2 min-h-[44px]"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add First Team Member
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaffUsers.map((user) => {
            const matchedStylist = stylists.find(
              (s) => s.id === user.staffId || s.userId === user.id || s.name === user.fullName
            );

            return (
              <StaffRosterCard
                key={user.id}
                user={user}
                matchedStylist={matchedStylist}
                isOnLeaveToday={isStylistOnLeaveToday(matchedStylist?.id || user.staffId)}
                salonSlug={currentSlug}
                onEdit={(u) => {
                  setSelectedStaffUser(u);
                  setIsEditOpen(true);
                }}
                onPin={(u) => {
                  setSelectedStaffUser(u);
                  setIsPinModalOpen(true);
                }}
                onResetPassword={(u) => {
                  setSelectedStaffUser(u);
                  setIsResetPasswordOpen(true);
                }}
                onDelete={(u) => setUserToDelete(u)}
                onKillSwitch={(u) => setKillSwitchTarget(u)}
                onManageLeave={(u, st) => setAbsenceTarget({ user: u, stylist: st || null })}
              />
            );
          })}
        </div>
      )}

      {/* Staff Leave & Absence Records Section */}
      <Card className="bg-slate-900/60 border-slate-800">
        <div className="p-4 sm:p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Staff Leaves & Absence Schedule
              </h2>
              <p className="text-xs text-slate-400">
                Track planned leave, late-detected absences, and duty status across the salon team.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs border-slate-700 text-slate-300">
            {leaves.length} Recorded
          </Badge>
        </div>

        <CardContent className="p-4 sm:p-6">
          {leaves.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No leave records found. Tap "Manage Leave & Absence" on any staff card to schedule or record an absence.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 px-3">Team Member</th>
                    <th className="pb-3 px-3">Leave Date</th>
                    <th className="pb-3 px-3">Reason</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leaves.map((leave) => {
                    const matched =
                      stylists.find((s) => s.id === leave.stylistId) ||
                      staffUsers.find((u) => u.staffId === leave.stylistId || u.id === leave.stylistId);
                    const memberName = (matched as any)?.fullName || (matched as any)?.name || leave.stylistId;

                    return (
                      <tr key={leave.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-3 font-semibold text-white">{memberName}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {leave.leaveDate}
                          {leave.endDate && leave.endDate !== leave.leaveDate && ` → ${leave.endDate}`}
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-[200px] truncate">
                          {leave.reason || "Staff absence"}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              leave.status === "APPROVED"
                                ? "success"
                                : leave.status === "CANCELLED"
                                ? "outline"
                                : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {leave.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {leave.status === "APPROVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 h-8 px-2"
                              onClick={async () => {
                                try {
                                  await api.salons.updateStaffLeaveStatus(salon?.id || "", leave.id, "CANCELLED");
                                  showToast("Leave cancelled and staff member reactivated!", "success");
                                  fetchStaffData();
                                } catch (err: any) {
                                  showToast(err.message || "Failed to cancel leave", "error");
                                }
                              }}
                            >
                              Cancel Leave
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <AddStaffModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setInitialCreateData(undefined);
        }}
        salonId={salon?.id}
        salonSlug={salon?.slug}
        initialData={initialCreateData}
        onSuccess={(name) => {
          showToast(`Team member ${name} registered with login credentials!`, "success");
          fetchStaffData();
        }}
        showToast={showToast}
      />

      <EditStaffModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedStaffUser(null);
        }}
        user={selectedStaffUser}
        matchedStylist={stylists.find(
          (s) => s.id === selectedStaffUser?.staffId || s.userId === selectedStaffUser?.id
        )}
        onSuccess={(name) => {
          showToast(`Staff profile for ${name} updated!`, "success");
          fetchStaffData();
        }}
        showToast={showToast}
      />

      <StaffPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setSelectedStaffUser(null);
        }}
        user={selectedStaffUser}
        onSuccess={() => fetchStaffData()}
        showToast={showToast}
      />

      <ResetPasswordModal
        isOpen={isResetPasswordOpen}
        onClose={() => {
          setIsResetPasswordOpen(false);
          setSelectedStaffUser(null);
        }}
        user={selectedStaffUser}
        onSuccess={() => fetchStaffData()}
        showToast={showToast}
      />

      <KillSwitchModal
        user={killSwitchTarget}
        onClose={() => setKillSwitchTarget(null)}
        onSuccess={() => fetchStaffData()}
        showToast={showToast}
      />

      <DeleteStaffModal
        user={userToDelete}
        onClose={() => setUserToDelete(null)}
        onSuccess={() => fetchStaffData()}
        showToast={showToast}
      />

      <StaffAbsenceRecoveryModal
        isOpen={Boolean(absenceTarget)}
        onClose={() => setAbsenceTarget(null)}
        user={absenceTarget?.user || null}
        stylist={absenceTarget?.stylist || null}
        salonId={salon?.id}
        allStylists={stylists}
        onSuccess={(msg) => {
          showToast(msg, "success");
          fetchStaffData();
        }}
        showToast={showToast}
      />

      <UpgradePlanPromptModal
        isOpen={isUpgradePromptOpen}
        onClose={() => setIsUpgradePromptOpen(false)}
        currentTier={quota?.tier || "FREE"}
        maxStylists={quota?.max || 1}
        currentCount={stylists.length}
        salonSlug={currentSlug}
        hasPartnerDiscount={hasPartnerDiscount}
      />
    </div>
  );
}

export default function OwnerStaffPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Staff Roster...</div>}>
      <OwnerStaffContent />
    </Suspense>
  );
}
