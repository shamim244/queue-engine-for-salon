"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Stylist, AuthUser } from "@/lib/api";
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
  InitialStaffData,
} from "@/components/owner/staff";

function OwnerStaffContent() {
  const searchParams = useSearchParams();
  const { salon, setSelectedSalon } = useAuth();

  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [staffUsers, setStaffUsers] = useState<AuthUser[]>([]);
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
  const [initialCreateData, setInitialCreateData] = useState<InitialStaffData | undefined>(undefined);

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
      }
    } catch (err: any) {
      showToast("Failed to load staff roster: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [currentSlug]);

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
    setInitialCreateData(data);
    setIsCreateOpen(true);
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
              />
            );
          })}
        </div>
      )}

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
