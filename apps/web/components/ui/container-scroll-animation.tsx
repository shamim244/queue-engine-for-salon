"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ContainerScrollProps {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ContainerScroll: React.FC<ContainerScrollProps> = ({
  titleComponent,
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Progress: 0 (when top enters bottom of viewport) to 1 (when bottom reaches center)
      const totalDistance = windowHeight + rect.height * 0.5;
      const currentProgress = (windowHeight - rect.top) / totalDistance;
      const progress = Math.min(1, Math.max(0, currentProgress));

      const maxRotate = isMobile ? 10 : 20;
      const rotateX = maxRotate * (1 - progress);
      const minScale = isMobile ? 0.88 : 0.95;
      const scale = minScale + (1 - minScale) * progress;
      const translateY = -60 * progress;

      if (cardRef.current) {
        cardRef.current.style.transform = `rotateX(${rotateX}deg) scale(${scale})`;
      }
      if (headerRef.current) {
        headerRef.current.style.transform = `translateY(${translateY}px)`;
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-h-[45rem] md:min-h-[58rem] flex items-center justify-center relative p-2 md:p-10 overflow-hidden",
        className
      )}
    >
      <div
        className="py-4 md:py-12 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <div
          ref={headerRef}
          className="max-w-5xl mx-auto text-center px-4 mb-8 transition-transform duration-75 ease-out will-change-transform"
        >
          {titleComponent}
        </div>

        <div
          ref={cardRef}
          style={{
            transformStyle: "preserve-3d",
            boxShadow:
              "0 20px 50px -10px rgba(16, 185, 129, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.08)",
          }}
          className="max-w-5xl -mt-6 sm:-mt-8 mx-auto w-full border border-slate-700/80 p-2 sm:p-5 bg-slate-950/90 rounded-3xl backdrop-blur-2xl transition-transform duration-75 ease-out will-change-transform"
        >
          <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-900/60">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
