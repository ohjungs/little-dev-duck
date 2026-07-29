"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  ExternalLink,
  Layers,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Share2,
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
import {
  clusterArticles,
  feedTopics,
  RECOMMENDED_FEEDS,
  resolveFeedUrl,
  unregisteredFeeds,
  rotateRecommended,
  dayOfYearOf,
  type Article,
  type Feed,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/today";
import { recordCollectDone, shouldAutoCollect } from "@/lib/newsAutoCollect";
import { safeHref } from "@/lib/safeHref";
import { textToBlocks } from "@/lib/pageTemplates";
import { timeAgo } from "@/lib/timeAgo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DailyBriefing } from "@/components/DailyBriefing";
import {
  getReadArticles,
  markArticleRead,
  markArticlesRead,
  subscribeReadArticles,
  toggleArticleRead,
} from "@/lib/readArticles";
import {
  getBookmarkedIds,
  toggleBookmark,
  subscribeBookmarks,
} from "@/lib/bookmarkedArticles";

// 외부 링크 스킴 화이트리스트는 공용 safeHref 한 벌(lib/safeHref — 2026-07-29 리뷰에서 승격).

// 기사를 노트(페이지) 본문으로 — 요약(없으면 스니펫) 문단 + 원문 링크 문단.
// 블록 리터럴을 여기서 다시 만들지 않는다(리뷰 REF-LOW 해소) — 템플릿·메시지 변환과
// 같은 textToBlocks 한 벌. 서버가 content에서 plain_text를 파생한다.
function scrapContent(a: Article): unknown[] {
  const body = a.summary ?? a.snippet;
  return textToBlocks(`${body ? `${body}\n` : ""}원문: ${a.link}`);
}

// 기사 1건 카드. 목록/군집 양쪽에서 재사용(마크업 중복 제거). onScrap이 있으면 스크랩 버튼 노출.
//
// 2026-07-26 : 뉴스 - 카드 - 클릭읽음
// 피드백 4-2 "카드를 누르면 읽음 처리". 카드 전체가 버튼이라 안쪽 아이콘 버튼·링크의 클릭이
// 위로 새면 원문을 열면서 읽음이 두 번 뒤집힌다 → 안쪽 컨트롤은 stopPropagation으로 막는다.
// 카드 자체는 <button>이 아니라 div + role="button"이다: 안에 <a>(원문 보기)가 있어
// <button> 안에 상호작용 요소를 넣는 잘못된 중첩이 되기 때문이다. 키보드 접근은 직접 챙긴다.
function ArticleCard({
  a,
  read,
  bookmarked,
  copied,
  onScrap,
  onRead,
  onToggleRead,
  onBookmark,
  onShare,
}: {
  a: Article;
  read?: boolean;
  bookmarked?: boolean;
  copied?: boolean;
  onScrap?: (a: Article) => void;
  onRead?: (a: Article) => void;
  onToggleRead?: (a: Article) => void;
  onBookmark?: (a: Article) => void;
  onShare?: (a: Article) => void;
}) {
  // 안쪽 컨트롤 공통 래퍼 — 카드의 읽음 토글로 클릭이 새지 않게 한다.
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div
      role={onToggleRead ? "button" : undefined}
      tabIndex={onToggleRead ? 0 : undefined}
      aria-pressed={onToggleRead ? !!read : undefined}
      aria-label={onToggleRead ? `${a.title} — ${read ? "읽음 해제" : "읽음 표시"}` : undefined}
      onClick={onToggleRead ? () => onToggleRead(a) : undefined}
      onKeyDown={
        onToggleRead
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggleRead(a);
              }
            }
          : undefined
      }
      className={cn(
        "rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40",
        onToggleRead &&
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        read && "opacity-55",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{a.title}</h3>
          {bookmarked && (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary-accent">
              저장됨
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onBookmark && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onBookmark(a);
              }}
              aria-label={bookmarked ? "북마크 해제" : "나중에 읽기"}
              title={bookmarked ? "북마크 해제" : "나중에 읽기"}
              className={cn(
                "transition-colors",
                bookmarked
                  ? "text-primary-accent hover:text-muted-foreground"
                  : "text-muted-foreground hover:text-primary-accent",
              )}
            >
              {bookmarked ? (
                <BookmarkCheck className="size-4" />
              ) : (
                <Bookmark className="size-4" />
              )}
            </button>
          )}
          {onScrap && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onScrap(a);
              }}
              aria-label="노트로 스크랩"
              title="노트로 스크랩"
              className="text-muted-foreground transition-colors hover:text-primary-accent"
            >
              <BookmarkPlus className="size-4" />
            </button>
          )}
          {onShare && (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onShare(a);
              }}
              aria-label="링크 복사"
              title="링크 복사"
              className={cn(
                "transition-colors",
                copied
                  ? "text-primary-accent"
                  : "text-muted-foreground hover:text-primary-accent",
              )}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Share2 className="size-3.5" />
              )}
            </button>
          )}
          <a
            href={safeHref(a.link)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="원문 보기"
            title="원문 보기"
            onClick={(e) => {
              // 원문을 여는 건 "읽었다"이지 토글이 아니다 — 카드 토글로 새면 오히려 안 읽음이 된다.
              stop(e);
              onRead?.(a);
            }}
            className="text-muted-foreground hover:text-primary-accent"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
      {a.summary ? (
        <p className="mt-2 whitespace-pre-line text-base leading-relaxed text-foreground/80">
          {a.summary}
        </p>
      ) : a.snippet ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground/80">
          {a.snippet}
        </p>
      ) : null}
      {a.publishedAt && (
        <p className="mt-2 text-xs text-muted-foreground/60">
          {timeAgo(a.publishedAt)}
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
  // 추천 피드 추가 중인 URL(중복 클릭 방지 + 버튼 라벨).
  const [addingUrl, setAddingUrl] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [grouped, setGrouped] = useState(false);
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [pendingDeleteFeed, setPendingDeleteFeed] = useState<Feed | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // 추천 주제가 7개라 기본은 2개만 펼친다(칩이 화면을 밀어내지 않게).
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // 읽음 상태(localStorage) 동기화 — 링크 클릭/스크랩 시 즉시 반영.
  useEffect(() => {
    const sync = () => setReadIds(getReadArticles());
    sync();
    return subscribeReadArticles(sync);
  }, []);
  const readSet = useMemo(() => new Set(readIds), [readIds]);
  // 이미 등록한 피드는 추천에서 뺀다(core 순수함수 — 끝 슬래시·대소문자 차이 흡수).
  //
  // 2026-07-27 (2차 피드백 4-3, Phase 47 T2-1): 남은 것을 **전부** 보여주면 며칠 만에 목록이
  // 마르고, 사용자에겐 "추천이 갱신되지 않는다"로 보인다. 날짜 시드로 **N개씩 회전**시킨다 —
  // 무작위가 아니라 결정적이라 **하루 안에서는 새로고침해도 같은 목록**이다(방금 본 걸 다시 찾을 수 있다).
  const suggestions = useMemo(() => {
    const remaining = unregisteredFeeds(
      RECOMMENDED_FEEDS,
      feeds.map((f) => f.url),
    );
    return rotateRecommended(remaining, dayOfYearOf(todayIso()), 6);
  }, [feeds]);

  // 북마크 상태(localStorage) 동기화.
  useEffect(() => {
    const sync = () => setBookmarkedIds(getBookmarkedIds());
    sync();
    return subscribeBookmarks(sync);
  }, []);
  const bookmarkSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  // 피드별 기사 수 / 안 읽음 수 — Map 순회로 결정적 계산(LLM 아님).
  const articlesByFeed = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) {
      map.set(a.feedId, (map.get(a.feedId) ?? 0) + 1);
    }
    return map;
  }, [articles]);

  const unreadByFeed = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) {
      if (!readSet.has(a.id)) {
        map.set(a.feedId, (map.get(a.feedId) ?? 0) + 1);
      }
    }
    return map;
  }, [articles, readSet]);

  function handleShare(article: Article) {
    void navigator.clipboard.writeText(article.link);
    setCopiedId(article.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  // 검색어 부분일치 + (안 읽음만 토글 시) 읽은 기사 제외 + (저장됨만 토글 시) 북마크 기사만. 군집·목록 모두 이 결과 기준.
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((a) => {
      if (unreadOnly && readSet.has(a.id)) return false;
      if (bookmarkedOnly && !bookmarkSet.has(a.id)) return false;
      if (!needle) return true;
      return `${a.title} ${a.summary ?? ""} ${a.snippet ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
  }, [articles, query, unreadOnly, bookmarkedOnly, readSet, bookmarkSet]);

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
      // addFeed가 사이트 규칙으로 주소를 바꿔 저장했으면 그 사실을 알린다. 말없이 다른 주소로
      // 저장하면 사용자는 자기가 넣은 주소가 등록된 줄 안다(velog가 정확히 그 경우다).
      // 판정은 addFeed와 **같은 순수 함수**를 쓴다 — 문구를 여기서 따로 만들면 규칙이 갈라진다.
      const resolution = resolveFeedUrl(trimmed);
      setNote(resolution.kind === "rewritten" ? resolution.note : null);
      await load();
    } catch (err) {
      setNote(
        err instanceof Error ? err.message : "피드 추가에 실패했어요.",
      );
    }
  };

  // 추천 피드 추가. 기존 addFeed(SSRF 가드 포함)를 그대로 쓴다. 칩 1개도 주제 전체도 같은 경로다.
  // 중간에 하나가 실패해도 나머지는 계속 추가한다 — 한 피드가 막혔다고 전체가 무산되면
  // 사용자는 무엇이 들어갔는지 알 수 없다. 결과는 성공/실패 건수로 함께 알린다.
  const onAddRecommended = async (feedUrls: string[]) => {
    setNote(null);
    const supabase = createClient();
    const failed: string[] = [];
    for (const feedUrl of feedUrls) {
      setAddingUrl(feedUrl);
      try {
        await addFeed(supabase, { url: feedUrl });
      } catch {
        // 여기서 알리지 않고 모아 두는 건 의도다 — 주제 전체 추가에서 매번 알리면 마지막
        // 메시지만 남아 몇 개가 들어갔는지 알 수 없다. 루프가 끝난 뒤 성공/실패 건수로 한 번 알린다.
        failed.push(feedUrl);
      }
    }
    setAddingUrl(null);
    const added = feedUrls.length - failed.length;
    if (failed.length > 0) {
      setNote(`${added}개 추가 · ${failed.length}개 실패했어요.`);
    }
    await load();
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
  // 카드 본문 클릭 — 읽음/안읽음을 뒤집는다(잘못 눌러도 되돌릴 수 있게 토글, 단방향 아님).
  const onToggleRead = (a: Article) => { toggleArticleRead(a.id); };
  const onBookmark = (a: Article) => { toggleBookmark(a.id); };

  const onCollect = useCallback(async () => {
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
        // 성공했을 때만 기록 — 실패를 기록하면 6시간 동안 자동 재시도가 막힌다.
        recordCollectDone(Date.now());
        await load();
      }
    } catch {
      setNote("수집 요청에 실패했어요.");
    } finally {
      setCollecting(false);
    }
  }, [load]);

  // 2026-07-29 : 방문 시 자동 수집 (Phase 61 후속). 마지막 수집이 6시간 넘게 오래됐으면
  // 들어올 때 한 번 돈다 — "매일 10개"가 수동 버튼에만 매달리지 않게. 판정은
  // newsAutoCollect 순수 함수, 실행은 위 onCollect 그대로(재구현 금지). 피드가 없으면
  // 수집할 것도 없다. 서버 예약 실행은 CRON_SECRET(PENDING 6번) 승인 후 별도.
  const autoCollectTried = useRef(false);
  useEffect(() => {
    if (state !== "ready" || feeds.length === 0 || autoCollectTried.current) return;
    autoCollectTried.current = true;
    if (!shouldAutoCollect(Date.now())) return;
    // 렌더 커밋 직후 동기 setState(캐스케이드)를 피해 한 틱 미룬다 — 목록이 먼저 그려진다.
    const timer = setTimeout(() => void onCollect(), 0);
    return () => clearTimeout(timer);
  }, [state, feeds.length, onCollect]);

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 요약: 피드·기사 수 — state=ready 때만 표시해 레이아웃 점프 방지 */}
      {state === "ready" && (
        <p className="text-sm text-muted-foreground">
          피드 <strong className="font-semibold text-foreground">{feeds.length}개</strong> ·{" "}
          기사 <strong className="font-semibold text-foreground">{articles.length}개</strong>
          {articles.some((a) => !readSet.has(a.id)) && (
            <>
              {" "}·{" "}
              <span className="text-primary-accent font-medium">
                안 읽음{" "}
                {articles.filter((a) => !readSet.has(a.id)).length}개
              </span>
            </>
          )}
        </p>
      )}
      {/* 피드 추가 + 수집 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <form onSubmit={onAdd} className="flex gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="RSS 주소 또는 사이트 주소 (예: toss.tech, velog.io/@아이디)"
            aria-label="RSS 피드 또는 사이트 주소"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          />
          <Button type="submit" size="sm" variant="secondary">
            <Plus />
            피드 추가
          </Button>
        </form>
        {/* Phase 19 T2: 아직 등록 안 한 추천 피드만 노출. 다 등록하면 섹션 자체가 사라진다.
            2026-07-26(피드백 4-4): 주제가 7개로 늘면서 칩이 한 화면을 넘겼다 — 주제를 접었다 펼 수
            있게 하고, 주제 단위 일괄 추가를 붙였다. 하나씩 7번 누르게 하지 않는다. */}
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                추천 피드 {suggestions.length}개
              </span>
              <button
                type="button"
                onClick={() => setShowAllSuggestions((v) => !v)}
                aria-expanded={showAllSuggestions}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {showAllSuggestions ? "접기" : "모두 보기"}
              </button>
            </div>
            {(showAllSuggestions
              ? feedTopics(suggestions)
              : feedTopics(suggestions).slice(0, 2)
            ).map((topic) => {
              const inTopic = suggestions.filter((f) => f.topic === topic);
              return (
                <div key={topic} className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={addingUrl !== null}
                    onClick={() => onAddRecommended(inTopic.map((f) => f.url))}
                    title={`${topic} ${inTopic.length}개를 모두 추가`}
                    className="text-[11px] text-muted-foreground/70 underline-offset-2 transition-colors hover:text-primary-accent hover:underline disabled:opacity-50"
                  >
                    {topic} 전체 +
                  </button>
                  {inTopic.map((f) => (
                    <button
                      key={f.url}
                      type="button"
                      disabled={addingUrl !== null}
                      onClick={() => onAddRecommended([f.url])}
                      className="rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      {addingUrl === f.url ? "추가 중..." : `+ ${f.title}`}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {/* 오늘의 브리핑(Phase 61 T2) — 하루 10개 이슈 카드. 읽음은 아래 목록과 같은 한 벌. */}
        {state === "ready" && (
          <DailyBriefing articles={articles} feeds={feeds} readSet={readSet} />
        )}
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
            {bookmarkedIds.length > 0 && (
              <Button
                size="sm"
                variant={bookmarkedOnly ? "default" : "outline"}
                onClick={() => setBookmarkedOnly((v) => !v)}
                aria-pressed={bookmarkedOnly}
              >
                <BookmarkCheck className="size-3.5" />
                저장됨
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
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pl-2.5 pr-1.5 text-xs"
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  feed.status === "paused"
                    ? "bg-orange-400"
                    : feed.failCount > 0
                      ? "bg-red-400"
                      : "bg-green-400",
                )}
                title={
                  feed.status === "paused"
                    ? "일시정지"
                    : feed.failCount > 0
                      ? `수집 오류 ${feed.failCount}회`
                      : "정상"
                }
              />
              <span
                className={
                  feed.status === "paused"
                    ? "text-muted-foreground line-through"
                    : ""
                }
              >
                {feed.title ?? new URL(feed.url).hostname}
              </span>
              <span className="text-xs text-muted-foreground">
                {articlesByFeed.get(feed.id) ?? 0}
              </span>
              {(unreadByFeed.get(feed.id) ?? 0) > 0 && (
                <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary-accent">
                  {unreadByFeed.get(feed.id)}개 안읽음
                </span>
              )}
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
          {bookmarkedOnly
            ? "저장된 기사가 없어요."
            : unreadOnly
              ? "안 읽은 기사가 없어요."
              : "검색어와 일치하는 기사가 없어요."}
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
                      bookmarked={bookmarkSet.has(a.id)}
                      copied={copiedId === a.id}
                      onScrap={onScrap}
                      onRead={onRead}
                      onToggleRead={onToggleRead}
                      onBookmark={onBookmark}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <ArticleCard
                key={cluster.key}
                a={cluster.articles[0]}
                read={readSet.has(cluster.articles[0].id)}
                bookmarked={bookmarkSet.has(cluster.articles[0].id)}
                copied={copiedId === cluster.articles[0].id}
                onScrap={onScrap}
                onRead={onRead}
                onToggleRead={onToggleRead}
                onBookmark={onBookmark}
                onShare={handleShare}
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
              bookmarked={bookmarkSet.has(a.id)}
              copied={copiedId === a.id}
              onScrap={onScrap}
              onRead={onRead}
              onToggleRead={onToggleRead}
              onBookmark={onBookmark}
              onShare={handleShare}
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
