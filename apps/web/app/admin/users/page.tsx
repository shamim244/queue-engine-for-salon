"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { api, AuthUser, Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  ShieldCheck,
  Building2,
  Scissors,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Lock,
  Phone,
  Mail,
  SlidersHorizontal,
  Clock,
  Sparkles,
} from "lucide-react";
import { maskPhone } from "@/lib/utils";

function AdminUsersContent() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [salonFilter, setSalonFilter] = useState<string>("ALL");

  // In-app Toast Banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AuthUser | null>(null);
  const [selectedUser, setSelectedUser] = useState<AuthUser | null>(null);

  // Create Form State
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"SUPER_ADMIN" | "SALON_OWNER" | "STAFF">("STAFF");
  const [newSalonId, setNewSalonId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit Form State
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<"SUPER_ADMIN" | "SALON_OWNER" | "STAFF">("STAFF");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "SUSPENDED" | "TERMINATED" | "INACTIVE">("ACTIVE");
  const [editSalonId, setEditSalonId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset Password State
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, salonsRes] = await Promise.all([
        api.admin.users.list({
          role: roleFilter !== "ALL" ? roleFilter : undefined,
          salonId: salonFilter !== "ALL" ? salonFilter : undefined,
          search: searchQuery.trim() || undefined,
        }),
        api.salons.getAll(),
      ]);
      setUsers(usersRes.users || []);
      setSalons(salonsRes || []);
    } catch (err: any) {
      showToast("Failed to load users: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter, salonFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword || newPassword.length < 6) {
      showToast("Username and a password of at least 6 characters are required", "error");
      return;
    }
    setCreating(true);
    try {
      await api.admin.users.create({
        fullName: newFullName.trim() || undefined,
        email: newEmail.trim() || undefined,
        username: newUsername.trim().toLowerCase(),
        password: newPassword,
        role: newRole,
        phone: newPhone.trim() || undefined,
        salonId: newRole !== "SUPER_ADMIN" ? newSalonId || undefined : undefined,
      });

      showToast(`User account for "${newUsername.trim()}" created successfully!`, "success");
      setIsCreateOpen(false);
      setNewFullName("");
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");
      setNewPhone("");
      setNewSalonId("");
      fetchData();
    } catch (err: any) {
      showToast("Failed to create user: " + (err.message || "Unknown error"), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (user: AuthUser) => {
    setSelectedUser(user);
    setEditFullName(user.fullName || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditRole((user.role as any) || "STAFF");
    setEditStatus(user.status || "ACTIVE");
    setEditSalonId(user.salonId || "");
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingEdit(true);
    try {
      await api.admin.users.update(selectedUser.id, {
        fullName: editFullName.trim() || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        role: editRole,
        status: editStatus,
        salonId: editRole !== "SUPER_ADMIN" ? editSalonId || undefined : undefined,
      });

      showToast(`User "${selectedUser.username}" profile updated!`, "success");
      setIsEditOpen(false);
      fetchData();
    } catch (err: any) {
      showToast("Failed to update user: " + (err.message || "Unknown error"), "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenResetPassword = (user: AuthUser) => {
    setSelectedUser(user);
    setResetPasswordValue("");
    setIsResetPasswordOpen(true);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !resetPasswordValue || resetPasswordValue.length < 6) {
      showToast("New password must be at least 6 characters long", "error");
      return;
    }
    setSavingPassword(true);
    try {
      await api.admin.users.resetPassword(selectedUser.id, resetPasswordValue);
      showToast(`Password reset successfully for "${selectedUser.username}". Old sessions revoked.`, "success");
      setIsResetPasswordOpen(false);
    } catch (err: any) {
      showToast("Failed to reset password: " + (err.message || "Unknown error"), "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.admin.users.delete(userToDelete.id);
      showToast(`User "${userToDelete.username}" deleted from platform.`, "info");
      setUserToDelete(null);
      fetchData();
    } catch (err: any) {
      showToast("Failed to delete user: " + (err.message || "Unknown error"), "error");
    }
  };

  // KPI Calculations
  const superAdminCount = users.filter((u) => u.role === "SUPER_ADMIN").length;
  const ownerCount = users.filter((u) => u.role === "SALON_OWNER").length;
  const staffCount = users.filter((u) => u.role === "STAFF").length;
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* In-app Toast Banner */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between shadow-lg transition-all animate-in slide-in-from-top-2 ${
            toast.type === "success"
              ? "bg-emerald-950/80 border-emerald-600/50 text-emerald-200"
              : toast.type === "error"
              ? "bg-rose-950/80 border-rose-600/50 text-rose-200"
              : "bg-blue-950/80 border-blue-600/50 text-blue-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Users className="h-5 w-5 text-blue-400 shrink-0" />}
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 p-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Platform User Directory & Authentication
            </h1>
            <Badge variant="purple" className="text-xs">
              Additive RBAC
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Centralized credentials management, role permissions, password resets, and branch assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="gap-2 border-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold gap-2 shadow-lg shadow-blue-600/25"
          >
            <UserPlus className="h-4 w-4" />
            + New User Account
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-slate-400 uppercase font-semibold">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{users.length}</div>
            <p className="text-xs text-emerald-400 mt-1 font-medium">{activeCount} Active Accounts</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-slate-400 uppercase font-semibold">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-300">{superAdminCount}</div>
            <p className="text-xs text-slate-400 mt-1">Full platform authority</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-slate-400 uppercase font-semibold">Salon Owners</CardTitle>
            <Building2 className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-300">{ownerCount}</div>
            <p className="text-xs text-slate-400 mt-1">Tenant branch operators</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs text-slate-400 uppercase font-semibold">Stylists & Staff</CardTitle>
            <Scissors className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-300">{staffCount}</div>
            <p className="text-xs text-slate-400 mt-1">Mirror tablet & chair operators</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-slate-900/40 border-slate-800">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, username, email, or phone..."
              className="pl-10 bg-slate-950 border-slate-800 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admins</option>
              <option value="SALON_OWNER">Salon Owners</option>
              <option value="STAFF">Stylists / Staff</option>
            </select>

            <select
              value={salonFilter}
              onChange={(e) => setSalonFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Salons</option>
              {salons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <Button type="submit" size="sm" variant="secondary" className="text-xs h-9">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Users Data Grid */}
      <Card className="border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User Identity</th>
                <th className="py-3 px-4">Role & Access</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading platform users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const roleVariant =
                    u.role === "SUPER_ADMIN"
                      ? "purple"
                      : u.role === "SALON_OWNER"
                      ? "default"
                      : "success";

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {(u.fullName || u.username).substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">
                              {u.fullName || u.username}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge variant={roleVariant as any} className="text-[11px] font-semibold gap-1">
                          {u.role === "SUPER_ADMIN" && <Shield className="h-3 w-3" />}
                          {u.role === "SALON_OWNER" && <Building2 className="h-3 w-3" />}
                          {u.role === "STAFF" && <Scissors className="h-3 w-3" />}
                          {u.role}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.salonName ? (
                          <span className="text-xs font-semibold text-slate-200">
                            {u.salonName}
                          </span>
                        ) : u.role === "SUPER_ADMIN" ? (
                          <span className="text-xs text-purple-400 font-mono">Global Platform</span>
                        ) : (
                          <span className="text-xs text-slate-500 font-italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs space-y-0.5">
                        {u.email && (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[160px]">{u.email}</span>
                          </div>
                        )}
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                        {!u.email && !u.phone && (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={u.status === "ACTIVE" ? "success" : "destructive"}
                          className="text-[10px]"
                        >
                          {u.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenResetPassword(u)}
                            className="h-8 text-xs px-2 gap-1 border-slate-700 hover:border-slate-500"
                            title="Reset User Password"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                            Reset
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(u)}
                            className="h-8 text-xs px-2 gap-1 border-slate-700 hover:border-slate-500"
                            title="Edit Profile & Permissions"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-blue-400" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setUserToDelete(u)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create User Account */}
      {isCreateOpen && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogClose onClose={() => setIsCreateOpen(false)} />
          <form onSubmit={handleCreateUser}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-400" />
                Create Platform User Account
              </DialogTitle>
              <DialogDescription>
                Provision a new administrator, salon owner, or stylist login with full credentials.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Full Name
                  </label>
                  <Input
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. ramesh@salon.com"
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Username <span className="text-rose-400">*</span>
                  </label>
                  <Input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="e.g. ramesh_barber"
                    className="bg-slate-950 border-slate-800 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Password <span className="text-rose-400">*</span> (min 6 chars)
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-slate-950 border-slate-800 pr-10 font-mono"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Role & Permissions <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-white focus:outline-none"
                  >
                    <option value="STAFF">Stylist / Staff (Seat & Queue Operations)</option>
                    <option value="SALON_OWNER">Salon Owner (Branch Manager & Front Desk)</option>
                    <option value="SUPER_ADMIN">Super Admin (Full HQ Access)</option>
                  </select>
                </div>
              </div>

              {newRole !== "SUPER_ADMIN" && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Assign to Salon Branch <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newSalonId}
                    onChange={(e) => setNewSalonId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-white focus:outline-none"
                    required
                  >
                    <option value="">Select Salon Branch...</option>
                    {salons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.operatingMode === "RURAL_SOLO" ? "Rural Solo" : "Multi-Station"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2"
              >
                {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Modal: Edit User */}
      {isEditOpen && selectedUser && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogClose onClose={() => setIsEditOpen(false)} />
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-400" />
                Edit Profile: {selectedUser.username}
              </DialogTitle>
              <DialogDescription>
                Update user personal details, assigned branch, role, or account lock status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Full Name
                  </label>
                  <Input
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="bg-slate-950 border-slate-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-white focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE (Normal Access)</option>
                    <option value="SUSPENDED">SUSPENDED (Locked Out)</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-white focus:outline-none"
                  >
                    <option value="STAFF">Stylist / Staff</option>
                    <option value="SALON_OWNER">Salon Owner</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>

                {editRole !== "SUPER_ADMIN" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Salon Branch
                    </label>
                    <select
                      value={editSalonId}
                      onChange={(e) => setEditSalonId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm font-semibold text-white focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {salons.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingEdit}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2"
              >
                {savingEdit ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Modal: Reset Password */}
      {isResetPasswordOpen && selectedUser && (
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogClose onClose={() => setIsResetPasswordOpen(false)} />
          <form onSubmit={handleConfirmResetPassword}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-400">
                <KeyRound className="h-5 w-5" />
                Reset Password: @{selectedUser.username}
              </DialogTitle>
              <DialogDescription>
                Set a new password for <strong className="text-white">{selectedUser.fullName || selectedUser.username}</strong>. All existing active device sessions will be revoked immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    value={resetPasswordValue}
                    onChange={(e) => setResetPasswordValue(e.target.value)}
                    placeholder="Enter new strong password..."
                    className="bg-slate-950 border-slate-800 pr-10 font-mono"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingPassword}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
              >
                {savingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Modal: Delete User Confirmation */}
      {userToDelete && (
        <Dialog open={Boolean(userToDelete)} onOpenChange={() => setUserToDelete(null)}>
          <DialogClose onClose={() => setUserToDelete(null)} />
          <div>
            <DialogHeader>
              <DialogTitle className="text-rose-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-rose-500" />
                Delete User Account: @{userToDelete.username}?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete <strong className="text-white">{userToDelete.fullName || userToDelete.username}</strong> ({userToDelete.role})? This user will be immediately logged out and barred from logging in.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setUserToDelete(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Confirm Deletion
              </Button>
            </DialogFooter>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Users...</div>}>
      <AdminUsersContent />
    </Suspense>
  );
}
