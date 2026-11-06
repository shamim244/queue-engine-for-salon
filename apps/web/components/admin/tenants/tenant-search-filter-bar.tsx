import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type PlanFilterType = "ALL" | "STARTER" | "PRO" | "ENTERPRISE";

interface TenantSearchFilterBarProps {
  globalFilter: string;
  onGlobalFilterChange: (val: string) => void;
  planFilter: PlanFilterType;
  onPlanFilterChange: (val: PlanFilterType) => void;
}

export function TenantSearchFilterBar({
  globalFilter,
  onGlobalFilterChange,
  planFilter,
  onPlanFilterChange,
}: TenantSearchFilterBarProps) {
  return (
    <Card className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by name, slug, phone..."
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="pl-10 h-10 min-h-[44px]"
        />
      </div>

      <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap">
        <span className="text-xs text-slate-400 font-medium">SaaS Plan:</span>
        {(["ALL", "STARTER", "PRO", "ENTERPRISE"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => onPlanFilterChange(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] sm:min-h-[36px] ${
              planFilter === filter
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {filter === "ALL"
              ? "All Plans"
              : filter === "STARTER"
              ? "Starter Plan"
              : filter === "PRO"
              ? "Pro Plan"
              : "Enterprise"}
          </button>
        ))}
      </div>
    </Card>
  );
}
