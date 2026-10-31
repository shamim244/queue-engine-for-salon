"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
  selectedLabel: string | null;
  setSelectedLabel: (label: string | null) => void;
  fallbackLabel: string | null;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

function extractLabel(node: React.ReactNode, targetValue: string | undefined): string | null {
  if (!targetValue || !node) return null;
  for (const child of React.Children.toArray(node)) {
    if (!React.isValidElement(child)) continue;
    const props: any = child.props;
    if (props && props.value === targetValue) {
      if (typeof props.children === "string") return props.children;
    }
    if (props && props.children) {
      const nested = extractLabel(props.children, targetValue);
      if (nested) return nested;
    }
  }
  return null;
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  open: controlledOpen,
  onOpenChange,
  disabled,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | undefined>(defaultValue);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const isControlledValue = value !== undefined;
  const currentValue = isControlledValue ? value : uncontrolledValue;

  const isControlledOpen = controlledOpen !== undefined;
  const isOpen = isControlledOpen ? controlledOpen : uncontrolledOpen;

  const fallbackLabel = React.useMemo(() => extractLabel(children, currentValue), [children, currentValue]);

  const setOpen = React.useCallback(
    (newOpen: boolean) => {
      if (!isControlledOpen) {
        setUncontrolledOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    },
    [isControlledOpen, onOpenChange]
  );

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlledValue) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isControlledValue, onValueChange]
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

  const contextValue = React.useMemo<SelectContextType>(
    () => ({
      value: currentValue,
      onValueChange: handleValueChange,
      open: isOpen,
      setOpen,
      disabled,
      selectedLabel,
      setSelectedLabel,
      fallbackLabel,
    }),
    [currentValue, handleValueChange, isOpen, setOpen, disabled, selectedLabel, fallbackLabel]
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={containerRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-1", className)} {...props} />;
}

export function SelectValue({
  placeholder,
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  const context = React.useContext(SelectContext);
  const displayText = context?.selectedLabel || context?.fallbackLabel || context?.value || placeholder;

  return (
    <span
      className={cn(
        "block truncate text-sm",
        !context?.selectedLabel && !context?.fallbackLabel && !context?.value && "text-slate-400",
        className
      )}
    >
      {displayText}
    </span>
  );
}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectTrigger must be used within Select");

  return (
    <button
      ref={ref}
      type="button"
      role="combobox"
      aria-expanded={context.open}
      disabled={context.disabled || props.disabled}
      onClick={() => context.setOpen(!context.open)}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
          context.open && "rotate-180"
        )}
      />
    </button>
  );
});
SelectTrigger.displayName = "SelectTrigger";

export function SelectContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(SelectContext);

  if (!context?.open) return null;

  return (
    <div
      role="listbox"
      className={cn(
        "absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-slate-800 bg-slate-900/95 p-1 text-slate-100 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-100",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SelectLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400", className)}
      {...props}
    />
  );
}

export const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; disabled?: boolean }
>(({ className, children, value, disabled, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");

  const { value: selectedValue, onValueChange, setOpen, setSelectedLabel } = context;
  const isSelected = selectedValue === value;

  React.useEffect(() => {
    if (isSelected && typeof children === "string") {
      setSelectedLabel(children);
    }
  }, [isSelected, children, setSelectedLabel]);

  const handleSelect = () => {
    if (disabled) return;
    onValueChange?.(value);
    if (typeof children === "string") {
      setSelectedLabel(children);
    }
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      role="option"
      tabIndex={disabled ? -1 : 0}
      aria-selected={isSelected}
      onClick={handleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSelect();
        }
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none transition-colors hover:bg-slate-800 hover:text-white focus:bg-slate-800 focus:text-white",
        disabled && "pointer-events-none opacity-50",
        isSelected && "bg-blue-600/20 text-blue-300 font-medium",
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex h-4 w-4 items-center justify-center">
          <Check className="h-4 w-4 text-blue-400" />
        </span>
      )}
    </div>
  );
});
SelectItem.displayName = "SelectItem";

export function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("-mx-1 my-1 h-px bg-slate-800", className)} {...props} />;
}
