import React from "react";
import type { Stylist } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface UnlinkedStationsBannerProps {
  unlinkedStylists: Stylist[];
  onProvisionLogin: (stylist: Stylist) => void;
}

export function UnlinkedStationsBanner({
  unlinkedStylists,
  onProvisionLogin,
}: UnlinkedStationsBannerProps) {
  if (unlinkedStylists.length === 0) return null;

  return (
    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-200">
            Legacy Stations Found ({unlinkedStylists.length})
          </p>
          <p className="text-xs text-amber-300/80 mt-0.5">
            The following stations do not yet have user credentials assigned:{" "}
            <span className="font-semibold text-white">
              {unlinkedStylists.map((s) => s.name).join(", ")}
            </span>
            . Create credentials to enable mirror tablet unlock and login.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0 md:max-w-md">
        {unlinkedStylists.map((st) => (
          <Button
            key={st.id}
            size="sm"
            variant="outline"
            className="text-xs min-h-[44px] sm:min-h-[36px] border-amber-500/50 text-amber-300 hover:bg-amber-500/20"
            onClick={() => onProvisionLogin(st)}
          >
            + Create Login for {st.name.split(" ")[0]}
          </Button>
        ))}
      </div>
    </div>
  );
}
