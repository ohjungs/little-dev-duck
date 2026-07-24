"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookmarkPlus,
  ExternalLink,
  Layers,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import {
  addFeed,
  createPage,
  deleteFeed,
  listArticles,
  listFeeds,
  setFeedStatus,
} from "@ldd/api";
import { clusterArticles, type Article, type Feed } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  getReadArticles,
  markArticleRead,
  markArticlesRead,
  subscribeReadArticles,
} from "@/lib/readArticles";

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

// RSS 피드가 준 외부 링크는 http(s)만 허용(zod .url()이 javascript: 스킴을 통과시키므로 렌더 시 화이트리스트 — 보안 리뷰).
function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "#";
}

// 기사를 노트(페이지) 본문으로. BlockNote는 최소 PartialBlock을 받아 id/props를 채운다.
// 요약(없으면 스니펫) 문단 + 원문 링크 문단. 서버가 content에서 plain_text를 파생한다.
function scrapContent(a: Article): unknown[] {
  const para = (text: string) => ({
    type: "paragraph",
    content: [{ type: "text", text, styles: {} }],
  });
  const blocks: unknown[] = [];
  const body = a.summary ?? a.snippet;
  if (body) blocks.push(para(body));
  blocks.push(para(`원문: ${a.link}`));
  return blocks;
}

// 기사 1건 카드. 목록/군집 양쪽에서 재사용(마크업 중복 제거). onScrap이 있으면 스크랩 버튼 노출.
function ArticleCard({
  a,
  read,
  onScrap,
  onRead,
}: {
  a: Article;
  read?: boolean;
  onScrap?: (a: Article) => void;
  onRead?: (a: Article) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40",
        read && "opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug">{a.title}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {onScrap && (
            <button
              type="button"
              onClick={() => onScrap(a)}
              aria-label="노트로 스크랩"
              title="노트로 스크랩"
              className="text-muted-foreground transition-colors hover:text-primary-accent"
            >
              <BookmarkPlus className="size-4" />
            </button>
          )}
          <a
            href={safeHref(a.link)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="원문 보기"
            onClick={() => onRead?.(a)}
            className="text-muted-foreground hover:text-primary-accent"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
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
    </div>
  );
}

// Phase 15: 뉴스 리더 — 피드 관리(추가/일시정지/삭제) + 수동 수집 + 기사 목록(3줄 요약).
export function NewsReader() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [url, setUrl] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [grouped, setGrouped] = useState(false);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [pendingDeleteFeed, setPendingDeleteFeed] = useState<Feed | null>(null);

  // 읽음 상태(localStorage) 동기화 — 링크 클릭/스크랩 시 즉시 반영.
  useEffect(() => {
    const sync = () => setReadIds(getReadArticles());
    sync();
    return subscribeReadArticles(sync);
  }, []);
  const readSet = useMemo(() => new Set(readIds), [readIds]);

  // 검색어 부분일치 + (안 읽음만 토글 시) 읽은 기사 제외. 군집·목록 모두 이 결과 기준.
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (unreadOnly && readSet.has(a.id)) return false;
      if (!needle) return true;
      return `${a.title} ${a.summary ?? ""} ${a.snippet ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [articles, query, unreadOnly, readSet]);

  // Phase 15 T3: 제목/스니펫 유사도로 관련 기사 군집화(무의존성 순수함수). 다중 멤버 군집만 시각적으로 묶는다.
  const clusters = useMemo(() => clusterArticles(shown), [shown]);
  const hasRelated = clusters.some((c) => c.articles.length > 1);

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
    // load는 async(await 후 setState)라 동기 캐스케이딩 렌더가 아니다 — 규칙 오탐이라 disable.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
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

  const onDelete = (feed: Feed) => {
    setPendingDeleteFeed(feed);
  };

  const confirmDeleteFeed = async () => {
    if (!pendingDeleteFeed) return;
    const feed = pendingDeleteFeed;
    setPendingDeleteFeed(null);
    await deleteFeed(createClient(), feed.id);
    await load();
  };

  const onScrap = async (a: Article) => {
    setNote(null);
    markArticleRead(a.id);
    try {
      await createPage(createClient(), {
        title: a.title,
        content: scrapContent(a),
        icon: "📰",
      });
      setNote(`"${a.title}"을(를) 노트로 저장했어요. 워크스페이스에서 확인하세요.`);
    } catch {
      setNote("노트 저장에 실패했어요.");
    }
  };
  const onRead = (a: Article) => markArticleRead(a.id);

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
            {feeds.length}개 피드 ·{" "}
            {query.trim()
              ? `${shown.length}/${articles.length}`
              : articles.length}
            개 기사
          </span>
          <div className="flex items-center gap-2">
            {articles.some((a) => !readSet.has(a.id)) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => markArticlesRead(articles.map((a) => a.id))}
              >
                모두 읽음
              </Button>
            )}
            {readIds.length > 0 && (
              <Button
                size="sm"
                variant={unreadOnly ? "default" : "outline"}
                onClick={() => setUnreadOnly((v) => !v)}
                aria-pressed={unreadOnly}
              >
                안 읽음만
              </Button>
            )}
            {hasRelated && (
              <Button
                size="sm"
                variant={grouped ? "default" : "outline"}
                onClick={() => setGrouped((g) => !g)}
                aria-pressed={grouped}
              >
                <Layers />
                관련 기사 묶기
              </Button>
            )}
            <Button size="sm" onClick={onCollect} disabled={collecting}>
              {collecting ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              지금 수집
            </Button>
          </div>
        </div>
        {note && <p className="text-xs text-primary-accent">{note}</p>}
      </div>

      {/* 기사 검색(클라이언트 필터) */}
      {articles.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="기사 검색 (제목·요약)"
            aria-label="기사 검색"
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      )}

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
      {state === "ready" && articles.length > 0 && shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {unreadOnly ? "안 읽은 기사가 없어요." : "검색어와 일치하는 기사가 없어요."}
        </p>
      )}
      {grouped ? (
        <div className="flex flex-col gap-3">
          {clusters.map((cluster) =>
            cluster.articles.length > 1 ? (
              <div
                key={cluster.key}
                className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-2"
              >
                <p className="px-2 py-1 text-xs font-medium text-primary-accent">
                  관련 기사 {cluster.articles.length}건
                </p>
                <div className="flex flex-col gap-2">
                  {cluster.articles.map((a) => (
                    <ArticleCard
                      key={a.id}
                      a={a}
                      read={readSet.has(a.id)}
                      onScrap={onScrap}
                      onRead={onRead}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <ArticleCard
                key={cluster.key}
                a={cluster.articles[0]}
                read={readSet.has(cluster.articles[0].id)}
                onScrap={onScrap}
                onRead={onRead}
              />
            ),
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((a) => (
            <ArticleCard
              key={a.id}
              a={a}
              read={readSet.has(a.id)}
              onScrap={onScrap}
              onRead={onRead}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!pendingDeleteFeed}
        title="피드 삭제"
        description={pendingDeleteFeed ? `피드 "${pendingDeleteFeed.title ?? pendingDeleteFeed.url}"와 수집된 기사를 삭제할까요?` : ""}
        confirmLabel="삭제"
        onConfirm={confirmDeleteFeed}
        onCancel={() => setPendingDeleteFeed(null)}
      />
    </div>
  );
}
