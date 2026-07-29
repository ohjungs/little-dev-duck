// 2026-07-29 : 설정 - 데이터 절약 모드 (Phase 56 T2 T-009)
// 무료 티어 대역폭(5GB/월) 대책 — 켜면 대화의 사진을 자동으로 안 불러오고 누를 때만.
// 기기별 취향이라 localStorage(sendKeyPref와 같은 결). 키는 여기 한 곳.

const KEY = "ldd-data-saver";

export function getDataSaver(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setDataSaver(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // 저장 실패로 설정 화면을 막지 않는다.
  }
}
