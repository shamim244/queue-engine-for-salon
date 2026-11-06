import React, { useState, useEffect } from "react";
import { api, AuthUser } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

interface StaffPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function StaffPinModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  showToast,
}: StaffPinModalProps) {
  const [pinValue, setPinValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setPinValue(user.pin || "");
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !/^\d{4}$/.test(pinValue)) {
      showToast("Please enter a valid 4-digit numeric PIN", "error");
      return;
    }

    setSaving(true);
    try {
      await api.auth.updateStaff(user.id, {
        pin: pinValue,
      });
      showToast("4-Digit Mirror PIN saved successfully!", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast("Failed to save PIN: " + (err.message || "Unknown error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <KeyRound className="h-5 w-5" />
            Quick Mirror PIN: {user?.fullName || user?.username}
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
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
            className="w-48 h-16 text-center text-3xl font-mono tracking-widest rounded-2xl border-2 border-amber-500 bg-slate-950 text-white focus:outline-none shadow-lg shadow-amber-500/20 mx-auto block"
            autoFocus
            required
          />
          <span className="text-xs text-slate-400 mt-2 block">
            Numbers only. Example: <code className="text-amber-400">1234</code>
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold min-h-[44px]"
          >
            {saving ? "Saving..." : "Save 4-Digit PIN"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
