"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Scissors,
  Zap,
  Brush,
  Sparkles,
  Palette,
  Droplets,
  Flame,
  Crown,
  ShowerHead,
  Clock,
  Star,
  Smile,
  Heart,
  Tag,
  type LucideIcon,
} from "lucide-react";

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  scissors: Scissors,
  zap: Zap,
  brush: Brush,
  sparkles: Sparkles,
  palette: Palette,
  droplets: Droplets,
  flame: Flame,
  crown: Crown,
  "shower-head": ShowerHead,
  shower: ShowerHead,
  clock: Clock,
  star: Star,
  smile: Smile,
  heart: Heart,
  tag: Tag,
};

export interface ServiceIconProps {
  icon?: string | null;
  className?: string;
  size?: number;
  alt?: string;
  fallback?: string;
}

export function ServiceIcon({
  icon,
  className,
  size = 20,
  alt = "Service Icon",
  fallback = "✂️",
}: ServiceIconProps) {
  const [imgError, setImgError] = useState(false);

  const cleanIcon = (icon || "").trim();

  // 1. If empty or image failed to load, render fallback
  if (!cleanIcon || imgError) {
    return (
      <span
        className={cn("inline-flex items-center justify-center select-none text-base", className)}
        role="img"
        aria-label={alt}
      >
        {fallback}
      </span>
    );
  }

  // 2. Check if it's an external URL (SVGRepo / CDN / hosted image)
  const isUrl =
    cleanIcon.startsWith("http://") ||
    cleanIcon.startsWith("https://") ||
    cleanIcon.startsWith("//") ||
    cleanIcon.startsWith("/");

  if (isUrl) {
    return (
      <img
        src={cleanIcon}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setImgError(true)}
        className={cn("object-contain shrink-0 inline-block", className)}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }

  // 3. Check if it's a Lucide icon key (e.g. "lucide:scissors" or "scissors")
  const lucideKey = cleanIcon.startsWith("lucide:")
    ? cleanIcon.slice(7).toLowerCase()
    : cleanIcon.toLowerCase();

  const MatchedLucide = LUCIDE_ICON_MAP[lucideKey];
  if (MatchedLucide) {
    return <MatchedLucide className={cn("shrink-0", className)} size={size} />;
  }

  // 4. Default: Render as Emoji or Unicode character
  return (
    <span
      className={cn("inline-flex items-center justify-center select-none text-base leading-none", className)}
      role="img"
      aria-label={alt}
    >
      {cleanIcon}
    </span>
  );
}
