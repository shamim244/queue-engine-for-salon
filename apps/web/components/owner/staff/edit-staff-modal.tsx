import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { AuthUser, Stylist } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2 } from "lucide-react";

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  matchedStylist?: Stylist;
  onSuccess: (name: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function EditStaffModal({
  isOpen,
  onClose,
  user,
  matchedStylist,
  onSuccess,
  showToast,
}: EditStaffModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pace, setPace] = useState(25);
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setPin(user.pin || "");
      setStatus(user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE");
      setPace(matchedStylist?.avgDurationMinutes || 25);
    }
  }, [user, matchedStylist, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (pin && !/^\d{4}$/.test(pin)) {
      showToast("Mirror PIN must be exactly 4 digits", "error");
      return;
    }

    setSavingEdit(true);
    try {
      await api.auth.updateStaff(user.id, {
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        pin: pin.trim() || undefined,
        avgDurationMinutes: Number(pace) || 25,
        status,
      });

      onSuccess(fullName || user.username);
      onClose();
    } catch (err: any) {
      showToast("Failed to update staff member: " + (err.message || "Unknown error"), "error");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-amber-400" />
            Edit Profile: @{user?.username}
          </DialogTitle>
          <DialogDescription>
            Update staff details, mirror tablet PIN, speed calibration, or active status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Full Name
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="min-h-[44px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@salon.com"
                className="min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                4-Digit Mirror PIN
              </label>
              <Input
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 5678"
                className="min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Service Speed (Mins)
              </label>
              <Input
                type="number"
                min={10}
                max={90}
                value={pace}
                onChange={(e) => setPace(Number(e.target.value))}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Account Status
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer min-h-[44px] py-1">
                <input
                  type="radio"
                  name="edit-status"
                  checked={status === "ACTIVE"}
                  onChange={() => setStatus("ACTIVE")}
                  className="accent-amber-500 h-4 w-4"
                />
                <span>Active (Can log in & accept clients)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer min-h-[44px] py-1">
                <input
                  type="radio"
                  name="edit-status"
                  checked={status === "SUSPENDED"}
                  onChange={() => setStatus("SUSPENDED")}
                  className="accent-rose-500 h-4 w-4"
                />
                <span className="text-rose-400">Suspended</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={savingEdit}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={savingEdit}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold min-h-[44px]"
          >
            {savingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
