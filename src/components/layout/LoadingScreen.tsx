import { getTranslations } from "next-intl/server";
import { cn } from "@/components/ui/utils";

interface LoadingScreenProps {
  className?: string;
  overlay?: boolean;
}

export async function LoadingScreen({ className, overlay = false }: LoadingScreenProps) {
  const t = await getTranslations("loading");

  return (
    <div
      className={cn(
        "min-h-screen bg-background flex items-center justify-center px-4",
        overlay && "fixed inset-0 z-50",
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight text-primary animate-pulse">
          FM Playlist
        </h1>
        <p className="text-muted-foreground font-medium">
          {t("message")}
        </p>
      </div>
    </div>
  );
}