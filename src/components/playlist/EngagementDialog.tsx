"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  Edit2,
  Heart,
  MessageSquare,
  Reply,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import type {
  EngagementUser,
  Song,
  SongComment,
  SongCommentReply,
  SongEngagementSummary,
  SongLiker,
} from "@/types/song";
import { SONG_COMMENT_MAX_LENGTH } from "@/lib/song-limits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setCachedLikers } from "@/lib/likers-cache";

interface EngagementDialogProps {
  song: Song | null;
  open: boolean;
  isLikePending: boolean;
  isLoggedIn?: boolean;
  onOpenChange: (open: boolean) => void;
  onLikeToggle: (song: Song) => void;
  onSummaryChange: (summary: SongEngagementSummary) => void;
}

interface LikesResponse {
  summary: SongEngagementSummary;
  likers: SongLiker[];
}

interface CommentsResponse {
  summary: SongEngagementSummary;
  comments: SongComment[];
}

interface CommentMutationResponse extends CommentsResponse {
  commentId?: number;
}

type CommentLike = SongComment | SongCommentReply;

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
}

function formatActivityTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(user: EngagementUser): string {
  const parts = user.name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return initials || user.email[0]?.toUpperCase() || "?";
}

function Avatar({ user, size = "md" }: { user: EngagementUser; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "size-7" : "size-9";

  if (user.picture) {
    return (
      <Image
        src={user.picture}
        alt={user.name}
        width={size === "sm" ? 28 : 36}
        height={size === "sm" ? 28 : 36}
        className={`${sizeClass} rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex items-center justify-center rounded-full bg-secondary/15 text-xs font-black text-secondary`}
    >
      {getInitials(user)}
    </span>
  );
}

function CommentEntry({
  item,
  isReply,
  onDelete,
  onUpdate,
}: {
  item: CommentLike;
  isReply: boolean;
  onDelete: (commentId: number) => Promise<void>;
  onUpdate: (commentId: number, body: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(item.body);
  const [isSaving, setIsSaving] = useState(false);
  const t = useTranslations("engagement");
  const locale = useLocale();

  useEffect(() => {
    if (!isEditing) setEditBody(item.body);
  }, [isEditing, item.body]);

  const handleSave = async () => {
    const trimmed = editBody.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      await onUpdate(item.id, trimmed);
      setIsEditing(false);
    } catch {
      // Parent dialog shows the API error message.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex gap-3 ${isReply ? "pl-7 sm:pl-10" : ""}`}>
      <Avatar user={item.author} size={isReply ? "sm" : "md"} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-bold text-sm text-foreground truncate">
            {item.author.name}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            {formatActivityTime(item.createdAt, locale)}
          </p>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(event) => setEditBody(event.target.value)}
              maxLength={SONG_COMMENT_MAX_LENGTH}
              rows={3}
              className="bg-input-background resize-none border-2 border-border focus:border-primary"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground font-semibold">
                {editBody.length}/{SONG_COMMENT_MAX_LENGTH}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving || !editBody.trim()}
                  onClick={handleSave}
                  className="rounded-xl font-bold"
                >
                  {t("save")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {item.body}
          </p>
        )}

        {!isEditing && (item.canEdit || item.canDelete) && (
          <div className="flex items-center gap-1">
            {item.canEdit && (
              <button
                type="button"
                aria-label={t("editComment")}
                title={t("editComment")}
                onClick={() => void setIsEditing(true)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Edit2 className="size-4" />
              </button>
            )}
            {item.canDelete && (
              <button
                type="button"
                aria-label={t("deleteComment")}
                title={t("deleteComment")}
                onClick={() => void onDelete(item.id)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EngagementDialog({
  song,
  open,
  isLikePending,
  isLoggedIn = false,
  onOpenChange,
  onLikeToggle,
  onSummaryChange,
}: EngagementDialogProps) {
  const [likers, setLikers] = useState<SongLiker[]>([]);
  const [comments, setComments] = useState<SongComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyBodies, setReplyBodies] = useState<Record<number, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("engagement");
  const tAuth = useTranslations("auth");

  const refresh = useCallback(async () => {
    if (!song) return;

    setIsLoading(true);
    setError(null);
    try {
      const [likesResponse, commentsResponse] = await Promise.all([
        fetch(`/api/songs/${song.id}/likes`),
        fetch(`/api/songs/${song.id}/comments`),
      ]);

      const [likesData, commentsData] = await Promise.all([
        readJsonResponse<LikesResponse>(likesResponse, t("errors.failedToLoadLikes")),
        readJsonResponse<CommentsResponse>(
          commentsResponse,
          t("errors.failedToLoadComments")
        ),
      ]);

      setLikers(likesData.likers);
      setCachedLikers(song.id, likesData.likers);
      setComments(commentsData.comments);
      onSummaryChange(commentsData.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  }, [onSummaryChange, song, t]);

  useEffect(() => {
    if (open) {
      void refresh();
    } else {
      setError(null);
      setActiveReplyId(null);
    }
  }, [open, refresh]);

  const handleCommentMutation = useCallback(
    (data: CommentMutationResponse) => {
      setComments(data.comments);
      onSummaryChange(data.summary);
    },
    [onSummaryChange]
  );

  const submitComment = async (parentCommentId: number | null) => {
    if (!song) return;

    const body =
      parentCommentId === null
        ? newComment.trim()
        : (replyBodies[parentCommentId] ?? "").trim();

    if (!body) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/songs/${song.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentCommentId }),
      });

      const data = await readJsonResponse<CommentMutationResponse>(
        response,
        t("errors.failedToPostComment")
      );

      handleCommentMutation(data);
      if (parentCommentId === null) {
        setNewComment("");
      } else {
        setReplyBodies((current) => ({ ...current, [parentCommentId]: "" }));
        setActiveReplyId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateComment = async (commentId: number, body: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const data = await readJsonResponse<CommentMutationResponse>(
        response,
        t("errors.failedToUpdateComment")
      );
      handleCommentMutation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
      throw err;
    }
  };

  const deleteComment = async (commentId: number) => {
    setError(null);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      const data = await readJsonResponse<CommentMutationResponse>(
        response,
        t("errors.failedToDeleteComment")
      );
      handleCommentMutation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.somethingWentWrong"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-2 border-primary/20 sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl font-black text-primary">
            {song?.songTitle || song?.submitterName || t("track")}
          </DialogTitle>
          <DialogDescription className="font-semibold">
            {song ? t("likesComments", { likes: song.likeCount, comments: song.commentCount }) : ""}
          </DialogDescription>
        </DialogHeader>

        {song && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={isLikePending || !isLoggedIn}
                onClick={() => onLikeToggle(song)}
                title={!isLoggedIn ? t("signInToLike", { domain: ALLOWED_EMAIL_DOMAIN, defaultValue: `Sign in with a ${ALLOWED_EMAIL_DOMAIN} account to like` }) : (song.userLiked ? t("unlike") : t("like"))}
                className={
                  song.userLiked
                    ? "bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
                    : !isLoggedIn
                    ? "bg-white text-muted-foreground border-2 border-border font-bold opacity-60 cursor-not-allowed rounded-xl"
                    : "bg-white text-foreground border-2 border-border hover:border-primary font-bold rounded-xl"
                }
              >
                <Heart
                  className="size-4"
                  fill={song.userLiked ? "currentColor" : "none"}
                />
                {song.likeCount}
              </Button>
              <div className="inline-flex items-center gap-2 rounded-md border-2 border-border bg-white px-3 py-2 text-sm font-bold text-foreground">
                <MessageSquare className="size-4 text-secondary" />
                {song.commentCount}
              </div>
            </div>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-secondary" />
                <h3 className="text-sm font-black text-foreground">{t("likedBy")}</h3>
              </div>
              {isLoading ? (
                <p className="text-sm font-semibold text-muted-foreground">{t("loading")}</p>
              ) : likers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {likers.map((liker) => (
                    <div
                      key={liker.user.id}
                      className="flex items-center gap-2 rounded-full border border-border bg-background px-2 py-1"
                    >
                      <Avatar user={liker.user} size="sm" />
                      <span className="max-w-[10rem] truncate text-xs font-bold text-foreground">
                        {liker.user.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">{t("noLikesYet")}</p>
              )}
            </section>

            <section className="space-y-4">
               {!isLoggedIn ? (
                <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10 text-center space-y-3 shadow-inner">
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                    {t("signInToInteract", {
                      domain: ALLOWED_EMAIL_DOMAIN,
                      defaultValue: `Sign in with a ${ALLOWED_EMAIL_DOMAIN} account to add a track / like / comment`,
                    })}
                  </p>
                  <div className="flex justify-center">
                    <SignInButton forceRedirectUrl="/" signUpForceRedirectUrl="/">
                      <Button
                        className="bg-white hover:bg-neutral-50 text-foreground border border-border shadow-sm font-bold px-4 py-2 flex items-center gap-2 rounded-xl text-xs cursor-pointer transition-all hover:border-neutral-300 shadow-lg shadow-black/5"
                      >
                        <GoogleIcon className="w-4 h-4 shrink-0" />
                        <span>{tAuth("signIn")}</span>
                      </Button>
                    </SignInButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    placeholder={t("addComment")}
                    rows={3}
                    maxLength={SONG_COMMENT_MAX_LENGTH}
                    className="bg-input-background resize-none border-2 border-border focus:border-primary"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-semibold">
                      {newComment.length}/{SONG_COMMENT_MAX_LENGTH}
                    </span>
                    <Button
                      type="button"
                      disabled={isSubmitting || !newComment.trim()}
                      onClick={() => void submitComment(null)}
                      className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl"
                    >
                      <Send className="size-4" />
                      {t("post")}
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm font-semibold text-destructive">
                  {error}
                </p>
              )}

              <div className="space-y-5">
                {isLoading ? (
                  <p className="text-sm font-semibold text-muted-foreground">{t("loading")}</p>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      <CommentEntry
                        item={comment}
                        isReply={false}
                        onDelete={deleteComment}
                        onUpdate={updateComment}
                      />
                      <div className="pl-12">
                        {activeReplyId === comment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={replyBodies[comment.id] ?? ""}
                              onChange={(event) =>
                                setReplyBodies((current) => ({
                                  ...current,
                                  [comment.id]: event.target.value,
                                }))
                              }
                              placeholder={t("writeReply")}
                              rows={2}
                              maxLength={SONG_COMMENT_MAX_LENGTH}
                              className="bg-input-background resize-none border-2 border-border focus:border-primary"
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground font-semibold">
                                {(replyBodies[comment.id] ?? "").length}/
                                {SONG_COMMENT_MAX_LENGTH}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setActiveReplyId(null)}
                                >
                                  {t("cancel")}
                                </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      isSubmitting ||
                                      !(replyBodies[comment.id] ?? "").trim()
                                    }
                                    onClick={() => void submitComment(comment.id)}
                                    className="rounded-xl font-bold"
                                  >
                                    {t("reply")}
                                  </Button>
                              </div>
                            </div>
                          </div>
                        ) : isLoggedIn ? (
                          <button
                            type="button"
                            onClick={() => setActiveReplyId(comment.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Reply className="size-3.5" />
                            {t("reply")}
                          </button>
                        ) : null}
                      </div>
                      {comment.replies.length > 0 && (
                        <div className="space-y-3">
                          {comment.replies.map((reply) => (
                            <CommentEntry
                              key={reply.id}
                              item={reply}
                              isReply
                              onDelete={deleteComment}
                              onUpdate={updateComment}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">
                    {t("noCommentsYet")}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}