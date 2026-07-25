// 2026-07-26 : 오리 - 조회도구 - 유사도검색으로는못푸는질문
// 오리 도구 6개가 **전부 쓰기**였다(createTodo·completeTodo·createMemo·createPage·
// addCalendarEvent·checkHabit). 그래서 "이번 주 마감 뭐 있어?" 같은 조회 질문은 RAG 벡터
// 검색 상위 몇 개에만 의존했다 — 할 일이 많으면 정작 이번 주 마감이 빠지고, 날짜로 거를
// 수단 자체가 없다. 유사도 검색은 "비슷한 걸 찾아줘"지 "조건에 맞는 걸 전부 줘"가 아니다.
//
// 계약(toolKindSchema)에는 "readonly"가 처음부터 있었고 자동 실행 경로도 있었는데
// 쓰는 도구가 하나도 없었다. 조회 함수(listTodos)도 이미 있었다 — 마지막 연결만 빠져 있었다.
//
// 여기는 순수 선별 로직만 둔다(I/O 없음). 날짜 규약이 이 저장소 버그의 단골이라 한 곳에 모은다.

import { epochDay } from "./date-util";
import type { Todo } from "./todo";

// 결과는 LLM 컨텍스트로 되돌아간다 — 무제한이면 무료 쿼터를 갉아먹고 답도 산만해진다.
export const DUCK_TODO_LIMIT = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DuckTodoFilter = {
  status?: "all" | "done" | "notDone";
  /** 오늘부터 N일 이내 마감만. 지난 마감(overdue)은 항상 포함한다. */
  dueWithinDays?: number;
};

// 마감일은 **UTC 자정**으로 저장된다(Phase 23 규약). 로컬 변환에 태우면 하루가 밀리므로
// 앞 10자리를 그대로 쓴다 — dueDateLabel.ts·embed-text.ts와 같은 규약이다.
function dueDatePart(dueDate: string | null): string | null {
  const head = dueDate?.slice(0, 10);
  return head && DATE_RE.test(head) ? head : null;
}

export function selectTodosForDuck(
  todos: Todo[],
  filter: DuckTodoFilter,
  today: string,
): Todo[] {
  const todayDay = epochDay(today);

  const filtered = todos.filter((t) => {
    if (filter.status === "done" && !t.isDone) return false;
    if (filter.status === "notDone" && t.isDone) return false;

    if (filter.dueWithinDays === undefined) return true;
    const date = dueDatePart(t.dueDate);
    if (!date) return false; // 마감으로 거를 땐 마감 없는 건 대상이 아니다.
    // 지난 마감은 "이번 주 마감 뭐 있어?"에서 가장 중요한 항목이라 항상 남긴다.
    return epochDay(date) - todayDay <= filter.dueWithinDays;
  });

  return filtered
    .slice()
    .sort((a, b) => {
      const da = dueDatePart(a.dueDate);
      const db = dueDatePart(b.dueDate);
      if (da && db) return epochDay(da) - epochDay(db);
      if (da) return -1; // 마감 있는 것이 앞
      if (db) return 1;
      return 0;
    })
    .slice(0, DUCK_TODO_LIMIT);
}
