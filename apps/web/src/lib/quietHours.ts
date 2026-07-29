// Phase 12 T2 방해금지(DND) 설정 저장. 프로필 테이블/서버 없이 localStorage에 둔다(ponytail) —
// Tauri 위젯도 같은 배포 origin을 로드(옵션 A)하므로 web↔위젯 간 자연 공유된다(다른 기기 동기화는 후속).
// 2026-07-29 (Phase 56 T1 M-011): days(0=일~6=토) 추가 — 없으면 매일(하위호환).
export type QuietHours = { start: number; end: number; days?: number[] };

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
      // days는 선택 — 0-6 정수만 남긴다(범위 밖은 아는 척하지 않고 버림, core coercion과 같은 결).
      const days = Array.isArray(v.days)
        ? v.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6)
        : undefined;
      return days === undefined ? { start: v.start, end: v.end } : { start: v.start, end: v.end, days };
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
