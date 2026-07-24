import { deriveLevel } from "./duck-xp";

export interface PomodoroStats {
  totalMinutes: number;
  sessionsCount: number;
  avgMinutes: number;
  topTag: string | null;
}

export function pomodoroStats(
  sessions: { durationMinutes: number; tag: string | null; completedAt: string | null }[],
): PomodoroStats {
  const completed = sessions.filter((s) => s.completedAt !== null);
  if (completed.length === 0)
    return { totalMinutes: 0, sessionsCount: 0, avgMinutes: 0, topTag: null };
  const totalMinutes = completed.reduce((sum, s) => sum + s.durationMinutes, 0);
  const avgMinutes = Math.round(totalMinutes / completed.length);
  const tagCount = new Map<string, number>();
  for (const s of completed)
    if (s.tag) tagCount.set(s.tag, (tagCount.get(s.tag) ?? 0) + 1);
  let topTag: string | null = null;
  let max = 0;
  for (const [t, c] of tagCount) if (c > max) { topTag = t; max = c; }
  return { totalMinutes, sessionsCount: completed.length, avgMinutes, topTag };
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}

// YYYY-MM-DD 문자열 날짜에서 i일을 뺀 날짜를 YYYY-MM-DD로 반환한다.
// toISOString()은 UTC 변환으로 로컬 타임존에서 날짜가 바뀔 수 있어 사용하지 않는다.
function shiftDate(yyyy_mm_dd: string, daysBack: number): string {
  const [y, m, d] = yyyy_mm_dd.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, (d ?? 1) - daysBack);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function habitHeatmapData(
  checks: { checkedDate: string }[],
  today: string, // YYYY-MM-DD
  days: number = 90,
): HeatmapDay[] {
  const countByDate = new Map<string, number>();
  for (const c of checks)
    countByDate.set(c.checkedDate, (countByDate.get(c.checkedDate) ?? 0) + 1);
  const result: HeatmapDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const iso = shiftDate(today, i);
    result.push({ date: iso, count: countByDate.get(iso) ?? 0 });
  }
  return result;
}

// 요약 대시보드(Phase 12 T6) — 이미 조회된 데이터에서 지표를 계산하는 순수함수.
// 데이터 조회(api)와 렌더(web)는 호출부가 담당. 여기선 계산만 담아 테스트 가능하게 둔다.

export interface DashboardInput {
  todos: readonly { isDone: boolean }[];
  pageCount: number;
  memoCount: number;
  habitCount: number;
  articleCount: number;
  duckXp: number | null; // null=오리 상태 없음(레벨 1로 취급)
}

export interface DashboardSummary {
  todosTotal: number;
  todosDone: number;
  todosRemaining: number;
  pageCount: number;
  memoCount: number;
  habitCount: number;
  articleCount: number;
  level: number;
}

export function dashboardSummary(input: DashboardInput): DashboardSummary {
  const todosDone = input.todos.filter((t) => t.isDone).length;
  return {
    todosTotal: input.todos.length,
    todosDone,
    todosRemaining: input.todos.length - todosDone,
    pageCount: input.pageCount,
    memoCount: input.memoCount,
    habitCount: input.habitCount,
    articleCount: input.articleCount,
    level: input.duckXp == null ? 1 : deriveLevel(input.duckXp),
  };
}
