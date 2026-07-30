import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-30 : 접근성 - 문서 언어 선언 (감사 발견)
// `<html lang>`은 Next 스캐폴드 기본값 `en`이 한 번도 고쳐지지 않은 채 배포돼 있었다.
// 앱 전체 UI·description·openGraph locale이 모두 한국어인데 문서 언어만 영어였다 —
// **스크린리더가 한국어를 영어 음성·발음 규칙으로 읽는다**(WCAG 3.1.1 Language of Page,
// Level A 위반). 눈으로는 아무 이상이 없어 리뷰로는 잡히지 않는 부류라 검사로 잠근다.
//
// 검사 대상은 layout.tsx 실물이다 — 이 저장소가 globals.css 색·마이그레이션 SQL에 쓰는 방식과
// 같다(진짜 쓰이는 값을 읽어야 검사가 살아 있다).

const LAYOUT = readFileSync(
  path.join(__dirname, "..", "..", "app", "layout.tsx"),
  "utf8",
);

describe("문서 언어 선언 (layout.tsx 실물 검사)", () => {
  it("검사가 실제로 파일을 읽었다", () => {
    // 0바이트를 읽고 아래 검사가 공짜로 통과하는 상황을 먼저 배제한다.
    expect(LAYOUT).toContain("RootLayout");
    expect(LAYOUT).toContain("<html");
  });

  it("<html lang>이 한국어다", () => {
    const m = /<html\s+lang="([^"]+)"/.exec(LAYOUT);
    expect(m, "<html lang=\"...\">를 찾지 못했다").not.toBeNull();
    expect(m![1]).toBe("ko");
  });

  it("<html lang>과 openGraph locale의 언어가 일치한다", () => {
    // 둘이 갈라지면 어느 쪽이 맞는지 알 수 없다. 실제로 lang=en / locale=ko_KR로 갈라져 있었다.
    const lang = /<html\s+lang="([^"]+)"/.exec(LAYOUT)![1];
    const locale = /locale:\s*"([^"]+)"/.exec(LAYOUT);
    expect(locale, "openGraph locale을 찾지 못했다").not.toBeNull();
    expect(locale![1].split(/[-_]/)[0]).toBe(lang.split("-")[0]);
  });
});
