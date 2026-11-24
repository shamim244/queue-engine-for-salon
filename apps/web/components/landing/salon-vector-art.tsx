"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface VectorProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * 1. Precision Barber Shears & Scissors
 * Meticulously detailed haircutting shears with hollow-ground blades, pivot screw, finger tang, and bumper.
 */
export const ScissorsShearsVector: React.FC<VectorProps> = ({
  className,
  size = 48,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-amber-400/90 drop-shadow-sm", className)}
    {...props}
  >
    {/* Blade 1 */}
    <path
      d="M25 15 C30 25, 45 42, 50 50 L50 53 L38 68 C34 73, 27 75, 22 70 C17 65, 18 57, 24 53 L35 45 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.08"
    />
    {/* Blade 2 */}
    <path
      d="M75 15 C70 25, 55 42, 50 50 L50 53 L62 68 C66 73, 73 75, 78 70 C83 65, 82 57, 76 53 L65 45 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.08"
    />
    {/* Finger Rings */}
    <circle cx="22" cy="71" r="7.5" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="78" cy="71" r="7.5" stroke="currentColor" strokeWidth="2.5" />
    {/* Finger Tang / Rest on Right Ring */}
    <path
      d="M84 75 C88 78, 92 84, 91 88"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Center Pivot Tension Bolt */}
    <circle cx="50" cy="50" r="4.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
    <circle cx="50" cy="50" r="1.5" fill="currentColor" />
    {/* Blade Hollow Ground Reflection Lines */}
    <path d="M29 23 L45 44" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round" />
    <path d="M71 23 L55 44" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.6" strokeLinecap="round" />
  </svg>
);

/**
 * 2. Classic Cut-Throat Straight Razor
 * Open folding barber razor with tang jimps, pivot pin, hollow-ground blade, and wood/acrylic scale.
 */
export const StraightRazorVector: React.FC<VectorProps> = ({
  className,
  size = 48,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-amber-400/90 drop-shadow-sm", className)}
    {...props}
  >
    {/* Razor Blade (Extended open) */}
    <path
      d="M15 32 L68 18 C74 16, 78 20, 76 25 L68 46 C66 50, 60 52, 55 51 L18 42 C14 41, 12 37, 15 32 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.08"
    />
    {/* Razor Hollow Grind Line & Spine */}
    <path d="M19 35 L64 23" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
    <path d="M17 38 L62 45" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4" strokeLinecap="round" />
    {/* Shank & Tang with Grip Jimps */}
    <path d="M14 36 L6 34 C4 33, 3 36, 5 38 L9 42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="8" y1="33" x2="7" y2="36" stroke="currentColor" strokeWidth="1.2" />
    <line x1="10" y1="34" x2="9" y2="37" stroke="currentColor" strokeWidth="1.2" />
    {/* Pivot Pin Joint */}
    <circle cx="16" cy="40" r="3" fill="currentColor" stroke="currentColor" strokeWidth="1" />
    {/* Razor Scales (Folding Handle curving down) */}
    <path
      d="M16 40 C22 55, 38 78, 62 86 C74 90, 84 87, 88 80 C90 75, 87 70, 78 68 C58 64, 42 48, 16 40 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.12"
    />
    {/* Handle End Brass Pin */}
    <circle cx="82" cy="83" r="2" fill="currentColor" />
  </svg>
);

/**
 * 3. Heavy Hydraulic Barber Chair
 * Authentic barber styling chair with hydraulic pump lever, tufted leather backrest, chrome armrests, and footrest.
 */
export const BarberChairVector: React.FC<VectorProps> = ({
  className,
  size = 56,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-emerald-400/90 drop-shadow-sm", className)}
    {...props}
  >
    {/* Adjustable Headrest */}
    <rect x="42" y="10" width="16" height="7" rx="3.5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
    <line x1="47" y1="17" x2="47" y2="21" stroke="currentColor" strokeWidth="2" />
    <line x1="53" y1="17" x2="53" y2="21" stroke="currentColor" strokeWidth="2" />

    {/* Tufted Backrest */}
    <path
      d="M34 22 C34 20, 66 20, 66 22 L64 45 C64 47, 36 47, 36 45 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.1"
    />
    {/* Backrest Tufting Stitch Lines */}
    <line x1="42" y1="26" x2="42" y2="41" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
    <line x1="50" y1="25" x2="50" y2="42" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
    <line x1="58" y1="26" x2="58" y2="41" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />

    {/* Chrome Armrests */}
    <path d="M26 34 C26 31, 34 31, 35 34 L35 48 C35 50, 31 50, 28 48 Z" stroke="currentColor" strokeWidth="2" />
    <path d="M74 34 C74 31, 66 31, 65 34 L65 48 C65 50, 69 50, 72 48 Z" stroke="currentColor" strokeWidth="2" />

    {/* Padded Seat Cushion */}
    <rect x="28" y="47" width="44" height="11" rx="4" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.15" />

    {/* Seat Recline Subframe */}
    <path d="M36 58 L45 66 L55 66 L64 58" stroke="currentColor" strokeWidth="2" />

    {/* Footrest Pedals & Hanging Support */}
    <path d="M60 56 L72 68 L80 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <rect x="70" y="66" width="14" height="4" rx="2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.2" />

    {/* Center Hydraulic Column */}
    <rect x="47" y="66" width="6" height="16" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.25" />

    {/* Hydraulic Foot Pump Lever */}
    <path d="M53 74 L66 70 L68 73" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

    {/* Heavy Round Pedestal Base with Chrome Trim */}
    <ellipse cx="50" cy="85" rx="24" ry="6" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.1" />
    <ellipse cx="50" cy="85" rx="14" ry="3" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
  </svg>
);

/**
 * 4. Classic Spinning Barber Pole
 * Helical red, white, blue stripes with polished top/bottom brass caps and mounting bracket.
 */
export const BarberPoleVector: React.FC<VectorProps> = ({
  className,
  size = 52,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-amber-400 drop-shadow-sm", className)}
    {...props}
  >
    {/* Wall Mount Bracket */}
    <path d="M22 25 L34 28 L34 72 L22 75 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
    <line x1="26" y1="20" x2="26" y2="80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

    {/* Top Brass Globe Finial */}
    <circle cx="50" cy="15" r="7" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
    <path d="M40 22 C40 20, 60 20, 60 22 L58 27 L42 27 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3" />

    {/* Main Cylinder Glass Tube */}
    <rect x="40" y="27" width="20" height="46" rx="2" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity="0.05" />

    {/* Helical Spiral Stripes */}
    <path d="M40 33 L60 41" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
    <path d="M40 43 L60 51" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M40 53 L60 61" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
    <path d="M40 63 L60 71" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />

    {/* Bottom Brass Cap & Basin */}
    <path d="M42 73 L58 73 L60 78 C60 80, 40 80, 40 78 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3" />
    <circle cx="50" cy="83" r="3" fill="currentColor" />
  </svg>
);

/**
 * 5. Professional Hair Clippers
 * Cordless fade clippers with taper lever, fade blade, power toggle, and ergonomic grip ribs.
 */
export const HairClipperVector: React.FC<VectorProps> = ({
  className,
  size = 48,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-teal-400 drop-shadow-sm", className)}
    {...props}
  >
    {/* Fade Blade Teeth */}
    <path d="M38 15 L62 15 L64 22 L36 22 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2" />
    <line x1="41" y1="15" x2="41" y2="19" stroke="currentColor" strokeWidth="1.5" />
    <line x1="45" y1="15" x2="45" y2="19" stroke="currentColor" strokeWidth="1.5" />
    <line x1="49" y1="15" x2="49" y2="19" stroke="currentColor" strokeWidth="1.5" />
    <line x1="53" y1="15" x2="53" y2="19" stroke="currentColor" strokeWidth="1.5" />
    <line x1="57" y1="15" x2="57" y2="19" stroke="currentColor" strokeWidth="1.5" />

    {/* Main Clipper Housing */}
    <path
      d="M36 22 C36 22, 33 45, 36 72 C37 78, 43 83, 50 83 C57 83, 63 78, 64 72 C67 45, 64 22, 64 22 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.1"
    />

    {/* Side Taper Adjustment Lever */}
    <path d="M64 30 L71 33 L69 38 L63 36" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" />

    {/* Ergonomic Ribbed Thumb Grip */}
    <line x1="43" y1="36" x2="57" y2="36" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
    <line x1="43" y1="41" x2="57" y2="41" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
    <line x1="43" y1="46" x2="57" y2="46" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />

    {/* Power Switch & LED Light */}
    <rect x="46" y="56" width="8" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.2" />
    <circle cx="50" cy="74" r="2" fill="currentColor" />
  </svg>
);

/**
 * 6. Barber Water Atomizer Spray Bottle
 * Retro whiskey/glass barber spray mister with trigger nozzle.
 */
export const SprayBottleVector: React.FC<VectorProps> = ({
  className,
  size = 48,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-amber-400 drop-shadow-sm", className)}
    {...props}
  >
    {/* Spray Trigger Nozzle Head */}
    <path d="M38 18 L55 18 L68 24 L68 28 L48 28 L48 35 L38 35 Z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.15" />
    {/* Trigger Lever */}
    <path d="M53 28 C55 35, 60 42, 62 45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    {/* Spray Nozzle Hole & Mist Drops */}
    <circle cx="70" cy="26" r="1.5" fill="currentColor" />
    <circle cx="78" cy="22" r="1" fill="currentColor" strokeOpacity="0.6" />
    <circle cx="82" cy="26" r="1" fill="currentColor" strokeOpacity="0.6" />
    <circle cx="79" cy="30" r="1" fill="currentColor" strokeOpacity="0.6" />

    {/* Bottle Neck & Screw Collar */}
    <rect x="41" y="35" width="18" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3" />

    {/* Glass Bottle Body (Square / Vintage Flask style) */}
    <path
      d="M34 44 C34 42, 66 42, 66 44 L67 82 C67 85, 64 87, 61 87 L39 87 C36 87, 33 85, 33 82 Z"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      fill="currentColor"
      fillOpacity="0.08"
    />

    {/* Internal Dip Tube */}
    <line x1="50" y1="42" x2="50" y2="83" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 3" />

    {/* Vintage Embossed Label Outline */}
    <rect x="39" y="54" width="22" height="22" rx="2" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" />
  </svg>
);

/**
 * 7. Seamless Illustrated Salon Wallpaper Vector Pattern
 * Repeats across section backgrounds with bespoke salon iconography so the background is NEVER "just a color".
 */
export const SalonBackgroundPattern: React.FC<{
  className?: string;
  opacity?: number;
}> = ({ className, opacity = 0.12 }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none select-none overflow-hidden",
        className
      )}
      style={{ opacity }}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern
            id="salon-artisan-pattern"
            width="220"
            height="220"
            patternUnits="userSpaceOnUse"
          >
            {/* 1. Barber Shears at top left */}
            <g transform="translate(20, 20) scale(0.42)">
              <path
                d="M25 15 C30 25, 45 42, 50 50 L50 53 L38 68 C34 73, 27 75, 22 70 C17 65, 18 57, 24 53 L35 45 Z"
                stroke="#d97706"
                strokeWidth="2.2"
                fill="none"
              />
              <path
                d="M75 15 C70 25, 55 42, 50 50 L50 53 L62 68 C66 73, 73 75, 78 70 C83 65, 82 57, 76 53 L65 45 Z"
                stroke="#d97706"
                strokeWidth="2.2"
                fill="none"
              />
              <circle cx="22" cy="71" r="7.5" stroke="#d97706" strokeWidth="2.2" fill="none" />
              <circle cx="78" cy="71" r="7.5" stroke="#d97706" strokeWidth="2.2" fill="none" />
              <circle cx="50" cy="50" r="3.5" fill="#d97706" />
            </g>

            {/* 2. Barber Chair at center */}
            <g transform="translate(130, 20) scale(0.38)">
              <rect x="42" y="10" width="16" height="7" rx="3.5" stroke="#10b981" strokeWidth="2.2" fill="none" />
              <path d="M34 22 C34 20, 66 20, 66 22 L64 45 C64 47, 36 47, 36 45 Z" stroke="#10b981" strokeWidth="2.2" fill="none" />
              <rect x="28" y="47" width="44" height="11" rx="4" stroke="#10b981" strokeWidth="2.2" fill="none" />
              <rect x="47" y="66" width="6" height="16" stroke="#10b981" strokeWidth="2" fill="none" />
              <ellipse cx="50" cy="85" rx="24" ry="6" stroke="#10b981" strokeWidth="2.2" fill="none" />
            </g>

            {/* 3. Straight Razor at bottom left */}
            <g transform="translate(25, 130) scale(0.42)">
              <path
                d="M15 32 L68 18 C74 16, 78 20, 76 25 L68 46 C66 50, 60 52, 55 51 L18 42 C14 41, 12 37, 15 32 Z"
                stroke="#d97706"
                strokeWidth="2.2"
                fill="none"
              />
              <path
                d="M16 40 C22 55, 38 78, 62 86 C74 90, 84 87, 88 80 C90 75, 87 70, 78 68 C58 64, 42 48, 16 40 Z"
                stroke="#d97706"
                strokeWidth="2.2"
                fill="none"
              />
              <circle cx="16" cy="40" r="3" fill="#d97706" />
            </g>

            {/* 4. Barber Pole at bottom right */}
            <g transform="translate(135, 125) scale(0.4)">
              <rect x="40" y="27" width="20" height="46" rx="2" stroke="#14b8a6" strokeWidth="2.2" fill="none" />
              <circle cx="50" cy="15" r="7" stroke="#14b8a6" strokeWidth="2" fill="none" />
              <path d="M40 35 L60 43" stroke="#dc2626" strokeWidth="2.5" />
              <path d="M40 47 L60 55" stroke="#ffffff" strokeWidth="2" />
              <path d="M40 59 L60 67" stroke="#2563eb" strokeWidth="2.5" />
              <ellipse cx="50" cy="78" rx="10" ry="3" stroke="#14b8a6" strokeWidth="2" fill="none" />
            </g>

            {/* Hair Comb Accent in between */}
            <g transform="translate(90, 88) rotate(45) scale(0.35)">
              <rect x="10" y="40" width="80" height="18" rx="3" stroke="#f59e0b" strokeWidth="2" fill="none" />
              {[...Array(12)].map((_, i) => (
                <line
                  key={i}
                  x1={18 + i * 5.5}
                  y1="40"
                  x2={18 + i * 5.5}
                  y2="54"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
              ))}
            </g>

            {/* Geometric Subtle Dot Grid Intersections */}
            <circle cx="0" cy="0" r="1.5" fill="#d97706" fillOpacity="0.4" />
            <circle cx="220" cy="0" r="1.5" fill="#d97706" fillOpacity="0.4" />
            <circle cx="0" cy="220" r="1.5" fill="#d97706" fillOpacity="0.4" />
            <circle cx="220" cy="220" r="1.5" fill="#d97706" fillOpacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#salon-artisan-pattern)" />
      </svg>
    </div>
  );
};

/**
 * 8. 2.5D Isometric Illustrated Salon Bay Artwork
 * Complete visual architectural illustration of a luxury Indian salon workstation:
 * illuminated mirror, hydraulic barber chair, granite counter, chrome tools, and digital queue tablet.
 */
export const SalonStationIsometricIllustration: React.FC<{
  className?: string;
  activeTicket?: string;
  liveBill?: string;
}> = ({
  className,
  activeTicket = "#103",
  liveBill = "₹140",
}) => {
  return (
    <div
      className={cn(
        "relative w-full max-w-2xl mx-auto p-4 sm:p-8 flex items-center justify-center select-none",
        className
      )}
    >
      <svg
        viewBox="0 0 600 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
      >
        <defs>
          {/* Ambient Lighting Gradients */}
          <radialGradient id="mirrorWarmHalo" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#d97706" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#080c0a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="walnutWood" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#291b12" />
            <stop offset="50%" stopColor="#1a110a" />
            <stop offset="100%" stopColor="#0f0a06" />
          </linearGradient>
          <linearGradient id="emeraldLeather" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#065f46" />
            <stop offset="60%" stopColor="#047857" />
            <stop offset="100%" stopColor="#064e3b" />
          </linearGradient>
          <linearGradient id="chromeMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
        </defs>

        {/* 1. Ambient Mirror Backlight Halo */}
        <circle cx="300" cy="190" r="180" fill="url(#mirrorWarmHalo)" />

        {/* 2. Salon Floor Isometric Base Tile */}
        <polygon
          points="300,340 520,400 300,460 80,400"
          fill="#0c120f"
          stroke="#1e2923"
          strokeWidth="2"
        />
        {/* Isometric Tile Floor Lines */}
        <line x1="190" y1="370" x2="410" y2="430" stroke="#13211a" strokeWidth="1.5" />
        <line x1="410" y1="370" x2="190" y2="430" stroke="#13211a" strokeWidth="1.5" />

        {/* 3. Arch Vanity Mirror (Back Wall) */}
        <path
          d="M200 90 C200 35, 400 35, 400 90 L400 320 L200 320 Z"
          fill="#080e0c"
          stroke="#d97706"
          strokeWidth="3.5"
        />
        {/* Inner Illuminated LED Strip */}
        <path
          d="M210 95 C210 45, 390 45, 390 95 L390 315 L210 315 Z"
          stroke="#fbbf24"
          strokeWidth="2"
          strokeOpacity="0.8"
          fill="#0b1612"
        />
        {/* Mirror Reflection Sheen */}
        <path
          d="M230 75 L370 215 L350 215 L220 85 Z"
          fill="#ffffff"
          fillOpacity="0.04"
        />

        {/* 4. Mounted Touchscreen Tablet on Mirror (PIN: 1234 Stylist Console) */}
        <rect
          x="330"
          y="120"
          width="54"
          height="75"
          rx="5"
          fill="#020617"
          stroke="#06b6d4"
          strokeWidth="2"
        />
        {/* Tablet Screen UI */}
        <rect x="334" y="124" width="46" height="67" rx="3" fill="#0f172a" />
        <rect x="338" y="128" width="38" height="6" rx="1.5" fill="#047857" />
        <text x="357" y="133" fontSize="4.5" fill="#a7f3d0" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          CHAIR #1
        </text>
        <text x="357" y="148" fontSize="9" fill="#ffffff" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">
          {activeTicket}
        </text>
        <text x="357" y="157" fontSize="5" fill="#94a3b8" textAnchor="middle">
          Vikram (Fade)
        </text>
        <text x="357" y="170" fontSize="8" fill="#10b981" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
          {liveBill}
        </text>
        <rect x="338" y="176" width="38" height="11" rx="2" fill="#059669" />
        <text x="357" y="184" fontSize="5" fill="#ffffff" fontWeight="bold" textAnchor="middle">
          CALL NEXT
        </text>

        {/* 5. Granite / Walnut Vanity Station Counter Shelf */}
        <polygon
          points="140,290 460,290 440,325 120,325"
          fill="url(#walnutWood)"
          stroke="#451a03"
          strokeWidth="2.5"
        />
        {/* Counter Edge Shadow & Brass Inlay */}
        <polygon points="120,325 440,325 440,335 120,335" fill="#1f140c" stroke="#d97706" strokeWidth="1" />

        {/* 6. Tools on Counter: Acrylic QR Stand, Scissors, Clippers & Spray Bottle */}
        {/* Acrylic Entrance QR Stand */}
        <polygon points="150,270 175,270 178,310 153,310" fill="#ffffff" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.5" />
        <rect x="156" y="278" width="16" height="16" fill="#ffffff" rx="1" />
        <rect x="159" y="281" width="10" height="10" fill="#0f172a" />
        <text x="164" y="303" fontSize="3.5" fill="#a7f3d0" fontWeight="bold" textAnchor="middle">
          SCAN QR
        </text>

        {/* Spray Mister Bottle on Counter */}
        <rect x="195" y="272" width="12" height="26" rx="2" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1.5" />
        <rect x="198" y="265" width="6" height="7" rx="1" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
        <path d="M204 265 L212 268" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />

        {/* Professional Shears Resting on Counter */}
        <path d="M225 305 L255 295" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="225" cy="305" r="3.5" stroke="#f8fafc" strokeWidth="1.5" />
        <circle cx="228" cy="311" r="3.5" stroke="#d97706" strokeWidth="1.5" />

        {/* Barbicide Sanitizing Glass Jar with Combs */}
        <rect x="400" y="265" width="18" height="34" rx="3" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.8" />
        <line x1="405" y1="260" x2="407" y2="280" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        <line x1="412" y1="258" x2="410" y2="285" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />

        {/* 7. Hydraulic Vintage Barber Chair (Isometric Centerpiece) */}
        {/* Pedestal Base */}
        <ellipse cx="295" cy="415" rx="42" ry="14" fill="url(#chromeMetal)" stroke="#64748b" strokeWidth="2" />
        <ellipse cx="295" cy="413" rx="28" ry="8" fill="#475569" />

        {/* Hydraulic Central Piston */}
        <rect x="289" y="365" width="12" height="42" rx="2" fill="url(#chromeMetal)" stroke="#475569" strokeWidth="1.5" />
        {/* Foot Pump Pedal */}
        <path d="M301 390 L325 385 L328 392" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />

        {/* Footrest Platform */}
        <polygon points="325,370 365,370 375,395 335,395" fill="url(#chromeMetal)" stroke="#475569" strokeWidth="1.5" />
        <line x1="335" y1="382" x2="365" y2="382" stroke="#334155" strokeWidth="1" />

        {/* Thick Padded Seat (Rich Emerald Leather) */}
        <ellipse cx="295" cy="355" rx="38" ry="16" fill="url(#emeraldLeather)" stroke="#047857" strokeWidth="2.5" />
        <path d="M257 355 C257 365, 333 365, 333 355 L333 365 C333 375, 257 375, 257 365 Z" fill="#064e3b" stroke="#047857" strokeWidth="1.5" />

        {/* Curved Chrome Armrests */}
        <path d="M254 320 C250 315, 255 350, 260 354" stroke="url(#chromeMetal)" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M336 320 C340 315, 335 350, 330 354" stroke="url(#chromeMetal)" strokeWidth="3.5" strokeLinecap="round" />

        {/* Diamond Tufted Leather Backrest */}
        <path
          d="M265 265 C265 240, 325 240, 325 265 L325 340 C325 345, 265 345, 265 340 Z"
          fill="url(#emeraldLeather)"
          stroke="#047857"
          strokeWidth="3"
        />
        {/* Tufting Buttons & Diamonds */}
        <circle cx="280" cy="275" r="2" fill="#064e3b" />
        <circle cx="310" cy="275" r="2" fill="#064e3b" />
        <circle cx="295" cy="295" r="2" fill="#064e3b" />
        <circle cx="280" cy="315" r="2" fill="#064e3b" />
        <circle cx="310" cy="315" r="2" fill="#064e3b" />
        <line x1="280" y1="275" x2="310" y2="315" stroke="#065f46" strokeWidth="1" strokeOpacity="0.6" />
        <line x1="310" y1="275" x2="280" y2="315" stroke="#065f46" strokeWidth="1" strokeOpacity="0.6" />

        {/* Adjustable Padded Headrest */}
        <rect x="282" y="222" width="26" height="14" rx="7" fill="url(#emeraldLeather)" stroke="#047857" strokeWidth="2" />
        <line x1="290" y1="236" x2="290" y2="245" stroke="url(#chromeMetal)" strokeWidth="2.5" />
        <line x1="300" y1="236" x2="300" y2="245" stroke="url(#chromeMetal)" strokeWidth="2.5" />

        {/* 8. Resting Paper Ticket #104 on Station Counter */}
        <g transform="translate(255, 305) rotate(-6)">
          <polygon
            points="0,0 48,0 48,26 0,26"
            fill="#fffbeb"
            stroke="#d97706"
            strokeWidth="1.5"
          />
          {/* Ticket Serrated Notches */}
          <circle cx="0" cy="13" r="3.5" fill="#1f140c" />
          <circle cx="48" cy="13" r="3.5" fill="#1f140c" />
          <text x="24" y="8" fontSize="4.5" fill="#b45309" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            TOKEN #104
          </text>
          <text x="24" y="16" fontSize="7" fill="#0f172a" fontWeight="black" textAnchor="middle" fontFamily="sans-serif">
            Amit Sharma
          </text>
          {/* Mini Barcode */}
          <line x1="10" y1="19" x2="10" y2="23" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="13" y1="19" x2="13" y2="23" stroke="#0f172a" strokeWidth="0.8" />
          <line x1="16" y1="19" x2="16" y2="23" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="20" y1="19" x2="20" y2="23" stroke="#0f172a" strokeWidth="1.2" />
          <line x1="24" y1="19" x2="24" y2="23" stroke="#0f172a" strokeWidth="0.8" />
          <line x1="28" y1="19" x2="28" y2="23" stroke="#0f172a" strokeWidth="1.5" />
          <line x1="32" y1="19" x2="32" y2="23" stroke="#0f172a" strokeWidth="1" />
          <line x1="36" y1="19" x2="36" y2="23" stroke="#0f172a" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
};
