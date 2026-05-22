"use client";

import { SignOutButton } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import Image from "next/image";

interface UserMenuProps {
  user: {
    name?: string;
    picture?: string;
    email?: string;
  };
  settings?: React.ReactNode;
}

export function UserMenu({ user, settings }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 bg-white px-2 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-md border border-border">
      {user.picture && (
        <Image
          src={user.picture}
          alt={user.name || "User"}
          width={32}
          height={32}
          className="size-8 rounded-full"
        />
      )}
      <span className="text-sm font-semibold text-foreground hidden md:inline max-w-[12rem] truncate">
        {user.name || user.email}
      </span>
      {settings}
      <SignOutButton>
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive transition-colors p-1"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </SignOutButton>
    </div>
  );
}
