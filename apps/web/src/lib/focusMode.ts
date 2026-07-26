// 2026-07-27 : 알림 - 집중 모드 - 단일 출처 (Phase 51 T2)
//
// **여기 오기 전 상태: 집중 모드는 아무것도 막지 않았다.**
// `PomodoroWidget`이 키를 쓰고 이벤트를 쏘면서 주석에 "다른 컴포넌트가 이 이벤트를 수신해
// 알림을 억제한다"고 적어 뒀는데, **그 키를 읽는 곳도 이벤트를 듣는 곳도 0곳이었다**(실측).
// 즉 집중 모드를 켜도 알림은 그대로 떴다.
//
// 키를 여기 한 곳에 두고, **억제 판정을 알림 함수 안으로 옮긴다**(notify.ts).
// 호출부마다 확인하게 두면 계획이 경고한 대로 "한쪽만 방해금지를 지키는" 상태가 된다.

export const FOCUS_MODE_KEY = "ldd-focus-mode";
export const FOCUS_CHANGED_EVENT = "ldd:focus-changed";

/** 집중 모드가 켜져 있는가. 저장소 접근이 막혀도 던지지 않는다(알림을 막을 이유는 아니다). */
export function isFocusMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FOCUS_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function enableFocusMode(): void {
  localStorage.setItem(FOCUS_MODE_KEY, "true");
  window.dispatchEvent(new Event(FOCUS_CHANGED_EVENT));
}

export function disableFocusMode(): void {
  localStorage.removeItem(FOCUS_MODE_KEY);
  window.dispatchEvent(new Event(FOCUS_CHANGED_EVENT));
}
