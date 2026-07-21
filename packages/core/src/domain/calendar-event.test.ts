import { describe, expect, it } from "vitest";
import { calendarEventSchema, daysUntil } from "./calendar-event";

describe("daysUntil", () => {
  it("오늘이면 0", () => {
    expect(daysUntil("2026-07-21", "2026-07-21")).toBe(0);
  });

  it("내일이면 1, 어제면 -1", () => {
    expect(daysUntil("2026-07-22", "2026-07-21")).toBe(1);
    expect(daysUntil("2026-07-20", "2026-07-21")).toBe(-1);
  });

  it("datetime을 넘겨도 날짜 부분만 계산", () => {
    expect(daysUntil("2026-07-25T14:30:00+09:00", "2026-07-21")).toBe(4);
  });

  it("월 경계를 넘어도 실제 일수", () => {
    expect(daysUntil("2026-08-01", "2026-07-30")).toBe(2);
  });
});

describe("calendarEventSchema", () => {
  it("endAt은 null 허용(시점 이벤트)", () => {
    const parsed = calendarEventSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      title: "마감",
      startAt: "2026-07-25T00:00:00+09:00",
      endAt: null,
      createdAt: "2026-07-21T00:00:00+09:00",
      updatedAt: "2026-07-21T00:00:00+09:00",
    });
    expect(parsed.endAt).toBeNull();
  });
});
