import { deriveLevel } from "./duck-xp";

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
