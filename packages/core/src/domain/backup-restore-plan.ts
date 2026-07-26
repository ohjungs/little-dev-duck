import { todoSchema, type Todo } from "./todo";
import { memoSchema, type Memo } from "./memo";
import { habitSchema, habitCheckSchema, type Habit, type HabitCheck } from "./habit";
import { calendarEventSchema, type CalendarEvent } from "./calendar-event";
import { pageSchema, type Page } from "./page";
import { feedSchema, type Feed } from "./news";
import { duckStateSchema, type DuckState } from "./duck-state";
import { pomodoroSessionSchema, type PomodoroSession } from "./pomodoro";
import { activityDailyEntrySchema, type ActivityDailyEntry } from "./activity-daily";
import type { Backup, BackupCollectionKey } from "./backup";

// 2026-07-26 : 백업 - 가져오기 - 복원계획
// "무엇을 어떤 순서로 넣을지"를 정하는 순수함수. 실제 쓰기는 api가 한다.
// 판단을 여기 모으는 이유: 순서를 틀리면 외래키에 걸려 데이터가 통째로 안 들어가는데,
// 그건 DB 없이도 결정되는 문제라 테스트로 잠글 수 있다.

// habit_checks.habit_id가 habits를 가리키므로 습관이 먼저다.
// pages는 자기 자신(parent_id)을 가리켜 컬렉션 안에서 다시 정렬한다.
const RESTORE_ORDER: BackupCollectionKey[] = [
  "todos",
  "memos",
  "habits",
  "habitChecks",
  "calendarEvents",
  "pages",
  "feeds",
  "duckState",
  "pomodoroSessions",
  "activityDaily",
];

export type RestorePlan = {
  todos: Todo[];
  memos: Memo[];
  habits: Habit[];
  habitChecks: HabitCheck[];
  calendarEvents: CalendarEvent[];
  pages: Page[];
  feeds: Feed[];
  duckState: DuckState[];
  pomodoroSessions: PomodoroSession[];
  activityDaily: ActivityDailyEntry[];
  order: BackupCollectionKey[];
  // 모양이 깨져 복원할 수 없는 항목 수. 한 줄 때문에 백업 전체를 버리지 않되,
  // 몇 개를 못 넣었는지는 사용자에게 반드시 알린다.
  invalid: number;
  total: number;
};

// 부모가 자식보다 먼저 오도록 정렬한다. 자식을 먼저 insert하면 parent_id 외래키에 걸려
// 그 문서를 잃는다. 파일에 없는 부모(=DB에 이미 있을 수 있다)는 건드리지 않고 그대로 둔다 —
// 임의로 최상위로 올리면 사용자의 문서 구조를 말없이 바꾸는 셈이다.
// 손상된 파일의 순환 참조(A→B→A, A→A)에도 멈추지 않고 전부 돌려준다.
export function orderPagesParentsFirst(pages: Page[]): Page[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const placed = new Set<string>();
  const out: Page[] = [];

  const visit = (page: Page, seen: Set<string>) => {
    if (placed.has(page.id)) return;
    // 순환을 만나면 더 올라가지 않고 여기서 놓는다(무한 재귀 방지).
    if (seen.has(page.id)) return;
    seen.add(page.id);
    const parent = page.parentId ? byId.get(page.parentId) : undefined;
    if (parent) visit(parent, seen);
    if (!placed.has(page.id)) {
      placed.add(page.id);
      out.push(page);
    }
  };

  for (const page of pages) visit(page, new Set());
  // 순환에 갇혀 못 놓인 항목이 남으면 그대로 뒤에 붙인다 — 한 항목도 잃지 않는다.
  for (const page of pages) {
    if (!placed.has(page.id)) {
      placed.add(page.id);
      out.push(page);
    }
  }
  return out;
}

// 스키마를 통과한 것만 남기고, 떨어진 개수를 센다.
function keepValid<T>(
  items: unknown[],
  parse: (v: unknown) => { success: boolean; data?: T },
  counter: { invalid: number },
): T[] {
  const out: T[] = [];
  for (const item of items) {
    const r = parse(item);
    if (r.success && r.data !== undefined) out.push(r.data);
    else counter.invalid += 1;
  }
  return out;
}

export function planRestore(backup: Backup): RestorePlan {
  const counter = { invalid: 0 };
  const todos = keepValid<Todo>(backup.todos, (v) => todoSchema.safeParse(v), counter);
  const memos = keepValid<Memo>(backup.memos, (v) => memoSchema.safeParse(v), counter);
  const habits = keepValid<Habit>(backup.habits, (v) => habitSchema.safeParse(v), counter);
  const habitChecks = keepValid<HabitCheck>(
    backup.habitChecks,
    (v) => habitCheckSchema.safeParse(v),
    counter,
  );
  const calendarEvents = keepValid<CalendarEvent>(
    backup.calendarEvents,
    (v) => calendarEventSchema.safeParse(v),
    counter,
  );
  const pages = keepValid<Page>(backup.pages, (v) => pageSchema.safeParse(v), counter);
  const feeds = keepValid<Feed>(backup.feeds, (v) => feedSchema.safeParse(v), counter);
  const duckState = keepValid<DuckState>(
    backup.duckState,
    (v) => duckStateSchema.safeParse(v),
    counter,
  );

  const pomodoroSessions = keepValid<PomodoroSession>(
    backup.pomodoroSessions,
    (v) => pomodoroSessionSchema.safeParse(v),
    counter,
  );
  const activityDaily = keepValid<ActivityDailyEntry>(
    backup.activityDaily,
    (v) => activityDailyEntrySchema.safeParse(v),
    counter,
  );

  return {
    todos,
    memos,
    habits,
    habitChecks,
    calendarEvents,
    pages: orderPagesParentsFirst(pages),
    feeds,
    duckState,
    pomodoroSessions,
    activityDaily,
    order: RESTORE_ORDER,
    invalid: counter.invalid,
    total:
      todos.length +
      memos.length +
      habits.length +
      habitChecks.length +
      calendarEvents.length +
      pages.length +
      feeds.length +
      duckState.length +
      pomodoroSessions.length +
      activityDaily.length,
  };
}
