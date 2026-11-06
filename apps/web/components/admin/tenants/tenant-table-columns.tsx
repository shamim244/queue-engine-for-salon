import React from "react";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import type { Salon } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  Tv,
  Armchair,
  Settings,
  ExternalLink,
} from "lucide-react";

export function getTenantTableColumns(onInspect: (salon: Salon) => void): ColumnDef<Salon>[] {
  return [
    {
      header: "Salon / Branch",
      accessorKey: "name",
      cell: ({ row }) => {
        const salon = row.original;
        return (
          <div>
            <div className="font-bold text-white text-sm">{salon.name}</div>
            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span className="font-mono text-blue-400">/s/{salon.slug}</span>
              <span>•</span>
              <span>{salon.phone}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: "SaaS Plan",
      id: "plan",
      cell: ({ row }) => {
        const salon = row.original;
        const tier = (salon as any).tier || (salon.organizationId === "org-aura" ? "PRO" : "STARTER");
        const isPro = tier === "PRO";
        const isEnt = tier === "ENTERPRISE";
        return (
          <Badge
            variant={isEnt ? "warning" : isPro ? "purple" : "default"}
            className="font-bold text-xs"
          >
            {isEnt ? "Enterprise" : isPro ? "Pro Plan" : "Starter Plan"}
          </Badge>
        );
      },
    },
    {
      header: "Stations & Capacity",
      id: "stations",
      cell: ({ row }) => {
        const salon = row.original;
        const count = salon.stylists?.length || 1;
        return (
          <Badge
            variant="outline"
            className="font-semibold text-xs border-slate-700 bg-slate-800/80 text-slate-300"
          >
            {`${count} ${count === 1 ? "Station" : "Stations"}`}
          </Badge>
        );
      },
    },
    {
      header: "Chairs & Stylists",
      id: "stylists",
      cell: ({ row }) => {
        const count = row.original.stylists?.length || 1;
        return (
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white">{count}</span>{" "}
            {count === 1 ? "Stylist" : "Stylists"}
          </div>
        );
      },
    },
    {
      header: "Status",
      id: "status",
      cell: ({ row }) => {
        const salon = row.original;
        const status = salon.status || "ACTIVE";
        return (
          <Badge
            variant={
              status === "ACTIVE"
                ? "success"
                : status === "SUSPENDED"
                ? "destructive"
                : "warning"
            }
            className="text-xs font-semibold"
          >
            {status}
          </Badge>
        );
      },
    },
    {
      header: "Live Touchpoints",
      id: "links",
      cell: ({ row }) => {
        const slug = row.original.slug;
        return (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/s/${slug}`}
              target="_blank"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
              title="Customer Door QR"
            >
              <QrCode className="h-4 w-4" />
            </Link>
            <Link
              href={`/s/${slug}/tv`}
              target="_blank"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
              title="Lobby TV Departure Board"
            >
              <Tv className="h-4 w-4" />
            </Link>
            <Link
              href={`/s/${slug}/station`}
              target="_blank"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
              title="Staff Chair Working Station"
            >
              <Armchair className="h-4 w-4" />
            </Link>
          </div>
        );
      },
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => {
        const salon = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] sm:min-h-[32px] text-xs gap-1 border-slate-700 hover:border-slate-500 hover:text-white"
              onClick={() => onInspect(salon)}
            >
              <Settings className="h-3.5 w-3.5 text-blue-400" />
              Manage
            </Button>
            <Link href={`/owner?salon=${salon.slug}`}>
              <Button
                size="sm"
                variant="secondary"
                className="min-h-[44px] sm:min-h-[32px] text-xs gap-1"
              >
                Owner Hub
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];
}
