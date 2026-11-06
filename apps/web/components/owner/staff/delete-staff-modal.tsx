import React, { useState } from "react";
import { api, AuthUser } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw } from "lucide-react";

interface DeleteStaffModalProps {
  user: AuthUser | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function DeleteStaffModal({
  user,
  onClose,
  onSuccess,
  showToast,
}: DeleteStaffModalProps) {
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await api.auth.deleteStaff(user.id);
      showToast(`Staff member @${user.username} deleted from branch.`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast("Failed to delete staff member: " + (err.message || "Unknown error"), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div>
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-rose-500" />
            Remove @{user.username} from Salon?
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{" "}
            <strong className="text-white">
              {user.fullName || user.username}
            </strong>{" "}
            from this salon branch? Their user credentials and associated station assignments will be deactivated.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={deleting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 min-h-[44px]"
          >
            {deleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Confirm Deletion
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
