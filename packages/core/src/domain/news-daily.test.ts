import { describe, expect, it } from "vitest";
import { briefingRange, dailyIssues } from "./news-daily";
import { topicForUrl } from "./news-feeds";

const NOW = "2026-07-29T09:00:00.000Z";

// 제목을 서로 다르게 주면 clusterArticles가 묶지 않는다(토큰 겹침 없음).
const art = (o: {
  id: string;
  feedId: string;
  title?: string;
  publishedAt?: string | null;
}) => ({
  id: o.id,
  feedId: o.feedId,
  title: o.title ?? `단독 소식 ${o.id} ${o.id}알파 ${o.id}베타 ${o.id}감마`,
  snippet: null,
  publishedAt: o.publishedAt === undefined ? "2026-07-29T08:00:00.000Z" : o.publishedAt,
  createdAt: null,
});

describe("dailyIssues (하루 이슈 선정 — Phase 61 T1)", () => {
  it("기본 10개까지, rank는 1부터 차례로", () => {
    const arts = Array.from({ length: 15 }, (_, i) =>
      art({ id: `a${i}`, feedId: `f${i}` }),
    );
    const r = dailyIssues(arts, { now: NOW });
    expect(r.items).toHaveLength(10);
    expect(r.items.map((x) => x.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("10개가 안 되면 있는 만큼만 — 부족을 숨기지 않는다", () => {
    const r = dailyIssues([art({ id: "a1", feedId: "f1" })], { now: NOW });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.rank).toBe(1);
  });

  it("한 피드가 상한(기본 3)을 넘겨 차지하지 못한다", () => {
    const arts = [
      ...Array.from({ length: 8 }, (_, i) => art({ id: `dom${i}`, feedId: "big" })),
      ...Array.from({ length: 7 }, (_, i) => art({ id: `etc${i}`, feedId: `f${i}` })),
    ];
    const r = dailyIssues(arts, { now: NOW });
    const fromBig = r.items.filter((x) => x.article.feedId === "big").length;
    expect(fromBig).toBeLessThanOrEqual(3);
    // 상한으로 밀려도 자리는 다른 피드가 채운다.
    expect(r.items).toHaveLength(10);
  });

  it("카테고리는 피드 매핑에서, 모르는 피드는 종합", () => {
    const r = dailyIssues(
      [art({ id: "a1", feedId: "known" }), art({ id: "a2", feedId: "unknown" })],
      { now: NOW, topicByFeedId: { known: "경제 일반" } },
    );
    const byId = new Map(r.items.map((x) => [x.article.id, x.category]));
    expect(byId.get("a1")).toBe("경제 일반");
    expect(byId.get("a2")).toBe("종합");
  });

  it("빈 입력은 이유를 그대로 전달한다 (topArticles 한 벌)", () => {
    const r = dailyIssues([], { now: NOW });
    expect(r.items).toHaveLength(0);
    expect(r.reason).toBe("no-articles");
  });

  it("창 밖(기본 24시간) 기사만 있으면 none-recent", () => {
    const r = dailyIssues(
      [art({ id: "old", feedId: "f1", publishedAt: "2026-07-20T00:00:00.000Z" })],
      { now: NOW },
    );
    expect(r.items).toHaveLength(0);
    expect(r.reason).toBe("none-recent");
    expect(r.windowHours).toBe(24);
  });
});

// 2026-07-29 : 뉴스 - 피드 URL → 주제 (Phase 61 T1)
describe("topicForUrl", () => {
  it("추천 피드 URL이면 주제를 돌려준다 (끝 슬래시·대소문자 무시)", () => {
    expect(topicForUrl("https://www.hankyung.com/feed/economy")).toBe("경제 일반");
    expect(topicForUrl("HTTPS://news.hada.io/rss/news/")).toBe("개발 뉴스");
  });

  it("모르는 URL은 null — 지어내지 않는다", () => {
    expect(topicForUrl("https://example.com/rss")).toBeNull();
  });
});

// 2026-07-29 : 뉴스 - 브리핑 날짜 탭 창 계산 (Phase 61 T3)
describe("briefingRange (KST 날짜 창)", () => {
  it("오늘: 그 KST 날의 끝을 기준으로 24시간 창", () => {
    expect(briefingRange("today", "2026-07-29")).toEqual({
      now: "2026-07-29T15:00:00.000Z", // 다음날 00:00 KST
      windowHours: 24,
    });
  });

  it("어제: 하루 앞 날짜의 24시간 창", () => {
    expect(briefingRange("yesterday", "2026-07-29")).toEqual({
      now: "2026-07-28T15:00:00.000Z",
      windowHours: 24,
    });
  });

  it("지난주: 오늘 00:00 KST 이전 7일 창 (오늘 제외)", () => {
    expect(briefingRange("week", "2026-07-29")).toEqual({
      now: "2026-07-28T15:00:00.000Z", // 오늘 00:00 KST
      windowHours: 168,
    });
  });

  it("특정 날짜: 그 날의 24시간 창, 잘못된 날짜는 null", () => {
    expect(briefingRange("date", "2026-07-29", "2026-07-01")).toEqual({
      now: "2026-07-01T15:00:00.000Z",
      windowHours: 24,
    });
    expect(briefingRange("date", "2026-07-29", "잘못된값")).toBeNull();
    expect(briefingRange("date", "2026-07-29")).toBeNull();
  });

  it("월 경계를 넘는 어제 계산도 맞다", () => {
    expect(briefingRange("yesterday", "2026-08-01")).toEqual({
      now: "2026-07-31T15:00:00.000Z",
      windowHours: 24,
    });
  });
});
