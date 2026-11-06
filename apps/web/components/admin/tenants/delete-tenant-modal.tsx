import React, { useState } from "react";
import { api } from "@/lib/api";
import type { Salon } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw } from "lucide-react";

interface DeleteTenantModalProps {
  salon: Salon | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function DeleteTenantModal({
  salon,
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: DeleteTenantModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!salon) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.salons.delete(salon.id);
      showToast("Salon removed successfully.", "info");
      onSuccess(salon.name);
      onClose();
    } catch (err: any) {
      showToast("Failed to delete salon: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <div>
        <DialogHeader>
          <DialogTitle className="text-rose-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-rose-500" />
            Permanently Delete &quot;{salon.name}&quot;?
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong className="text-white">{salon.name}</strong>? This action cannot be undone. All active tickets, chair assignments, door QR routes, and TV dashboards for this branch will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 min-h-[44px]"
          >
            {isDeleting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Confirm Permanent Deletion
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
