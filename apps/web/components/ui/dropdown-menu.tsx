"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | null>(null);

export function DropdownMenu({
  open: controlledOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlled, onOpenChange]
  );

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setOpen]);

  const contextValue = React.useMemo(() => ({ open: isOpen, setOpen }), [isOpen, setOpen]);

  return (
    <DropdownMenuContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, onClick, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="menu"
      aria-expanded={context.open}
      onClick={(e) => {
        onClick?.(e);
        context.setOpen(!context.open);
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export function DropdownMenuGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-1", className)} {...props} />;
}

export function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  const context = React.useContext(DropdownMenuContext);

  if (!context?.open) return null;

  const alignStyles = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  };

  return (
    <div
      role="menu"
      style={{ marginTop: `${sideOffset}px` }}
      className={cn(
        "absolute z-50 min-w-[12rem] overflow-hidden rounded-xl border border-slate-800 bg-slate-900/95 p-1 text-slate-100 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-100",
        alignStyles[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    disabled?: boolean;
    inset?: boolean;
  }
>(({ className, disabled, inset, onClick, children, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(e);
    context?.setOpen(false);
  };

  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium outline-none transition-colors hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white",
        inset && "pl-8",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    checked?: boolean;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }
>(({ className, children, checked, disabled, onCheckedChange, onClick, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(e);
    onCheckedChange?.(!checked);
    context?.setOpen(false);
  };

  return (
    <div
      ref={ref}
      role="menuitemcheckbox"
      tabIndex={disabled ? -1 : 0}
      aria-checked={checked}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2.5 text-xs sm:text-sm font-medium outline-none transition-colors hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4 text-blue-400" />}
      </span>
      {children}
    </div>
  );
});
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return (
    <div
      className={cn(
        "px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }) {
  return <div className={cn("-mx-1 my-1 h-px bg-slate-800", className)} {...props} />;
}

export function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto text-[10px] tracking-widest text-slate-500", className)}
      {...props}
    />
  );
}
