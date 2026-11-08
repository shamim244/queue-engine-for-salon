"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { triggerHaptic, isHapticEnabled, setHapticEnabled } from "@/lib/haptics";
import {
  Settings,
  Sliders,
  Clock,
  KeyRound,
  Lock,
  Armchair,
  CheckCircle2,
  Coffee,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  LogOut,
  AlertCircle,
  User,
  Shield,
  Smartphone,
  Moon,
  Volume2,
  Maximize2,
  Check,
  Scissors,
  RotateCcw,
  Minus,
  Plus,
  IndianRupee,
  Zap,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";

export default function StaffPreferencesPage() {
  return (
    <AuthGuard requiredRole={["STAFF", "SALON_OWNER", "SUPER_ADMIN"]}>
      <StaffSettingsContent />
    </AuthGuard>
  );
}

type SettingsTab = "general" | "security" | "device";

function StaffSettingsContent() {
  const { user, staff, salon, logout, demoLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Speed Calibration State (15m to 60m)
  const [paceMinutes, setPaceMinutes] = useState<number>(staff?.avgDurationMinutes || 25);
  const [savingPace, setSavingPace] = useState(false);
  const [paceSuccessMsg, setPaceSuccessMsg] = useState(false);

  // Shift Status
  const [shiftStatus, setShiftStatus] = useState<"ACTIVE" | "BREAK" | "OFF">("ACTIVE");

  // PIN Update
  const [newPin, setNewPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState(false);

  // Password Update
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdSuccessMsg, setPwdSuccessMsg] = useState(false);

  // Device & Display Preferences State
  const [hapticsOn, setHapticsOn] = useState(true);
  const [mirrorOledOn, setMirrorOledOn] = useState(false);
  const [chimeOn, setChimeOn] = useState(true);

  // Per-Service Custom Duration State
  const [serviceDurations, setServiceDurations] = useState<Record<string, number>>({});
  const [loadingDurations, setLoadingDurations] = useState(false);
  const [savingDurations, setSavingDurations] = useState(false);
  const [durationSuccessMsg, setDurationSuccessMsg] = useState(false);
  const [catalogServices, setCatalogServices] = useState<any[]>(salon?.services || []);

  // In-App Toast Alert
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const staffId = staff?.id || user?.staffId || "stylist-01";
  const userId = user?.id || "user-staff-01";
  const displayName = staff?.name || user?.fullName || user?.username || "Staff Barber";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Load initial preferences
  useEffect(() => {
    setHapticsOn(isHapticEnabled());
    try {
      const savedOled = localStorage.getItem("station_oled_mode") === "true";
      setMirrorOledOn(savedOled);
      const savedChime = localStorage.getItem("station_audio_chime") !== "false";
      setChimeOn(savedChime);
    } catch {}
  }, []);

  // Sync catalog services
  useEffect(() => {
    if (salon?.services && salon.services.length > 0) {
      setCatalogServices(salon.services);
    } else if (salon?.id || salon?.slug) {
      api.salons.get(salon?.id || salon?.slug || "ramesh-barber").then((data) => {
        if (data?.salon?.services && data.salon.services.length > 0) {
          setCatalogServices(data.salon.services);
        }
      }).catch(() => {});
    }
  }, [salon]);

  // Load existing per-service custom durations for this stylist
  useEffect(() => {
    if (!staffId) return;
    setLoadingDurations(true);
    const fetcher = typeof api.auth?.getStaffServiceDurations === "function"
      ? api.auth.getStaffServiceDurations(staffId)
      : fetch(`/api/auth/staff/service-durations/${staffId}`).then((r) => r.json());

    fetcher
      .then((res: any) => {
        if (res && res.success && res.overrides) {
          setServiceDurations(res.overrides);
        }
      })
      .catch((err: any) => {
        console.warn("Failed to load staff service durations:", err);
      })
      .finally(() => {
        setLoadingDurations(false);
      });
  }, [staffId]);

  const handleDurationChange = (serviceId: string, duration: number) => {
    triggerHaptic("tap");
    setServiceDurations((prev) => ({
      ...prev,
      [serviceId]: Math.max(5, Math.min(120, duration)),
    }));
  };

  const handleResetDuration = (serviceId: string) => {
    triggerHaptic("tap");
    setServiceDurations((prev) => {
      const copy = { ...prev };
      delete copy[serviceId];
      return copy;
    });
    showToast("Duration reset to salon default", "info");
  };

  const handleSaveAllDurations = async () => {
    const effectiveSalonId = salon?.id || "salon-rural-01";
    if (!staffId) return;
    setSavingDurations(true);
    triggerHaptic("tap");
    try {
      const overrides: Record<string, number | null> = {};
      catalogServices.forEach((srv) => {
        if (serviceDurations[srv.id] !== undefined) {
          overrides[srv.id] = serviceDurations[srv.id];
        } else {
          overrides[srv.id] = null;
        }
      });

      const payload = {
        salonId: effectiveSalonId,
        stylistId: staffId,
        overrides,
      };

      const res: any = typeof api.auth?.updateStaffServiceDurations === "function"
        ? await api.auth.updateStaffServiceDurations(payload)
        : await fetch("/api/auth/staff/service-durations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).then((r) => r.json());

      if (res && res.success) {
        setServiceDurations(res.overrides || {});
        setDurationSuccessMsg(true);
        triggerHaptic("complete");
        showToast("Service custom durations saved! Client wait times recalculated.", "success");
        setTimeout(() => setDurationSuccessMsg(false), 3500);
      }
    } catch (err: any) {
      triggerHaptic("alert");
      showToast("Failed to save service durations: " + (err.message || "Failed"), "error");
    } finally {
      setSavingDurations(false);
    }
  };

  const handleUpdatePace = async (newVal: number) => {
    setPaceMinutes(newVal);
    setSavingPace(true);
    setPaceSuccessMsg(false);
    triggerHaptic("tap");
    try {
      await api.auth.updateStaffPreference({
        staffId,
        customAvgDurationMinutes: newVal,
        isActive: shiftStatus === "ACTIVE",
      });
      setPaceSuccessMsg(true);
      showToast(`Speed pace updated to ${newVal} minutes`, "success");
      setTimeout(() => setPaceSuccessMsg(false), 3000);
    } catch (err: any) {
      showToast("Failed to update speed pace: " + (err.message || "Failed"), "error");
    } finally {
      setSavingPace(false);
    }
  };

  const handleToggleShift = async (status: "ACTIVE" | "BREAK" | "OFF") => {
    triggerHaptic("tap");
    setShiftStatus(status);
    try {
      await api.auth.updateStaffPreference({
        staffId,
        customAvgDurationMinutes: paceMinutes,
        isActive: status === "ACTIVE",
      });
      showToast(
        `Shift status changed to ${
          status === "ACTIVE" ? "Active Duty" : status === "BREAK" ? "On Break" : "Off Duty"
        }`,
        "info"
      );
    } catch (err: any) {
      showToast("Failed to update shift status: " + (err.message || "Failed"), "error");
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      showToast("PIN must be exactly 4 numeric digits (e.g. 1234)", "error");
      return;
    }
    setSavingPin(true);
    setPinSuccessMsg(false);
    triggerHaptic("tap");
    try {
      await api.auth.setPin(userId, newPin);
      triggerHaptic("complete");
      setPinSuccessMsg(true);
      setNewPin("");
      showToast("Mirror touch PIN saved successfully!", "success");
      setTimeout(() => setPinSuccessMsg(false), 3000);
    } catch (err: any) {
      triggerHaptic("alert");
      showToast("Failed to update PIN: " + (err.message || "Failed"), "error");
    } finally {
      setSavingPin(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    setSavingPassword(true);
    setPwdSuccessMsg(false);
    triggerHaptic("tap");
    try {
      await api.auth.changePassword(userId, newPassword);
      triggerHaptic("complete");
      setPwdSuccessMsg(true);
      setNewPassword("");
      setConfirmPassword("");
      showToast("Account password changed successfully!", "success");
      setTimeout(() => setPwdSuccessMsg(false), 3000);
    } catch (err: any) {
      triggerHaptic("alert");
      showToast("Failed to change password: " + (err.message || "Failed"), "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleHaptic = () => {
    const next = !hapticsOn;
    setHapticsOn(next);
    setHapticEnabled(next);
    if (next) triggerHaptic("complete");
    showToast(`Haptic vibration ${next ? "enabled" : "disabled"}`, "info");
  };

  const handleToggleOled = () => {
    triggerHaptic("tap");
    const next = !mirrorOledOn;
    setMirrorOledOn(next);
    try {
      localStorage.setItem("station_oled_mode", String(next));
    } catch {}
    showToast(`OLED anti-glare mirror mode ${next ? "activated" : "deactivated"}`, "info");
  };

  const handleToggleChime = () => {
    triggerHaptic("tap");
    const next = !chimeOn;
    setChimeOn(next);
    try {
      localStorage.setItem("station_audio_chime", String(next));
    } catch {}
    showToast(`Audio chime announcements ${next ? "enabled" : "disabled"}`, "info");
  };

  const handleToggleFullscreen = () => {
    triggerHaptic("tap");
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      showToast("Fullscreen kiosk mode active", "info");
    } else {
      document.exitFullscreen().catch(() => {});
      showToast("Exited fullscreen mode", "info");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-2">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-950 border-emerald-500/50 text-emerald-200"
                : toast.type === "error"
                ? "bg-rose-950 border-rose-500/50 text-rose-200"
                : "bg-slate-900 border-slate-700 text-slate-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
            {toast.type === "info" && <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <Link
          href="/staff"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Chair &amp; Queue Cockpit</span>
        </Link>

        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 gap-1.5 self-start sm:self-auto"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out ({user.username})</span>
          </Button>
        )}
      </div>

      {/* Main Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-amber-400" />
          <span>General Settings &amp; Account Control</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Complete control over your personal profile, 4-digit mirror PIN, service speed pace, and hardware preferences.
        </p>
      </div>

      {/* Category Tabs: General | Security | Device */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic("tap");
            setActiveTab("general");
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "general"
              ? "border-amber-400 text-amber-300"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <User className="h-4 w-4" />
          <span>General Profile &amp; Pace</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("tap");
            setActiveTab("security");
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "security"
              ? "border-amber-400 text-amber-300"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>Security &amp; PIN</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic("tap");
            setActiveTab("device");
          }}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "device"
              ? "border-amber-400 text-amber-300"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Smartphone className="h-4 w-4" />
          <span>Device &amp; Station</span>
        </button>
      </div>

      {/* TAB 1: GENERAL SETTINGS */}
      {activeTab === "general" && (
        <div className="space-y-6 animate-in fade-in-0 duration-150">
          {/* Stylist Identity Card */}
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <User className="h-4 w-4 text-cyan-400" />
                <span>Stylist Profile &amp; Branch Assignment</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Your authenticated staff identity within this salon
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-cyan-600/20 shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white truncate">{displayName}</h3>
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10 font-bold">
                      STAFF STYLIST
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Username: <span className="text-slate-200 font-mono">@{user?.username || "staff"}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Assigned Salon: <strong className="text-slate-200">{salon?.name || "Ramesh Traditional Barber"}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shift Working Status */}
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <span>Shift Working Availability</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Controls whether automated ticket queue dispatches clients to your chair
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    shiftStatus === "ACTIVE"
                      ? "success"
                      : shiftStatus === "BREAK"
                      ? "warning"
                      : "secondary"
                  }
                  className="font-bold text-xs"
                >
                  {shiftStatus === "ACTIVE"
                    ? "On Duty & Ready"
                    : shiftStatus === "BREAK"
                    ? "On Chai Break"
                    : "Off Duty"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleShift("ACTIVE")}
                  className={`p-4 rounded-xl border text-center transition-all min-h-[52px] ${
                    shiftStatus === "ACTIVE"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                      : "border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white"
                  }`}
                >
                  <Armchair className="h-5 w-5 mx-auto mb-1.5 text-emerald-400" />
                  <span className="text-xs font-bold block">On Duty &amp; Serving</span>
                  <span className="text-[10px] text-slate-400">Queue active</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleShift("BREAK")}
                  className={`p-4 rounded-xl border text-center transition-all min-h-[52px] ${
                    shiftStatus === "BREAK"
                      ? "border-amber-500 bg-amber-500/15 text-amber-300 font-bold shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                      : "border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white"
                  }`}
                >
                  <Coffee className="h-5 w-5 mx-auto mb-1.5 text-amber-400" />
                  <span className="text-xs font-bold block">15m Chai Break</span>
                  <span className="text-[10px] text-slate-400">Chair paused</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleShift("OFF")}
                  className={`p-4 rounded-xl border text-center transition-all min-h-[52px] ${
                    shiftStatus === "OFF"
                      ? "border-rose-500 bg-rose-500/15 text-rose-300 font-bold shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/30"
                      : "border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white"
                  }`}
                >
                  <Clock className="h-5 w-5 mx-auto mb-1.5 text-rose-400" />
                  <span className="text-xs font-bold block">Off Duty</span>
                  <span className="text-[10px] text-slate-400">Shift closed</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Personal Speed & Pace Calibration */}
          <Card className="border-amber-500/30 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-amber-400" />
                    <span>Personal Speed Calibration</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Tune your haircut pace. Downstream wait times on customer phones recalculate dynamically!
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">{paceMinutes}</span>
                  <span className="text-xs text-slate-400 ml-1">mins / client</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5">
              <div className="space-y-2">
                <input
                  type="range"
                  min={15}
                  max={60}
                  step={5}
                  value={paceMinutes}
                  onChange={(e) => handleUpdatePace(Number(e.target.value))}
                  className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-1">
                  <span>15m (Lightning Fast)</span>
                  <span>25m (Standard)</span>
                  <span>40m (Detailed Fade)</span>
                  <span>60m (Relaxed Spa)</span>
                </div>
              </div>

              {paceSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Pace calibrated to {paceMinutes} minutes! Queue updated in real time.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Per-Service Custom Duration Preferences */}
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-amber-400" />
                    <span>Individual Service Duration Overrides</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    Different barbers take different times. Set your personal duration per service. Falls back to salon default if not customized.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/10 text-xs font-bold">
                    {Object.keys(serviceDurations).length} Custom Overrides
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {loadingDurations ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                  <span>Loading service catalog &amp; durations...</span>
                </div>
              ) : catalogServices.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No services registered for this salon yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {catalogServices.map((service) => {
                    const hasOverride = serviceDurations[service.id] !== undefined;
                    const effectiveDuration = hasOverride
                      ? serviceDurations[service.id]
                      : service.estimatedDurationMinutes;

                    return (
                      <div
                        key={service.id}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                          hasOverride
                            ? "border-amber-500/40 bg-amber-500/5 shadow-sm"
                            : "border-slate-800 bg-slate-950/60"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-white truncate">{service.name}</h4>
                              <span className="text-xs text-slate-400 font-mono flex items-center">
                                <IndianRupee className="h-3 w-3" />
                                {service.basePrice}
                              </span>
                              {service.isAddOn && (
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                  Add-on
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Salon Owner Default: <strong className="text-slate-300">{service.estimatedDurationMinutes} mins</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {hasOverride ? (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1">
                                <Zap className="h-3 w-3 text-amber-400" />
                                <span>{effectiveDuration} mins (Custom)</span>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs font-mono">
                                {effectiveDuration} mins (Salon Default)
                              </Badge>
                            )}

                            {hasOverride && (
                              <button
                                type="button"
                                onClick={() => handleResetDuration(service.id)}
                                title="Reset to salon owner default"
                                className="text-[10px] text-slate-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 min-h-[36px]"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span className="hidden sm:inline">Reset</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive Pace Stepper and Range Control */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            {/* Decrement Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleDurationChange(service.id, Math.max(5, effectiveDuration - 5))
                              }
                              className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-700"
                              aria-label="Decrease 5 minutes"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            {/* Slider */}
                            <input
                              type="range"
                              min={5}
                              max={90}
                              step={5}
                              value={effectiveDuration}
                              onChange={(e) =>
                                handleDurationChange(service.id, Number(e.target.value))
                              }
                              className="flex-1 h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />

                            {/* Increment Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleDurationChange(service.id, Math.min(120, effectiveDuration + 5))
                              }
                              className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-sm shrink-0 border border-slate-700"
                              aria-label="Increase 5 minutes"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>

                            <span className="w-14 text-right font-mono text-sm font-bold text-amber-300">
                              {effectiveDuration}m
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {durationSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Custom service durations saved! Client wait times recalculated across live queue.</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2 pb-4 sm:pb-6 px-4 sm:px-6 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400">
                Changes immediately affect estimated queue wait times for customers assigned to your chair.
              </p>
              <Button
                type="button"
                onClick={handleSaveAllDurations}
                disabled={savingDurations || loadingDurations}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black h-11 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
              >
                {savingDurations ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving Durations...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Service Durations</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* TAB 2: SECURITY & PIN MANAGEMENT */}
      {activeTab === "security" && (
        <div className="space-y-6 animate-in fade-in-0 duration-150">
          {/* 4-Digit Mirror Touch PIN */}
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <span>4-Digit Mirror Screen Lock PIN</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Staff uses this 4-digit code to quickly unlock the mirror tablet without entering passwords
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSavePin} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Set New 4-Digit Numeric PIN
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="password"
                      maxLength={4}
                      pattern="\d{4}"
                      placeholder="••••"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                      className="w-36 text-center text-2xl tracking-widest font-mono h-11 bg-slate-950 border-slate-700"
                      required
                    />
                    <Button
                      type="submit"
                      disabled={savingPin || newPin.length !== 4}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black h-11 px-6 rounded-xl"
                    >
                      {savingPin ? "Saving..." : "Save 4-Digit PIN"}
                    </Button>
                  </div>
                </div>

                {pinSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>4-Digit Mirror Touch PIN updated successfully!</span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Account Password Change */}
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-400" />
                <span>Change Account Password</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Update your staff portal login password
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="bg-slate-950 border-slate-700 h-10 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="bg-slate-950 border-slate-700 h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={savingPassword || newPassword.length < 6}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs h-10 px-5 rounded-xl border border-slate-700"
                >
                  {savingPassword ? "Updating Password..." : "Update Password"}
                </Button>

                {pwdSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Password updated successfully!</span>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: DEVICE & STATION PREFERENCES */}
      {activeTab === "device" && (
        <div className="space-y-6 animate-in fade-in-0 duration-150">
          <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-400" />
                <span>Station Hardware &amp; Display Preferences</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400 mt-0.5">
                Optimize mirror tablet performance, tactile feedback, and audio alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* 1. Android Haptic Vibration */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                    <Smartphone className="h-4 w-4 text-emerald-400" />
                    <span>Android Haptic Vibration</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Provides tactile vibration pulses on client arrival, ticket call, and service finish
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleHaptic}
                  className={`text-xs font-bold px-3 py-1.5 h-8 rounded-lg shrink-0 ${
                    hapticsOn
                      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/15"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {hapticsOn ? "ENABLED" : "DISABLED"}
                </Button>
              </div>

              {/* 2. OLED Anti-Glare Mirror Mode */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                    <Moon className="h-4 w-4 text-purple-400" />
                    <span>OLED Anti-Glare Deep Black Mode</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Pure black (#000000) backdrop to reduce reflection on mirror displays and save tablet battery
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleOled}
                  className={`text-xs font-bold px-3 py-1.5 h-8 rounded-lg shrink-0 ${
                    mirrorOledOn
                      ? "border-purple-500/40 text-purple-300 bg-purple-500/15"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {mirrorOledOn ? "ACTIVE" : "OFF"}
                </Button>
              </div>

              {/* 3. Audio Chime Announcements */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                    <Volume2 className="h-4 w-4 text-blue-400" />
                    <span>Audio Chime &amp; Voice Announcements</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Plays dual-tone airport sound and announces ticket numbers when calling next customer
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleChime}
                  className={`text-xs font-bold px-3 py-1.5 h-8 rounded-lg shrink-0 ${
                    chimeOn
                      ? "border-blue-500/40 text-blue-300 bg-blue-500/15"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {chimeOn ? "ON" : "MUTED"}
                </Button>
              </div>

              {/* 4. Fullscreen Mode */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                    <Maximize2 className="h-4 w-4 text-amber-400" />
                    <span>Fullscreen Kiosk Mode</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Expands the station interface to full screen, hiding browser bars on tablets
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleFullscreen}
                  className="text-xs font-bold px-3 py-1.5 h-8 rounded-lg shrink-0 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                >
                  Toggle Kiosk
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
