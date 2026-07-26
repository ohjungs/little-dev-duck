import { describe, expect, it } from "vitest";
import {
  COMMON_FEED_PATHS,
  RECOMMENDED_FEEDS,
  feedTopics,
  resolveFeedUrl,
  unregisteredFeeds,
} from "./news-feeds";

describe("RECOMMENDED_FEEDS", () => {
  it("주제와 제목·URL이 모두 채워져 있다", () => {
    for (const f of RECOMMENDED_FEEDS) {
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.topic.length).toBeGreaterThan(0);
      expect(f.url).toMatch(/^https:\/\//);
    }
  });

  it("URL이 중복되지 않는다(같은 피드를 두 번 추천하지 않게)", () => {
    const urls = RECOMMENDED_FEEDS.map((f) => f.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("http(평문)는 넣지 않는다", () => {
    expect(RECOMMENDED_FEEDS.every((f) => f.url.startsWith("https://"))).toBe(true);
  });
});

describe("feedTopics", () => {
  it("등장 순서를 유지하며 주제를 중복 없이 뽑는다", () => {
    const topics = feedTopics(RECOMMENDED_FEEDS);
    expect(new Set(topics).size).toBe(topics.length);
    expect(topics.length).toBeGreaterThan(1);
  });

  it("빈 목록이면 빈 배열", () => {
    expect(feedTopics([])).toEqual([]);
  });
});

describe("unregisteredFeeds", () => {
  const F = RECOMMENDED_FEEDS;

  it("등록된 게 없으면 전부 추천한다", () => {
    expect(unregisteredFeeds(F, [])).toHaveLength(F.length);
  });

  it("이미 등록한 피드는 빼고 추천한다", () => {
    const result = unregisteredFeeds(F, [F[0].url]);
    expect(result).toHaveLength(F.length - 1);
    expect(result.some((f) => f.url === F[0].url)).toBe(false);
  });

  it("끝 슬래시 차이는 같은 피드로 본다", () => {
    expect(unregisteredFeeds(F, [`${F[0].url}/`]).some((f) => f.url === F[0].url)).toBe(
      false,
    );
  });

  it("대소문자·앞뒤 공백 차이도 같은 피드로 본다", () => {
    const messy = `  ${F[0].url.toUpperCase()}  `;
    expect(unregisteredFeeds(F, [messy]).some((f) => f.url === F[0].url)).toBe(false);
  });

  it("전부 등록했으면 빈 배열(추천 UI를 숨길 신호)", () => {
    expect(unregisteredFeeds(F, F.map((f) => f.url))).toEqual([]);
  });

  it("등록 목록에 빈 문자열·쓰레기가 섞여도 throw하지 않는다", () => {
    expect(() => unregisteredFeeds(F, ["", "   ", "not a url"])).not.toThrow();
    expect(unregisteredFeeds(F, ["", "not a url"])).toHaveLength(F.length);
  });
});

// 2026-07-26 : 뉴스 - 피드해석 - velog실측
// 사용자가 "velog.io"를 등록했더니 0건이었다. 실측(2026-07-26)으로 원인 확인:
//   ① velog.io 홈은 <link rel=alternate> RSS 태그를 **하나도** 내보내지 않는다(자동 발견 불가)
//   ② velog.io/rss/@아이디 는 404, 실제 피드는 **다른 도메인** v2.velog.io/rss/@아이디 (200, 20건)
// 즉 자동 발견으로는 원리적으로 못 찾는 부류라 사이트 규칙이 필요하다.
describe("resolveFeedUrl", () => {
  it("velog 사용자 주소를 실제 피드 도메인으로 바꾼다", () => {
    const r = resolveFeedUrl("https://velog.io/@velopert");
    expect(r.kind).toBe("rewritten");
    if (r.kind === "rewritten") {
      expect(r.url).toBe("https://v2.velog.io/rss/@velopert");
    }
  });

  it("velog 주소의 뒤쪽 경로·쿼리·해시는 버린다(피드는 사용자 단위)", () => {
    for (const raw of [
      "https://velog.io/@velopert/posts",
      "https://velog.io/@velopert/some-post-slug?tag=x#top",
      "velog.io/@velopert/",
    ]) {
      const r = resolveFeedUrl(raw);
      expect(r.kind).toBe("rewritten");
      if (r.kind === "rewritten") {
        expect(r.url).toBe("https://v2.velog.io/rss/@velopert");
      }
    }
  });

  it("스킴 없이·www 붙여·대문자로 써도 같은 결과", () => {
    for (const raw of [
      "velog.io/@velopert",
      "http://www.velog.io/@velopert",
      "HTTPS://VELOG.IO/@velopert",
    ]) {
      const r = resolveFeedUrl(raw);
      expect(r.kind).toBe("rewritten");
      if (r.kind === "rewritten") {
        expect(r.url).toBe("https://v2.velog.io/rss/@velopert");
      }
    }
  });

  it("사용자 아이디 없는 velog.io는 '못 만든다'고 이유와 함께 답한다", () => {
    // 조용히 등록해 두면 사용자는 수집이 될 줄 알고 기다린다. velog에는 전체 피드가 없다.
    const r = resolveFeedUrl("https://velog.io");
    expect(r.kind).toBe("unresolvable");
    if (r.kind === "unresolvable") {
      expect(r.reason).toContain("@");
    }
  });

  it("이미 올바른 velog 피드 주소는 건드리지 않는다", () => {
    const r = resolveFeedUrl("https://v2.velog.io/rss/@velopert");
    expect(r.kind).toBe("asis");
  });

  it("규칙에 없는 주소는 그대로 통과시킨다(앞뒤 공백만 정리)", () => {
    const r = resolveFeedUrl("  https://dev.to/feed  ");
    expect(r).toEqual({ kind: "asis", url: "https://dev.to/feed" });
  });

  it("velog가 아닌 곳의 @는 건드리지 않는다", () => {
    const r = resolveFeedUrl("https://example.com/@someone");
    expect(r.kind).toBe("asis");
  });
});

describe("COMMON_FEED_PATHS", () => {
  it("전부 슬래시로 시작하는 상대 경로다", () => {
    for (const p of COMMON_FEED_PATHS) expect(p.startsWith("/")).toBe(true);
  });

  it("중복이 없다", () => {
    expect(new Set(COMMON_FEED_PATHS).size).toBe(COMMON_FEED_PATHS.length);
  });

  // 2026-07-26 실측: 이 목록으로 toss.tech(/rss.xml)·tech.kakao.com(/feed)이 실제로 발견됐다.
  // 시도 횟수는 수집 1회당 추가 왕복이므로 늘릴 때 근거가 필요하다 — 상한을 테스트로 잠근다.
  it("시도 횟수가 6회를 넘지 않는다(수집 1회당 추가 왕복 비용)", () => {
    expect(COMMON_FEED_PATHS.length).toBeLessThanOrEqual(6);
  });
});
