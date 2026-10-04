"use client";

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { Bot, Check, Copy, Loader2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface AgentToken {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface AgentAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error || fallback;
}

export function AgentAccessDialog({ open, onOpenChange, returnFocusRef }: AgentAccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Each opening gets fresh state, so late responses cannot reveal a previous token. */}
      {open && <AgentAccessContent onClose={() => onOpenChange(false)} returnFocusRef={returnFocusRef} />}
    </Dialog>
  );
}

function AgentAccessContent({ onClose, returnFocusRef }: {
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const t = useTranslations("agentAccessDialog");
  const locale = useLocale();
  const nameId = useId();
  const requests = useRef<AbortController | null>(null);
  const createPending = useRef(false);
  const revokePending = useRef(new Set<number>());
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<{ value: string; id: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTokens = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/agent-tokens", { signal, cache: "no-store" });
      if (!response.ok) throw new Error(await readError(response, t("errors.failedToLoad")));
      const data = (await response.json()) as { tokens: AgentToken[] };
      if (signal.aborted) return;
      setTokens(data.tokens);
    } catch (err) {
      if (!signal.aborted) {
        setLoadError(err instanceof Error ? err.message : t("errors.failedToLoad"));
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    requests.current = controller;
    void loadTokens(controller.signal);
    return () => controller.abort();
  }, [loadTokens]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const signal = requests.current?.signal;
    if (!signal || signal.aborted || createPending.current || loading || loadError || !name.trim()) return;
    createPending.current = true;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/agent-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
        signal,
      });
      if (!response.ok) throw new Error(await readError(response, t("errors.failedToCreate")));
      const data = (await response.json()) as { token: string; summary: AgentToken };
      if (signal.aborted) return;
      setNewToken({ value: data.token, id: data.summary.id });
      setCopied(false);
      setName("");
      setTokens((current) => [data.summary, ...current]);
    } catch (err) {
      if (!signal.aborted) setError(err instanceof Error ? err.message : t("errors.failedToCreate"));
    } finally {
      createPending.current = false;
      if (!signal.aborted) setCreating(false);
    }
  };

  const handleRevoke = async (token: AgentToken) => {
    const signal = requests.current?.signal;
    if (!signal || signal.aborted || loading || revokePending.current.has(token.id)) return;
    revokePending.current.add(token.id);
    setRevoking(new Set(revokePending.current));
    setError(null);
    try {
      const response = await fetch(`/api/agent-tokens/${token.id}`, { method: "DELETE", signal });
      if (!response.ok) throw new Error(await readError(response, t("errors.failedToRevoke")));
      if (signal.aborted) return;
      setTokens((current) => current.filter((item) => item.id !== token.id));
      setNewToken((current) => current?.id === token.id ? null : current);
      setCopied(false);
    } catch (err) {
      if (!signal.aborted) setError(err instanceof Error ? err.message : t("errors.failedToRevoke"));
    } finally {
      revokePending.current.delete(token.id);
      if (!signal.aborted) setRevoking(new Set(revokePending.current));
    }
  };

  const handleCopy = async () => {
    if (!newToken) return;
    const signal = requests.current?.signal;
    try {
      await navigator.clipboard.writeText(newToken.value);
      if (!signal?.aborted) setCopied(true);
    } catch {
      if (!signal?.aborted) setError(t("errors.failedToCopy"));
    }
  };

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
      <DialogContent
        className="bg-white border-2 border-primary/20 sm:max-w-lg max-h-[90dvh] overflow-y-auto p-4 sm:p-6 [&>*]:min-w-0"
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current;
          if (target?.isConnected) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6 text-xl font-black text-foreground">
            <Bot aria-hidden="true" className="size-5 shrink-0 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="font-medium">
            {t("description")}
            <span className="mt-2 block text-xs">{t("limitNote")}</span>
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

        {newToken && (
          <div className="space-y-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
            <p className="text-sm font-bold text-foreground">{t("newTokenTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("newTokenNote")}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 select-all break-all rounded-md bg-white px-2 py-1.5 text-xs font-semibold text-foreground">
                {newToken.value}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0 self-start rounded-lg font-bold sm:self-auto"
              >
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-2" aria-busy={creating}>
          <label htmlFor={nameId} className="text-sm font-bold text-foreground">
            {t("nameLabel")}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={nameId}
              value={name}
              maxLength={40}
              placeholder={t("namePlaceholder")}
              onChange={(event) => setName(event.target.value)}
              disabled={creating}
              className="min-w-0 rounded-xl"
            />
            <Button
              type="submit"
              disabled={loading || !!loadError || creating || !name.trim()}
              className="shrink-0 whitespace-normal rounded-xl font-bold"
            >
              {creating ? t("creating") : t("create")}
            </Button>
          </div>
        </form>

        <div className="space-y-2" aria-busy={loading}>
          <p className="text-sm font-bold text-foreground">{t("yourTokens")}</p>
          {loading ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
              {t("loading")}
            </p>
          ) : loadError ? (
            <div className="space-y-2">
              <p role="alert" className="text-sm font-semibold text-destructive">{loadError}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const signal = requests.current?.signal;
                if (signal && !signal.aborted) void loadTokens(signal);
              }} className="rounded-lg font-bold">{t("retry")}</Button>
            </div>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTokens")}</p>
          ) : (
            <ul className="space-y-2">
              {tokens.map((token) => (
                <li
                  key={token.id}
                  className="flex flex-col items-start gap-2 rounded-xl border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                    <p className="break-words text-sm font-bold text-foreground [overflow-wrap:anywhere]">{token.name}</p>
                    <p className="break-words text-xs text-muted-foreground">
                      <span className="font-mono">{token.prefix}…</span>
                      {" · "}
                      {token.lastUsedAt
                        ? t("lastUsed", {
                            date: new Date(token.lastUsedAt).toLocaleDateString(locale),
                          })
                        : t("neverUsed")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(token)}
                    disabled={revoking.has(token.id)}
                    aria-label={t("revokeNamed", { name: token.name })}
                    aria-busy={revoking.has(token.id)}
                    className="shrink-0 whitespace-normal rounded-lg font-bold text-destructive hover:text-destructive"
                  >
                    {revoking.has(token.id)
                      ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                      : <Trash2 aria-hidden="true" className="size-4" />}
                    {revoking.has(token.id) ? t("revoking") : t("revoke")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">{t("usageTitle")}</p>
          <pre tabIndex={0} role="region" aria-label={t("usageTitle")} className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-[11px] leading-relaxed text-neutral-100 focus-visible:outline-2 focus-visible:outline-primary">
{`curl -X POST ${origin}/api/songs \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{"youtubeUrl":"https://www.youtube.com/watch?v=...",
       "description":"why I picked it"}'`}
          </pre>
          <p className="text-xs text-muted-foreground">{t("usageNote")}</p>
          <a href="/agent-api.md" target="_blank" rel="noopener noreferrer" className="inline-block rounded-sm text-xs font-bold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-primary">
            Agent API
          </a>
        </div>

        {newToken && (
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl font-bold"
          >
            {t("dismiss")}
          </Button>
        )}
      </DialogContent>
  );
}
