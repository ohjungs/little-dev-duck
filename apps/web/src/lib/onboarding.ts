// Phase 13 T1 온보딩. 최초 1회 안내 오버레이 표시 여부를 localStorage로 기억(ponytail, 서버 불필요).
const KEY = "ldd:onboarded";

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true; // SSR에선 안 띄운다
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function setOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // 저장 실패는 무시(다음 방문에 다시 안내될 뿐 기능엔 무해)
  }
}
