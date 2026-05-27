"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const t = useTranslations("playlist.search");

  return (
    <div className="relative flex items-center gap-2 bg-white px-3 sm:px-5 py-2 sm:py-3 rounded-xl shadow-md border border-border w-full sm:w-72">
      <Search
        className="w-5 h-5 text-secondary shrink-0"
        strokeWidth={2.5}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("ariaLabel")}
        className="w-full bg-transparent border-0 p-0 text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-0 outline-none text-foreground"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="text-muted-foreground hover:text-foreground focus:outline-none shrink-0"
          aria-label={t("clearAriaLabel")}
          type="button"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
