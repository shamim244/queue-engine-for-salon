import React, { useState } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Check } from "lucide-react";

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (salonName: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function AddTenantModal({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: AddTenantModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast("Name and Phone are required", "error");
      return;
    }

    setCreating(true);
    try {
      await api.salons.register({
        name: name.trim(),
        slug: slug.trim() || undefined,
        phone: phone.trim(),
        stylists: [{ name: "Master Stylist", avgDurationMinutes: 25 }],
        services: [
          { name: "Haircut", basePrice: 150, estimatedDurationMinutes: 25 },
          { name: "Beard Trim", basePrice: 80, estimatedDurationMinutes: 15 },
        ],
      });

      onSuccess(name.trim());
      setName("");
      setSlug("");
      setPhone("");
      onClose();
    } catch (err: any) {
      showToast("Failed to create salon: " + (err.message || "Unknown error"), "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Register New Salon Branch</DialogTitle>
          <DialogDescription>
            Create a new tenant with immediate routing, QR generation, and socket initialization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Salon / Barber Shop Name *
            </label>
            <Input
              placeholder="e.g. Royal Crown Barbers"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="min-h-[44px]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Custom URL Slug (Optional)
            </label>
            <Input
              placeholder="e.g. royal-crown (auto-generated if empty)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Contact Phone Number *
            </label>
            <Input
              placeholder="+91 98765 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="min-h-[44px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={creating}
            className="min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={creating}
            className="gap-2 min-h-[44px]"
          >
            {creating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Create Salon Tenant
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
