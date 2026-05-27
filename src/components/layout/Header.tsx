"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/components/auth/UserMenu";

interface HeaderProps {
  user?: {
    name?: string;
    picture?: string;
    email?: string;
  } | null;
  settings?: React.ReactNode;
}

export function Header({ user, settings }: HeaderProps) {
  const t = useTranslations("home");

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-30 mb-8 sm:mb-12"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-primary whitespace-nowrap">
            FM Playlist
          </h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm md:text-base text-muted-foreground font-semibold">
            {t("tagline")}
          </p>
        </div>
        <div className="shrink-0 self-start sm:self-center">
          <UserMenu user={user} settings={settings} />
        </div>
      </div>
    </motion.header>
  );
}
