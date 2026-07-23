"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  addFeed,
  deleteFeed,
  listArticles,
  listFeeds,
  setFeedStatus,
} from "@ldd/api";
import type { Article, Feed } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

// Phase 15: 뉴스 리더 — 피드 관리(추가/일시정지/삭제) + 수동 수집 + 기사 목록(3줄 요약).
export function NewsReader() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [url, setUrl] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    try {
      const [f, a] = await Promise.all([
        listFeeds(supabase),
        listArticles(supabase, 60),
      ]);
      setFeeds(f);
      setArticles(a);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setNote(null);
    try {
      await addFeed(createClient(), { url: trimmed });
      setUrl("");
      await load();
    } catch (err) {
      setNote(
        err instanceof Error ? err.message : "피드 추가에 실패했어요.",
      );
    }
  };

  const onToggle = async (feed: Feed) => {
    await setFeedStatus(
      createClient(),
      feed.id,
      feed.status === "active" ? "paused" : "active",
    );
    await load();
  };

  const onDelete = async (feed: Feed) => {
    if (
      !window.confirm(
        `피드 "${feed.title ?? feed.url}"와 수집된 기사를 삭제할까요?`,
      )
    )
      return;
    await deleteFeed(createClient(), feed.id);
    await load();
  };

  const onCollect = async () => {
    setCollecting(true);
    setNote(null);
    try {
      const res = await fetch("/api/news/collect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error ?? "수집에 실패했어요.");
      } else {
        const paused = Array.isArray(data.paused) ? data.paused.length : 0;
        setNote(
          `새 기사 ${data.collected}건 · 요약 ${data.summarized}건` +
            (paused ? ` · 자동 일시정지 ${paused}` : ""),
        );
        await load();
      }
    } catch {
      setNote("수집 요청에 실패했어요.");
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 피드 추가 + 수집 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <form onSubmit={onAdd} className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="RSS 피드 URL (예: https://example.com/feed.xml)"
            aria-label="RSS 피드 URL"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          />
          <Button type="submit" size="sm" variant="secondary">
            <Plus />
            피드 추가
          </Button>
        </form>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {feeds.length}개 피드 · {articles.length}개 기사
          </span>
          <Button size="sm" onClick={onCollect} disabled={collecting}>
            {collecting ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            지금 수집
          </Button>
        </div>
        {note && <p className="text-xs text-primary-accent">{note}</p>}
      </div>

      {/* 피드 목록 */}
      {feeds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {feeds.map((feed) => (
            <span
              key={feed.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-3 pr-1.5 text-xs"
            >
              <span
                className={
                  feed.status === "paused"
                    ? "text-muted-foreground line-through"
                    : ""
                }
              >
                {feed.title ?? new URL(feed.url).hostname}
              </span>
              <button
                type="button"
                onClick={() => onToggle(feed)}
                aria-label={feed.status === "active" ? "일시정지" : "재개"}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                {feed.status === "active" ? (
                  <Pause className="size-3" />
                ) : (
                  <Play className="size-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onDelete(feed)}
                aria-label="피드 삭제"
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 기사 목록 */}
      {state === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> 불러오는 중...
        </p>
      )}
      {state === "error" && (
        <p className="text-sm text-muted-foreground">불러오지 못했어요.</p>
      )}
      {state === "ready" && articles.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          아직 기사가 없어요. RSS 피드를 추가하고 &quot;지금 수집&quot;을 눌러보세요.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {articles.map((a) => (
          <li
            key={a.id}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold leading-snug">{a.title}</h3>
              <a
                href={a.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="원문 보기"
                className="shrink-0 text-muted-foreground hover:text-primary-accent"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
            {a.summary ? (
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                {a.summary}
              </p>
            ) : a.snippet ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
                {a.snippet}
              </p>
            ) : null}
            {a.publishedAt && (
              <p className="mt-2 text-xs text-muted-foreground/60">
                {timeLabel(a.publishedAt)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
