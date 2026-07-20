import { describe, expect, it } from "vitest";
import { todoSchema } from "./todo";

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
