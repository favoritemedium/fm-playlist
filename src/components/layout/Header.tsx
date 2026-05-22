"use client";

import { motion } from "motion/react";
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
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10 sm:mb-12"
    >
      <div className="flex items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-primary">
            FM Playlist
          </h1>
          <p className="mt-2 text-sm sm:text-base md:text-lg text-muted-foreground font-medium">
            Share your favorite tracks, discover what&apos;s moving the FM crew
          </p>
        </div>
        {user && (
          <div className="shrink-0">
            <UserMenu user={user} settings={settings} />
          </div>
        )}
      </div>
    </motion.header>
  );
}
