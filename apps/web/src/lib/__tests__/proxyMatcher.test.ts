import { describe, it, expect } from "vitest";
import { config } from "@/proxy";

// proxy matcher는 전부 정규식 문법이라 그대로 RegExp로 세워 판정할 수 있다.
const hitsAuthGate = (pathname: string) =>
  config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(pathname));

describe("proxy matcher", () => {
  it("오리 영상은 인증 게이트를 타지 않는다", () => {
    // 게이트에 걸리면 303 /welcome(HTML)을 돌려받아 <video>가 디코드에 실패한다
    expect(hitsAuthGate("/duck-quack.mp4")).toBe(false);
    expect(hitsAuthGate("/duck-idle.mp4")).toBe(false);
  });

  it("영상 확장자 예외가 빠지면 실제로 게이트에 걸린다(회귀 근거)", () => {
    const BEFORE_FIX =
      "/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)";
    expect(new RegExp(`^${BEFORE_FIX}$`).test("/duck-quack.mp4")).toBe(true);
  });

  it("webm도 같이 예외로 둔다(알파 채널 영상 대비)", () => {
    expect(hitsAuthGate("/duck-quack.webm")).toBe(false);
  });

  it("기존 이미지·플랫폼 경로 예외가 유지된다", () => {
    for (const p of [
      "/duck-logo.png",
      "/duck-quack-poster.jpg",
      "/file.svg",
      "/_next/static/chunk.js",
      "/_vercel/insights/script.js",
      "/favicon.ico",
    ]) {
      expect(hitsAuthGate(p), `${p} 는 게이트를 타면 안 된다`).toBe(false);
    }
  });

  it("보호 대상 화면은 여전히 게이트를 탄다", () => {
    for (const p of ["/", "/pages", "/settings", "/office", "/login", "/welcome"]) {
      expect(hitsAuthGate(p), `${p} 는 게이트를 타야 한다`).toBe(true);
    }
  });
});
