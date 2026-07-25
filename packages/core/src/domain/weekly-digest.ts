import { startOfWeek, toLocalDateString } from "./date-util";
import type { StandupInput } from "./standup";

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

export type DigestRange = { start: string; end: string };

export function weeklyDigestTitle(range: DigestRange): string {
  return `주간 다이제스트 ${range.start} ~ ${range.end}`;
}

// 일정 제목을 본문에 몇 개까지 늘어놓을지. 넘으면 개수만 알린다 — 일정이 많은 주에
// 다이제스트가 일정 목록으로 뒤덮이면 요약이 아니다.
const MAX_LISTED_EVENTS = 5;

// 2026-07-26 : 리텐션 - 주간다이제스트 - 본문
// LLM을 쓰지 않는다. 스탠드업(일간)이 이미 Gemini 요약을 담당하고, 주간 다이제스트는 무료 쿼터가
// 없거나 소진돼도 반드시 떠야 하는 복귀 훅이다. 수치 요약만으로도 "지난 주 뭐 했더라"는 충족된다.
// 각 원소가 한 줄(=블록 하나)이라 줄 안에 개행이 남으면 안 된다.
export function formatWeeklyDigestLines(
  input: StandupInput,
  range: DigestRange,
): string[] {
  const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
  const events = input.calendarEvents.map(oneLine).filter(Boolean);
  const eventsLine =
    events.length === 0
      ? "일정: 없음"
      : events.length > MAX_LISTED_EVENTS
        ? `일정: ${events.slice(0, MAX_LISTED_EVENTS).join(", ")} 외 ${events.length - MAX_LISTED_EVENTS}건 (총 ${events.length}건)`
        : `일정: ${events.join(", ")} (총 ${events.length}건)`;

  return [
    `지난 주(${range.start} ~ ${range.end}) 기록이에요. 한 주 수고했어요.`,
    "지난 주 요약",
    `할 일: ${input.todosTotal}개 중 ${input.todosCompleted}개 완료`,
    `습관 체크: ${input.habitsChecked}회`,
    `집중: ${input.pomodoroSessions}회, 총 ${input.pomodoroMinutes}분`,
    `페이지 편집: ${input.pagesEdited}건`,
    eventsLine,
    "이번 주 계획",
    "",
  ];
}
