"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, Stylist, Salon } from "@/lib/api";
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
  Check,
} from "lucide-react";

function OwnerStaffContent() {
  const searchParams = useSearchParams();
  const { salon } = useAuth();

  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [staffLogins, setStaffLogins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Stylist Modal
  const [isAddStylistOpen, setIsAddStylistOpen] = useState(false);
  const [newStylistName, setNewStylistName] = useState("");
  const [newStylistPhone, setNewStylistPhone] = useState("");
  const [newStylistPace, setNewStylistPace] = useState(25);
  const [savingStylist, setSavingStylist] = useState(false);

  // Set PIN Modal
  const [selectedStylistForPin, setSelectedStylistForPin] = useState<Stylist | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  // Create Staff Login Modal
  const [selectedStylistForLogin, setSelectedStylistForLogin] = useState<Stylist | null>(null);
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [savingLogin, setSavingLogin] = useState(false);

  // In-app Kill-Switch Modal State
  const [killSwitchTarget, setKillSwitchTarget] = useState<{ userId: string; stylistName: string } | null>(null);
  const [revokingUserId, setRevokingUserId] = useState<string | null>(null);

  // In-App Toast Banner
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const currentSlug = salon?.slug || searchParams.get("salon") || "salon-rural-01";

  const fetchStaffData = async () => {
    try {
      const salonRes = await api.salons.get(currentSlug);
      setStylists(salonRes.salon?.stylists || []);

      if (salonRes.salon?.id) {
        const loginsRes = await api.auth.listStaff(salonRes.salon.id);
        setStaffLogins(loginsRes.staffUsers || []);
      }
    } catch (err) {
      console.error("Failed to load staff list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [currentSlug]);

  const handleAddStylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStylistName.trim() || !salon) return;
    setSavingStylist(true);
    try {
      await api.salons.addStylist(salon.id, {
        name: newStylistName.trim(),
        phone: newStylistPhone.trim() || undefined,
        avgDurationMinutes: Number(newStylistPace) || 25,
      });
      setIsAddStylistOpen(false);
      setNewStylistName("");
      setNewStylistPhone("");
      showToast(`Stylist ${newStylistName.trim()} added!`, "success");
      fetchStaffData();
    } catch (err) {
      showToast("Failed to add stylist: " + (err as Error).message, "error");
    } finally {
      setSavingStylist(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStylistForPin || !/^\d{4}$/.test(pinValue)) {
      showToast("Please enter a valid 4-digit numeric PIN (e.g. 1234)", "error");
      return;
    }
    setSavingPin(true);
    try {
      // Find matching user login for this stylist
      const login = staffLogins.find((u) => u.staffId === selectedStylistForPin.id);
      if (login) {
        await api.auth.setPin(login.id, pinValue);
      } else {
        // Create user login automatically with default credentials and this PIN
        await api.auth.createStaff({
          salonId: salon?.id || "salon-rural-01",
          staffId: selectedStylistForPin.id,
          username: selectedStylistForPin.name.toLowerCase().replace(/\s+/g, ""),
          password: "password123",
          pin: pinValue,
        });
      }
      setSelectedStylistForPin(null);
      setPinValue("");
      showToast("4-Digit Mirror PIN updated successfully!", "success");
      fetchStaffData();
    } catch (err) {
      showToast("Failed to set PIN: " + (err as Error).message, "error");
    } finally {
      setSavingPin(false);
    }
  };

  const handleCreateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStylistForLogin || !staffUsername || !staffPassword) {
      showToast("Username and password are required", "error");
      return;
    }
    setSavingLogin(true);
    try {
      await api.auth.createStaff({
        salonId: salon?.id || "salon-rural-01",
        staffId: selectedStylistForLogin.id,
        username: staffUsername.trim(),
        password: staffPassword,
        pin: staffPin.trim() || undefined,
      });
      setSelectedStylistForLogin(null);
      setStaffUsername("");
      setStaffPassword("");
      setStaffPin("");
      showToast("Staff login credentials created!", "success");
      fetchStaffData();
    } catch (err) {
      showToast("Failed to create credentials: " + (err as Error).message, "error");
    } finally {
      setSavingLogin(false);
    }
  };

  const handleConfirmKillSwitch = async () => {
    if (!killSwitchTarget) return;
    setRevokingUserId(killSwitchTarget.userId);
    try {
      await api.auth.revokeAll(killSwitchTarget.userId);
      showToast(`All active sessions for ${killSwitchTarget.stylistName} have been invalidated.`, "info");
      setKillSwitchTarget(null);
      fetchStaffData();
    } catch (err) {
      showToast("Kill-switch error: " + (err as Error).message, "error");
    } finally {
      setRevokingUserId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert Banner */}
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
            {toast.type === "error" && <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0" />}
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Stylist Roster & Security Credentials
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage mirror tablet PINs, speed calibrations, and instant session kill-switches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStaffData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAddStylistOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add Stylist / Barber
          </Button>
        </div>
      </div>

      {/* Stylist Roster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stylists.map((st) => {
          const login = staffLogins.find((u) => u.staffId === st.id);
          const hasPin = Boolean(st.pin || login?.pin);
          const isRevoking = revokingUserId === login?.id;

          return (
            <Card key={st.id} className="relative flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-base">
                      {st.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base text-white">{st.name}</CardTitle>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {st.isOwner ? "Salon Owner / Lead Stylist" : "Senior Barber"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={st.isAvailable ? "success" : "secondary"}>
                    {st.isAvailable ? "Available" : "Busy"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      Speed Pace:
                    </span>
                    <strong className="text-white">{st.avgDurationMinutes || 25} mins</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-amber-400" />
                      4-Digit Quick PIN:
                    </span>
                    <Badge variant={hasPin ? "success" : "outline"} className="text-[10px]">
                      {hasPin ? "Configured (••••)" : "Not Set"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-purple-400" />
                      App Login:
                    </span>
                    <span className="font-mono text-slate-300">
                      {login ? login.username : "No Login"}
                    </span>
                  </div>
                </div>

                {/* PIN and Login Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8 border-slate-700 hover:border-amber-500/60"
                    onClick={() => {
                      setSelectedStylistForPin(st);
                      setPinValue(login?.pin || "");
                    }}
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-400" />
                    Set Mirror PIN
                  </Button>

                  {!login && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs h-8"
                      onClick={() => {
                        setSelectedStylistForLogin(st);
                        setStaffUsername(st.name.toLowerCase().replace(/\s+/g, ""));
                      }}
                    >
                      <Lock className="h-3.5 w-3.5 mr-1 text-blue-400" />
                      Create Login
                    </Button>
                  )}
                </div>
              </CardContent>

              {/* Emergency Kill-Switch in Footer */}
              {login && (
                <div className="p-4 pt-0">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full text-xs h-8 gap-1.5 bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition-all"
                    onClick={() => setKillSwitchTarget({ userId: login.id, stylistName: st.name })}
                    disabled={isRevoking}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {isRevoking ? "Revoking..." : "🚨 Emergency Kill-Switch"}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

        {/* Modal: Add Stylist */}
        <Dialog open={isAddStylistOpen} onOpenChange={setIsAddStylistOpen}>
          <DialogClose onClose={() => setIsAddStylistOpen(false)} />
          <form onSubmit={handleAddStylist}>
            <DialogHeader>
              <DialogTitle>Add New Stylist / Barber</DialogTitle>
              <DialogDescription>
                Add a barber to this salon branch with default pace calibration.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Stylist Full Name *
                </label>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  value={newStylistName}
                  onChange={(e) => setNewStylistName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Phone Number (Optional)
                </label>
                <Input
                  placeholder="+91 98765 00000"
                  value={newStylistPhone}
                  onChange={(e) => setNewStylistPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Average Haircut Duration (Minutes)
                </label>
                <Input
                  type="number"
                  min={10}
                  max={90}
                  value={newStylistPace}
                  onChange={(e) => setNewStylistPace(Number(e.target.value))}
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used by the queue algorithm to predict wait times for waiting clients.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddStylistOpen(false)}
                disabled={savingStylist}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingStylist}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {savingStylist ? "Saving..." : "Save Stylist"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal: Set 4-Digit Quick PIN */}
        <Dialog open={Boolean(selectedStylistForPin)} onOpenChange={() => setSelectedStylistForPin(null)}>
          <DialogClose onClose={() => setSelectedStylistForPin(null)} />
          <form onSubmit={handleUpdatePin}>
            <DialogHeader>
              <DialogTitle>
                Set 4-Digit Mirror PIN for {selectedStylistForPin?.name}
              </DialogTitle>
              <DialogDescription>
                Enables rapid 2-second touch-unlock and chair swap on the shared mirror tablet.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-6">
              <div className="text-center">
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Enter 4-Digit Numeric PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  pattern="\d{4}"
                  placeholder="••••"
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                  className="w-48 h-16 text-center text-3xl font-mono tracking-widest rounded-2xl border-2 border-amber-500 bg-slate-950 text-white focus:outline-none shadow-lg shadow-amber-500/20 mx-auto block"
                  autoFocus
                  required
                />
                <span className="text-xs text-slate-400 mt-2 block">
                  Only numbers 0-9. Example: <code className="text-amber-400">1234</code>
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedStylistForPin(null)}
                disabled={savingPin}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingPin}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {savingPin ? "Saving..." : "Save 4-Digit PIN"}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>

        {/* Modal: Create Staff App Login */}
        <Dialog open={Boolean(selectedStylistForLogin)} onOpenChange={() => setSelectedStylistForLogin(null)}>
          <DialogClose onClose={() => setSelectedStylistForLogin(null)} />
          <form onSubmit={handleCreateLogin}>
            <DialogHeader>
              <DialogTitle>
                Create App Credentials for {selectedStylistForLogin?.name}
              </DialogTitle>
              <DialogDescription>
                Allow this stylist to log into their mobile preferences panel and working chair UI.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Username *
                </label>
                <Input
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Password *
                </label>
                <Input
                  type="password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  4-Digit Mirror PIN (Optional)
                </label>
                <Input
                  maxLength={4}
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 5678"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedStylistForLogin(null)}
                disabled={savingLogin}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {savingLogin ? "Creating..." : "Create Account"}
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
                  🚨 Revoke Active Sessions for {killSwitchTarget.stylistName}?
                </DialogTitle>
                <DialogDescription>
                  This will immediately terminate all active login tokens and mirror tablet sessions for{" "}
                  <strong className="text-white">{killSwitchTarget.stylistName}</strong> across all devices. The staff member will be logged out on the next heartbeat.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setKillSwitchTarget(null)}
                  disabled={Boolean(revokingUserId)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmKillSwitch}
                  disabled={Boolean(revokingUserId)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2"
                >
                  {revokingUserId ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                  Revoke Sessions Immediately
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
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Staff...</div>}>
      <OwnerStaffContent />
    </Suspense>
  );
}
