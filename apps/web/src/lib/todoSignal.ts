import type { TodayTodoTally } from "@ldd/core";

// TodoWidget → DuckWidget 간 결합을 스토어 없이 잇는다. 네이티브 CustomEvent라
// 서로의 내부를 알 필요 없이 "오늘 투두 집계 변경" 신호만 주고받는다.
const TODOS_CHANGED_EVENT = "ldd:todos-changed";

// 마지막으로 발행된 값을 보관해 나중에 구독하는 쪽이 즉시 재생받게 한다. 이게 없으면
// DuckWidget이 TodoWidget보다 먼저 마운트돼야만 값을 받는 숨은 순서 의존이 생긴다.
let lastTally: TodayTodoTally | null = null;

export function emitTodosChanged(tally: TodayTodoTally): void {
  lastTally = tally;
  window.dispatchEvent(new CustomEvent(TODOS_CHANGED_EVENT, { detail: tally }));
}

export function onTodosChanged(
  handler: (tally: TodayTodoTally) => void,
): () => void {
  const listener = (event: Event) => {
    handler((event as CustomEvent<TodayTodoTally>).detail);
  };
  window.addEventListener(TODOS_CHANGED_EVENT, listener);
  // 구독 시점에 이미 발행된 마지막 값이 있으면 즉시 재생(마운트 순서 무관하게 최신 상태 반영).
  if (lastTally) handler(lastTally);
  return () => window.removeEventListener(TODOS_CHANGED_EVENT, listener);
}
