import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "./site-url";

describe("resolveSiteUrl", () => {
  it("명시 설정(NEXT_PUBLIC_SITE_URL)이 가장 우선한다", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://duck.example.com",
        VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app",
        VERCEL_URL: "deploy-abc.vercel.app",
      }),
    ).toBe("https://duck.example.com");
  });

  it("명시 설정이 없으면 프로덕션 도메인을 쓴다(프리뷰 빌드에서도 안정적)", () => {
    expect(
      resolveSiteUrl({
        VERCEL_PROJECT_PRODUCTION_URL: "prod.vercel.app",
        VERCEL_URL: "deploy-abc.vercel.app",
      }),
    ).toBe("https://prod.vercel.app");
  });

  it("프로덕션 도메인도 없으면 배포별 URL로 폴백한다", () => {
    expect(resolveSiteUrl({ VERCEL_URL: "deploy-abc.vercel.app" })).toBe(
      "https://deploy-abc.vercel.app",
    );
  });

  it("아무것도 없으면 로컬 개발 주소로 폴백한다", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:5000");
  });

  it("스킴이 없는 Vercel 호스트에 https를 붙인다", () => {
    expect(resolveSiteUrl({ VERCEL_URL: "x.vercel.app" })).toBe(
      "https://x.vercel.app",
    );
  });

  it("이미 스킴이 있으면 중복해서 붙이지 않는다", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:5100" })).toBe(
      "http://127.0.0.1:5100",
    );
  });

  it("끝의 슬래시를 제거한다(상대경로 결합 시 // 방지)", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://duck.example.com/" })).toBe(
      "https://duck.example.com",
    );
  });

  it("빈 문자열·공백만인 값은 미설정으로 본다", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "  ", VERCEL_URL: "x.vercel.app" }),
    ).toBe("https://x.vercel.app");
  });
});
