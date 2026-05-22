"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface UserMenuProps {
  user: {
    name?: string;
    picture?: string;
    email?: string;
  };
  settings?: React.ReactNode;
}

export function UserMenu({ user, settings }: UserMenuProps) {
  const t = useTranslations("auth");

  return (
    <div className="flex items-center gap-3.5 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-md border border-border/80">
      {/* Profile: avatar + name */}
      <div className="flex items-center gap-2.5 min-w-0">
        {user.picture && (
          <Image
            src={user.picture}
            alt={user.name || "User"}
            width={28}
            height={28}
            className="size-7 rounded-full border border-primary/20 object-cover shrink-0 shadow-inner"
          />
        )}
        <span className="text-xs font-black text-foreground truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[150px]">
          {user.name || user.email}
        </span>
      </div>

      {/* Vertical separator */}
      <div className="h-5 w-px bg-border shrink-0" />

      {/* Controls: language dropdown, settings, and logout */}
      <div className="flex items-center gap-1.5 shrink-0">
        {settings}
        <SignOutButton>
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive transition-all p-2 rounded-xl hover:bg-destructive/10"
            aria-label={t("signOut")}
          >
            <LogOut className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
