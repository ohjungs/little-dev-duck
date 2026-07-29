// Phase 12 T2 방해금지(DND). 오리가 조용 시간대엔 혼잣말을 안 한다(밤엔 오리도 잔다).
// hour(0-23, 로컬 시각)가 [startHour, endHour) 구간이면 조용. startHour>endHour면 자정을 넘는
// 구간(예: 22시~7시). start===end는 빈 구간(항상 false)으로 본다.
export function isQuietHour(
  hour: number,
  startHour: number,
  endHour: number,
): boolean {
  if (startHour === endHour) return false;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

// 2026-07-29 : 방해금지 - 요일별 (Phase 56 T1 M-011)
/**
 * 지금 조용해야 하는가 — 요일 조건까지 본다. `days`(0=일 ~ 6=토)가 없으면 매일(하위호환).
 * 자정을 넘는 구간(22~07)의 요일 판정은 **지금 요일 기준**이다: 월요일만 켜면 화요일
 * 새벽은 시끄럽다. "월요일 밤부터 이어지는 새벽"까지 원하면 화요일도 켜면 된다 —
 * 시작-요일 역산 같은 영리한 규칙은 설정 화면으로 설명할 수 없다.
 */
export function isQuietNow(
  now: { hour: number; weekday: number },
  pref: { start: number; end: number; days?: readonly number[] },
): boolean {
  if (pref.days !== undefined && !pref.days.includes(now.weekday)) return false;
  return isQuietHour(now.hour, pref.start, pref.end);
}
