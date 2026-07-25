import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

// Phase 18 T5. 사이트맵·robots는 "잘못 열면 조용히 새는" 종류라 정책을 테스트로 못박는다.

describe("sitemap", () => {
  it("공개 페이지 slug를 열거하지 않는다(Phase 12 T1 열거 방지 설계 보존)", () => {
    // 이 단언이 깨지면 공개 페이지 목록을 통째로 배포하게 된다 — 절대 완화하지 말 것.
    expect(sitemap().some((e) => e.url.includes("/p/"))).toBe(false);
  });

  it("랜딩을 싣는다", () => {
    expect(sitemap().some((e) => e.url.endsWith("/welcome"))).toBe(true);
  });

  it("모든 항목이 절대 URL이다(상대경로는 크롤러가 무시)", () => {
    for (const entry of sitemap()) {
      expect(entry.url).toMatch(/^https?:\/\//);
    }
  });

  it("URL에 슬래시가 겹치지 않는다", () => {
    for (const entry of sitemap()) {
      expect(entry.url.replace(/^https?:\/\//, "")).not.toContain("//");
    }
  });
});

describe("robots", () => {
  const rules = robots().rules as {
    allow?: string[];
    disallow?: string | string[];
  };

  it("기본은 차단이다(새 라우트가 실수로 색인되지 않게)", () => {
    expect(rules.disallow).toBe("/");
  });

  it("공개 표면만 연다", () => {
    expect(rules.allow).toContain("/welcome");
    expect(rules.allow).toContain("/p/");
  });

  it("워크스페이스·API 경로는 열려 있지 않다", () => {
    for (const path of [
      "/pages",
      "/settings",
      "/insights",
      "/news",
      "/office",
      "/admin",
      "/api",
    ]) {
      expect(rules.allow ?? []).not.toContain(path);
    }
  });

  it("사이트맵 위치를 절대 URL로 알린다", () => {
    expect(robots().sitemap).toMatch(/^https?:\/\/.+\/sitemap\.xml$/);
  });
});
