import { describe, expect, it } from "vitest";
import {
  RECOMMENDED_FEEDS,
  feedTopics,
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
