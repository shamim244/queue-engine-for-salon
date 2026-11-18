import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, ArrowRight, ShieldCheck, Tv, Users, Zap } from "lucide-react";

interface UpgradePlanPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  maxStylists?: number;
  currentCount?: number;
  salonSlug?: string;
  hasPartnerDiscount?: boolean;
}

export function UpgradePlanPromptModal({
  isOpen,
  onClose,
  currentTier = "FREE",
  maxStylists = 1,
  currentCount = 1,
  salonSlug,
  hasPartnerDiscount = false,
}: UpgradePlanPromptModalProps) {
  const billingHref = salonSlug ? `/owner/billing?salon=${salonSlug}` : `/owner/billing`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} className="max-w-xl">
      <DialogClose onClose={onClose} />

      <DialogHeader className="text-left">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[11px] font-semibold">
              Station Quota Limit Reached
            </Badge>
            <DialogTitle className="text-xl sm:text-2xl font-black text-white mt-1">
              Unlock More Barber Stations
            </DialogTitle>
          </div>
        </div>
        <DialogDescription className="text-slate-300 text-sm leading-relaxed">
          Your salon is currently on the{" "}
          <span className="font-bold text-amber-300">{currentTier} Plan</span>, which includes{" "}
          <span className="font-bold text-white">{maxStylists} Barber Station</span> ({currentCount}/{maxStylists} currently in use).
          To add more barber chairs and staff accounts, upgrade your subscription plan.
        </DialogDescription>
      </DialogHeader>

      {/* Value Comparison Cards */}
      <div className="space-y-3 my-4">
        {/* Starter Solo */}
        <div className="p-3.5 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Starter Solo Plan</span>
              <Badge className="bg-slate-700 text-slate-200 text-[10px] py-0 px-1.5">
                Up to 2 Chairs
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                2 Master Stylist Stations
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                4-Digit Mirror PINs
              </span>
            </div>
          </div>
          <div className="text-right sm:shrink-0">
            <div className="text-base font-black text-white">₹499<span className="text-xs font-normal text-slate-400">/mo</span></div>
          </div>
        </div>

        {/* Pro Plan (Highlighted) */}
        <div className="p-4 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent relative overflow-hidden shadow-lg shadow-amber-500/5">
          <div className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-bl-lg">
            Recommended
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-black text-amber-300 text-sm sm:text-base">Pro Salon Plan</span>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] py-0 px-2 font-bold">
                Unlimited Chairs
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Unlimited Barber Stations
              </span>
              <span className="flex items-center gap-1.5">
                <Tv className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Lobby TV Kiosk Mode
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Real-time WhatsApp Alerts
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Multi-chair Queue Analytics
              </span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between">
            <span className="text-xs text-amber-200/80">Most popular for growing high-volume salons</span>
            <div className="text-base font-black text-white">₹999<span className="text-xs font-normal text-slate-400">/mo</span></div>
          </div>
        </div>
      </div>

      {/* Partner Referral Notice */}
      {hasPartnerDiscount && (
        <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/30 text-emerald-200 text-xs flex items-center gap-2">
          <span className="text-base">🤝</span>
          <span>
            <strong>10% Partner Discount Active:</strong> Your partner referral discount will be automatically applied at checkout!
          </span>
        </div>
      )}

      <DialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 min-h-[44px]"
        >
          Keep 1 Station
        </Button>

        <Link
          href={billingHref}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-lg shadow-amber-500/20 min-h-[44px] transition-colors active:scale-[0.98]"
        >
          Upgrade Plan Now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </DialogFooter>
    </Dialog>
  );
}
