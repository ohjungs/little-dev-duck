// 2026-07-26 : 뉴스 - 대시보드TOP - 인기신호
// 사용자 피드백 4-5: "가장 인기많고 조회수 많은 최근거를 대쉬보드에 TOP3까지".
//
// **조회수는 우리에게 없는 데이터다.** RSS는 조회수를 싣지 않고, 우리 DB에도 없다.
// 없는 수치를 지어내면 순위가 거짓이 된다. 대신 우리가 **실제로 가진** 신호를 쓴다:
//   "서로 다른 몇 개 매체가 같은 사건을 다뤘는가"
// 여러 매체가 동시에 쓴 사건이 곧 그날 크게 다뤄진 사건이다. 조회수의 대용이 아니라
// 그 자체로 타당한 신호이고, 무엇보다 **측정 가능하다**. UI도 "n개 매체" 로 그대로 밝힌다.
//
// 군집화는 이미 있는 clusterArticles(제목·스니펫 토큰 Jaccard)를 그대로 쓴다 — 재구현하지 않는다.

import { clusterArticles, type ClusterableArticle } from "./news-cluster";

export interface RankableArticle extends ClusterableArticle {
  feedId: string;
  publishedAt?: string | null;
  // 발행일이 없는 피드가 실제로 있다(RSS에 pubDate 없음). 그때 수집 시각으로 대신한다.
  createdAt?: string | null;
}

export interface RankedArticle<T> {
  article: T;
  // 이 사건을 다룬 서로 다른 피드 수. 1이면 단독 보도다.
  feedCount: number;
}

// 2026-07-27 : 뉴스 - TOP3 - 왜 비었는지 (Phase 42 T2, 2차 피드백 1-8)
// 사용자가 뉴스 화면에서 기사를 보고 왔는데 대시보드는 "최근 3일 안에 수집된 기사가 없어요"라고
// 했다. **그 문구가 사실이 아니었다** — 기사는 방금 수집됐고, 걸린 건 **발행일**이다.
// RSS가 2주 전에 발행한 글을 오늘 수집하면 창 밖이라 여기서 빠지는데, 화면은 "수집이 안 됐다"고
// 말한다. 사용자가 그걸 오류로 인식한 것은 **맞는 인식**이었다.
//
// 창을 넓히지 않는다 — "오늘의 뉴스"가 2주 전 기사를 보여주면 위젯 이름이 거짓이 된다.
// 대신 **왜 비었는지를 값으로 돌려준다.** 위젯에서 조건을 다시 쓰면 두 벌이 되고 한쪽만 고쳐진다.
export type TopArticlesEmptyReason =
  // 애초에 기사가 하나도 없다(수집 전).
  | "no-articles"
  // 기사는 있는데 전부 창 밖이다(오래된 발행일 / 오래 전에 수집됨).
  | "none-recent";

export interface TopArticlesResult<T> {
  items: RankedArticle<T>[];
  // 판정에 넣은 기사 수. 화면이 "N건은 오래됐어요"라고 숫자로 말할 수 있게 한다.
  totalConsidered: number;
  // 창 밖이거나 시각을 알 수 없어 빠진 수.
  excluded: number;
  // 실제로 적용된 창 길이. 화면 문구가 이 값과 어긋나지 않게 함께 돌려준다.
  windowHours: number;
  // items가 비었을 때만 채운다. 비어 있지 않으면 null이다.
  reason: TopArticlesEmptyReason | null;
}

export interface TopArticlesOptions {
  // 기준 시각(ISO). 호출부가 주입해 테스트가 실행 시각과 무관하게 성립하게 한다.
  now: string;
  limit?: number;
  // "최근"으로 볼 기간(시간). 기본 72시간.
  windowHours?: number;
}

const DEFAULT_LIMIT = 3;
const DEFAULT_WINDOW_HOURS = 72;

// 기사의 시각을 epoch ms로. 발행일 우선, 없으면 수집일. 둘 다 없거나 해석 불가면 null.
// (Date를 만들되 **날짜 문자열로 되돌리지 않는다** — 이 저장소가 여러 번 밟은 시간대 함정을 피한다.)
function timeOf(a: RankableArticle): number | null {
  for (const raw of [a.publishedAt, a.createdAt]) {
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

// 최근 기사 중 여러 매체가 다룬 것부터 상위 N건. 순수 함수 — 입력을 바꾸지 않는다.
export function topArticles<T extends RankableArticle>(
  articles: readonly T[],
  options: TopArticlesOptions,
): TopArticlesResult<T> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;
  const windowMs = windowHours * 60 * 60 * 1000;
  const totalConsidered = articles.length;
  const empty = (reason: TopArticlesEmptyReason): TopArticlesResult<T> => ({
    items: [],
    totalConsidered,
    excluded: totalConsidered,
    windowHours,
    reason,
  });

  const nowMs = new Date(options.now).getTime();
  // 기준 시각을 해석할 수 없으면 아무것도 판정할 수 없다. 기사가 없는 것과 같게 취급한다
  // (없는 사실을 지어내 "오래됐어요"라고 말하지 않는다).
  if (Number.isNaN(nowMs)) return empty("no-articles");
  if (totalConsidered === 0) return empty("no-articles");

  // 시각을 알 수 없거나 창 밖인 기사는 뺀다. 시각은 한 번만 계산해 정렬에서 재사용한다.
  const dated: { item: T; at: number }[] = [];
  for (const a of articles) {
    const at = timeOf(a);
    if (at === null) continue;
    if (nowMs - at > windowMs) continue;
    dated.push({ item: a, at });
  }
  if (dated.length === 0) return empty("none-recent");

  const byId = new Map(dated.map((d) => [d.item.id, d]));
  const clusters = clusterArticles(dated.map((d) => d.item));

  const ranked: { entry: RankedArticle<T>; at: number }[] = [];
  for (const cluster of clusters) {
    // 같은 매체가 속보·후속으로 여러 건을 쓴 것은 "널리 다뤄진 사건"이 아니다 → 피드 단위로 센다.
    const feedCount = new Set(cluster.articles.map((a) => a.feedId)).size;
    // 대표는 군집에서 가장 최근 기사(사용자가 보고 싶은 건 최신 상태다).
    let best = byId.get(cluster.articles[0].id)!;
    for (const a of cluster.articles) {
      const d = byId.get(a.id)!;
      if (d.at > best.at) best = d;
    }
    ranked.push({ entry: { article: best.item, feedCount }, at: best.at });
  }

  ranked.sort((x, y) => {
    if (y.entry.feedCount !== x.entry.feedCount) {
      return y.entry.feedCount - x.entry.feedCount;
    }
    if (y.at !== x.at) return y.at - x.at;
    // 시각까지 같으면 id로 확정한다 — 대시보드가 새로고침마다 순서를 바꾸지 않게.
    return x.entry.article.id.localeCompare(y.entry.article.id);
  });

  return {
    items: ranked.slice(0, limit).map((r) => r.entry),
    totalConsidered,
    excluded: totalConsidered - dated.length,
    windowHours,
    // 여기까지 왔으면 창 안에 기사가 있으므로 items는 비지 않는다.
    reason: null,
  };
}
