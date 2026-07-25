import { startOfWeek, toLocalDateString } from "./date-util";

// 오리 주간 다이제스트(Phase 18 T4)의 트리거 판정. 순수함수 — 실제 집계·페이지 생성·알림은 호출부.
//
// 2026-07-26 : 리텐션 - 주간다이제스트 - 트리거
// "주 1회, 지난 주를 요약"이 규칙이다. 이번 주를 요약하면 주 중간에 만든 다이제스트가 반쪽이
// 되므로 항상 완결된 지난 주를 대상으로 한다. 사용자가 수요일에 처음 들어와도 지난 주 요약이
// 떠서 복귀 훅이 된다.

const WEEK_MS = 7 * 86_400_000;

// 이번 시점에 만들어야 할 다이제스트가 다루는 주 = 지난 주 월요일(로컬, YYYY-MM-DD).
// 같은 주 안에서는 요일과 무관하게 같은 값이라 중복 생성 방지 키로 그대로 쓴다.
export function digestWeekKey(now: Date): string {
  const thisMonday = startOfWeek(now);
  return toLocalDateString(
    new Date(
      thisMonday.getFullYear(),
      thisMonday.getMonth(),
      thisMonday.getDate() - 7,
    ),
  );
}

// 요약 대상 기간(지난 주 월~일). 활동 조회 쿼리의 경계로 쓴다.
export function previousWeekRange(now: Date): { start: string; end: string } {
  const start = digestWeekKey(now);
  const [y, m, d] = start.split("-").map(Number);
  return { start, end: toLocalDateString(new Date(y, m - 1, d + 6)) };
}

// 아직 이번 차례의 다이제스트를 안 만들었으면 true.
// lastWeekKey가 깨진 값이면 "만든 적 없음"으로 본다(저장소 오염에 막히지 않게).
// 저장된 키가 지금 만들 키보다 미래면(기기 시계 되돌림) 만들지 않는다 — 같은 주 중복 생성 방지.
export function shouldCreateDigest(input: {
  now: Date;
  lastWeekKey: string | null;
}): boolean {
  const target = digestWeekKey(input.now);
  const last = input.lastWeekKey;
  if (!last || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return true;
  const lastMs = Date.parse(`${last}T00:00:00Z`);
  const targetMs = Date.parse(`${target}T00:00:00Z`);
  if (Number.isNaN(lastMs)) return true;
  return targetMs - lastMs >= WEEK_MS;
}
