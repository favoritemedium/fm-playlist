"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bot, Settings } from "lucide-react";
import { useTranslations } from "next-intl";


interface PlaylistSettingsProps {
  startPlayingWhenSelected: boolean;
  onStartPlayingWhenSelectedChange: () => void;
  continuePlayingPlaylist: boolean;
  onContinuePlayingPlaylistChange: () => void;
  /** Shown only for signed-in users. */
  onOpenAgentAccess?: (returnFocusTo: HTMLButtonElement | null) => void;
}

function SettingToggle({
  labelId,
  label,
  description,
  checked,
  onChange,
  comingSoon = false,
  comingSoonLabel,
}: {
  labelId: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  comingSoon?: boolean;
  comingSoonLabel: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 ${comingSoon ? "opacity-50" : ""}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span id={labelId} className="text-sm font-bold text-foreground">
            {label}
          </span>
          {comingSoon && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {comingSoonLabel}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={comingSoon}
        onClick={comingSoon ? undefined : onChange}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
          comingSoon ? "cursor-not-allowed" : ""
        } ${checked ? "bg-primary" : "bg-switch-background"}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function PlaylistSettings({
  startPlayingWhenSelected,
  onStartPlayingWhenSelectedChange,
  continuePlayingPlaylist,
  onContinuePlayingPlaylistChange,
  onOpenAgentAccess,
}: PlaylistSettingsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [open]);

  return (
    <div
      ref={containerRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("ariaLabel")}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={t("title")}
        onClick={() => setOpen((v) => !v)}
        className={`rounded-xl p-2 transition-all hover:bg-muted ${
          open ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
        }`}
      >
        <Settings className="w-4 h-4" strokeWidth={2.5} />
      </button>

      {open && (
        <div id={panelId} className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white p-4 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            {t("playback.sectionTitle")}
          </p>
          <div className="space-y-5">
            <SettingToggle
              labelId={`${panelId}-start-playing`}
              label={t("playback.autoPlay.label")}
              description={t("playback.autoPlay.description")}
              checked={startPlayingWhenSelected}
              onChange={onStartPlayingWhenSelectedChange}
              comingSoonLabel={tCommon("comingSoon")}
            />
            <SettingToggle
              labelId={`${panelId}-continue-playing`}
              label={t("playback.continuePlaying.label")}
              description={t("playback.continuePlaying.description")}
              checked={continuePlayingPlaylist}
              onChange={onContinuePlayingPlaylistChange}
              comingSoonLabel={tCommon("comingSoon")}
            />
          </div>
          {onOpenAgentAccess && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenAgentAccess(triggerRef.current);
              }}
              className="mt-5 flex w-full items-center gap-2 border-t border-border pt-4 text-left text-sm font-bold text-foreground transition-colors hover:text-primary"
            >
              <Bot className="size-4" />
              {t("agentAccess")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
