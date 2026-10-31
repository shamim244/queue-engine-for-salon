import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link" | "emerald";
  size?: "default" | "sm" | "lg" | "xl" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]";

    const variantStyles = {
      default: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm focus-visible:ring-blue-500",
      secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 focus-visible:ring-slate-500",
      outline: "border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white focus-visible:ring-slate-500",
      destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus-visible:ring-rose-500",
      ghost: "hover:bg-slate-800/60 text-slate-300 hover:text-white",
      link: "text-blue-400 underline-offset-4 hover:underline p-0",
      emerald: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm focus-visible:ring-emerald-500",
    };

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-12 rounded-xl px-6 text-base font-semibold",
      xl: "h-14 rounded-2xl px-8 text-lg font-bold shadow-lg",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
