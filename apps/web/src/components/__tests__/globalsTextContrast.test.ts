import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-30 : 디자인 - 보조 텍스트 대비 (감사 발견: 라이트 테마 --muted-foreground 3.74:1)
// HabitHeatmap.contrast.test.ts와 같은 방식(globals.css 실물 파싱)이되, 여기서는 지각 거리(ΔE)가
// 아니라 **WCAG 명도 대비**를 쓴다 — 이건 인접 색 구분이 아니라 "본문 글자가 배경 위에서
// 읽히는가"를 재는 문제라 표준 기준(AA 통상 텍스트 4.5:1)이 적합하다.

const CSS = readFileSync(
  path.join(__dirname, "..", "..", "app", "globals.css"),
  "utf8",
);

const AA_NORMAL_TEXT = 4.5;

function blockOf(selector: string): string {
  // `.dark {` 는 인쇄용 media query 안에도 있다. 맨 처음 것(팔레트 정의)만 본다.
  const start = CSS.indexOf(selector);
  expect(start, `${selector} 블록을 찾지 못했다`).toBeGreaterThan(-1);
  const end = CSS.indexOf("\n}", start);
  return CSS.slice(start, end);
}

function varOf(block: string, name: string, selector: string): string {
  const m = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
  expect(m, `${selector}에 ${name}가 없다`).not.toBeNull();
  return m![1];
}

// sRGB 16진색 → 상대 휘도(WCAG 정의식).
function relativeLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const srgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = srgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  const [r, g, b] = lin;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("보조 텍스트(--muted-foreground) 대비 (globals.css 실물 검사)", () => {
  for (const mode of [
    { name: "라이트", selector: ":root {" },
    { name: "다크", selector: ".dark {" },
  ]) {
    it(`${mode.name}: 배경 위 --muted-foreground가 AA 통상 텍스트(4.5:1) 이상`, () => {
      const block = blockOf(mode.selector);
      const fg = varOf(block, "--muted-foreground", mode.selector);
      for (const bgVar of ["--background", "--card", "--muted"]) {
        const bg = varOf(block, bgVar, mode.selector);
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `${mode.name} --muted-foreground(${fg}) vs ${bgVar}(${bg}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    });
  }

  it("검사가 실제로 작동한다 (가짜 입력)", () => {
    // 검은/흰색은 21:1에 가깝다.
    expect(contrastRatio("#000000", "#ffffff")).toBeGreaterThan(20);
    // 같은 색은 1:1.
    expect(contrastRatio("#8a8069", "#8a8069")).toBeCloseTo(1, 1);
    // 감사에서 확인된 낡은 값(3.74:1)은 AA 기준에 못 미친다.
    expect(contrastRatio("#8a8069", "#fbfaf7")).toBeLessThan(AA_NORMAL_TEXT);
  });
});
