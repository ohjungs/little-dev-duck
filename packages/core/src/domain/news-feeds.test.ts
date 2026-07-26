import { describe, expect, it } from "vitest";
import {
  COMMON_FEED_PATHS,
  RECOMMENDED_FEEDS,
  feedTopics,
  resolveFeedUrl,
  unregisteredFeeds,
  rotateRecommended,
  dayOfYearOf,
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

  // 2026-07-27 정정 (2차 피드백 4-1, Phase 42 T3)
  // 전에는 이 자리가 "velog에는 전체 피드가 없다"는 전제로 **등록을 거부**했다.
  // **그 전제가 틀렸다** — `https://v2.velog.io/rss/`가 실측 200에 20건(전부 title·link·pubDate,
  // 당일 발행)이다. 1차 조사는 홈 HTML의 `<link rel=alternate>`만 봐서 **없다는 것을 확인한 게
  // 아니라 못 찾은 것**이었다. 거부는 해결이 아니다 — 사용자가 같은 항목을 다시 올렸다.
  it("사용자 아이디 없는 velog.io는 전체 글 피드로 등록한다", () => {
    for (const raw of ["https://velog.io", "velog.io/", "http://www.velog.io"]) {
      const r = resolveFeedUrl(raw);
      expect(r.kind).toBe("rewritten");
      if (r.kind === "rewritten") {
        expect(r.url).toBe("https://v2.velog.io/rss/");
        // 다음 단계(사용자별 피드)를 안내해야 "전체만 되는구나"에서 멈추지 않는다.
        expect(r.note).toContain("@아이디");
      }
    }
  });

  it("전체 피드로 바꾼 뒤에도 사용자 지정 주소가 우선한다", () => {
    // velog.io/@아이디가 홈 규칙에 삼켜지면 개인 피드를 등록할 수 없게 된다(순서 회귀 방지).
    const r = resolveFeedUrl("https://velog.io/@velopert");
    expect(r.kind).toBe("rewritten");
    if (r.kind === "rewritten") {
      expect(r.url).toBe("https://v2.velog.io/rss/@velopert");
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

// 2026-07-27 : 추천 피드 - 회전 (2차 피드백 4-3, Phase 47 T2-1)
// "추천이 갱신되지 않는다"의 실체는 **다 등록하면 추천이 통째로 사라지는 것**이었다.
// 여기서 잠그는 성질은 ① 하루 안에서는 흔들리지 않는다 ② 날이 바뀌면 달라진다
// ③ 한 화면에 같은 주제만 뜨지 않는다 — 셋 다 사용자가 바로 알아채는 것들이다.
describe("추천 피드 회전", () => {
  const feeds = RECOMMENDED_FEEDS;

  it("같은 날에는 같은 결과다 (새로고침마다 흔들리지 않게)", () => {
    expect(rotateRecommended(feeds, 100, 4)).toEqual(
      rotateRecommended(feeds, 100, 4),
    );
  });

  it("날이 바뀌면 목록이 달라진다", () => {
    const a = rotateRecommended(feeds, 100, 4).map((f) => f.url);
    const b = rotateRecommended(feeds, 101, 4).map((f) => f.url);
    expect(a).not.toEqual(b);
  });

  it("요청한 개수를 지킨다", () => {
    expect(rotateRecommended(feeds, 0, 4)).toHaveLength(4);
    expect(rotateRecommended(feeds, 0, 1)).toHaveLength(1);
  });

  it("한 화면에 같은 주제가 겹치지 않는다 (주제가 충분할 때)", () => {
    const picked = rotateRecommended(feeds, 5, 3);
    expect(new Set(picked.map((f) => f.topic)).size).toBe(picked.length);
  });

  it("전체보다 많이 요구하면 전체를 준다", () => {
    expect(rotateRecommended(feeds, 3, 999)).toHaveLength(feeds.length);
  });

  it("빈 목록·0개 요청에도 던지지 않는다", () => {
    expect(rotateRecommended([], 1, 3)).toEqual([]);
    expect(rotateRecommended(feeds, 1, 0)).toEqual([]);
  });

  it("음수 시드에도 안전하다", () => {
    // dayOfYear가 계산 실패로 0이나 음수가 되어도 화면이 죽으면 안 된다.
    expect(rotateRecommended(feeds, -7, 3)).toHaveLength(3);
  });

  it("며칠에 걸쳐 전체가 한 번씩은 노출된다", () => {
    // 앞쪽만 계속 나오면 뒤쪽 추천은 영영 안 보인다 — "갱신되지 않는다"가 그대로 남는다.
    const seen = new Set<string>();
    for (let day = 0; day < feeds.length * 2; day += 1) {
      for (const f of rotateRecommended(feeds, day, 3)) seen.add(f.url);
    }
    expect(seen.size).toBe(feeds.length);
  });
});

describe("연중 일차", () => {
  it("1월 1일이 1이다", () => {
    expect(dayOfYearOf("2026-01-01")).toBe(1);
  });

  it("윤년 2월 29일을 센다", () => {
    expect(dayOfYearOf("2028-03-01")).toBe(61); // 31 + 29 + 1
    expect(dayOfYearOf("2026-03-01")).toBe(60); // 31 + 28 + 1
  });

  it("해석할 수 없는 값은 0이다 (던지지 않는다)", () => {
    expect(dayOfYearOf("이상한 값")).toBe(0);
  });
});
