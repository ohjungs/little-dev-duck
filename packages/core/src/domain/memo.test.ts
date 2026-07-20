import { describe, expect, it } from "vitest";
import { memoSchema } from "./memo";

const validMemo = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  title: "회의 메모",
  content: "다음 스프린트 계획 논의",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
};

describe("memoSchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(memoSchema.safeParse(validMemo).success).toBe(true);
  });

  it("빈 제목을 거부한다", () => {
    expect(memoSchema.safeParse({ ...validMemo, title: "" }).success).toBe(
      false,
    );
  });

  it("최대 길이(10000자)를 초과한 본문을 거부한다", () => {
    expect(
      memoSchema.safeParse({ ...validMemo, content: "a".repeat(10001) })
        .success,
    ).toBe(false);
  });

  it("잘못된 형식의 날짜를 거부한다", () => {
    expect(
      memoSchema.safeParse({ ...validMemo, createdAt: "2026-07-20" })
        .success,
    ).toBe(false);
  });

  it("Postgres가 실제로 내려주는 +00:00 오프셋 타임스탬프를 허용한다", () => {
    expect(
      memoSchema.safeParse({
        ...validMemo,
        createdAt: "2026-07-20T09:15:23.456789+00:00",
        updatedAt: "2026-07-20T09:15:23.456789+00:00",
      }).success,
    ).toBe(true);
  });
});
