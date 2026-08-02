import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-08-01 : 계측 - Analytics/SpeedInsights - 배선 잠금 (사용자 결정 C-8)
// 두 계측은 **서로 다른 것을 잰다**: `<Analytics />`는 방문자·페이지뷰, `<SpeedInsights />`는
// 실사용자 성능(Core Web Vitals). 하나만 붙여 두고 "계측 붙였다"고 믿기 쉬워 둘 다 잠근다.
//
// 이 저장소가 실제로 겪은 부류의 사고를 막는 검사다 — `<Analytics />`는 모든 페이지에 붙어
// 있었는데 Vercel 프로젝트에서 기능이 꺼져 있어 **한 건도 안 걷혔다**(스크립트 404).
// 코드 쪽이 빠지는 것만은 여기서 막고, 대시보드 토글은 docs/loop-eng/USER-SETUP-2026-08-01.md가 맡는다.
//
// import 경로까지 보는 이유: 두 패키지 모두 `/next`와 `/react` 진입점이 따로 있고, App Router에서
// `/react`를 쓰면 라우트 변경이 집계되지 않는다(첫 페이지만 잡힌다). 눈으로는 구분되지 않는다.

const LAYOUT = readFileSync(
  path.join(__dirname, "..", "..", "app", "layout.tsx"),
  "utf8",
);
const PKG = JSON.parse(
  readFileSync(path.join(__dirname, "..", "..", "..", "package.json"), "utf8"),
) as { dependencies?: Record<string, string> };

describe("계측 배선 (layout.tsx 실물 검사)", () => {
  it("검사가 실제로 파일을 읽었다", () => {
    expect(LAYOUT).toContain("RootLayout");
    expect(LAYOUT).toContain("<body>");
  });

  it.each([
    ["Analytics", "@vercel/analytics/next", "@vercel/analytics"],
    ["SpeedInsights", "@vercel/speed-insights/next", "@vercel/speed-insights"],
  ])("%s가 App Router 진입점으로 import되고 렌더된다", (component, entry, pkg) => {
    expect(LAYOUT).toContain(`import { ${component} } from "${entry}"`);
    expect(LAYOUT).toContain(`<${component} />`);
    // 렌더만 하고 의존성이 없으면 빌드가 깨진다 — 짝을 함께 본다.
    expect(PKG.dependencies?.[pkg]).toBeTruthy();
  });

  it("두 계측 모두 <body> 안에 있다", () => {
    // </body> 뒤나 <head>에 두면 조용히 집계되지 않는다.
    const body = LAYOUT.slice(LAYOUT.indexOf("<body>"), LAYOUT.indexOf("</body>"));
    expect(body).toContain("<Analytics />");
    expect(body).toContain("<SpeedInsights />");
  });
});
