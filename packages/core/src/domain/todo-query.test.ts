import { describe, expect, it } from "vitest";
import { selectTodosForDuck, DUCK_TODO_LIMIT } from "./todo-query";
import type { Todo } from "./todo";

// 이 테스트의 요지: **"이번 주 마감 뭐 있어?"는 유사도 검색으로 답할 수 있는 질문이 아니다.**
// 오리 도구 6개가 전부 쓰기여서, 조회 질문은 RAG 상위 몇 개에만 의존했다 — 할 일이 많으면
// 정작 이번 주 마감이 빠지고, 날짜로 거를 수단도 없었다. 그 질문은 조회(query)가 필요하다.

const TODAY = "2026-07-26";

function todo(over: Partial<Todo> & { id: string }): Todo {
  return {
    id: over.id,
    userId: "u1",
    title: over.title ?? "제목",
    isDone: over.isDone ?? false,
    dueDate: over.dueDate ?? null,
    recurrence: over.recurrence ?? null,
    createdAt: over.createdAt ?? "2026-07-01T00:00:00.000Z",
  } as Todo;
}

describe("selectTodosForDuck", () => {
  it("조건이 없으면 전부 준다", () => {
    const list = [todo({ id: "a" }), todo({ id: "b", isDone: true })];
    expect(selectTodosForDuck(list, {}, TODAY)).toHaveLength(2);
  });

  it("미완료만 고를 수 있다", () => {
    const list = [todo({ id: "a" }), todo({ id: "b", isDone: true })];
    const got = selectTodosForDuck(list, { status: "notDone" }, TODAY);
    expect(got.map((t) => t.id)).toEqual(["a"]);
  });

  it("완료만 고를 수 있다", () => {
    const list = [todo({ id: "a" }), todo({ id: "b", isDone: true })];
    expect(selectTodosForDuck(list, { status: "done" }, TODAY).map((t) => t.id)).toEqual(["b"]);
  });

  it("마감이 N일 이내인 것만 고른다", () => {
    const list = [
      todo({ id: "today", dueDate: "2026-07-26T00:00:00.000Z" }),
      todo({ id: "in7", dueDate: "2026-08-02T00:00:00.000Z" }),
      todo({ id: "far", dueDate: "2026-09-01T00:00:00.000Z" }),
      todo({ id: "none" }),
    ];
    const got = selectTodosForDuck(list, { dueWithinDays: 7 }, TODAY);
    expect(got.map((t) => t.id)).toEqual(["today", "in7"]);
  });

  // 이미 지난 마감은 "이번 주 마감 뭐 있어?"에서 가장 중요한 항목이다 — 빼면 안 된다.
  it("기한이 지난 것도 함께 준다", () => {
    const list = [
      todo({ id: "overdue", dueDate: "2026-07-20T00:00:00.000Z" }),
      todo({ id: "today", dueDate: "2026-07-26T00:00:00.000Z" }),
    ];
    const got = selectTodosForDuck(list, { dueWithinDays: 3 }, TODAY);
    expect(got.map((t) => t.id)).toEqual(["overdue", "today"]);
  });

  it("마감일이 빠른 순으로 준다", () => {
    const list = [
      todo({ id: "late", dueDate: "2026-07-30T00:00:00.000Z" }),
      todo({ id: "early", dueDate: "2026-07-27T00:00:00.000Z" }),
    ];
    expect(selectTodosForDuck(list, {}, TODAY).map((t) => t.id)).toEqual(["early", "late"]);
  });

  it("마감 없는 것은 뒤로 보낸다", () => {
    const list = [
      todo({ id: "none" }),
      todo({ id: "dated", dueDate: "2026-07-30T00:00:00.000Z" }),
    ];
    expect(selectTodosForDuck(list, {}, TODAY).map((t) => t.id)).toEqual(["dated", "none"]);
  });

  // 저장 규약은 UTC 자정이다(Phase 23). 로컬 변환에 태우면 하루가 밀린다 —
  // 이 세션에서 반복해서 낸 회귀라 규약을 못박는다.
  it("UTC 자정 저장값을 로컬 변환 없이 읽는다", () => {
    const list = [todo({ id: "a", dueDate: "2026-07-26T00:00:00.000Z" })];
    expect(selectTodosForDuck(list, { dueWithinDays: 0 }, TODAY)).toHaveLength(1);
  });

  it("해석할 수 없는 마감일은 마감 없음으로 본다", () => {
    const list = [todo({ id: "bad", dueDate: "언젠가" })];
    expect(selectTodosForDuck(list, { dueWithinDays: 7 }, TODAY)).toHaveLength(0);
    expect(selectTodosForDuck(list, {}, TODAY)).toHaveLength(1);
  });

  // 결과는 LLM 컨텍스트로 되돌아간다 — 무제한이면 무료 쿼터를 갉아먹는다.
  it("개수 상한을 넘기지 않는다", () => {
    const list = Array.from({ length: DUCK_TODO_LIMIT + 10 }, (_, i) =>
      todo({ id: `t${i}` }),
    );
    expect(selectTodosForDuck(list, {}, TODAY)).toHaveLength(DUCK_TODO_LIMIT);
  });

  it("빈 목록에서 죽지 않는다", () => {
    expect(selectTodosForDuck([], { dueWithinDays: 7 }, TODAY)).toEqual([]);
  });

  it("음수 dueWithinDays는 지난 것만 남긴다", () => {
    const list = [
      todo({ id: "overdue", dueDate: "2026-07-20T00:00:00.000Z" }),
      todo({ id: "today", dueDate: "2026-07-26T00:00:00.000Z" }),
    ];
    expect(selectTodosForDuck(list, { dueWithinDays: -1 }, TODAY).map((t) => t.id)).toEqual([
      "overdue",
    ]);
  });
});
