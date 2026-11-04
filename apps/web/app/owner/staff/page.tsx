"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Stylist, Salon, AuthUser } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  Users,
  KeyRound,
  ShieldAlert,
  UserPlus,
  RefreshCw,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Armchair,
  Search,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import { maskPhone } from "@/lib/utils";

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

  // Form State: Create Staff Member
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createPin, setCreatePin] = useState("");
  const [createPace, setCreatePace] = useState(25);
  const [createStaffId, setCreateStaffId] = useState<string | undefined>(undefined);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State: Edit Staff Member
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editPace, setEditPace] = useState(25);
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [savingEdit, setSavingEdit] = useState(false);

  // Form State: Reset Password
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Form State: Quick Mirror PIN
  const [quickPinValue, setQuickPinValue] = useState("");
  const [savingQuickPin, setSavingQuickPin] = useState(false);

  // Kill Switch & Delete execution states
  const [revoking, setRevoking] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Auto-generate username helper
  const handleAutoGenerateUsername = () => {
    if (!createFullName.trim()) return;
    const clean = createFullName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 15);
    const branchPrefix = salon?.slug ? salon.slug.split("-")[1] || "st" : "st";
    setCreateUsername(`${clean}_${branchPrefix}`);
  };

  // Generate random secure password helper
  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreatePassword(pwd);
    setShowCreatePassword(true);
  };

  const handleGenerateResetPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordValue(pwd);
    setShowResetPassword(true);
  };

  // Submit: Create Staff Member (Unified: User + Station + Credentials)
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salon?.id) {
      showToast("Salon branch context is missing", "error");
      return;
    }
    if (!createFullName.trim()) {
      showToast("Full name is required", "error");
      return;
    }
    if (!createUsername.trim()) {
      showToast("Username is required", "error");
      return;
    }
    if (!createPassword || createPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }
    if (createPin && !/^\d{4}$/.test(createPin)) {
      showToast("Mirror PIN must be exactly 4 digits (e.g. 1234)", "error");
      return;
    }

    setCreating(true);
    try {
      await api.auth.createStaff({
        salonId: salon.id,
        staffId: createStaffId,
        fullName: createFullName.trim(),
        username: createUsername.trim(),
        password: createPassword,
        email: createEmail.trim() || undefined,
        phone: createPhone.trim() || undefined,
        pin: createPin.trim() || undefined,
        avgDurationMinutes: Number(createPace) || 25,
      });

      setIsCreateOpen(false);
      setCreateFullName("");
      setCreateEmail("");
      setCreateUsername("");
      setCreatePassword("");
      setCreatePhone("");
      setCreatePin("");
      setCreatePace(25);
      setCreateStaffId(undefined);
      showToast(`Team member ${createFullName.trim()} registered with login credentials!`, "success");
      fetchStaffData();
    } catch (err: any) {
      showToast("Failed to create staff member: " + (err.message || "Unknown error"), "error");
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: AuthUser) => {
    setSelectedStaffUser(user);
    setEditFullName(user.fullName || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditPin(user.pin || "");
    setEditStatus(user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE");

    // Match stylist speed
    const matchedStylist = stylists.find((s) => s.id === user.staffId || s.userId === user.id);
    setEditPace(matchedStylist?.avgDurationMinutes || 25);
    setIsEditOpen(true);
  };

  // Submit: Edit Staff Member
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUser) return;
    if (editPin && !/^\d{4}$/.test(editPin)) {
      showToast("Mirror PIN must be exactly 4 digits", "error");
      return;
    }

    setSavingEdit(true);
    try {
      await api.auth.updateStaff(selectedStaffUser.id, {
        fullName: editFullName.trim() || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        pin: editPin.trim() || undefined,
        avgDurationMinutes: Number(editPace) || 25,
        status: editStatus,
      });

      setIsEditOpen(false);
      setSelectedStaffUser(null);
      showToast(`Staff profile for ${editFullName || selectedStaffUser.username} updated!`, "success");
      fetchStaffData();
    } catch (err: any) {
      showToast("Failed to update staff member: " + (err.message || "Unknown error"), "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (user: AuthUser) => {
    setSelectedStaffUser(user);
    setResetPasswordValue("");
    setShowResetPassword(false);
    setIsResetPasswordOpen(true);
  };

  // Submit: Reset Staff Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUser) return;
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await api.auth.resetStaffPassword(selectedStaffUser.id, resetPasswordValue);
      setIsResetPasswordOpen(false);
      setSelectedStaffUser(null);
      setResetPasswordValue("");
      showToast(`Password updated for @${selectedStaffUser.username}! Active sessions revoked.`, "success");
      fetchStaffData();
    } catch (err: any) {
      showToast("Failed to reset password: " + (err.message || "Unknown error"), "error");
    } finally {
      setSavingPassword(false);
    }
  };

  // Open Quick PIN Modal
  const openPinModal = (user: AuthUser) => {
    setSelectedStaffUser(user);
    setQuickPinValue(user.pin || "");
    setIsPinModalOpen(true);
  };

  // Submit: Set Quick Mirror PIN
  const handleSaveQuickPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffUser || !/^\d{4}$/.test(quickPinValue)) {
      showToast("Please enter a valid 4-digit numeric PIN", "error");
      return;
    }

    setSavingQuickPin(true);
    try {
      await api.auth.updateStaff(selectedStaffUser.id, {
        pin: quickPinValue,
      });
      setIsPinModalOpen(false);
      setSelectedStaffUser(null);
      setQuickPinValue("");
      showToast("4-Digit Mirror PIN saved successfully!", "success");
      fetchStaffData();
    } catch (err: any) {
      showToast("Failed to save PIN: " + (err.message || "Unknown error"), "error");
    } finally {
      setSavingQuickPin(false);
    }
  };

  // Submit: Emergency Kill Switch (Revoke all active sessions)
  const handleConfirmKillSwitch = async () => {
    if (!killSwitchTarget) return;
    setRevoking(true);
    try {
      await api.auth.revokeAll(killSwitchTarget.id);
      showToast(`All active sessions for @${killSwitchTarget.username} have been invalidated.`, "info");
      setKillSwitchTarget(null);
      fetchStaffData();
    } catch (err: any) {
      showToast("Kill-switch failed: " + (err.message || "Unknown error"), "error");
    } finally {
      setRevoking(false);
    }
  };

  // Submit: Remove Staff Account
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await api.auth.deleteStaff(userToDelete.id);
      showToast(`Staff member @${userToDelete.username} deleted from branch.`, "success");
      setUserToDelete(null);
      fetchStaffData();
    } catch (err: any) {
      showToast("Failed to delete staff member: " + (err.message || "Unknown error"), "error");
    } finally {
      setDeleting(false);
    }
  };

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
  const tierQuotaMax = 10;

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

      {/* Header & KPI Summary */}
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
            className="gap-2 border-slate-700 bg-slate-900/60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCreateStaffId(undefined);
              setCreateFullName("");
              setCreateUsername("");
              setCreatePassword("");
              setCreateEmail("");
              setCreatePhone("");
              setCreatePin("");
              setCreatePace(25);
              setIsCreateOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20"
          >
            <UserPlus className="h-4 w-4" />
            Add Team Member
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Staff Users</p>
              <p className="text-2xl font-bold text-white tracking-tight">{staffUsers.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Armchair className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Active Stations</p>
              <p className="text-2xl font-bold text-emerald-400 tracking-tight">
                {activeStaffCount} <span className="text-xs text-slate-400 font-normal">of {stylists.length} chairs</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Mirror Tablet PINs</p>
              <p className="text-2xl font-bold text-purple-300 tracking-tight">
                {configuredPinsCount} <span className="text-xs text-slate-400 font-normal">configured</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Branch Capacity</p>
              <p className="text-sm font-semibold text-white tracking-tight">
                {stylists.length} Active Stylists
              </p>
              <p className="text-[11px] text-slate-400">
                Stations: {stylists.length} Active Mirrors
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unlinked Legacy Stylists Alert Banner (if any legacy mock stylists exist) */}
      {unlinkedStylists.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-200">
                Legacy Stations Found ({unlinkedStylists.length})
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                The following stations do not yet have user credentials assigned:{" "}
                <span className="font-semibold text-white">
                  {unlinkedStylists.map((s) => s.name).join(", ")}
                </span>
                . Create credentials to enable mirror tablet unlock and login.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {unlinkedStylists.map((st) => (
              <Button
                key={st.id}
                size="sm"
                variant="outline"
                className="text-xs border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
                onClick={() => {
                  setCreateStaffId(st.id);
                  setCreateFullName(st.name);
                  setCreateUsername(st.name.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                  setCreatePassword("password123");
                  setCreatePhone(st.phone || "");
                  setCreatePace(st.avgDurationMinutes || 25);
                  setCreatePin(st.pin || "");
                  setIsCreateOpen(true);
                }}
              >
                + Create Login for {st.name.split(" ")[0]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name, username, phone, or PIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900/60 border-slate-800 text-sm"
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
                onClick={() => {
                  setCreateStaffId(undefined);
                  setCreateFullName("");
                  setCreateUsername("");
                  setCreatePassword("");
                  setIsCreateOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold mt-2"
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
            const pace = matchedStylist?.avgDurationMinutes || 25;
            const hasPin = Boolean(user.pin || matchedStylist?.pin);
            const isSuspended = user.status === "SUSPENDED";

            return (
              <Card
                key={user.id}
                className={`relative flex flex-col justify-between border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all ${
                  isSuspended ? "opacity-70 border-rose-900/30" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-base shadow-inner">
                        {(user.fullName || user.username).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base text-white flex items-center gap-2">
                          {user.fullName || user.username}
                          {matchedStylist?.isOwner && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                              Lead / Owner
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs font-mono text-slate-400">@{user.username}</p>
                      </div>
                    </div>
                    <Badge variant={isSuspended ? "destructive" : "success"}>
                      {isSuspended ? "Suspended" : "Active"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-xs text-slate-300">
                  {/* Contact & Station Specs */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    {user.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-blue-400" />
                          Email:
                        </span>
                        <span className="text-slate-200 truncate max-w-[170px]" title={user.email}>
                          {user.email}
                        </span>
                      </div>
                    )}

                    {user.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-emerald-400" />
                          Phone:
                        </span>
                        <span className="text-slate-200">{maskPhone(user.phone)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        Service Pace:
                      </span>
                      <strong className="text-white font-mono">{pace} mins</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-purple-400" />
                        Mirror PIN:
                      </span>
                      {hasPin ? (
                        <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-500/20">
                          Configured (••••)
                        </span>
                      ) : (
                        <span className="font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded text-[11px]">
                          Not Set
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-slate-800 hover:border-slate-700 hover:bg-slate-800 gap-1"
                      onClick={() => openEditModal(user)}
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                      Edit Details
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10 gap-1"
                      onClick={() => openPinModal(user)}
                    >
                      <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                      {hasPin ? "Update PIN" : "Set PIN"}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/10 gap-1"
                      onClick={() => openResetPasswordModal(user)}
                    >
                      <Lock className="h-3.5 w-3.5 text-blue-400" />
                      Reset Pwd
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300 gap-1"
                      onClick={() => setUserToDelete(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      Remove
                    </Button>
                  </div>
                </CardContent>

                {/* Emergency Session Revoke Kill-Switch */}
                <div className="p-4 pt-0">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full text-xs h-8 gap-1.5 bg-rose-950/40 text-rose-300 border border-rose-900/40 hover:bg-rose-600 hover:text-white transition-all"
                    onClick={() => setKillSwitchTarget(user)}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    🚨 Emergency Kill-Switch
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Add Team Member (Unified Account + Station) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogClose onClose={() => setIsCreateOpen(false)} />
        <form onSubmit={handleCreateStaff}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-amber-400" />
              {createStaffId ? "Provision Login for Station" : "Add Team Member & Station"}
            </DialogTitle>
            <DialogDescription>
              Creates an authentic staff account with password, phone, speed calibration, and an optional 4-digit mirror PIN.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Full Name *
                </label>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="ramesh@salon.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Username *
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateUsername}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> Auto-Suggest
                </button>
              </div>
              <Input
                placeholder="ramesh_barber"
                value={createUsername}
                onChange={(e) => setCreateUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Login Password *
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> Generate Secure
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showCreatePassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Phone Number
                </label>
                <Input
                  placeholder="+91 98765 00000"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  4-Digit Mirror PIN (Optional)
                </label>
                <Input
                  maxLength={4}
                  placeholder="e.g. 1234"
                  value={createPin}
                  onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Service Speed Pace (Minutes per haircut)
                </label>
                <span className="text-xs font-mono text-amber-400 font-bold">{createPace} mins</span>
              </div>
              <Input
                type="number"
                min={10}
                max={90}
                value={createPace}
                onChange={(e) => setCreatePace(Number(e.target.value))}
              />
              <div className="flex gap-2 mt-2">
                {[15, 20, 25, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setCreatePace(mins)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-all ${
                      createPace === mins
                        ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                        : "bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {creating ? "Registering..." : "Create Team Member"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: Edit Staff Member Profile */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogClose onClose={() => setIsEditOpen(false)} />
        <form onSubmit={handleUpdateStaff}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-amber-400" />
              Edit Profile: @{selectedStaffUser?.username}
            </DialogTitle>
            <DialogDescription>
              Update staff details, mirror tablet PIN, speed calibration, or active status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Full Name
              </label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@salon.com"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Phone Number
                </label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  4-Digit Mirror PIN
                </label>
                <Input
                  maxLength={4}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 5678"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Service Speed (Mins)
                </label>
                <Input
                  type="number"
                  min={10}
                  max={90}
                  value={editPace}
                  onChange={(e) => setEditPace(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Account Status
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={editStatus === "ACTIVE"}
                    onChange={() => setEditStatus("ACTIVE")}
                    className="accent-amber-500"
                  />
                  <span>Active (Can log in & accept clients)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={editStatus === "SUSPENDED"}
                    onChange={() => setEditStatus("SUSPENDED")}
                    className="accent-rose-500"
                  />
                  <span className="text-rose-400">Suspended</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={savingEdit}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: Reset Staff Password */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogClose onClose={() => setIsResetPasswordOpen(false)} />
        <form onSubmit={handleResetPassword}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-400">
              <Lock className="h-5 w-5" />
              Reset Password for @{selectedStaffUser?.username}
            </DialogTitle>
            <DialogDescription>
              Set a new login password. All existing mirror sessions and mobile tokens for this staff member will be invalidated immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  New Password *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateResetPassword}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" /> Generate Secure
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="pr-10"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsResetPasswordOpen(false)}
              disabled={savingPassword}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={savingPassword}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: Quick 4-Digit Mirror PIN */}
      <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
        <DialogClose onClose={() => setIsPinModalOpen(false)} />
        <form onSubmit={handleSaveQuickPin}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <KeyRound className="h-5 w-5" />
              Quick Mirror PIN: {selectedStaffUser?.fullName || selectedStaffUser?.username}
            </DialogTitle>
            <DialogDescription>
              Enables rapid 2-second touch-unlock and stylist chair swap on the shared mirror tablet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-6 text-center">
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              Enter 4-Digit Numeric PIN
            </label>
            <input
              type="password"
              maxLength={4}
              pattern="\d{4}"
              placeholder="••••"
              value={quickPinValue}
              onChange={(e) => setQuickPinValue(e.target.value.replace(/\D/g, ""))}
              className="w-48 h-16 text-center text-3xl font-mono tracking-widest rounded-2xl border-2 border-amber-500 bg-slate-950 text-white focus:outline-none shadow-lg shadow-amber-500/20 mx-auto block"
              autoFocus
              required
            />
            <span className="text-xs text-slate-400 mt-2 block">
              Numbers only. Example: <code className="text-amber-400">1234</code>
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPinModalOpen(false)}
              disabled={savingQuickPin}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={savingQuickPin}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {savingQuickPin ? "Saving..." : "Save 4-Digit PIN"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Modal: Emergency Kill-Switch Confirmation */}
      {killSwitchTarget && (
        <Dialog open={Boolean(killSwitchTarget)} onOpenChange={() => setKillSwitchTarget(null)}>
          <DialogClose onClose={() => setKillSwitchTarget(null)} />
          <div>
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                🚨 Revoke Sessions for @{killSwitchTarget.username}?
              </DialogTitle>
              <DialogDescription>
                This will immediately terminate all active login tokens and mirror tablet sessions for{" "}
                <strong className="text-white">
                  {killSwitchTarget.fullName || killSwitchTarget.username}
                </strong>{" "}
                across all devices. The staff member will be logged out on the next heartbeat.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setKillSwitchTarget(null)}
                disabled={revoking}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmKillSwitch}
                disabled={revoking}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2"
              >
                {revoking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                Revoke Sessions Immediately
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}

      {/* Modal: Delete Staff Member Confirmation */}
      {userToDelete && (
        <Dialog open={Boolean(userToDelete)} onOpenChange={() => setUserToDelete(null)}>
          <DialogClose onClose={() => setUserToDelete(null)} />
          <div>
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-500" />
                Remove @{userToDelete.username} from Salon?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove{" "}
                <strong className="text-white">
                  {userToDelete.fullName || userToDelete.username}
                </strong>{" "}
                from this salon branch? Their user credentials and associated station assignments will be deactivated.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2"
              >
                {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Confirm Deletion
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
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
