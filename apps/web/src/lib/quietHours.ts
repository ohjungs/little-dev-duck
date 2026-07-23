// Phase 12 T2 방해금지(DND) 설정 저장. 프로필 테이블/서버 없이 localStorage에 둔다(ponytail) —
// Tauri 위젯도 같은 배포 origin을 로드(옵션 A)하므로 web↔위젯 간 자연 공유된다(다른 기기 동기화는 후속).
export type QuietHours = { start: number; end: number };

const KEY = "ldd:quietHours";
// 같은 탭에서 설정 변경을 DuckWidget이 즉시 반영하도록 발생시키는 커스텀 이벤트(다른 탭은 storage 이벤트).
export const QUIET_HOURS_EVENT = "ldd:quietHours";

export function readQuietHours(): QuietHours | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<QuietHours>;
    if (typeof v?.start === "number" && typeof v?.end === "number") {
      return { start: v.start, end: v.end };
    }
  } catch {
    // 손상된 값은 무시(설정 없음으로 취급)
  }
  return null;
}

export function writeQuietHours(value: QuietHours | null): void {
  if (typeof window === "undefined") return;
  if (value === null) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(QUIET_HOURS_EVENT));
}
