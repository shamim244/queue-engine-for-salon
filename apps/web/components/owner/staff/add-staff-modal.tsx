import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput, DEFAULT_COUNTRIES } from "@/components/ui/phone-input";
import { UserPlus, Sparkles, Eye, EyeOff } from "lucide-react";

export interface InitialStaffData {
  staffId?: string;
  fullName?: string;
  username?: string;
  phone?: string;
  pace?: number;
  pin?: string;
}

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonId?: string;
  salonSlug?: string;
  initialData?: InitialStaffData;
  onSuccess: (fullName: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export function AddStaffModal({
  isOpen,
  onClose,
  salonId,
  salonSlug,
  initialData,
  onSuccess,
  showToast,
}: AddStaffModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+91");
  const [pin, setPin] = useState("");
  const [pace, setPace] = useState(25);
  const [staffId, setStaffId] = useState<string | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const parsePhoneInput = (raw: string) => {
    if (!raw) return { code: "+91", national: "" };
    let code = "+91";
    let digits = raw.replace(/\D/g, "");
    if (raw.startsWith("+")) {
      for (const c of DEFAULT_COUNTRIES) {
        if (raw.startsWith(c.code)) {
          code = c.code;
          digits = raw.slice(c.code.length).replace(/\D/g, "");
          break;
        }
      }
    } else if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    }
    return { code, national: digits.slice(0, 10) };
  };

  useEffect(() => {
    if (isOpen) {
      setInlineError(null);
      if (initialData) {
        setStaffId(initialData.staffId);
        setFullName(initialData.fullName || "");
        setUsername(initialData.username || "");
        const parsed = parsePhoneInput(initialData.phone || "");
        setPhone(parsed.national);
        setPhoneCountryCode(parsed.code);
        setPace(initialData.pace || 25);
        setPin(initialData.pin || "");
        setPassword("password123");
      } else {
        setStaffId(undefined);
        setFullName("");
        setEmail("");
        setUsername("");
        setPassword("");
        setPhone("");
        setPhoneCountryCode("+91");
        setPin("");
        setPace(25);
      }
      setShowPassword(false);
    }
  }, [isOpen, initialData]);

  const handleAutoGenerateUsername = () => {
    if (!fullName.trim()) return;
    const clean = fullName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 15);
    const branchPrefix = salonSlug ? salonSlug.split("-")[1] || "st" : "st";
    setUsername(`${clean}_${branchPrefix}`);
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) {
      showToast("Salon branch context is missing", "error");
      return;
    }
    if (!fullName.trim()) {
      showToast("Full name is required", "error");
      return;
    }
    if (!username.trim()) {
      showToast("Username is required", "error");
      return;
    }
    if (!password || password.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      showToast("Mirror PIN must be exactly 4 digits (e.g. 1234)", "error");
      return;
    }

    let formattedPhone: string | undefined = undefined;
    if (phone && phone.trim()) {
      const cleanDigits = phone.trim().replace(/\D/g, "");
      if (cleanDigits.length !== 10) {
        setInlineError("Mobile phone number must be exactly 10 digits");
        showToast("Mobile phone number must be exactly 10 digits", "error");
        return;
      }
      formattedPhone = `${phoneCountryCode}${cleanDigits}`;
    }

    setCreating(true);
    setInlineError(null);
    try {
      await api.auth.createStaff({
        salonId,
        staffId,
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        phone: formattedPhone,
        pin: pin.trim() || undefined,
        avgDurationMinutes: Number(pace) || 25,
      });

      onSuccess(fullName.trim());
      onClose();
    } catch (err: any) {
      const msg = err.message || "Failed to create staff member";
      setInlineError(msg);
      showToast("Failed to create staff member: " + msg, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogClose onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-400" />
            {staffId ? "Provision Login for Station" : "Add Team Member & Station"}
          </DialogTitle>
          <DialogDescription>
            Creates an authentic staff account with password, phone, speed calibration, and an optional 4-digit mirror PIN.
          </DialogDescription>
        </DialogHeader>

        {inlineError && (
          <div className="p-3 my-2 rounded-xl border border-rose-500/50 bg-rose-950/60 text-rose-200 text-xs flex items-center gap-2">
            <span className="font-bold text-rose-400">⚠️ Error:</span>
            <span>{inlineError}</span>
          </div>
        )}

        <div className="space-y-4 my-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Full Name *
              </label>
              <Input
                placeholder="e.g. Ramesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                required
                className="min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="ramesh@salon.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Username *
              </label>
              <button
                type="button"
                onClick={handleAutoGenerateUsername}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 p-1"
              >
                <Sparkles className="h-3 w-3" /> Auto-Suggest
              </button>
            </div>
            <Input
              placeholder="ramesh_barber"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              required
              className="min-h-[44px]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Login Password *
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10 min-h-[44px]"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Phone Number
              </label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                countryCode={phoneCountryCode}
                onCountryCodeChange={setPhoneCountryCode}
                placeholder="9876543210"
                showDigitCounter={true}
                disabled={creating}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                4-Digit Mirror PIN (Optional)
              </label>
              <Input
                maxLength={4}
                placeholder="e.g. 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="min-h-[44px]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Service Speed Pace (Minutes per haircut)
              </label>
              <span className="text-xs font-mono text-amber-400 font-bold">{pace} mins</span>
            </div>
            <Input
              type="number"
              min={10}
              max={90}
              value={pace}
              onChange={(e) => setPace(Number(e.target.value))}
              className="min-h-[44px]"
            />
            <div className="flex gap-2 mt-2">
              {[15, 20, 25, 30, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setPace(mins)}
                  className={`text-xs px-3 py-2 rounded-lg border font-mono transition-all min-h-[40px] ${
                    pace === mins
                      ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
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
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold min-h-[44px]"
          >
            {creating ? "Registering..." : "Create Team Member"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
