import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-29 : 보안 - 외부 링크 safeHref 잠금 (Phase 61·62 리뷰 후속)
// 리뷰에서 실제로 잡힌 구멍: safeHref가 두 파일에 복사돼 있었고 새 화면(DailyBriefing)은
// 아예 없이 RSS 원본 URL을 href에 넣었다(javascript: 스킴 통과 가능). 승격으로 고쳤지만
// **다음 화면이 또 빠뜨리는 것**은 사람이 못 지킨다 — 정적 검사로 못박는다.
//
// 검사 두 개:
//  1) safeHref 정의는 lib/safeHref.ts 한 곳뿐이다(복사 금지 — 복사본은 한쪽만 고쳐진다).
//  2) 기사 링크(a.link / article.link / ranked.article.link)를 href에 넣는 파일은
//     반드시 공용 safeHref를 import한다. 새 뉴스 화면이 생기면 이 검사가 먼저 알려준다.

const SRC_ROOT = path.join(__dirname, "..", "..");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(SRC_ROOT, f).replace(/\\/g, "/");

describe("외부 링크 safeHref 잠금", () => {
  const files = walk(SRC_ROOT);

  it("safeHref 정의는 lib/safeHref.ts 한 곳뿐이다", () => {
    const defs = files.filter((f) =>
      readFileSync(f, "utf-8").includes("function safeHref"),
    );
    expect(defs.map(rel)).toEqual(["lib/safeHref.ts"]);
  });

  it("기사 링크를 href에 넣는 파일은 공용 safeHref를 import한다", () => {
    // 기사 객체의 링크를 그대로 렌더할 수 있는 패턴. 넓게 잡되, import가 있으면 통과라
    // 오탐 비용은 import 한 줄이다.
    const renderRe = /href=\{[^}]*\.link\b/;
    const offenders = files.filter((f) => {
      const src = readFileSync(f, "utf-8");
      return renderRe.test(src) && !src.includes('from "@/lib/safeHref"');
    });
    expect(offenders.map(rel)).toEqual([]);
  });
});
