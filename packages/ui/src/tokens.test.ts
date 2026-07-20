import { describe, expect, it } from "vitest";
import { darkTheme, lightTheme, type ThemeTokens } from "./tokens";

const WCAG_AA_MIN_CONTRAST = 4.5;

function hexToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * hexToLinear(r) + 0.7152 * hexToLinear(g) + 0.0722 * hexToLinear(b)
  );
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

describe("design tokens", () => {
  it("라이트/다크 토큰 스냅샷", () => {
    expect({ lightTheme, darkTheme }).toMatchSnapshot();
  });

  it.each([
    ["light", lightTheme],
    ["dark", darkTheme],
  ] as [string, ThemeTokens][])(
    "%s 테마: bg/text 대비가 WCAG AA(4.5:1) 이상이다",
    (_name, theme) => {
      expect(contrastRatio(theme.bg, theme.text)).toBeGreaterThanOrEqual(
        WCAG_AA_MIN_CONTRAST,
      );
    },
  );

  it.each([
    ["light", lightTheme],
    ["dark", darkTheme],
  ] as [string, ThemeTokens][])(
    "%s 테마: accent/textOnAccent 대비가 WCAG AA(4.5:1) 이상이다",
    (_name, theme) => {
      expect(
        contrastRatio(theme.accent, theme.textOnAccent),
      ).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
    },
  );

  it.each([
    ["light", lightTheme],
    ["dark", darkTheme],
  ] as [string, ThemeTokens][])(
    "%s 테마: surface/textOnAccent 대비가 WCAG AA(4.5:1) 이상이다",
    (_name, theme) => {
      expect(
        contrastRatio(theme.surface, theme.textOnAccent),
      ).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
    },
  );

  it("다크 전환 시 bg와 text가 서로 뒤바뀐다", () => {
    expect(darkTheme.bg).toBe(lightTheme.text);
    expect(darkTheme.text).toBe(lightTheme.bg);
  });
});
