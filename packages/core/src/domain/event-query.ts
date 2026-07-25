// 2026-07-26 : 오리 - 앱캘린더조회 - 도구공백
// 구글 캘린더 어댑터에는 listUpcomingEvents가 있는데, **앱 자체 캘린더에는 조회 도구가 없었다.**
// 구글을 연동하지 않은 사용자(기본 상태)의 앱 내 일정은 오리가 조회할 방법이 아예 없어,
// "내일 일정 뭐 있어?"는 벡터 검색 상위 몇 개에만 기댔다. 할 일(listTodos)과 같은 공백이다.
//
// 여기는 순수 선별 로직만 둔다(I/O 없음). 날짜 규약이 이 저장소 버그의 단골이라 한 곳에 모은다.

import { epochDay, toLocalDateString } from "./date-util";
import type { CalendarEvent } from "./calendar-event";

// 결과는 LLM 컨텍스트로 되돌아간다 — 무제한이면 무료 쿼터를 갉아먹고 답도 산만해진다.
export const DUCK_EVENT_LIMIT = 30;

export type DuckEventFilter = {
  /** 오늘부터 N일 이내만. 생략하면 앞으로의 일정 전부. */
  withinDays?: number;
  /** 지난 일정도 포함할지. 기본은 제외 — 지나간 일정은 기록이지 예정이 아니다. */
  includePast?: boolean;
};

// 일정은 **로컬 자정** 기준으로 저장된다(Phase 27 규약 — 할 일의 UTC 자정과 반대다).
// `slice(0, 10)`으로 자르면 UTC 날짜가 나와 KST에서 전날이 된다(localDateKey.ts와 같은 규약).
function localDay(startAt: string): number | null {
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return null;
  return epochDay(toLocalDateString(d));
}

export function selectEventsForDuck(
  events: CalendarEvent[],
  filter: DuckEventFilter,
  today: string,
): CalendarEvent[] {
  const todayDay = epochDay(today);

  const filtered = events.filter((e) => {
    const day = localDay(e.startAt);
    // 해석할 수 없는 시각은 조용히 버리지 않는다 — 이상한 값이 있다는 걸 오리도 봐야
    // 사용자에게 되물을 수 있다. 버리면 "일정이 없다"는 틀린 답이 된다.
    if (day === null) return true;
    if (!filter.includePast && day < todayDay) return false;
    if (filter.withinDays !== undefined && day - todayDay > filter.withinDays) return false;
    return true;
  });

  return filtered
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.startAt).getTime();
      const tb = new Date(b.startAt).getTime();
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1; // 해석 못 하는 건 뒤로
      if (Number.isNaN(tb)) return -1;
      return ta - tb;
    })
    .slice(0, DUCK_EVENT_LIMIT);
}
