import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listTodosForDuck,
  listEventsForDuck,
  listHabits,
  listHabitChecksInRange,
} from "@ldd/api";
import {
  pickInitiative,
  summarizeHabitsForDuck,
  type InitiativeCandidate,
  type InitiativeInput,
  type InitiativeKind,
} from "@ldd/core";

// 2026-07-26 : 오리 - 자율 발화 - 배선 (피드백 1-3)
// 판단은 core `pickInitiative`(순수·규칙)가, 조회는 api가 한다. 여기는 둘을 잇는 자리다.
// **LLM을 부르지 않는다** — 여기서 모델을 쓰면 화면을 열 때마다 무료 쿼터가 나간다.
//
// 오늘 무엇을 말했는지는 localStorage에 남긴다. 서버에 둘 수도 있지만 "오늘 몇 번 말했나"는
// 기기별 화면 경험이고, 이걸 위해 테이블을 늘리면 되돌리기 어려운 스키마 변경이 붙는다.

const KEY = "ldd-duck-initiative";

type Stored = { date: string; count: number; kinds: InitiativeKind[] };

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Stored>;
    if (typeof v.date !== "string" || typeof v.count !== "number") return null;
    return { date: v.date, count: v.count, kinds: Array.isArray(v.kinds) ? v.kinds : [] };
  } catch {
    // 손상된 값이면 없는 것으로 본다 — 자율 발화 때문에 화면이 죽으면 안 된다.
    return null;
  }
}

/** 오늘 이미 말한 기록. 날짜가 바뀌었으면 초기화된 값을 준다. */
export function readSpoken(today: string): { spokenKinds: InitiativeKind[]; spokenCount: number } {
  const s = read();
  if (!s || s.date !== today) return { spokenKinds: [], spokenCount: 0 };
  return { spokenKinds: s.kinds, spokenCount: s.count };
}

/** 실제로 말한 뒤에만 부른다 — 계산만 하고 기록하면 하지도 않은 말을 셌다고 남는다. */
export function markSpoken(today: string, kind: InitiativeKind): void {
  const cur = readSpoken(today);
  const next: Stored = {
    date: today,
    count: cur.spokenCount + 1,
    kinds: cur.spokenKinds.includes(kind) ? cur.spokenKinds : [...cur.spokenKinds, kind],
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막힌 브라우저(프라이빗 모드 등)에서는 상한이 느슨해질 뿐 기능은 돈다.
  }
}

/**
 * 지금 오리가 건넬 말. 없으면 null.
 * 조회가 실패해도 null을 돌려준다 — 부가 기능 때문에 대시보드가 깨지면 안 된다.
 */
export async function loadDuckInitiative(
  supabase: SupabaseClient,
  opts: { now: Date; today: string; quiet: boolean },
): Promise<InitiativeCandidate | null> {
  const { now, today, quiet } = opts;
  if (quiet) return null;

  const spoken = readSpoken(today);

  let input: InitiativeInput;
  try {
    {
      const [todos, events, habits, checks] = await Promise.all([
        // 오늘까지 마감인 미완료 할 일. 지난 마감도 함께 온다(가장 급하다).
        listTodosForDuck(supabase, { status: "notDone", dueWithinDays: 0 }, today),
        listEventsForDuck(supabase, { withinDays: 0 }, today),
        listHabits(supabase),
        listHabitChecksInRange(supabase, today, today),
      ]);

      // 마감일 비교는 문자열 앞 10자리로 한다 — 저장 규약이 UTC 자정이라
      // Date를 거치면 시간대만큼 하루가 밀린다(Phase 23·28에서 반복해 데인 부분).
      const dueDates = todos.map((t) => t.dueDate?.slice(0, 10)).filter(Boolean) as string[];
      const overdueTodos = dueDates.filter((d) => d < today).length;
      const dueTodayTodos = dueDates.filter((d) => d === today).length;

      const next = events
        .map((e) => ({ title: e.title, at: new Date(e.startAt).getTime() }))
        .filter((e) => Number.isFinite(e.at) && e.at >= now.getTime())
        .sort((a, b) => a.at - b.at)[0];

      const uncheckedHabits = summarizeHabitsForDuck(habits, checks, today)
        .filter((h) => !h.checkedToday)
        .map((h) => h.title);

      input = {
        hour: now.getHours(),
        overdueTodos,
        dueTodayTodos,
        uncheckedHabits,
        nextEventInMinutes: next ? Math.round((next.at - now.getTime()) / 60000) : null,
        nextEventTitle: next?.title ?? null,
      };
    }
  } catch {
    // 조회 실패는 조용히 넘긴다. 자율 발화는 부가 기능이고, 여기서 던지면 오리 위젯이 죽는다 —
    // "말을 안 거는 것"은 사용자가 알아차릴 손해가 없지만 위젯이 사라지는 건 아니다.
    return null;
  }

  return pickInitiative(input, { ...spoken, quiet });
}
