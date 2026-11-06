import React, { useState } from "react";
import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface KillSwitchModalProps {
  user: AuthUser | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function KillSwitchModal({
  user,
  onClose,
  onSuccess,
  showToast,
}: KillSwitchModalProps) {
  const [revoking, setRevoking] = useState(false);

  if (!user) return null;

  const handleConfirm = async () => {
    setRevoking(true);
    try {
      await api.auth.revokeAll(user.id);
      showToast(`All active sessions for @${user.username} have been invalidated.`, "info");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast("Kill-switch failed: " + (err.message || "Unknown error"), "error");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div>
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            🚨 Revoke Sessions for @{user.username}?
          </DialogTitle>
          <DialogDescription>
            This will immediately terminate all active login tokens and mirror tablet sessions for{" "}
            <strong className="text-white">
              {user.fullName || user.username}
            </strong>{" "}
            across all devices. The staff member will be logged out on the next heartbeat.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={revoking}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={revoking}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 min-h-[44px]"
          >
            {revoking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
            Revoke Sessions Immediately
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
