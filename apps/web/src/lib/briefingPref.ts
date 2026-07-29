// 2026-07-29 : 뉴스 - 브리핑 보기 취향 (Phase 61 T4)
// 한 장씩/목록 보기와 글자 크기. 기기별 취향이라 localStorage(dataSaverPref와 같은 결).
// 키·허용값은 여기 한 곳 — 화면이 문자열을 직접 만들면 오타가 조용히 기본값이 된다.

const VIEW_KEY = "ldd-briefing-view";
const FONT_KEY = "ldd-briefing-font";

export type BriefingView = "list" | "single";
export type BriefingFont = "base" | "large";

export function getBriefingView(): BriefingView {
  if (typeof window === "undefined") return "list";
  try {
    return window.localStorage.getItem(VIEW_KEY) === "single" ? "single" : "list";
  } catch {
    return "list";
  }
}

export function setBriefingView(view: BriefingView): void {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // 저장 실패로 보기를 막지 않는다.
  }
}

export function getBriefingFont(): BriefingFont {
  if (typeof window === "undefined") return "base";
  try {
    return window.localStorage.getItem(FONT_KEY) === "large" ? "large" : "base";
  } catch {
    return "base";
  }
}

export function setBriefingFont(font: BriefingFont): void {
  try {
    window.localStorage.setItem(FONT_KEY, font);
  } catch {
    // 저장 실패로 보기를 막지 않는다.
  }
}
