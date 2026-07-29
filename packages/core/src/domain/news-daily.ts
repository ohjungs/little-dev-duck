// 2026-07-29 : 뉴스 - 데일리 브리핑 이슈 선정 (Phase 61 T1, cherrypick.today 벤치마킹)
//
// "하루 10개의 이슈"를 고른다. **선정 파이프라인을 새로 만들지 않는다** — 군집·중복 제거·
// 다매체 신호·결정적 정렬은 topArticles 한 벌 그대로다(재구현은 인벤토리 위반).
// 이 층이 더하는 것은 셋뿐이다:
//   1. 창을 하루(24시간)로 좁힌다 — "오늘의 브리핑"이 사흘 전 기사를 실으면 이름이 거짓이다.
//   2. 피드별 상한 — 한 매체가 10칸을 다 차지하면 브리핑이 아니라 그 매체 목차다.
//   3. 카테고리 라벨 — 피드의 주제에서 온다(기사별 LLM 분류는 쓰지 않는다, 무료 원칙).
//      모르는 피드는 지어내지 않고 "종합"이다.

import { topArticles, type RankableArticle, type TopArticlesEmptyReason } from "./news-top";

export const DAILY_ISSUE_LIMIT = 10;
export const DAILY_ISSUE_WINDOW_HOURS = 24;
export const DAILY_ISSUE_PER_FEED_CAP = 3;
export const DAILY_ISSUE_FALLBACK_CATEGORY = "종합";

export interface DailyIssue<T> {
  rank: number; // 1부터
  category: string;
  article: T;
  // 이 사건을 다룬 서로 다른 피드 수(topArticles의 신호 그대로 — 화면이 "n개 매체"로 밝힌다).
  feedCount: number;
}

export interface DailyIssuesOptions {
  now: string;
  limit?: number;
  windowHours?: number;
  perFeedCap?: number;
  // feedId → 주제 라벨. 없거나 빠진 피드는 종합.
  topicByFeedId?: Record<string, string>;
}

export interface DailyIssuesResult<T> {
  items: DailyIssue<T>[];
  totalConsidered: number;
  excluded: number;
  windowHours: number;
  reason: TopArticlesEmptyReason | null;
}

export function dailyIssues<T extends RankableArticle>(
  articles: readonly T[],
  options: DailyIssuesOptions,
): DailyIssuesResult<T> {
  const limit = options.limit ?? DAILY_ISSUE_LIMIT;
  const perFeedCap = options.perFeedCap ?? DAILY_ISSUE_PER_FEED_CAP;
  const topics = options.topicByFeedId ?? {};

  // 상한 적용 전에 넉넉히 받아야 한다 — 10개만 받아 상한으로 지우면 자리가 빈 채 남는다.
  const ranked = topArticles(articles, {
    now: options.now,
    windowHours: options.windowHours ?? DAILY_ISSUE_WINDOW_HOURS,
    limit: articles.length,
  });

  const perFeed = new Map<string, number>();
  const items: DailyIssue<T>[] = [];
  for (const { article, feedCount } of ranked.items) {
    if (items.length >= limit) break;
    const used = perFeed.get(article.feedId) ?? 0;
    if (used >= perFeedCap) continue;
    perFeed.set(article.feedId, used + 1);
    items.push({
      rank: items.length + 1,
      category: topics[article.feedId] ?? DAILY_ISSUE_FALLBACK_CATEGORY,
      article,
      feedCount,
    });
  }

  return {
    items,
    totalConsidered: ranked.totalConsidered,
    excluded: ranked.excluded,
    windowHours: ranked.windowHours,
    // 창 안에 기사가 있었지만 전부 상한에 걸리는 일은 없다(상한은 피드별이라 최소 1개는 남는다).
    reason: items.length === 0 ? ranked.reason : null,
  };
}
