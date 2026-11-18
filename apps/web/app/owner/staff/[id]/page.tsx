"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, type Salon, type AuthUser, type Stylist, type Ticket } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhoneInput, DEFAULT_COUNTRIES } from "@/components/ui/phone-input";
import {
  ArrowLeft,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  User,
  KeyRound,
  Clock,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Calendar,
  SlidersHorizontal,
  Save,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

function EditStaffContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { salon: authSalon } = useAuth();

  const userId = params?.id as string;
  const currentSlug = searchParams.get("salon") || authSalon?.slug || "ramesh-barber";

  // Data loading states
  const [loading, setLoading] = useState(true);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [user, setUser] = useState<(AuthUser & { hasPin?: boolean }) | null>(null);
  const [matchedStylist, setMatchedStylist] = useState<Stylist | null>(null);
  const [allStylists, setAllStylists] = useState<Stylist[]>([]);

  // Profile Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [pace, setPace] = useState(25);
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");

  // Credentials Fields
  const [pin, setPin] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Leave & Absence Fields
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveReason, setLeaveReason] = useState("");
  const [absenceAction, setAbsenceAction] = useState<"UNIVERSAL_FAST_LINE" | "REASSIGN_STYLIST">("UNIVERSAL_FAST_LINE");
  const [targetStylistId, setTargetStylistId] = useState("");
  const [strandedTickets, setStrandedTickets] = useState<Ticket[]>([]);
  const [checkingStranded, setCheckingStranded] = useState(false);
  const [isCurrentlyOnLeave, setIsCurrentlyOnLeave] = useState(false);

  // Status & Notifications
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Action progress states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [processingLeave, setProcessingLeave] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  const parsePhoneInput = (raw: string) => {
    if (!raw) return { code: "+91", national: "" };
    let code = "+91";
    let digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+")) {
      for (const c of DEFAULT_COUNTRIES) {
        if (raw.startsWith(c.code)) {
          code = c.code;
          digits = raw.slice(c.code.length).replace(/\D/g, "");
          break;
        }
      }
    } else if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    }
    return { code, national: digits.slice(0, 10) };
  };

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    setServerError(null);

    try {
      // 1. Fetch salon details
      const salonRes = await api.salons.get(currentSlug);
      const loadedSalon = salonRes.salon;
      setSalon(loadedSalon);

      // 2. Fetch staff member
      const memberRes = await api.auth.getStaffMember(userId);
      if (memberRes && memberRes.user) {
        const u = memberRes.user;
        setUser(u);
        setFullName(u.fullName || "");
        setEmail(u.email || "");
        setStatus(u.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE");

        const parsed = parsePhoneInput(u.phone || "");
        setPhone(parsed.national);
        setCountryCode(parsed.code);

        // 3. Match Stylist chair & speed
        if (loadedSalon?.stylists) {
          setAllStylists(loadedSalon.stylists);
          const matched = loadedSalon.stylists.find((s) => s.id === u.staffId);
          if (matched) {
            setMatchedStylist(matched);
            setPace(matched.avgDurationMinutes || 25);
          }
        }

        // 4. Check active leaves
        if (loadedSalon?.id) {
          try {
            const leavesRes = await api.salons.getStaffLeaves(loadedSalon.id);
            const todayStr = new Date().toISOString().slice(0, 10);
            const onLeave = (leavesRes.leaves || []).some(
              (l: any) =>
                (l.stylistId === u.staffId || l.stylist_id === u.staffId) &&
                l.leaveDate?.slice(0, 10) === todayStr &&
                l.status === "APPROVED"
            );
            setIsCurrentlyOnLeave(onLeave);
          } catch {
            // non-fatal
          }
        }

        // 5. Check stranded tickets if stylistId present
        if (loadedSalon?.id && u.staffId) {
          setCheckingStranded(true);
          try {
            const ticketRes = await api.salons.getStylistStrandedTickets(loadedSalon.id, u.staffId);
            setStrandedTickets(ticketRes.tickets || []);
          } catch {
            setStrandedTickets([]);
          } finally {
            setCheckingStranded(false);
          }
        }
      } else {
        setServerError("Staff member not found or access denied.");
      }
    } catch (err: any) {
      setServerError(err.message || "Failed to load staff member details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId, currentSlug]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }

    if (phone && phone.trim()) {
      const cleanDigits = phone.trim().replace(/\D/g, "");
      if (cleanDigits.length !== 10) {
        errors.phone = "Mobile number must be exactly 10 digits";
      } else if (countryCode === "+91" && !["6", "7", "8", "9"].includes(cleanDigits[0])) {
        errors.phone = "Indian mobile numbers must begin with 6, 7, 8, or 9";
      }
    }

    if (email && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errors.email = "Please enter a valid email address";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSavingProfile(true);
    try {
      const cleanDigits = phone.trim().replace(/\D/g, "");
      const formattedPhone = cleanDigits.length === 10 ? `${countryCode}${cleanDigits}` : null;

      const res = await api.auth.updateStaff(userId, {
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phone: formattedPhone || undefined,
        status,
        avgDurationMinutes: Number(pace) || 25,
      });

      if (res && res.success) {
        setSuccessMessage("Staff profile and service pace updated successfully!");
        if (res.user) setUser(res.user);
      } else {
        setServerError((res as any)?.message || "Failed to update profile.");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to update staff profile.";
      setServerError(msg);
      if (msg.toLowerCase().includes("phone")) {
        setFieldErrors((prev) => ({ ...prev, phone: msg }));
      } else if (msg.toLowerCase().includes("email")) {
        setFieldErrors((prev) => ({ ...prev, email: msg }));
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Set/Update Mirror PIN
  const handleSavePin = async () => {
    if (!pin.trim()) {
      setFieldErrors((prev) => ({ ...prev, pin: "Please enter a 4-digit PIN" }));
      return;
    }
    if (!/^\d{4}$/.test(pin.trim())) {
      setFieldErrors((prev) => ({ ...prev, pin: "Mirror PIN must be exactly 4 digits" }));
      return;
    }

    setSavingPin(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      await api.auth.updateStaff(userId, {
        pin: pin.trim(),
      });
      setSuccessMessage("Mirror PIN updated successfully! The staff member can now use it at the mirror station.");
      setPin("");
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.pin;
        return next;
      });
      setUser((prev) => (prev ? { ...prev, hasPin: true } : prev));
    } catch (err: any) {
      setServerError(err.message || "Failed to update Mirror PIN");
    } finally {
      setSavingPin(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setFieldErrors((prev) => ({ ...prev, password: "Password must be at least 6 characters long" }));
      return;
    }

    setSavingPassword(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      await api.auth.resetStaffPassword(userId, newPassword);
      setSuccessMessage("Password reset successfully! All active sessions have been invalidated for security.");
      setNewPassword("");
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.password;
        return next;
      });
    } catch (err: any) {
      setServerError(err.message || "Failed to reset password");
    } finally {
      setSavingPassword(false);
    }
  };

  // Handle Mark Leave & Absence Recovery
  const handleMarkLeave = async () => {
    if (!salon?.id || !user?.staffId) {
      setServerError("Salon or staff member station context is missing.");
      return;
    }

    setProcessingLeave(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      if (strandedTickets.length > 0) {
        const res = await api.salons.handleStaffAbsence(salon.id, {
          stylistId: user.staffId,
          action: absenceAction,
          targetStylistId: absenceAction === "REASSIGN_STYLIST" ? targetStylistId : undefined,
          reason: leaveReason.trim() || "Staff absence managed via dedicated profile",
        });
        setSuccessMessage(res.message || "Stranded customer queue handled and leave logged!");
        setStrandedTickets([]);
      } else {
        await api.salons.createStaffLeave(salon.id, {
          stylistId: user.staffId,
          leaveDate,
          reason: leaveReason.trim() || "Planned leave marked by owner",
          status: "APPROVED",
          appliedBy: "OWNER",
        });
        setSuccessMessage(`Marked ${user.fullName || user.username} on leave for ${leaveDate}!`);
      }
      setIsCurrentlyOnLeave(true);
    } catch (err: any) {
      setServerError(err.message || "Failed to process absence recovery.");
    } finally {
      setProcessingLeave(false);
    }
  };

  // Handle Session Kill-Switch
  const handleKillSwitch = async () => {
    const confirmRevoke = window.confirm(
      `Revoke all active mirror and mobile sessions for ${user?.fullName || user?.username}? The staff member will be logged out instantly.`
    );
    if (!confirmRevoke) return;

    setRevokingSessions(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      await api.auth.revokeAll(userId);
      setSuccessMessage("Emergency Kill-Switch triggered: All active sessions, tokens, and mirror devices invalidated!");
    } catch (err: any) {
      setServerError(err.message || "Failed to trigger emergency kill-switch");
    } finally {
      setRevokingSessions(false);
    }
  };

  // Handle Delete / Remove Staff
  const handleDeleteStaff = async () => {
    const confirmDelete = window.confirm(
      `Permanently remove ${user?.fullName || user?.username}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    setDeletingUser(true);
    setServerError(null);
    try {
      await api.auth.deleteStaff(userId);
      router.push(`/owner/staff?salon=${currentSlug}&deleted=${encodeURIComponent(user?.fullName || user?.username || "Staff")}`);
    } catch (err: any) {
      setServerError(err.message || "Failed to remove staff member");
      setDeletingUser(false);
    }
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setShowPassword(true);
  };

  const availableReassignStylists = useMemo(
    () => allStylists.filter((s) => s.id !== user?.staffId && s.isActive !== false),
    [allStylists, user?.staffId]
  );

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-amber-500" />
        <p className="text-sm text-slate-400">Loading staff member profile & station controls...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      {/* Top Breadcrumbs & Back CTA */}
      <div className="flex items-center justify-between">
        <Link
          href={`/owner/staff?salon=${currentSlug}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Staff Roster</span>
        </Link>
        <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-900/60 font-mono text-[11px]">
          ID: {userId}
        </Badge>
      </div>

      {/* Header Profile Identity Card */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xl shadow-inner shrink-0">
            {(user?.fullName || user?.username || "ST").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{user?.fullName || user?.username}</h2>
              {matchedStylist?.isOwner && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30">
                  Lead / Owner
                </Badge>
              )}
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5">@{user?.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCurrentlyOnLeave ? (
            <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/40 text-xs px-2.5 py-1 font-semibold">
              🏖️ On Leave Today
            </Badge>
          ) : (
            <Badge variant={status === "SUSPENDED" ? "destructive" : "success"} className="text-xs px-2.5 py-1">
              {status === "SUSPENDED" ? "🔴 Suspended" : "🟢 Active Member"}
            </Badge>
          )}
        </div>
      </div>

      {/* Persistent Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 flex items-start gap-3 shadow-xl animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-emerald-200">Changes Saved</h4>
            <p className="text-xs text-emerald-300 leading-relaxed">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Persistent Error Banner */}
      {serverError && (
        <div className="p-4 rounded-2xl border border-rose-500/50 bg-rose-950/60 text-rose-200 flex items-start gap-3 shadow-xl animate-in slide-in-from-top-2">
          <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-rose-200">Action Required</h4>
            <p className="text-xs text-rose-300 leading-relaxed">{serverError}</p>
          </div>
        </div>
      )}

      {/* SECTION 1: Personal Profile & Salon Chair Settings */}
      <form onSubmit={handleSaveProfile}>
        <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <User className="h-4 w-4 text-amber-400" />
              1. Personal Profile & Station Calibration
            </CardTitle>
            <CardDescription>
              Basic identity used on customer receipts, station displays, and live queue mirrors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.fullName;
                        return next;
                      });
                    }
                  }}
                  className={`bg-slate-950 border-slate-800 text-sm min-h-[44px] ${
                    fieldErrors.fullName ? "border-rose-500 ring-1 ring-rose-500" : ""
                  }`}
                  disabled={savingProfile}
                />
                {fieldErrors.fullName && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Mobile Phone Number
                </label>
                <PhoneInput
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.phone;
                        return next;
                      });
                    }
                  }}
                  countryCode={countryCode}
                  onCountryCodeChange={setCountryCode}
                  placeholder="9876543210"
                  showDigitCounter={true}
                  error={fieldErrors.phone}
                  disabled={savingProfile}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="staff@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.email;
                          return next;
                        });
                      }
                    }}
                    className={`pl-9 bg-slate-950 border-slate-800 text-sm min-h-[44px] ${
                      fieldErrors.email ? "border-rose-500 ring-1 ring-rose-500" : ""
                    }`}
                    disabled={savingProfile}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Account Status
                </label>
                <div className="flex items-center gap-3 min-h-[44px] p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === "ACTIVE"}
                      onChange={() => setStatus("ACTIVE")}
                      className="accent-amber-500 h-4 w-4"
                    />
                    <span>Active (Accepts clients)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === "SUSPENDED"}
                      onChange={() => setStatus("SUSPENDED")}
                      className="accent-rose-500 h-4 w-4"
                    />
                    <span className="text-rose-400">Suspended</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Service Speed Pace Slider */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-400" />
                  Default Service Speed / Pace:
                  <span className="text-amber-400 font-mono font-bold text-sm ml-1">{pace} mins</span>
                </label>
                <span className="text-[11px] text-slate-400">Controls queue wait time calculations</span>
              </div>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={pace}
                onChange={(e) => setPace(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer bg-slate-800 rounded-lg h-2"
                disabled={savingProfile}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>⚡ 10 mins (Ultra-Fast)</span>
                <span>⭐ 25 mins (Standard)</span>
                <span>✂️ 60 mins (Intricate)</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-800/80 pt-4 flex justify-end">
            <Button
              type="submit"
              disabled={savingProfile}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2 min-h-[44px] px-6 shadow-md"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Profile & Speed</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* SECTION 2: Security & Authentication (Mirror PIN & Password) */}
      <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-purple-400" />
            2. Station Credentials & Authentication
          </CardTitle>
          <CardDescription>
            Configure the 4-digit mirror station PIN and reset login passwords.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subsection A: 4-Digit Mirror PIN */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-purple-400" />
                4-Digit Mirror Quick-PIN
              </label>
              {user?.hasPin ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                  PIN Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-400 border-slate-700">
                  Not Configured
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Barbers can enter this 4-digit PIN on the shared salon tablet to unlock their personal chair mirror.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="e.g. 1234"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  if (fieldErrors.pin) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.pin;
                      return next;
                    });
                  }
                }}
                className={`bg-slate-900 border-slate-700 font-mono tracking-widest text-center text-base min-h-[44px] ${
                  fieldErrors.pin ? "border-rose-500 ring-1 ring-rose-500" : ""
                }`}
                disabled={savingPin}
              />
              <Button
                type="button"
                onClick={handleSavePin}
                disabled={savingPin || !pin.trim()}
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold min-h-[44px] shrink-0"
              >
                {savingPin ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Update PIN
              </Button>
            </div>
            {fieldErrors.pin && (
              <p className="text-xs text-rose-400 font-medium">{fieldErrors.pin}</p>
            )}
          </div>

          {/* Subsection B: Reset Password */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-400" />
                Reset Account Password
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 p-1"
              >
                <Sparkles className="h-3 w-3" /> Auto-Suggest Secure
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Enter a new login password. All existing sessions and mobile tokens will be revoked immediately for security.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-md">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.password;
                        return next;
                      });
                    }
                  }}
                  className={`bg-slate-900 border-slate-700 pr-10 font-mono text-sm min-h-[44px] ${
                    fieldErrors.password ? "border-rose-500 ring-1 ring-rose-500" : ""
                  }`}
                  disabled={savingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                onClick={handleResetPassword}
                disabled={savingPassword || !newPassword}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold min-h-[44px] shrink-0"
              >
                {savingPassword ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save Password
              </Button>
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-rose-400 font-medium">{fieldErrors.password}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: Leave & Absence Recovery */}
      <Card className="bg-slate-900/60 border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            3. Leave & Absence Management
          </CardTitle>
          <CardDescription>
            Mark planned staff leaves or perform late-absence recovery for stranded customer queues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {strandedTickets.length > 0 && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/40 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200">
                  {strandedTickets.length} Stranded Queue Ticket{strandedTickets.length > 1 ? "s" : ""} Detected!
                </p>
                <p className="text-amber-300/90 mt-0.5">
                  Customers are waiting specifically for this staff member. Choose a recovery action below to prevent walkouts.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Leave Date
              </label>
              <Input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="bg-slate-950 border-slate-800 text-sm min-h-[44px]"
                disabled={processingLeave}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Absence Reason (Optional)
              </label>
              <Input
                placeholder="e.g. Family emergency, medical leave"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="bg-slate-950 border-slate-800 text-sm min-h-[44px]"
                disabled={processingLeave}
              />
            </div>
          </div>

          {strandedTickets.length > 0 && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Queue Recovery Action for Stranded Clients
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 cursor-pointer flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="absence-action"
                    checked={absenceAction === "UNIVERSAL_FAST_LINE"}
                    onChange={() => setAbsenceAction("UNIVERSAL_FAST_LINE")}
                    className="accent-amber-500 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">Universal Fast Line</span>
                    <span className="text-[11px] text-slate-400">Next available stylist will serve them immediately</span>
                  </div>
                </label>

                <label className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 cursor-pointer flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="absence-action"
                    checked={absenceAction === "REASSIGN_STYLIST"}
                    onChange={() => setAbsenceAction("REASSIGN_STYLIST")}
                    className="accent-amber-500 mt-0.5"
                  />
                  <div className="w-full">
                    <span className="text-xs font-bold text-white block">Reassign to Specific Chair</span>
                    <select
                      value={targetStylistId}
                      onChange={(e) => setTargetStylistId(e.target.value)}
                      disabled={absenceAction !== "REASSIGN_STYLIST"}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 text-xs text-white rounded p-1.5"
                    >
                      <option value="">Select Alternative Stylist...</option>
                      {availableReassignStylists.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t border-slate-800/80 pt-4 flex justify-end">
          <Button
            type="button"
            onClick={handleMarkLeave}
            disabled={processingLeave}
            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-2 min-h-[44px]"
          >
            {processingLeave ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            <span>Log Absence & Protect Queue</span>
          </Button>
        </CardFooter>
      </Card>

      {/* SECTION 4: Danger Zone & Session Kill-Switch */}
      <Card className="bg-rose-950/20 border-rose-900/40 shadow-xl">
        <CardHeader>
          <CardTitle className="text-base font-bold text-rose-300 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            4. Emergency Controls & Danger Zone
          </CardTitle>
          <CardDescription className="text-rose-300/70">
            Emergency kill-switch to immediately disconnect mirror stations or permanently delete the staff member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Emergency Session Revoke (Kill-Switch)
              </h5>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Instantly revokes all active session tokens and tablet mirror connections. Use if a phone or tablet is compromised.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleKillSwitch}
              disabled={revokingSessions}
              className="min-h-[44px] shrink-0 bg-rose-700 hover:bg-rose-600 text-white font-bold"
            >
              {revokingSessions ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1.5" />}
              Revoke All Sessions
            </Button>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-900/60 bg-rose-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h5 className="text-xs font-bold text-rose-200">Permanently Remove Staff Member</h5>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Deletes login credentials, removes stylist assignment, and invalidates all mirror access.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteStaff}
              disabled={deletingUser}
              className="min-h-[44px] shrink-0 bg-rose-600 hover:bg-rose-500 font-bold"
            >
              {deletingUser ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
              Remove Team Member
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditStaffPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-16 px-4 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-amber-500" />
          <p className="text-sm text-slate-400 mt-2">Loading staff management view...</p>
        </div>
      }
    >
      <EditStaffContent />
    </Suspense>
  );
}
