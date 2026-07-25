import { describe, expect, it } from "vitest";
import { selectEventsForDuck, DUCK_EVENT_LIMIT } from "./event-query";
import type { CalendarEvent } from "./calendar-event";

// 앱 자체 캘린더에는 조회 도구가 없었다. 구글 캘린더 어댑터에는 listUpcomingEvents가 있는데,
// **연동하지 않은 사용자(기본 상태)의 앱 내 일정은 오리가 조회할 방법이 아예 없었다.**
// 할 일에 listTodos를 준 것과 같은 공백이라 같은 방식으로 메운다.

const TODAY = "2026-07-26";

// 일정은 **로컬 자정** 기준으로 저장된다(Phase 27 규약 — 할 일의 UTC 자정과 반대다).
// slice(0,10)으로 자르면 UTC 날짜가 나와 KST에서 전날이 된다.
function at(y: number, m: number, d: number, h = 0, min = 0): string {
  return new Date(y, m - 1, d, h, min).toISOString();
}

function ev(id: string, startAt: string, title = "일정"): CalendarEvent {
  return {
    id,
    userId: "u1",
    title,
    startAt,
    endAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  } as CalendarEvent;
}

describe("selectEventsForDuck", () => {
  it("기본은 오늘부터 앞으로의 일정만 준다", () => {
    const list = [
      ev("past", at(2026, 7, 20)),
      ev("today", at(2026, 7, 26)),
      ev("future", at(2026, 7, 28)),
    ];
    expect(selectEventsForDuck(list, {}, TODAY).map((e) => e.id)).toEqual([
      "today",
      "future",
    ]);
  });

  // 할 일은 지난 마감을 포함한다(아직 해야 하니까). 일정은 지나가면 기록이라 기본에서 뺀다 —
  // 대신 "어제 무슨 회의였지?" 같은 질문을 위해 명시적으로 켤 수 있게 둔다.
  it("지난 일정도 명시적으로 요청하면 준다", () => {
    const list = [ev("past", at(2026, 7, 20)), ev("today", at(2026, 7, 26))];
    const got = selectEventsForDuck(list, { includePast: true }, TODAY);
    expect(got.map((e) => e.id)).toEqual(["past", "today"]);
  });

  it("며칠 이내로 범위를 좁힐 수 있다", () => {
    const list = [
      ev("today", at(2026, 7, 26)),
      ev("in2", at(2026, 7, 28)),
      ev("far", at(2026, 8, 30)),
    ];
    expect(selectEventsForDuck(list, { withinDays: 2 }, TODAY).map((e) => e.id)).toEqual([
      "today",
      "in2",
    ]);
  });

  it("빠른 시각 순으로 준다", () => {
    const list = [ev("late", at(2026, 7, 28, 15)), ev("early", at(2026, 7, 27, 9))];
    expect(selectEventsForDuck(list, {}, TODAY).map((e) => e.id)).toEqual([
      "early",
      "late",
    ]);
  });

  // 로컬 자정 저장값을 UTC로 읽으면 KST에서 전날이 되어 "오늘 일정"이 사라진다.
  it("로컬 자정 저장값을 UTC로 잘못 읽지 않는다", () => {
    const list = [ev("today", at(2026, 7, 26, 0, 0))];
    expect(selectEventsForDuck(list, { withinDays: 0 }, TODAY)).toHaveLength(1);
  });

  it("해석할 수 없는 시각은 조용히 버리지 않고 결과에 남긴다", () => {
    // 이상한 값이 있다는 걸 오리도 보고 사용자에게 되물을 수 있어야 한다.
    const list = [ev("bad", "언제였더라")];
    expect(selectEventsForDuck(list, {}, TODAY).map((e) => e.id)).toEqual(["bad"]);
  });

  it("개수 상한을 넘기지 않는다", () => {
    const list = Array.from({ length: DUCK_EVENT_LIMIT + 10 }, (_, i) =>
      ev(`e${i}`, at(2026, 7, 27, 9)),
    );
    expect(selectEventsForDuck(list, {}, TODAY)).toHaveLength(DUCK_EVENT_LIMIT);
  });

  it("빈 목록에서 죽지 않는다", () => {
    expect(selectEventsForDuck([], { withinDays: 7 }, TODAY)).toEqual([]);
  });
});
