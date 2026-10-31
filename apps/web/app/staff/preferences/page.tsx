"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function StaffPreferencesPage() {
  const { user, staff, salon, logout, demoLogin } = useAuth();

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

  const staffId = staff?.id || user?.staffId || "stylist-01";
  const userId = user?.id || "user-staff-01";

  const handleUpdatePace = async (newVal: number) => {
    setPaceMinutes(newVal);
    setSavingPace(true);
    setPaceSuccessMsg(false);
    try {
      await api.auth.updateStaffPreference({
        staffId,
        customAvgDurationMinutes: newVal,
        isActive: shiftStatus === "ACTIVE",
      });
      setPaceSuccessMsg(true);
      setTimeout(() => setPaceSuccessMsg(false), 3000);
    } catch (err) {
      alert("Failed to update speed pace: " + (err as Error).message);
    } finally {
      setSavingPace(false);
    }
  };

  const handleToggleShift = async (status: "ACTIVE" | "BREAK" | "OFF") => {
    setShiftStatus(status);
    try {
      await api.auth.updateStaffPreference({
        staffId,
        customAvgDurationMinutes: paceMinutes,
        isActive: status === "ACTIVE",
      });
    } catch (err) {
      console.error("Failed to update shift status:", err);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      alert("PIN must be exactly 4 numeric digits (e.g. 1234)");
      return;
    }
    setSavingPin(true);
    setPinSuccessMsg(false);
    try {
      await api.auth.setPin(userId, newPin);
      setPinSuccessMsg(true);
      setNewPin("");
      setTimeout(() => setPinSuccessMsg(false), 3000);
    } catch (err) {
      alert("Failed to update PIN: " + (err as Error).message);
    } finally {
      setSavingPin(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    setPwdSuccessMsg(false);
    try {
      await api.auth.changePassword(userId, newPassword);
      setPwdSuccessMsg(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdSuccessMsg(false), 3000);
    } catch (err) {
      alert("Failed to change password: " + (err as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <Link
            href={salon?.slug ? `/s/${salon.slug}/station` : "/"}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Chair Station</span>
          </Link>

          {user ? (
            <Button variant="ghost" size="sm" onClick={() => logout()} className="text-xs text-rose-400 gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout ({user.username})</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => demoLogin("STAFF")}
              className="text-xs border-dashed gap-1"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Quick Staff Auth
            </Button>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Staff Profile & Station Preferences
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Personal speed pace calibration, shift availability, and 4-digit mirror PIN security.
          </p>
        </div>

        {/* 1. Shift Availability Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Shift Working Status</span>
              <Badge
                variant={
                  shiftStatus === "ACTIVE"
                    ? "success"
                    : shiftStatus === "BREAK"
                    ? "warning"
                    : "secondary"
                }
              >
                {shiftStatus === "ACTIVE"
                  ? "On Duty & Serving"
                  : shiftStatus === "BREAK"
                  ? "On Tea Break"
                  : "Off Duty"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Marking yourself on break pauses automated ticket dispatch to your chair.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleToggleShift("ACTIVE")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  shiftStatus === "ACTIVE"
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Armchair className="h-5 w-5 mx-auto mb-1 text-emerald-400" />
                <span className="text-xs">On Duty</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleShift("BREAK")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  shiftStatus === "BREAK"
                    ? "border-amber-500 bg-amber-500/15 text-amber-300 font-bold shadow-lg shadow-amber-500/10"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Coffee className="h-5 w-5 mx-auto mb-1 text-amber-400" />
                <span className="text-xs">15m Chai Break</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleShift("OFF")}
                className={`p-3 rounded-xl border text-center transition-all ${
                  shiftStatus === "OFF"
                    ? "border-rose-500 bg-rose-500/15 text-rose-300 font-bold shadow-lg shadow-rose-500/10"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Clock className="h-5 w-5 mx-auto mb-1 text-rose-400" />
                <span className="text-xs">Off Shift</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* 2. Speed Calibration Slider (15m to 60m) */}
        <Card className="border-amber-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-amber-400" />
                  <span>Personal Speed Calibration</span>
                </CardTitle>
                <CardDescription>
                  Tune your haircut pace. Downstream wait times recalculate dynamically in real-time!
                </CardDescription>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-amber-400">{paceMinutes}</span>
                <span className="text-xs text-slate-400 ml-1">mins / client</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
                <span>Pace calibrated to {paceMinutes} minutes! Queue updated.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. 4-Digit Quick Mirror PIN */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-400" />
              <span>4-Digit Mirror Touch PIN</span>
            </CardTitle>
            <CardDescription>
              Used for 2-second rapid chair unlock and switching on the shared tablet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  New 4-Digit Numeric PIN
                </label>
                <div className="flex gap-3">
                  <Input
                    type="password"
                    maxLength={4}
                    pattern="\d{4}"
                    placeholder="••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    className="w-36 text-center text-xl tracking-widest font-mono"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={savingPin || newPin.length !== 4}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  >
                    {savingPin ? "Saving..." : "Update PIN"}
                  </Button>
                </div>
              </div>

              {pinSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>4-Digit Mirror PIN saved successfully!</span>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* 4. Alphanumeric Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-400" />
              <span>Change Account Password</span>
            </CardTitle>
            <CardDescription>Update your personal account credentials.</CardDescription>
          </CardHeader>
          <CardContent>
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
                    placeholder="Min 6 characters"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={savingPassword}
                variant="secondary"
                className="text-xs font-bold"
              >
                {savingPassword ? "Updating..." : "Change Password"}
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
    </div>
  );
}
