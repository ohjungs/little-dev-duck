import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-30 : 디자인 - 보조 텍스트 대비 (감사 발견: 라이트 테마 --muted-foreground 3.74:1)
// HabitHeatmap.contrast.test.ts와 같은 방식(globals.css 실물 파싱)이되, 여기서는 지각 거리(ΔE)가
// 아니라 **WCAG 명도 대비**를 쓴다 — 이건 인접 색 구분이 아니라 "본문 글자가 배경 위에서
// 읽히는가"를 재는 문제라 표준 기준(AA 통상 텍스트 4.5:1)이 적합하다.
//
// 2026-07-31 : 이 파일은 **텍스트와 비텍스트를 모두 담는다**.
// 파일 이름이 TextContrast지만 아래쪽 describe는 SC 1.4.11(비텍스트 3:1) — 경계선과
// 포커스링을 잰다. 이름 때문에 새 파일을 파면 파싱 로직이 두 벌이 되고, 그러면 한쪽만
// 갱신되는 드리프트가 난다(이번 게이트 차단의 근본 원인이 정확히 그 종류의 공백이었다).
// **새 색 토큰을 추가하면 여기 목록에 넣는다.**

const CSS = readFileSync(
  path.join(__dirname, "..", "..", "app", "globals.css"),
  "utf8",
);

const AA_NORMAL_TEXT = 4.5;
// SC 1.4.11 비텍스트 대비: UI 컴포넌트의 경계·상태 표시는 인접 색과 3:1 이상.
const AA_NON_TEXT = 3;
// 사용자가 "이 컨트롤이 어디까지인지"를 이 색으로만 판단하는 토큰들.
const NON_TEXT_TOKENS = ["--ring", "--border", "--input"];
// 위 토큰이 실제로 얹히는 표면. **한 종만 재면 통과처럼 보이는 값이 통과한다** —
// 기각된 #9b8f7a가 그 사례라 아래 가짜 입력 검사에 박아 뒀다.
const SURFACES = ["--background", "--card", "--muted"];

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

// 2026-07-31 : 접근성 - 비텍스트 대비 (SC 1.4.11, 게이트 차단 건)
// 이 저장소는 globals.css 실물 파싱 관례를 이미 갖고 있었는데 **--muted-foreground 하나에만**
// 걸어 뒀다. 경계선과 포커스링은 아무도 재지 않아, 배경 대비 1.18:1짜리 테두리가
// 설계-개발-유닛-리뷰-QA 다섯 관문을 통과했다. 검사하지 않는 토큰은 언젠가 규격을 벗어난다.
describe("비텍스트 UI 대비 (globals.css 실물 검사)", () => {
  for (const mode of [
    { name: "라이트", selector: ":root {" },
    { name: "다크", selector: ".dark {" },
  ]) {
    for (const token of NON_TEXT_TOKENS) {
      it(`${mode.name}: ${token}이 배경 3종 위에서 3:1 이상`, () => {
        const block = blockOf(mode.selector);
        const fg = varOf(block, token, mode.selector);
        for (const bgVar of SURFACES) {
          const bg = varOf(block, bgVar, mode.selector);
          const ratio = contrastRatio(fg, bg);
          expect(
            ratio,
            `${mode.name} ${token}(${fg}) vs ${bgVar}(${bg}) = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_NON_TEXT);
        }
      });
    }
  }

  it("검사가 실제로 작동한다 (기각된 후보값)", () => {
    // 게이트에 걸린 낡은 --ring. 배경 위 2.81:1.
    expect(contrastRatio("#ca8a04", "#fbfaf7")).toBeLessThan(AA_NON_TEXT);
    // 게이트에 걸린 낡은 --border/--input. 1.18:1 — 사실상 선이 없었다.
    expect(contrastRatio("#ebe7dd", "#fbfaf7")).toBeLessThan(AA_NON_TEXT);
    // 진단이 처방했던 #9b8f7a. --background 위 3.05:1이라 통과처럼 보이지만
    // --muted 위에서는 2.82:1이다. **배경 3종을 다 재야 하는 이유**가 이것이다.
    expect(contrastRatio("#9b8f7a", "#f4f1ea")).toBeLessThan(AA_NON_TEXT);
  });
});
