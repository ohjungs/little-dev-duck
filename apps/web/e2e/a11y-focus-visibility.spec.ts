import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// 2026-07-31 : e2e - 접근성 - 컴파일된CSS실측 (SC 1.4.11 / 2.4.7)
//
// **왜 유닛(vitest)으로는 부족한가.**
// globalsTextContrast.test.ts는 globals.css **텍스트**를 파싱하고, focusVisibilityLock.test.ts는
// tsx의 **클래스 문자열**을 본다. 둘 다 소스 층이라 다음 두 가지를 못 본다:
//   (1) 그 토큰이 실제로 브라우저까지 배달되는가 (Tailwind v4 @theme 매핑·빌드 파이프라인)
//   (2) 그 클래스가 **컴파일된 CSS에 규칙으로 존재하는가** — 특히 group-focus-visible:*·
//       focus-within:* 같은 변형은 생성되지 않아도 소스 검사는 통과한다. 그러면 고친 척만 하고
//       화면은 그대로다.
// jsdom에는 Tailwind가 컴파일되지 않으므로(ConfirmDialog.test.tsx 머리말과 같은 한계) 이 층은
// 실브라우저 e2e에서만 잴 수 있다.
//
// **인증도 쓰기도 하지 않는다.** 이 저장소의 e2e는 프로덕션 Supabase에 실계정으로 쓰고
// (cleanup.ts 머리말), 그 정리 대상은 todos·memos뿐이다 — pages/db 행은 남는다. 그래서 검증
// 대상 컴포넌트(PageWorkspace·DbTableView)를 직접 띄우는 대신, **그 파일에 실제로 들어 있는
// 클래스 문자열 원문**을 읽어 공개 페이지의 DOM에 심고 실제 계산값을 잰다. 문자열이 소스에서
// 사라지면 아래 verbatim 단언이 먼저 실패하므로, 죽은 문자열을 테스트하는 상태로 흘러가지 않는다.

const SRC = path.join(__dirname, "..", "src");

/** 소스에 그대로 들어 있어야 하는 클래스 원문. 어긋나면 이 스펙이 먼저 죽는다. */
const CASES = {
  focusVisible: {
    file: path.join(SRC, "components", "PageWorkspace.tsx"),
    className:
      "shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100",
  },
  groupFocusVisible: {
    file: path.join(SRC, "components", "NewsTopWidget.tsx"),
    className:
      "mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-focus-visible:opacity-100 group-hover:opacity-100",
  },
  focusWithin: {
    file: path.join(SRC, "components", "PageEditor.tsx"),
    className:
      "flex justify-start px-4 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
  },
} as const;

// SC 1.4.11. 계약 A: 라이트/다크 × 토큰 3종 × 표면 3종 = 18쌍.
const AA_NON_TEXT = 3;
const NON_TEXT_TOKENS = ["--ring", "--border", "--input"] as const;
const SURFACES = ["--background", "--card", "--muted"] as const;

/**
 * 3자리 축약형을 6자리로 편다.
 *
 * 소스에는 `#ffffff`로 적혀 있어도 빌드(Lightning CSS)가 `#fff`로 줄여 배달한다 — 실측했다.
 * 즉 **소스 파싱 검사와 브라우저 실측은 같은 색을 다른 문자열로 본다.** 이걸 모르면
 * "토큰이 배달되지 않았다"는 잘못된 결론이 난다.
 */
function expandHex(hex: string): string {
  const n = hex.trim().replace("#", "");
  if (n.length === 3) return `#${n[0]}${n[0]}${n[1]}${n[1]}${n[2]}${n[2]}`;
  return `#${n}`;
}

function relativeLuminance(hex: string): number {
  const n = expandHex(hex).replace("#", "");
  const srgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = srgb.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** `#a16207` → `rgb(161, 98, 7)` (계산된 box-shadow는 항상 rgb 표기로 나온다). */
function hexToRgbString(hex: string): string {
  const n = expandHex(hex).replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

/** 테마 클래스를 강제한 뒤 :root의 토큰 실계산값을 읽는다. */
async function readTokens(
  page: Page,
  theme: "light" | "dark",
): Promise<Record<string, string>> {
  return page.evaluate(
    ({ names, dark }) => {
      document.documentElement.classList.toggle("dark", dark);
      const style = getComputedStyle(document.documentElement);
      const out: Record<string, string> = {};
      for (const name of names) out[name] = style.getPropertyValue(name).trim();
      return out;
    },
    {
      names: [...NON_TEXT_TOKENS, ...SURFACES],
      dark: theme === "dark",
    },
  );
}

test.describe("접근성: 컴파일된 CSS 실측 (인증 불필요)", () => {
  test("소스에 검사 대상 클래스 원문이 그대로 있다 (죽은 문자열 방지)", () => {
    for (const [name, c] of Object.entries(CASES)) {
      const source = readFileSync(c.file, "utf8");
      expect(source.length, `${c.file}를 읽지 못했다`).toBeGreaterThan(0);
      expect(
        source.includes(c.className),
        `${name}: ${path.basename(c.file)}에서 클래스 원문이 바뀌었다. 아래 실측 케이스도 같이 갱신해야 한다.`,
      ).toBe(true);
    }
  });

  for (const theme of ["light", "dark"] as const) {
    test(`${theme}: --ring/--border/--input이 브라우저까지 배달되고 표면 3종 위 3:1 이상`, async ({
      page,
    }) => {
      await page.goto("/login");
      const tokens = await readTokens(page, theme);

      for (const name of [...NON_TEXT_TOKENS, ...SURFACES]) {
        // 토큰이 비어 있으면 빌드가 배달하지 못한 것이다 — 소스 파싱 검사로는 못 잡는 실패다.
        // 축약형(#fff)도 정상 배달이므로 3자리·6자리를 모두 인정한다.
        expect(tokens[name], `${name}이 브라우저에 없다`).toMatch(
          /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
        );
      }

      for (const token of NON_TEXT_TOKENS) {
        for (const surface of SURFACES) {
          const ratio = contrastRatio(tokens[token], tokens[surface]);
          expect(
            ratio,
            `${theme} ${token}(${tokens[token]}) vs ${surface}(${tokens[surface]}) = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(AA_NON_TEXT);
        }
      }
    });
  }

  test("Button 포커스링이 알파 없는 --ring 색으로 실제로 그려진다", async ({
    page,
  }) => {
    await page.goto("/login");
    const ring = (await readTokens(page, "light"))["--ring"];

    const button = page.getByRole("button", { name: "Google로 계속하기" });
    // 키보드로 도달해야 :focus-visible이 확실히 붙는다(프로그램 포커스는 브라우저 휴리스틱).
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    expect(
      await button.evaluate((el) => el.matches(":focus-visible")),
      "키보드로 도달했는데 :focus-visible이 붙지 않았다 — 아래 단언이 무의미해진다",
    ).toBe(true);

    // 버튼은 transition-all이라 링 폭·색이 **애니메이션된다**. 곧바로 읽으면 중간값
    // (실측: rgba(161,98,7,0.03) 0 0 0 0.09px)이 잡혀 거짓 실패가 난다. 정착값을 기다린다.
    const settled = expect.poll(
      () => button.evaluate((el) => getComputedStyle(el).boxShadow),
      { message: "포커스링이 정착값에 도달하지 않았다" },
    );
    // 희석하면 rgba(..., 0.6)로 남는다. 정착 후에는 불투명 rgb()여야 3:1이 유지된다.
    await settled.toContain(hexToRgbString(ring));

    const shadow = await button.evaluate(
      (el) => getComputedStyle(el).boxShadow,
    );
    expect(
      /rgba\(\s*161\s*,\s*98\s*,\s*7\s*,\s*(0|0?\.\d+)\s*\)/.test(shadow),
      `링에 알파가 남아 있다: ${shadow}`,
    ).toBe(false);
  });

  test("Input 포커스링도 알파 없는 --ring 색이다", async ({ page }) => {
    await page.goto("/login");
    const ring = (await readTokens(page, "light"))["--ring"];

    const input = page.getByPlaceholder("you@example.com");
    await input.focus();
    await expect(input).toBeFocused();

    await expect
      .poll(() => input.evaluate((el) => getComputedStyle(el).boxShadow), {
        message: "입력칸 포커스링이 --ring 색으로 그려지지 않았다",
      })
      .toContain(hexToRgbString(ring));

    const shadow = await input.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(
      /rgba\(\s*161\s*,\s*98\s*,\s*7\s*,\s*(0|0?\.\d+)\s*\)/.test(shadow),
      `링에 알파가 남아 있다: ${shadow}`,
    ).toBe(false);
  });

  test("호버 전용 컨트롤이 키보드 포커스로 실제로 드러난다 (변형 3종 컴파일 확인)", async ({
    page,
  }) => {
    await page.goto("/login");

    // 페이지의 컴파일된 스타일시트를 그대로 쓰되, 본문 레이아웃과 섞이지 않게 격리해 심는다.
    await page.evaluate((cases) => {
      const host = document.createElement("div");
      host.id = "a11y-harness";
      host.style.cssText = "position:fixed;left:0;top:0;z-index:9999";
      host.innerHTML = `
        <div class="group"><button id="case-fv" class="${cases.focusVisible.className}">fv</button></div>
        <a id="case-gfv-anchor" href="#" class="group"><span id="case-gfv" class="${cases.groupFocusVisible.className}">gfv</span></a>
        <div class="group"><div id="case-fw" class="${cases.focusWithin.className}"><button id="case-fw-btn">fw</button></div></div>
        <div class="group"><button id="case-neg" class="opacity-0 transition-opacity group-hover:opacity-100">neg</button></div>
      `;
      document.body.prepend(host);
    }, CASES);

    // 시작 상태: 넷 다 숨어 있어야 한다(그래야 뒤의 "1"이 의미를 갖는다).
    for (const id of ["case-fv", "case-gfv", "case-fw", "case-neg"]) {
      expect(
        await page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).opacity),
        `${id}의 초기 opacity`,
      ).toBe("0");
    }

    // focus-visible: 자기가 포커스를 받는 컨트롤.
    await page.locator("#case-fv").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect
      .poll(
        () =>
          page
            .locator("#case-fv")
            .evaluate((el) => getComputedStyle(el).opacity),
        { message: "focus-visible:opacity-100이 컴파일되지 않았거나 적용되지 않았다" },
      )
      .toBe("1");

    // group-focus-visible: 자기는 포커스를 못 받는 장식, 감싼 링크가 포커스를 받는 경우.
    await page.locator("#case-gfv-anchor").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect
      .poll(
        () =>
          page
            .locator("#case-gfv")
            .evaluate((el) => getComputedStyle(el).opacity),
        { message: "group-focus-visible:opacity-100이 컴파일되지 않았거나 적용되지 않았다" },
      )
      .toBe("1");

    // focus-within: 컨테이너째 숨긴 경우.
    await page.locator("#case-fw-btn").focus();
    await expect
      .poll(
        () =>
          page
            .locator("#case-fw")
            .evaluate((el) => getComputedStyle(el).opacity),
        { message: "focus-within:opacity-100이 컴파일되지 않았거나 적용되지 않았다" },
      )
      .toBe("1");

    // 대조군: 되살림 변형이 없는 옛 패턴은 포커스를 받아도 숨은 채다.
    // (이게 "1"이 되면 위 결과는 변형 덕이 아니라 다른 이유였다는 뜻이라 검사가 무의미해진다.)
    await page.locator("#case-neg").focus();
    await page.waitForTimeout(400);
    expect(
      await page
        .locator("#case-neg")
        .evaluate((el) => getComputedStyle(el).opacity),
      "대조군이 드러났다 — 이 검사는 포커스 변형을 재고 있지 않다",
    ).toBe("0");
  });
});
