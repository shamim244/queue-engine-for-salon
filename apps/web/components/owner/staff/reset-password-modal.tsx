import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Sparkles, Eye, EyeOff } from "lucide-react";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onSuccess: (username: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  user,
  onSuccess,
  showToast,
}: ResetPasswordModalProps) {
  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPasswordValue("");
      setShowPassword(false);
    }
  }, [isOpen]);

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordValue(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!passwordValue || passwordValue.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    setSaving(true);
    try {
      await api.auth.resetStaffPassword(user.id, passwordValue);
      showToast(`Password updated for @${user.username}! Active sessions revoked.`, "success");
      onSuccess(user.username);
      onClose();
    } catch (err: any) {
      showToast("Failed to reset password: " + (err.message || "Unknown error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-400">
            <Lock className="h-5 w-5" />
            Reset Password for @{user?.username}
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
                onClick={handleGeneratePassword}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 p-1"
              >
                <Sparkles className="h-3 w-3" /> Generate Secure
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="pr-10 min-h-[44px]"
                autoFocus
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-h-[44px]"
          >
            {saving ? "Updating..." : "Update Password"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
