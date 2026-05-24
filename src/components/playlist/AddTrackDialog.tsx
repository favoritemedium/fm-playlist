"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SONG_DESCRIPTION_MAX_LENGTH,
  YOUTUBE_URL_MAX_LENGTH,
} from "@/lib/song-limits";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Song } from "@/types/song";

interface AddTrackDialogProps {
  onTrackAdded: (song: Song) => void;
}

export function AddTrackDialog({ onTrackAdded }: AddTrackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    youtubeUrl: "",
    description: "",
  });
  const t = useTranslations("addTrack");

  const errorId = "add-track-error";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : t("errors.failedToAdd");
        throw new Error(message);
      }

      if (!data || typeof data !== "object") {
        throw new Error(t("errors.failedToRead"));
      }

      const song = data as Song;
      onTrackAdded(song);
      setFormData({ youtubeUrl: "", description: "" });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) setError(null);
    }}>
      <DialogTrigger asChild>
        <Button className="w-full lg:w-auto bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 px-6 sm:px-8 py-5 sm:py-6 font-bold">
          <Plus className="w-5 h-5 mr-2" strokeWidth={3} />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border-2 border-primary/20 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-primary">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div>
            <label htmlFor="youtube-url" className="block mb-2 font-bold text-foreground">
              {t("youtubeUrlLabel")}
            </label>
            <Input
              id="youtube-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              value={formData.youtubeUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, youtubeUrl: e.target.value }))
              }
              placeholder={t("youtubeUrlPlaceholder")}
              required
              maxLength={YOUTUBE_URL_MAX_LENGTH}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              className="bg-input-background border-2 border-border focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="description" className="block mb-2 font-bold text-foreground">
              {t("descriptionLabel")}
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder={t("descriptionPlaceholder")}
              rows={3}
              maxLength={SONG_DESCRIPTION_MAX_LENGTH}
              className="bg-input-background resize-none border-2 border-border focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">
              {formData.description.length}/{SONG_DESCRIPTION_MAX_LENGTH}
            </p>
          </div>
          {error && (
            <p id={errorId} role="alert" className="text-sm text-destructive font-medium">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || !formData.youtubeUrl.trim()}
            aria-busy={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 shadow-lg shadow-primary/30"
          >
            {isSubmitting ? t("submittingButton") : t("submitButton")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
