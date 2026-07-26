import { describe, expect, it } from "vitest";
import { topArticles, type RankableArticle } from "./news-top";

const NOW = "2026-07-26T12:00:00.000Z";

function article(over: Partial<RankableArticle> & { id: string }): RankableArticle {
  return {
    title: `기사 ${over.id}`,
    snippet: null,
    feedId: `feed-${over.id}`,
    publishedAt: NOW,
    ...over,
  };
}

// 서로 묶이지 않을 만큼 어휘가 다른 제목들(군집화가 토큰 교집합 기반이라 필요하다).
const DISTINCT_TITLES = [
  "환율 급등 수출기업 비상",
  "신형 배터리 양산 개시",
  "프로야구 개막전 매진",
  "폭우 피해 복구 시작",
  "국제선 항공권 인하",
  "백신 임상 3상 진입",
  "해저터널 착공 확정",
  "청년 주택 공급 확대",
  "반려동물 등록 의무화",
  "전기요금 동결 결정",
];

// 같은 사건을 여러 매체가 다뤘음을 표현하려면 제목이 겹쳐야 한다(군집화가 토큰 교집합 기반).
function sameStory(id: string, feedId: string, publishedAt = NOW): RankableArticle {
  return {
    id,
    feedId,
    publishedAt,
    title: "정부 반도체 특별법 국회 본회의 통과",
    snippet: "반도체 특별법이 국회 본회의를 통과했다",
  };
}

describe("topArticles", () => {
  it("기사가 없으면 빈 배열", () => {
    expect(topArticles([], { now: NOW })).toEqual([]);
  });

  it("여러 피드가 함께 다룬 사건을 단독 기사보다 위에 둔다", () => {
    // 단독 기사가 더 최신인데도, 3개 매체가 다룬 사건이 위여야 한다 — 그게 우리가 가진 인기 신호다.
    const items = [
      article({ id: "solo", title: "혼자만 쓴 소식", publishedAt: "2026-07-26T11:59:00.000Z" }),
      sameStory("a", "feed-1", "2026-07-26T09:00:00.000Z"),
      sameStory("b", "feed-2", "2026-07-26T09:10:00.000Z"),
      sameStory("c", "feed-3", "2026-07-26T09:20:00.000Z"),
    ];
    const top = topArticles(items, { now: NOW });
    expect(top[0].feedCount).toBe(3);
    expect(top[0].article.title).toContain("반도체");
  });

  it("같은 피드가 같은 사건을 여러 번 실어도 1개 매체로 센다", () => {
    // 한 매체가 속보·후속으로 3건을 쓴 것은 '널리 다뤄진 사건'이 아니다.
    const items = [
      sameStory("a", "feed-1"),
      sameStory("b", "feed-1"),
      sameStory("c", "feed-1"),
    ];
    expect(topArticles(items, { now: NOW })[0].feedCount).toBe(1);
  });

  it("같은 사건에서는 가장 최근 기사를 대표로 보여준다", () => {
    const items = [
      sameStory("old", "feed-1", "2026-07-26T08:00:00.000Z"),
      sameStory("new", "feed-2", "2026-07-26T10:00:00.000Z"),
    ];
    expect(topArticles(items, { now: NOW })[0].article.id).toBe("new");
  });

  it("보도 매체 수가 같으면 최신이 위", () => {
    const items = [
      article({ id: "older", title: "가나다 소식 하나", publishedAt: "2026-07-26T01:00:00.000Z" }),
      article({ id: "newer", title: "라마바 소식 둘", publishedAt: "2026-07-26T11:00:00.000Z" }),
    ];
    expect(topArticles(items, { now: NOW })[0].article.id).toBe("newer");
  });

  it("기본 3건까지만 돌려준다", () => {
    // 제목이 겹치면 군집화가 하나로 묶어 결과가 1건이 된다(그게 정상 동작). 개수 상한을 보려면
    // 서로 토큰이 겹치지 않는 제목이어야 한다.
    const items = DISTINCT_TITLES.map((title, i) => article({ id: `x${i}`, title }));
    expect(topArticles(items, { now: NOW })).toHaveLength(3);
  });

  it("limit으로 개수를 바꿀 수 있다", () => {
    // 제목이 겹치면 군집화가 하나로 묶어 결과가 1건이 된다(그게 정상 동작). 개수 상한을 보려면
    // 서로 토큰이 겹치지 않는 제목이어야 한다.
    const items = DISTINCT_TITLES.map((title, i) => article({ id: `x${i}`, title }));
    expect(topArticles(items, { now: NOW, limit: 5 })).toHaveLength(5);
  });

  it("창(기본 3일)보다 오래된 기사는 제외한다 — '최근 것'이어야 하므로", () => {
    const items = [
      article({ id: "ancient", publishedAt: "2026-07-01T00:00:00.000Z" }),
    ];
    expect(topArticles(items, { now: NOW })).toEqual([]);
  });

  it("발행일이 없는 기사는 createdAt으로 판정한다", () => {
    // RSS에 pubDate가 없는 피드가 실제로 있다. 그때 발행일 없다고 통째로 버리면
    // 그 피드의 기사는 영영 TOP에 못 온다.
    const items = [
      article({ id: "nopub", publishedAt: null, createdAt: "2026-07-26T11:00:00.000Z" }),
    ];
    expect(topArticles(items, { now: NOW })).toHaveLength(1);
  });

  it("발행일도 수집일도 없으면 제외한다(언제 것인지 알 수 없음)", () => {
    const items = [article({ id: "unknown", publishedAt: null, createdAt: null })];
    expect(topArticles(items, { now: NOW })).toEqual([]);
  });

  it("날짜 문자열이 깨져 있어도 throw하지 않고 그 기사만 빠진다", () => {
    const items = [
      article({ id: "bad", publishedAt: "어제쯤?" }),
      article({ id: "good", title: "멀쩡한 소식 제목" }),
    ];
    const top = topArticles(items, { now: NOW });
    expect(top.map((t) => t.article.id)).toEqual(["good"]);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const items = [article({ id: "a" }), article({ id: "b", title: "다른 제목 둘" })];
    const snapshot = items.map((i) => i.id);
    topArticles(items, { now: NOW });
    expect(items.map((i) => i.id)).toEqual(snapshot);
  });

  it("같은 입력에 같은 순서를 돌려준다(대시보드가 새로고침마다 흔들리지 않게)", () => {
    const items = [
      sameStory("a", "feed-1"),
      sameStory("b", "feed-2"),
      article({ id: "c", title: "관계없는 다른 소식" }),
      article({ id: "d", title: "또 다른 관계없는 소식" }),
    ];
    const first = topArticles(items, { now: NOW }).map((t) => t.article.id);
    const second = topArticles(items, { now: NOW }).map((t) => t.article.id);
    expect(second).toEqual(first);
  });
});
