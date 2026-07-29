import { describe, expect, it } from "vitest";
import { todoSchema, sortTodosByDue } from "./todo";

const validTodo = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  title: "우유 사기",
  isDone: false,
  dueDate: "2026-07-21T00:00:00.000Z",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
};

describe("todoSchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(todoSchema.safeParse(validTodo).success).toBe(true);
  });

  it("null dueDate를 허용한다", () => {
    expect(
      todoSchema.safeParse({ ...validTodo, dueDate: null }).success,
    ).toBe(true);
  });

  it("빈 제목을 거부한다", () => {
    expect(todoSchema.safeParse({ ...validTodo, title: "" }).success).toBe(
      false,
    );
  });

  it("최대 길이(200자)를 초과한 제목을 거부한다", () => {
    expect(
      todoSchema.safeParse({ ...validTodo, title: "a".repeat(201) }).success,
    ).toBe(false);
  });

  it("잘못된 형식의 날짜를 거부한다", () => {
    expect(
      todoSchema.safeParse({ ...validTodo, dueDate: "not-a-date" }).success,
    ).toBe(false);
  });

  it("Postgres가 실제로 내려주는 +00:00 오프셋 타임스탬프를 허용한다", () => {
    expect(
      todoSchema.safeParse({
        ...validTodo,
        createdAt: "2026-07-20T09:15:23.456789+00:00",
        updatedAt: "2026-07-20T09:15:23.456789+00:00",
      }).success,
    ).toBe(true);
  });
});

// 2026-07-29 : 할 일 - 마감일순 보기 (Phase 62 T2)
describe("sortTodosByDue", () => {
  const t = (id: string, dueDate: string | null) => ({ id, dueDate });

  it("마감일 오름차순, 없는 것은 뒤로", () => {
    const out = sortTodosByDue([
      t("none", null),
      t("late", "2026-08-01T00:00:00.000Z"),
      t("soon", "2026-07-30T00:00:00.000Z"),
    ]);
    expect(out.map((x) => x.id)).toEqual(["soon", "late", "none"]);
  });

  it("같은 마감일·없음끼리는 원래 순서를 지킨다 (안정 정렬)", () => {
    const out = sortTodosByDue([
      t("a", null),
      t("b", "2026-07-30T00:00:00.000Z"),
      t("c", null),
      t("d", "2026-07-30T00:00:00.000Z"),
    ]);
    expect(out.map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("입력을 바꾸지 않는다", () => {
    const input = [t("x", null), t("y", "2026-07-30T00:00:00.000Z")];
    sortTodosByDue(input);
    expect(input.map((i) => i.id)).toEqual(["x", "y"]);
  });
});
