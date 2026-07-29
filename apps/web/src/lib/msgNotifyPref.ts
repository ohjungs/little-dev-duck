// 2026-07-29 : 메신저 - 알림 방식·키워드 저장 (Phase 56 T1 M-007·M-008)
// 모드는 기기별 취향이라 localStorage(sendKeyPref와 같은 결). 키워드 키는
// core LOCAL_PREF_SPECS("ldd:notify-keywords")와 같아야 백업에 담긴다 — 키는 여기 한 곳.

import type { MessageNotifyMode } from "@ldd/core";

const MODE_KEY = "ldd-msg-notify-mode";
// core local-prefs.ts의 허용 목록과 같은 리터럴이어야 한다(정적 검사로 잠금).
const KEYWORDS_KEY = "ldd:notify-keywords";

export function getMsgNotifyMode(): MessageNotifyMode {
  if (typeof window === "undefined") return "all";
  try {
    const raw = window.localStorage.getItem(MODE_KEY);
    // 모르는 값이면 기본값(전부) — 낡은 값 때문에 알림이 조용히 죽지 않는다.
    return raw === "keywords" || raw === "off" ? raw : "all";
  } catch {
    return "all";
  }
}

export function setMsgNotifyMode(mode: MessageNotifyMode): void {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // 저장 실패로 설정 화면을 막지 않는다.
  }
}

export function getNotifyKeywords(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEYWORDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function setNotifyKeywords(keywords: string[]): void {
  try {
    window.localStorage.setItem(KEYWORDS_KEY, JSON.stringify(keywords));
  } catch {
    // 저장 실패로 설정 화면을 막지 않는다.
  }
}
