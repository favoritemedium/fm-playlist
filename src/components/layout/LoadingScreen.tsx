"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/utils";

interface LoadingScreenProps {
  className?: string;
  overlay?: boolean;
}

export function LoadingScreen({ className, overlay = false }: LoadingScreenProps) {
  const t = useTranslations("loading");

  return (
    <div
      className={cn(
        "min-h-screen bg-background flex flex-col items-center justify-center px-4",
        overlay && "fixed inset-0 z-50 backdrop-blur-md bg-background/80",
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center space-y-5 max-w-sm">
        {/* Sleek rotating gradient spinner with inner glowing dot */}
        <div className="relative size-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
          <div className="absolute inset-3 rounded-full bg-secondary/80 animate-pulse shadow-lg shadow-secondary/50" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-primary">
            FM Playlist
          </h1>
          <p className="text-sm text-muted-foreground font-semibold tracking-wide animate-pulse">
            {t("message")}
          </p>
        </div>
      </div>
    </div>
  );
}