import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveFromWebRoot } from "./testRepoPaths";

// 2026-07-29 : 접근성 - 모션 축소 판정 한 벌 (Phase 57 T1 X-006)
// JS에서 prefers-reduced-motion을 직접 matchMedia로 읽는 자리가 흩어지면(마스코트·오피스·
// 영상) 한 곳만 고쳐진다 — 판정은 mascot의 usePrefersReducedMotion/prefersReducedMotionNow
// 한 벌만 쓴다. **CSS 안의 @media는 정당하다**(그건 CSS가 맞는 도구다) — 그래서 파일이 아니라
// "matchMedia와 리터럴이 같은 줄에 있는가"를 잡는다.

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("모션 축소 판정 단일 출처", () => {
  it("apps/web에는 matchMedia로 prefers-reduced-motion을 직접 읽는 줄이 없다", () => {
    const offenders: string[] = [];
    for (const file of walk(resolveFromWebRoot("src"))) {
      // 이 검사 파일 자신은 설명 주석에 두 문자열이 같이 있다 — 제외.
      if (file.includes("reducedMotionSingleSource")) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (line.includes("matchMedia") && line.includes("prefers-reduced-motion")) {
          offenders.push(`${file}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("mascot이 판정 한 벌(훅 + 즉시 읽기)을 내보낸다", () => {
    const src = readFileSync(
      resolveFromWebRoot("../../packages/mascot/src/usePrefersReducedMotion.ts"),
      "utf8",
    );
    expect(src).toContain("prefers-reduced-motion");
    expect(src).toContain("export function prefersReducedMotionNow");
  });
});
