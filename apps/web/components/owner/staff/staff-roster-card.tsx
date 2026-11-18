import React from "react";
import Link from "next/link";
import type { AuthUser, Stylist } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { maskPhone } from "@/lib/utils";
import {
  Mail,
  Phone,
  Clock,
  KeyRound,
  Edit2,
  Lock,
  Trash2,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";

interface StaffRosterCardProps {
  user: AuthUser;
  matchedStylist?: Stylist;
  isOnLeaveToday?: boolean;
  salonSlug?: string;
  onEdit: (user: AuthUser) => void;
  onPin: (user: AuthUser) => void;
  onResetPassword: (user: AuthUser) => void;
  onDelete: (user: AuthUser) => void;
  onKillSwitch: (user: AuthUser) => void;
  onManageLeave?: (user: AuthUser, matchedStylist?: Stylist) => void;
}

export function StaffRosterCard({
  user,
  matchedStylist,
  isOnLeaveToday,
  salonSlug,
  onEdit,
  onPin,
  onResetPassword,
  onDelete,
  onKillSwitch,
  onManageLeave,
}: StaffRosterCardProps) {
  const pace = matchedStylist?.avgDurationMinutes || 25;
  const hasPin = Boolean(user.pin || matchedStylist?.pin);
  const isSuspended = user.status === "SUSPENDED";

  return (
    <Card
      className={`relative flex flex-col justify-between border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all ${
        isSuspended ? "opacity-70 border-rose-900/30" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-base shadow-inner shrink-0">
              {(user.fullName || user.username).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-base text-white flex items-center gap-2">
                {user.fullName || user.username}
                {matchedStylist?.isOwner && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/30"
                  >
                    Lead / Owner
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs font-mono text-slate-400">@{user.username}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isOnLeaveToday ? (
              <Badge
                variant="outline"
                className="bg-amber-500/15 text-amber-300 border-amber-500/40 text-[11px] font-semibold"
              >
                🏖️ On Leave
              </Badge>
            ) : (
              <Badge variant={isSuspended ? "destructive" : "success"}>
                {isSuspended ? "Suspended" : "🟢 Active"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-xs text-slate-300">
        {/* Contact & Station Specs */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          {user.email && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-blue-400" />
                Email:
              </span>
              <span className="text-slate-200 truncate max-w-[170px]" title={user.email}>
                {user.email}
              </span>
            </div>
          )}

          {user.phone && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                Phone:
              </span>
              <span className="text-slate-200">{maskPhone(user.phone)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Service Pace:
            </span>
            <strong className="text-white font-mono">{pace} mins</strong>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-purple-400" />
              Mirror PIN:
            </span>
            {hasPin ? (
              <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-500/20">
                Configured (••••)
              </span>
            ) : (
              <span className="font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded text-[11px]">
                Not Set
              </span>
            )}
          </div>
        </div>

        {/* Dedicated Modify & Manage Page Primary CTA */}
        <Link
          href={`/owner/staff/${user.id}?salon=${salonSlug || "ramesh-barber"}`}
          className="w-full inline-flex items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-2 min-h-[44px] transition-all shadow-md active:scale-95"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Modify & Manage Account</span>
        </Link>

        {/* Quick Action Modal Shortcuts */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="text-xs min-h-[44px] border-slate-800 hover:border-slate-700 hover:bg-slate-800 gap-1.5"
            onClick={() => onEdit(user)}
          >
            <Edit2 className="h-4 w-4 text-slate-400 shrink-0" />
            Edit Details
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs min-h-[44px] border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/10 gap-1.5"
            onClick={() => onPin(user)}
          >
            <KeyRound className="h-4 w-4 text-amber-400 shrink-0" />
            {hasPin ? "Update PIN" : "Set PIN"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs min-h-[44px] border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/10 gap-1.5"
            onClick={() => onResetPassword(user)}
          >
            <Lock className="h-4 w-4 text-blue-400 shrink-0" />
            Reset Pwd
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs min-h-[44px] border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/10 text-rose-300 gap-1.5"
            onClick={() => onDelete(user)}
          >
            <Trash2 className="h-4 w-4 text-rose-400 shrink-0" />
            Remove
          </Button>
        </div>

        {/* Absence & Leave Recovery Button */}
        {onManageLeave && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs min-h-[44px] border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-300 font-medium gap-2"
            onClick={() => onManageLeave(user, matchedStylist)}
          >
            🏖️ Manage Leave & Absence
          </Button>
        )}
      </CardContent>

      {/* Emergency Session Revoke Kill-Switch */}
      <div className="p-4 pt-0">
        <Button
          variant="destructive"
          size="sm"
          className="w-full text-xs min-h-[44px] gap-2 bg-rose-950/40 text-rose-300 border border-rose-900/40 hover:bg-rose-600 hover:text-white transition-all font-semibold"
          onClick={() => onKillSwitch(user)}
        >
          <ShieldAlert className="h-4 w-4 shrink-0" />
          🚨 Emergency Kill-Switch
        </Button>
      </div>
    </Card>
  );
}
