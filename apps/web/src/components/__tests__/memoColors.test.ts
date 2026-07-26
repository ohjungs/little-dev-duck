import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deltaE, JUST_NOTICEABLE_DELTA_E } from "@ldd/core";

// 2026-07-27 : 메모 - 색 대비 (2차 피드백 1-6, Phase 44 T3)
// 사용자가 "메모가 잘 안보여서"라고 했다. 재 보니 `-50` 단계는 흰 카드와 **ΔE 6~10**이었다 —
// 겨우 알아채는 최소 차이(2.3)보다는 크지만 훑어보는 화면에서는 사실상 흰색이다.
//
// 검사 대상은 컴포넌트가 아니라 **globals.css 실물**이다(Phase 42 T6의 잔디와 같은 방식).
// 계산은 core `deltaE` **한 벌**을 쓴다 — 검사마다 공식을 복붙하면 한쪽만 고쳐진다.
const CSS = readFileSync(
  path.join(__dirname, "..", "..", "app", "globals.css"),
  "utf8",
);

// 메모지는 "종이" 느낌이라 아주 진할 필요는 없지만, 카드와 확실히 달라야 한다.
const MIN_VS_CARD = 15;
// 서로 다른 색이라는 게 한눈에 보여야 한다(색 자체가 분류 수단이다).
const MIN_BETWEEN = 10;

function blockOf(selector: string): string {
  const start = CSS.indexOf(selector);
  expect(start, `${selector} 블록을 찾지 못했다`).toBeGreaterThan(-1);
  return CSS.slice(start, CSS.indexOf("\n}", start));
}

function memoColors(selector: string): { colors: string[]; card: string } {
  const block = blockOf(selector);
  const colors = [1, 2, 3, 4, 5, 6].map((i) => {
    const m = new RegExp(String.raw`--memo-${i}:\s*(#[0-9a-fA-F]{6})`).exec(block);
    expect(m, `${selector}에 --memo-${i}가 없다`).not.toBeNull();
    return m![1];
  });
  const card = /--card:\s*(#[0-9a-fA-F]{6})/.exec(block);
  expect(card, `${selector}에 --card가 없다`).not.toBeNull();
  return { colors, card: card![1] };
}

describe("메모 색 (globals.css 실물 검사)", () => {
  for (const mode of [
    { name: "라이트", selector: ":root {" },
    { name: "다크", selector: ".dark {" },
  ]) {
    it(`${mode.name}: 메모가 카드 배경에 묻히지 않는다`, () => {
      const { colors, card } = memoColors(mode.selector);
      for (const [i, c] of colors.entries()) {
        expect(
          deltaE(c, card),
          `--memo-${i + 1}(${c})이 카드(${card})와 너무 비슷하다`,
        ).toBeGreaterThanOrEqual(MIN_VS_CARD);
      }
    });

    it(`${mode.name}: 색끼리 서로 구분된다`, () => {
      // 색이 곧 분류 수단이라, 두 메모가 같은 색으로 보이면 그 기능이 사라진다.
      const { colors } = memoColors(mode.selector);
      for (let i = 0; i < colors.length; i += 1) {
        for (let j = i + 1; j < colors.length; j += 1) {
          expect(
            deltaE(colors[i], colors[j]),
            `--memo-${i + 1}과 --memo-${j + 1}이 너무 비슷하다`,
          ).toBeGreaterThanOrEqual(MIN_BETWEEN);
        }
      }
    });
  }

  it("검사가 실제로 작동한다 (가짜 입력)", () => {
    // 실물만 읽는 검사는 통과해도 살아 있는지 알 수 없다(schemaGuard가 세운 원칙).
    // 예전 값(-50 단계)이 지금 기준에 걸리는지 직접 확인한다.
    expect(deltaE("#fefce8", "#ffffff")).toBeLessThan(MIN_VS_CARD);
    expect(deltaE("#fefce8", "#ffffff")).toBeGreaterThan(JUST_NOTICEABLE_DELTA_E);
  });
});
