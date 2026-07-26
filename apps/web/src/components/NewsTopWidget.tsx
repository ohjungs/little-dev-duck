"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";
import { listArticles } from "@ldd/api";
import { topArticles, type Article, type RankedArticle } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";
import { markArticleRead } from "@/lib/readArticles";

// 2026-07-26 : 대시보드 - 뉴스TOP3 - 인기기준
// 사용자 피드백 4-5. 순위 기준은 core `topArticles` 한 곳에 있고 여기서는 그리기만 한다.
// **조회수는 우리에게 없는 데이터라 쓰지 않는다** — 대신 "몇 개 매체가 다뤘는가"를 그대로
// 화면에 밝힌다. 숨기고 '인기'라고만 쓰면 근거 없는 순위처럼 보인다.

// 순위 계산에 넣을 만큼만 가져온다. 창(72시간) 밖은 어차피 걸러지므로 과하게 받을 이유가 없다.
const FETCH_LIMIT = 60;

// RSS가 준 외부 링크는 http(s)만 허용(NewsReader와 같은 규칙 — zod .url()이 javascript:를 통과시킨다).
function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "#";
}

export function NewsTopWidget() {
  const [top, setTop] = useState<RankedArticle<Article>[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const articles = await listArticles(createClient(), FETCH_LIMIT);
        if (!alive) return;
        // 기준 시각은 렌더 시점. 서버가 아니라 클라이언트에서 계산하므로 사용자의 실제 '지금'이다.
        setTop(topArticles(articles, { now: new Date().toISOString() }));
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="flex flex-col gap-3 p-5" aria-labelledby="news-top-heading">
      <div className="flex items-center justify-between">
        <h2
          id="news-top-heading"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <Newspaper className="size-4 text-primary-accent" />
          오늘의 뉴스 TOP 3
        </h2>
        <Link
          href="/news"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          전체 보기
        </Link>
      </div>

      {state === "loading" && (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      )}
      {state === "error" && (
        <p className="text-sm text-muted-foreground">뉴스를 불러오지 못했어요.</p>
      )}
      {state === "ready" && top.length === 0 && (
        <p className="text-sm text-muted-foreground">
          최근 3일 안에 수집된 기사가 없어요.{" "}
          <Link href="/news" className="text-primary-accent hover:underline">
            뉴스에서 수집하기
          </Link>
        </p>
      )}

      {top.length > 0 && (
        <ol className="flex flex-col gap-2">
          {top.map((ranked, index) => (
            <li key={ranked.article.id}>
              <a
                href={safeHref(ranked.article.link)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markArticleRead(ranked.article.id)}
                className="group flex gap-2.5 rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <span className="mt-0.5 shrink-0 text-sm font-semibold tabular-nums text-primary-accent">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-1.5">
                    <span className="line-clamp-2 text-sm font-medium leading-snug">
                      {ranked.article.title}
                    </span>
                    <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {/* 단독 보도에 "1개 매체"라고 붙이면 정보가 없다 — 여럿일 때만 근거를 밝힌다. */}
                    {ranked.feedCount > 1 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary-accent">
                        {ranked.feedCount}개 매체
                      </span>
                    )}
                    {ranked.article.publishedAt && (
                      <span>{timeAgo(ranked.article.publishedAt)}</span>
                    )}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
