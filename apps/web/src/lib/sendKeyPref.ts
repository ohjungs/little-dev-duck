// 2026-07-29 : 메신저 - 전송 키 설정 저장 (F-003)
// 기기별 취향이라 localStorage다(local-prefs.ts의 결). 키는 여기 한 곳.

import type { SendKeyMode } from "@/lib/composition";

const SEND_KEY_KEY = "ldd-send-key";

export function getSendKeyMode(): SendKeyMode {
  if (typeof window === "undefined") return "enter";
  try {
    const raw = window.localStorage.getItem(SEND_KEY_KEY);
    // 모르는 값이면 기본값 — 낡은 값이 남아 있어도 입력이 굳지 않는다.
    return raw === "ctrl-enter" ? "ctrl-enter" : "enter";
  } catch {
    return "enter";
  }
}

export function setSendKeyMode(mode: SendKeyMode): void {
  try {
    window.localStorage.setItem(SEND_KEY_KEY, mode);
  } catch {
    // 저장 실패로 설정 화면을 막지 않는다. 다음 방문에 기본값일 뿐이다.
  }
}
