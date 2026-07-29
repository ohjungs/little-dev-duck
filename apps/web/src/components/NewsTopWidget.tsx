"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";
import { listArticles, listFeeds } from "@ldd/api";
import {
  briefingRange,
  dailyIssues,
  kstDateString,
  topicForUrl,
  type Article,
  type DailyIssuesResult,
  type Feed,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";
import { getReadArticles, markArticleRead, subscribeReadArticles } from "@/lib/readArticles";

// 2026-07-29 : 대시보드 - 오늘의 브리핑 10 (사용자 지시: "top 3를 cherrypick처럼 매일
// 10개의 이슈만 보이도록"). 선정·창(오늘 KST)·카테고리는 뉴스 화면의 브리핑과 **같은
// core 한 벌**(dailyIssues·briefingRange) — 위젯과 뉴스 화면의 10개가 다르면 어느 쪽이
// 맞는지 모른다. 읽음도 read-articles 한 벌이라 진행 n/10이 뉴스 화면과 같이 움직인다.

// 순위 계산에 넣을 만큼만 가져온다. 창(오늘) 밖은 어차피 걸러진다.
const FETCH_LIMIT = 60;

// RSS가 준 외부 링크는 http(s)만 허용(NewsReader와 같은 규칙 — zod .url()이 javascript:를 통과시킨다).
function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "#";
}

export function NewsTopWidget() {
  const [result, setResult] = useState<DailyIssuesResult<Article> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const client = createClient();
        const [articles, feeds] = await Promise.all([
          listArticles(client, FETCH_LIMIT),
          listFeeds(client),
        ]);
        if (!alive) return;
        const topicByFeedId: Record<string, string> = {};
        for (const f of feeds as Feed[]) {
          const topic = topicForUrl(f.url);
          if (topic) topicByFeedId[f.id] = topic;
        }
        // 기준은 사용자의 '오늘'(KST) — 뉴스 화면 브리핑의 오늘 탭과 같은 창.
        const range = briefingRange("today", kstDateString(new Date()));
        if (range === null) throw new Error("날짜 계산 실패");
        setResult(dailyIssues(articles, { ...range, topicByFeedId }));
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 읽음 동기화 — 뉴스 화면에서 읽고 돌아와도 진행이 맞는다.
  useEffect(() => {
    const sync = () => setReadIds(getReadArticles());
    sync();
    return subscribeReadArticles(sync);
  }, []);
  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const items = result?.items ?? [];
  const done = items.filter((i) => readSet.has(i.article.id)).length;
  const windowDays = result ? Math.round(result.windowHours / 24) : 0;

  return (
    <section className="flex flex-col gap-3 p-5" aria-labelledby="news-top-heading">
      <div className="flex items-center justify-between">
        <h2
          id="news-top-heading"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Newspaper className="size-4 text-primary-accent" />
          오늘의 브리핑
        </h2>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {items.length > 0 && (
            <span role="status">
              {done === items.length ? "다 읽었어요!" : `${done}/${items.length}`}
            </span>
          )}
          <Link href="/news" className="transition-colors hover:text-foreground">
            전체 보기
          </Link>
        </span>
      </div>

      {state === "loading" && (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      )}
      {state === "error" && (
        <p className="text-sm text-muted-foreground">뉴스를 불러오지 못했어요.</p>
      )}
      {/* 판정은 core에 있고 여기서는 문구만 고른다(조건을 다시 쓰면 두 벌이 된다). */}
      {state === "ready" && items.length === 0 && result?.reason === "no-articles" && (
        <p className="text-sm text-muted-foreground">
          아직 수집된 기사가 없어요.{" "}
          <Link href="/news" className="text-primary-accent hover:underline">
            뉴스에서 수집하기
          </Link>
        </p>
      )}
      {state === "ready" && items.length === 0 && result?.reason === "none-recent" && (
        <p className="text-sm text-muted-foreground">
          오늘 발행·수집된 기사가 아직 없어요(창 {windowDays}일).{" "}
          <Link href="/news" className="text-primary-accent hover:underline">
            뉴스에서 수집하기
          </Link>
        </p>
      )}

      {items.length > 0 && (
        <ol className="flex flex-col gap-1">
          {items.map(({ rank, category, article: a, feedCount }) => {
            const read = readSet.has(a.id);
            return (
              <li key={a.id}>
                <a
                  href={safeHref(a.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markArticleRead(a.id)}
                  className={
                    "group flex gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-muted" +
                    (read ? " opacity-60" : "")
                  }
                >
                  <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold tabular-nums text-primary-accent">
                    {String(rank).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-1.5">
                      <span className="line-clamp-1 text-sm font-medium leading-snug">
                        {a.title}
                      </span>
                      <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded border border-border px-1">{category}</span>
                      {/* 단독 보도에 "1개 매체"는 정보가 없다 — 여럿일 때만 근거를 밝힌다. */}
                      {feedCount > 1 && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary-accent">
                          {feedCount}개 매체
                        </span>
                      )}
                      {a.publishedAt && <span>{timeAgo(a.publishedAt)}</span>}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
