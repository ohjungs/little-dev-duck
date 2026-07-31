import { readdirSync, readFileSync } from "node:fs";
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
// globals.css가 실제로 지배하는 범위. Tailwind는 이 트리의 클래스만 스캔하므로 검사 범위도 같다.
const WEB_SRC = path.join(__dirname, "..", "..");

const AA_NORMAL_TEXT = 4.5;
// SC 1.4.11 비텍스트 대비: UI 컴포넌트의 경계·상태 표시는 인접 색과 3:1 이상.
const AA_NON_TEXT = 3;
// 사용자가 "이 컨트롤이 어디까지인지"를 이 색으로만 판단하는 토큰들.
const NON_TEXT_TOKENS = ["--ring", "--border", "--input"];
// 위 토큰이 실제로 얹히는 표면. **한 종만 재면 통과처럼 보이는 값이 통과한다** —
// 기각된 #9b8f7a가 그 사례라 아래 가짜 입력 검사에 박아 뒀다.
const SURFACES = ["--background", "--card", "--muted"];

// 아래 교차 검사는 **가짜 CSS**로도 돌려야(검사가 살아 있는지) 하므로 파싱은 인자로 받는다.
function sliceBlock(css: string, selector: string): string {
  // `.dark {` 는 인쇄용 media query 안에도 있다. 맨 처음 것(팔레트 정의)만 본다.
  const start = css.indexOf(selector);
  if (start < 0) return "";
  return css.slice(start, css.indexOf("\n}", start));
}

function blockOf(selector: string): string {
  const block = sliceBlock(CSS, selector);
  expect(block, `${selector} 블록을 찾지 못했다`).not.toBe("");
  return block;
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

// 2026-07-31 : 접근성 - 텍스트 대비 - 전경/배경 짝 (게이트 차단 건)
// 위 두 describe는 **이름을 아는 토큰**만 잰다. 그래서 `--destructive-foreground`처럼
// 아예 없는 토큰은 잴 대상조차 되지 않았다. 여기서는 목록을 쓰지 않고 `--X-foreground`를
// globals.css에서 **찾아내서** 짝 `--X` 위 대비를 잰다 — 팔레트에 새 짝을 추가하면
// 다음 실행부터 자동으로 검사 대상이 된다.
describe("전경/배경 짝 대비 (--X-foreground vs --X, 자동 발견)", () => {
  for (const mode of [
    { name: "라이트", selector: ":root {" },
    { name: "다크", selector: ".dark {" },
  ]) {
    it(`${mode.name}: 모든 --X-foreground가 짝 위에서 AA(4.5:1) 이상`, () => {
      const block = blockOf(mode.selector);
      const pairs = [
        ...block.matchAll(/--([a-z0-9-]+)-foreground:\s*(#[0-9a-fA-F]{6})/g),
      ];
      // 발견이 0건이면 아래 루프가 조용히 통과한다 — 검사가 죽는 가장 흔한 방식이다.
      expect(pairs.length, `${mode.selector}에서 -foreground 짝을 찾지 못했다`).toBeGreaterThanOrEqual(7);

      for (const [, name, fg] of pairs) {
        const bg = varOf(block, `--${name}`, mode.selector);
        const ratio = contrastRatio(fg, bg);
        expect(
          ratio,
          `${mode.name} --${name}-foreground(${fg}) on --${name}(${bg}) = ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    });
  }

  it("검사가 실제로 작동한다 (토큰이 없어 --foreground가 상속되던 값)", () => {
    // 라이트: #262117 on #dc2626 = 3.31:1.
    expect(contrastRatio("#262117", "#dc2626")).toBeLessThan(AA_NORMAL_TEXT);
    // 다크: #f4f0e6 on #f87171 = 2.32:1.
    expect(contrastRatio("#f4f0e6", "#f87171")).toBeLessThan(AA_NORMAL_TEXT);
  });
});

// ── 정의 ↔ 참조 교차 검사 ───────────────────────────────────────────────────
// 2026-07-31 : 접근성 - 미정의 토큰 - 구조 (게이트 차단 건의 근본 원인)
// `text-destructive-foreground`가 다섯 관문을 통과한 이유는 대비가 잘못 계산돼서가 아니라
// **아무도 "그 토큰이 있긴 한가"를 묻지 않아서**다. Tailwind v4는 미정의 토큰의 유틸리티를
// 만들지 않고 경고도 없다 — 클래스가 조용히 사라진다.
// 교훈 L-23("목록이 둘이면 짝을 검사로 묶어라"). 여기서 두 목록은 `@theme inline` 정의와
// 소스의 클래스 참조이고, 차집합이 0이어야 한다.
//
// 허용목록을 쓰지 않는다. Tailwind 기본 팔레트(`text-red-500`)와 비색상 유틸(`text-sm`)을
// 일일이 열거하면 그게 또 하나의 손으로 관리하는 목록이 된다. 대신 **네임스페이스 첫 마디**로
// 가른다: globals.css가 정의한 토큰 이름의 첫 마디(`destructive`, `muted`, `gh` …)로 시작하는
// 참조만 우리 것으로 보고, 그건 반드시 정의돼 있어야 한다.
const UTILITY_PREFIXES = [
  "text", "bg", "border", "ring", "fill", "stroke",
  "from", "via", "to", "outline", "decoration", "shadow", "caret",
  "divide", "placeholder", "accent",
].join("|");

function utilityValues(source: string): string[] {
  // `(?!:)`는 CSS-in-JS 문자열 속 **CSS 속성명**(`border-radius:`)을 클래스로 오인하지 않게 한다.
  const re = new RegExp(
    `\\b(?:${UTILITY_PREFIXES})-([a-z][a-z0-9-]*)(?:/\\d+)?(?!:)\\b`,
    "g",
  );
  return [...source.matchAll(re)].map((m) => m[1]);
}

function themeColorTokens(css: string): Set<string> {
  const theme = sliceBlock(css, "@theme inline {");
  return new Set(
    [...theme.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]),
  );
}

function tokenNamespace(css: string): Set<string> {
  const names = [
    ...themeColorTokens(css),
    ...[...sliceBlock(css, ":root {").matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]),
    ...[...sliceBlock(css, ".dark {").matchAll(/--([a-z0-9-]+):/g)].map((m) => m[1]),
  ];
  return new Set(names.map((n) => n.split("-")[0]));
}

function undefinedColorTokenRefs(css: string, source: string): string[] {
  const defined = themeColorTokens(css);
  const namespace = tokenNamespace(css);
  const missing = new Set<string>();
  for (const value of utilityValues(source)) {
    if (!namespace.has(value.split("-")[0])) continue;
    if (defined.has(value)) continue;
    missing.add(value);
  }
  return [...missing].sort();
}

// 테스트 파일은 제외한다 — 아래 가짜 입력에 일부러 넣은 클래스 문자열까지 실물로 세면
// 검사가 제 꼬리를 문다. 화면에 나가는 소스만 본다.
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("미정의 색 토큰 참조 (globals.css 정의 ↔ 소스 참조 교차 검사)", () => {
  it("apps/web/src가 쓰는 색 토큰이 전부 @theme inline에 정의돼 있다", () => {
    const files = sourceFiles(WEB_SRC);
    // 스캔이 0건이면 아래 단언이 무조건 통과한다.
    expect(files.length, "소스를 한 건도 찾지 못했다").toBeGreaterThan(50);

    const offenders: string[] = [];
    for (const file of files) {
      for (const ref of undefinedColorTokenRefs(CSS, readFileSync(file, "utf8"))) {
        offenders.push(`${path.relative(WEB_SRC, file)} → ${ref}`);
      }
    }
    expect(
      offenders,
      "정의 없는 토큰을 참조한다 — Tailwind v4는 이 클래스를 만들지 않으므로 색이 조용히 사라진다",
    ).toEqual([]);
  });

  it("검사가 실제로 작동한다 (정의를 지우면 잡힌다)", () => {
    const broken = CSS.replace(
      "--color-destructive-foreground: var(--destructive-foreground);",
      "",
    );
    // 치환이 빗나가면(줄이 바뀌면) 아래 단언이 원본을 검사해 무의미해진다.
    expect(broken, "@theme inline 매핑 줄을 찾지 못했다").not.toBe(CSS);
    expect(
      undefinedColorTokenRefs(
        broken,
        'className="bg-destructive text-destructive-foreground"',
      ),
    ).toEqual(["destructive-foreground"]);
  });

  it("검사가 실제로 작동한다 (모르는 팔레트도 잡는다)", () => {
    const fakeCss =
      ":root {\n  --widget: #ffffff;\n}\n@theme inline {\n  --color-widget: var(--widget);\n}";
    expect(
      undefinedColorTokenRefs(fakeCss, 'class="bg-widget text-widget-foreground"'),
    ).toEqual(["widget-foreground"]);
  });

  it("Tailwind 기본값과 CSS 속성명은 오탐하지 않는다", () => {
    expect(
      undefinedColorTokenRefs(
        CSS,
        'class="text-red-500 bg-black/50 text-sm text-center border-2 ring-offset-background bg-gradient-to-b"',
      ),
    ).toEqual([]);
    // CSS-in-JS 문자열의 속성명은 클래스가 아니다(packages/mascot이 실제로 이렇게 쓴다).
    expect(
      undefinedColorTokenRefs(CSS, "border-radius:16px;text-decoration:none;"),
    ).toEqual([]);
  });
});
