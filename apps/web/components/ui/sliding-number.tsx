"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SlidingNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  digitClassName?: string;
}

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function DigitColumn({ digit, className }: { digit: string; className?: string }) {
  const isDigit = /^[0-9]$/.test(digit);

  if (!isDigit) {
    return <span className={cn("inline-block", className)}>{digit}</span>;
  }

  const num = parseInt(digit, 10);

  return (
    <span
      className={cn(
        "inline-block relative overflow-hidden h-[1em] leading-[1em] w-[0.62em] align-top text-center",
        className
      )}
      style={{ verticalAlign: "top" }}
    >
      <span
        className="absolute left-0 top-0 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
        style={{
          transform: `translateY(-${num * 10}%)`,
        }}
      >
        {NUMBERS.map((n) => (
          <span key={n} className="h-[1em] flex items-center justify-center">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

export const SlidingNumber: React.FC<SlidingNumberProps> = ({
  value,
  prefix = "",
  suffix = "",
  className,
  digitClassName,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formattedValue = Math.round(value).toLocaleString("en-IN");
  const fullString = `${prefix}${formattedValue}${suffix}`;

  if (!mounted) {
    return <span className={className}>{fullString}</span>;
  }

  return (
    <span className={cn("inline-flex items-baseline font-mono select-none", className)}>
      {fullString.split("").map((char, index) => (
        <DigitColumn key={`${index}-${char}`} digit={char} className={digitClassName} />
      ))}
    </span>
  );
};
