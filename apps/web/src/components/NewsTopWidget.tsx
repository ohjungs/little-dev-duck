"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Newspaper } from "lucide-react";
import { listArticles } from "@ldd/api";
import {
  topArticles,
  type Article,
  type RankedArticle,
  type TopArticlesResult,
} from "@ldd/core";
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
  const [result, setResult] = useState<TopArticlesResult<Article> | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const articles = await listArticles(createClient(), FETCH_LIMIT);
        if (!alive) return;
        // 기준 시각은 렌더 시점. 서버가 아니라 클라이언트에서 계산하므로 사용자의 실제 '지금'이다.
        setResult(topArticles(articles, { now: new Date().toISOString() }));
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const top: RankedArticle<Article>[] = result?.items ?? [];
  // 창 길이를 여기서 "3일"이라고 다시 쓰지 않는다 — core가 실제로 적용한 값에서 만든다.
  // 상수를 두 벌로 두면 창을 바꾸는 날 화면 문구만 거짓으로 남는다.
  const windowDays = result ? Math.round(result.windowHours / 24) : 0;

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
      {/* 2026-07-27 (2차 피드백 1-8): 전에는 어느 경우든 "최근 3일 안에 수집된 기사가
          없어요"였다. **기사를 방금 수집한 사용자에게 그건 거짓말이다** — 걸린 건 수집이
          아니라 발행일이었다. 이제 core가 이유를 함께 돌려주므로 사실대로 나눠 말한다.
          판정은 core에 있고 여기서는 문구만 고른다(조건을 다시 쓰면 두 벌이 된다). */}
      {state === "ready" && top.length === 0 && result?.reason === "no-articles" && (
        <p className="text-sm text-muted-foreground">
          아직 수집된 기사가 없어요.{" "}
          <Link href="/news" className="text-primary-accent hover:underline">
            뉴스에서 수집하기
          </Link>
        </p>
      )}
      {state === "ready" && top.length === 0 && result?.reason === "none-recent" && (
        <p className="text-sm text-muted-foreground">
          최근 기사가 없어요. 수집된 기사 {result.totalConsidered}건은 발행일이{" "}
          {windowDays}일보다 오래됐어요.{" "}
          <Link href="/news" className="text-primary-accent hover:underline">
            전체 보기
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
