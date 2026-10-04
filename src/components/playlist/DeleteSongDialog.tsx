"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Song } from "@/types/song";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteSongDialogProps {
  song: Song | null;
  onOpenChange: (open: boolean) => void;
  /** Resolves once the song is deleted; rejects with a displayable message. */
  onConfirm: (song: Song) => Promise<void>;
}

export function DeleteSongDialog({
  song,
  onOpenChange,
  onConfirm,
}: DeleteSongDialogProps) {
  const t = useTranslations("deleteSongDialog");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (pending) return;
    if (!open) setError(null);
    onOpenChange(open);
  };

  const handleConfirm = async () => {
    if (!song) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm(song);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={Boolean(song)} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-2 border-primary/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-foreground">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="font-medium">
            {song?.songTitle || song?.submitterName}
            <span className="mt-2 block">{t("description")}</span>
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
          >
            {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
            className="rounded-xl font-bold"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleConfirm}
            className="rounded-xl font-bold"
          >
            {pending ? t("deleting") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
