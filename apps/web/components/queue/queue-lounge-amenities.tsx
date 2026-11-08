import React, { useState } from "react";
import type { Salon } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wifi, Copy, Check, Sparkles, Coffee } from "lucide-react";

interface QueueLoungeAmenitiesProps {
  salon: Salon | null;
}

export function QueueLoungeAmenities({ salon }: QueueLoungeAmenitiesProps) {
  const [copied, setCopied] = useState(false);

  if (!salon) return null;

  // Strict Wi-Fi Availability Check (Must not display if salon does not have Wi-Fi)
  const isWifiFeatureAllowed = salon.enableLoungeWifi !== false;
  const hasWifiAmenity = (salon.amenities || []).some(
    (a) => a.toLowerCase().includes("wi-fi") || a.toLowerCase().includes("wifi")
  );
  const wifiSsid = salon.wifiSsid || (hasWifiAmenity ? `${salon.name} Guest Wi-Fi` : null);
  const showWifi = isWifiFeatureAllowed && Boolean(wifiSsid);

  // Filter other non-wifi amenities
  const otherAmenities = (salon.amenities || []).filter(
    (a) => !a.toLowerCase().includes("wi-fi") && !a.toLowerCase().includes("wifi")
  );

  // If salon has neither Wi-Fi nor other amenities, hide completely
  if (!showWifi && otherAmenities.length === 0) {
    return null;
  }

  const handleCopyPassword = () => {
    const password = salon.wifiPassword || "SalonGuest";
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Card className="border border-slate-800 bg-slate-900/50 shadow-lg">
      <CardHeader className="pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Lounge Comfort &amp; Amenities</span>
          </CardTitle>
          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
            While You Wait
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-3.5 space-y-3">
        {/* Salon Wi-Fi Section (Rendered ONLY when available) */}
        {showWifi && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Wifi className="h-4 w-4" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">{wifiSsid}</span>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400 py-0">
                    Complimentary
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Password: <span className="font-mono text-slate-200 font-semibold">{salon.wifiPassword || "Free Access / Open"}</span>
                </p>
              </div>
            </div>

            {salon.wifiPassword && (
              <button
                type="button"
                onClick={handleCopyPassword}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1 shrink-0 active:scale-95 transition-all min-h-[32px]"
                title="Copy Wi-Fi Password"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-slate-400" />
                    <span className="text-[11px]">Copy Pass</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Other Amenities Pills */}
        {otherAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {otherAmenities.map((amenity, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-950/60 border border-slate-800 text-slate-300"
              >
                <Coffee className="h-3 w-3 text-amber-400/80" />
                <span>{amenity}</span>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
