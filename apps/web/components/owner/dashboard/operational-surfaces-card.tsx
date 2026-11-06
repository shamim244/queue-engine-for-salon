import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Armchair, Tv, QrCode, Printer } from "lucide-react";

interface OperationalSurfacesCardProps {
  currentSlug: string;
}

export function OperationalSurfacesCard({ currentSlug }: OperationalSurfacesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Operational Surfaces</CardTitle>
        <CardDescription>Instant launch for mirror tablets and lobby TVs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <Link
          href={`/s/${currentSlug}/station`}
          target="_blank"
          className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 flex items-center justify-between text-xs text-slate-200 transition-all font-medium min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <Armchair className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <p className="text-white font-bold">Staff Chair Working Station</p>
              <p className="text-[11px] text-slate-400">4-Digit PIN mirror tablet</p>
            </div>
          </div>
          <span className="font-semibold text-slate-300">Launch →</span>
        </Link>

        <Link
          href={`/s/${currentSlug}/tv`}
          target="_blank"
          className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 flex items-center justify-between text-xs text-slate-200 transition-all font-medium min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <Tv className="h-4 w-4 text-blue-400 shrink-0" />
            <div>
              <p className="text-white font-bold">Public Lobby TV Board</p>
              <p className="text-[11px] text-slate-400">For lounge wall Smart TV</p>
            </div>
          </div>
          <span className="font-semibold text-slate-300">Launch →</span>
        </Link>

        <Link
          href={`/s/${currentSlug}`}
          target="_blank"
          className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 flex items-center justify-between text-xs text-slate-200 transition-all font-medium min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <QrCode className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-white font-bold">Customer Door QR Page</p>
              <p className="text-[11px] text-slate-400">Self check-in & Pocket Ticket</p>
            </div>
          </div>
          <span className="font-semibold text-slate-300">Launch →</span>
        </Link>

        <Link
          href={`/owner/links?salon=${currentSlug}`}
          className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 flex items-center justify-between text-xs text-slate-200 transition-all font-medium min-h-[48px]"
        >
          <div className="flex items-center gap-3">
            <Printer className="h-4 w-4 text-purple-400 shrink-0" />
            <div>
              <p className="text-white font-bold">Printable Mirror Poster</p>
              <p className="text-[11px] text-slate-400">A4 laminated door QR sheet</p>
            </div>
          </div>
          <span className="font-semibold text-slate-300">Open →</span>
        </Link>
      </CardContent>
    </Card>
  );
}
