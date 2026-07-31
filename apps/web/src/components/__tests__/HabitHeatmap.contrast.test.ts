import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-27 : 습관 잔디 - 대비를 숫자로 (2차 피드백 3-2, Phase 42 T6)
// 사용자가 "잔디가 잘 안 보인다"고 했다. **색을 눈으로 다시 고르면 다음에 또 지적받는다** —
// 그래서 기준을 숫자로 잠근다.
//
// 검사 대상은 컴포넌트 소스가 아니라 **globals.css 실물**이다. 이 저장소가 빌드 산출물
// (`buildStaticGuard`)과 마이그레이션(`schemaGuard`)에 쓰는 방식과 같다 — 진짜 쓰이는 값을
// 읽어야 검사가 살아 있다. 값을 컴포넌트에 클래스로 박으면 이 검사가 불가능하다.
//
// **명도 대비(WCAG)가 아니라 지각 거리(CIE ΔE)를 쓴다.** 명도만 재면 밝기가 비슷하고 색이
// 다른 두 칸을 "구분 안 됨"으로 잘못 판정한다. ΔE는 밝기와 색을 함께 본다.
// 기준선: ΔE 2.3 = 사람이 겨우 알아채는 최소 차이(JND). 잔디는 훑어보는 화면이라
// 그보다 넉넉히 잡는다.
//
// 2026-07-31 : 파일 이름은 HabitHeatmap이지만 **0..4 레벨 램프 전부**를 검사한다.
// --heat-*에는 이 검사가 있었는데 나중에 들어온 --gh-*(GitHub 잔디)는 같은 성격인데도
// 검사를 받지 않아, 다크 레벨 0이 카드와 ΔE 4.0인 채로 게이트를 통과했다(차단 건).
// 그래서 **목록을 손으로 적지 않고** globals.css에서 `--X-0`을 찾아 램프를 자동 발견한다.
// 새 잔디 팔레트를 넣으면 다음 실행부터 자동으로 이 기준을 받는다. 파일을 새로 파면
// 파싱·ΔE 구현이 두 벌이 되고 한쪽만 갱신되는 드리프트가 난다 — 그게 이 사고의 원인이었다.

const CSS = readFileSync(
  path.join(__dirname, "..", "..", "app", "globals.css"),
  "utf8",
);

// 인접 레벨은 이만큼 떨어져 있어야 한다. JND(2.3)의 다섯 배 — 훑어봐도 구분되게.
const MIN_ADJACENT_DELTA_E = 12;
// 레벨 0(체크 안 한 날)이 카드 배경에 묻히면 잔디의 격자 자체가 사라진다.
const MIN_LEVEL0_VS_CARD_DELTA_E = 6;

function blockOf(selector: string): string {
  // `.dark {` 는 인쇄용 media query 안에도 있다. **맨 처음 것**(팔레트 정의)만 본다.
  const start = CSS.indexOf(selector);
  expect(start, `${selector} 블록을 찾지 못했다`).toBeGreaterThan(-1);
  const end = CSS.indexOf("\n}", start);
  return CSS.slice(start, end);
}

// 테스트를 팔레트마다 만들어야 하므로 수집 시점에 판다(여기서는 expect를 쓰지 않는다).
function rampFamiliesOf(selector: string): string[] {
  const start = CSS.indexOf(selector);
  if (start < 0) return [];
  const block = CSS.slice(start, CSS.indexOf("\n}", start));
  return [...block.matchAll(/--([a-z0-9-]+)-0:\s*#[0-9a-fA-F]{6}/g)]
    .map((m) => m[1])
    .sort();
}

// 레벨 0이 있는 것만 램프로 본다 — --chart-*/--memo-*는 1부터라 여기 걸리지 않는다.
const FAMILIES = rampFamiliesOf(":root {");

function varsOf(
  selector: string,
  family: string,
): { levels: string[]; card: string } {
  const block = blockOf(selector);
  const levels = [0, 1, 2, 3, 4].map((i) => {
    const m = new RegExp(`--${family}-${i}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
    expect(m, `${selector}에 --${family}-${i}가 없다`).not.toBeNull();
    return m![1];
  });
  const card = /--card:\s*(#[0-9a-fA-F]{6})/.exec(block);
  expect(card, `${selector}에 --card가 없다`).not.toBeNull();
  return { levels, card: card![1] };
}

// sRGB 16진색 → CIE L*a*b*. 표준 변환식이라 라이브러리를 새로 들이지 않는다.
function lab(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  const srgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = srgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  const [r, g, b] = lin;
  // D65 백색점으로 정규화한 XYZ.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

describe("레벨 램프 색 대비 (globals.css 실물 검사, 팔레트 자동 발견)", () => {
  it("램프를 실제로 찾아냈고 라이트·다크가 같은 목록이다", () => {
    // 발견이 0건이면 아래 테스트가 하나도 생성되지 않고 스위트는 초록으로 끝난다 —
    // 검사가 죽는 가장 조용한 방식이라 여기서 못을 박는다.
    expect(FAMILIES, "0..4 램프를 찾지 못했다").toEqual(
      expect.arrayContaining(["gh", "heat"]),
    );
    // 한쪽 모드에만 있는 램프는 그 모드에서 검사를 통째로 건너뛴다.
    expect(rampFamiliesOf(".dark {"), "라이트/다크 램프 목록이 다르다").toEqual(
      FAMILIES,
    );
  });

  for (const mode of [
    { name: "라이트", selector: ":root {" },
    { name: "다크", selector: ".dark {" },
  ]) {
    for (const family of FAMILIES) {
      it(`${mode.name} --${family}-*: 인접 레벨이 훑어봐도 구분된다`, () => {
        const { levels } = varsOf(mode.selector, family);
        for (let i = 0; i < levels.length - 1; i += 1) {
          const d = deltaE(levels[i], levels[i + 1]);
          expect(
            d,
            `레벨 ${i}(${levels[i]})와 ${i + 1}(${levels[i + 1]})이 너무 가깝다`,
          ).toBeGreaterThanOrEqual(MIN_ADJACENT_DELTA_E);
        }
      });

      it(`${mode.name} --${family}-*: 빈 칸이 카드 배경에 묻히지 않는다`, () => {
        // 전에 이 검사가 없어서 다크 --heat-0이 카드와 ΔE 1.8이었다 — JND(2.3)보다 낮다.
        // --gh-0도 같은 이유로 4.0이었다(검사가 --heat-*에만 걸려 있어 새 팔레트가 새어 나갔다).
        const { levels, card } = varsOf(mode.selector, family);
        expect(
          deltaE(levels[0], card),
          `레벨 0(${levels[0]})이 카드(${card})와 구분되지 않는다`,
        ).toBeGreaterThanOrEqual(MIN_LEVEL0_VS_CARD_DELTA_E);
      });

      it(`${mode.name} --${family}-*: 레벨이 한 방향으로만 진해진다`, () => {
        // 중간이 튀면 "많이 한 날"이 "적게 한 날"보다 연해 보인다. 라이트는 어두워지는 방향,
        // 다크는 밝아지는 방향이다(배경이 반대라 방향도 반대여야 한다).
        const { levels } = varsOf(mode.selector, family);
        const lightness = levels.map((h) => lab(h)[0]);
        const goingDarker = mode.selector === ":root {";
        for (let i = 0; i < lightness.length - 1; i += 1) {
          const step = lightness[i + 1] - lightness[i];
          expect(
            goingDarker ? step : -step,
            `레벨 ${i}→${i + 1}에서 방향이 뒤집힌다`,
          ).toBeLessThan(0);
        }
      });
    }
  }

  it("검사가 실제로 작동한다 (가짜 입력)", () => {
    // 실물만 읽는 검사는 통과해도 살아 있는지 알 수 없다 — 이 저장소가 `schemaGuard`
    // 머리말에 적어 둔 원칙이다. 구분되지 않는 두 색을 넣으면 기준에 걸려야 한다.
    expect(deltaE("#f4f1ea", "#ffffff")).toBeLessThan(MIN_ADJACENT_DELTA_E);
    // 전에 다크 레벨 0이던 값과 그 카드 배경 — 사람이 구분하는 최소치(2.3)보다도 낮았다.
    expect(deltaE("#26211a", "#221e18")).toBeLessThan(2.3);
    // 게이트에 걸린 다크 --gh-0(#2a251c). JND는 넘지만 격자를 훑을 때는 빈 칸이 안 보였다.
    expect(deltaE("#2a251c", "#221e18")).toBeLessThan(MIN_LEVEL0_VS_CARD_DELTA_E);
    // 같은 색은 0, 흰색과 검은색은 100에 가깝다(변환식 자체가 맞는지).
    expect(deltaE("#123456", "#123456")).toBe(0);
    expect(deltaE("#000000", "#ffffff")).toBeGreaterThan(99);
  });
});
