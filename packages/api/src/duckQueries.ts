// 2026-07-26 : 오리 조회 - 고정창 - 창밖은영영안보임
// 이 세션에서 같은 부류를 세 번 고쳤다(재색인 상한 · 색인목록 페이지 · 뉴스 요약 창).
// 훑다가 네 번째를 찾았다: 오리의 조회 도구가 쓰는 원본 질의에 limit(500)이 있고 거르기는
// **앱에서** 한다.
//   - listTodos: created_at 내림차순 500 → 오래된 할 일이 창 밖. 2년 전에 만든 항목의 마감이
//     이번 주여도 오리가 못 본다.
//   - listCalendarEvents: start_at **오름차순** 500 → 과거 일정이 창을 채우면 **다가올 일정이
//     아예 안 들어온다**(더 나쁜 쪽).
//
// 공유 함수(listTodos·listCalendarEvents)는 위젯도 쓰므로 기본 동작을 바꾸지 않는다 —
// 캘린더 위젯은 전체를 받아 화면에서 날짜별로 거르는 구조라, 여기서 범위를 좁히면 과거 일정이
// 화면에서 사라질 수 있다(그건 UI 결정이 필요해 별도로 남긴다).
// 대신 **오리 전용 질의**를 두고 조건을 DB로 내린다. 그러면 창 개념 자체가 사라진다.

import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarEventSchema, todoSchema, type CalendarEvent, type Todo } from "@ldd/core";
import type { DuckEventFilter, DuckTodoFilter } from "@ldd/core";

/** 오리에게 되돌아가는 목록의 상한(컨텍스트·무료 쿼터 보호). 정렬·최종 상한은 core 선별기가 맡는다. */
const DUCK_QUERY_LIMIT = 200;

function todoFromRow(r: Record<string, unknown>): Todo {
  return todoSchema.parse({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    isDone: r.is_done,
    dueDate: r.due_date ?? null,
    recurrence: r.recurrence ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

function eventFromRow(r: Record<string, unknown>): CalendarEvent {
  return calendarEventSchema.parse({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    startAt: r.start_at,
    endAt: r.end_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

/** `YYYY-MM-DD`에 일수를 더한다. 날짜 문자열끼리의 순수 계산이라 시간대가 개입하지 않는다. */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  // eslint-disable-next-line no-restricted-syntax -- 위 주석 참조: UTC로 파싱해 UTC로 더한 날짜 문자열
  return d.toISOString().slice(0, 10);
}

export async function listTodosForDuck(
  supabase: SupabaseClient,
  filter: DuckTodoFilter,
  today: string,
): Promise<Todo[]> {
  let q = supabase.from("todos").select("*");
  if (filter.status === "done") q = q.eq("is_done", true);
  if (filter.status === "notDone") q = q.eq("is_done", false);
  if (filter.dueWithinDays !== undefined) {
    // 상한만 건다. **지난 마감은 잘라내지 않는다** — "이번 주 마감 뭐 있어?"에서 이미 지난
    // 것이 가장 급하다(core selectTodosForDuck과 같은 판단).
    q = q.lte("due_date", `${addDays(today, filter.dueWithinDays)}T23:59:59Z`);
  }
  const { data, error } = await q
    .order("due_date", { ascending: true })
    .limit(DUCK_QUERY_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => todoFromRow(r as Record<string, unknown>));
}

export async function listEventsForDuck(
  supabase: SupabaseClient,
  filter: DuckEventFilter,
  today: string,
): Promise<CalendarEvent[]> {
  let q = supabase.from("calendar_events").select("*");
  // 기본은 오늘 이후. 과거가 창을 채워 다가올 일정을 밀어내는 걸 DB에서 막는다.
  if (!filter.includePast) q = q.gte("start_at", `${today}T00:00:00`);
  if (filter.withinDays !== undefined) {
    q = q.lte("start_at", `${addDays(today, filter.withinDays)}T23:59:59`);
  }
  const { data, error } = await q
    .order("start_at", { ascending: true })
    .limit(DUCK_QUERY_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => eventFromRow(r as Record<string, unknown>));
}
