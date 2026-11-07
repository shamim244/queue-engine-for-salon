import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";

interface StationOpenChairCardProps {
  eligibleTicketsCount: number;
  processingAction: boolean;
  onCallNext: () => void;
}

export function StationOpenChairCard({
  eligibleTicketsCount,
  processingAction,
  onCallNext,
}: StationOpenChairCardProps) {
  return (
    <Card className="border-2 border-dashed border-amber-500/50 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-8 text-center space-y-6 shadow-2xl">
      <div className="space-y-2">
        <Badge variant="warning" className="px-3 py-1 text-xs">
          CHAIR IS READY
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-black text-white">
          Chair is Open & Available
        </h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {eligibleTicketsCount > 0
            ? `${eligibleTicketsCount} eligible client${eligibleTicketsCount > 1 ? "s" : ""} waiting in queue. Tap Call Next to summon.`
            : "No clients currently waiting for your chair. New walk-ins can scan the Door QR to enter queue."}
        </p>
      </div>

      <Button
        size="xl"
        onClick={onCallNext}
        disabled={processingAction || eligibleTicketsCount === 0}
        className="w-full max-w-md h-20 text-2xl font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-2xl shadow-amber-500/30 rounded-2xl gap-3 mx-auto transition-all active:scale-95"
      >
        <Volume2 className="h-8 w-8" />
        <span>📢 CALL NEXT CLIENT</span>
      </Button>
    </Card>
  );
}
