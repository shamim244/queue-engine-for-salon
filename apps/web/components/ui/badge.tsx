import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "purple" | "blue" | "emerald";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    secondary: "bg-slate-800 text-slate-300 border-slate-700",
    success: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    destructive: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    outline: "text-slate-300 border-slate-700",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
