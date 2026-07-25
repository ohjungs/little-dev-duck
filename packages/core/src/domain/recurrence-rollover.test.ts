import { describe, expect, it } from "vitest";
import { rolloverDueDate } from "./recurrence-rollover";

// 2026-07-26은 일요일(KST). 아래 테스트는 전부 이 날 낮을 "지금"으로 본다.
const NOW = new Date("2026-07-26T03:00:00.000Z"); // KST 12:00

describe("rolloverDueDate", () => {
  it("반복이 없으면 null (완료는 평소대로 처리된다)", () => {
    expect(rolloverDueDate(null, "2026-07-26T00:00:00.000Z", NOW)).toBeNull();
  });

  it("규칙이 깨져 있어도 null (반복만 조용히 꺼진다)", () => {
    expect(rolloverDueDate("FREQ=NOPE", "2026-07-26T00:00:00.000Z", NOW)).toBeNull();
  });

  it("마감일의 시각을 그대로 보존한다", () => {
    // 매주 화요일 오전 9시(KST) 할 일 → 다음 주도 오전 9시여야 한다.
    const due = "2026-07-28T00:00:00.000Z"; // KST 7/28 09:00
    expect(rolloverDueDate("FREQ=WEEKLY;BYDAY=TU", due, NOW)).toBe(
      "2026-08-04T00:00:00.000Z",
    );
  });

  it("매일 반복은 하루 뒤 같은 시각", () => {
    const due = "2026-07-26T13:30:00.000Z"; // KST 7/26 22:30
    expect(rolloverDueDate("FREQ=DAILY", due, NOW)).toBe("2026-07-27T13:30:00.000Z");
  });

  it("KST 자정 직후의 마감일을 하루 전으로 밀지 않는다", () => {
    // 서버(UTC)에서 Date를 그냥 쓰면 KST 00:30이 전날로 계산돼 회차가 하루 어긋난다.
    const due = "2026-07-27T15:30:00.000Z"; // KST 7/28 00:30 (화요일)
    expect(rolloverDueDate("FREQ=WEEKLY;BYDAY=TU", due, NOW)).toBe(
      "2026-08-03T15:30:00.000Z", // KST 8/4 00:30 (화요일)
    );
  });

  it("지난 마감일은 오늘 기준으로 따라잡는다", () => {
    // 3주 전 화요일 할 일을 오늘(7/26 일요일) 완료 → 또 과거 날짜를 주면 계속 밀린 채다.
    const due = "2026-07-07T00:00:00.000Z"; // KST 7/7 09:00 (화요일)
    const next = rolloverDueDate("FREQ=WEEKLY;BYDAY=TU", due, NOW);
    expect(next).toBe("2026-07-28T00:00:00.000Z"); // 오늘 다음의 화요일
  });

  it("따라잡을 때도 시각은 보존한다", () => {
    const due = "2026-07-07T13:30:00.000Z"; // KST 7/7 22:30
    expect(rolloverDueDate("FREQ=WEEKLY;BYDAY=TU", due, NOW)).toBe(
      "2026-07-28T13:30:00.000Z",
    );
  });

  it("미래 마감일은 그 날짜를 기준으로 다음 회차를 잡는다", () => {
    // 내일(월) 마감인 매일 반복을 오늘 미리 완료 → 일정이 앞당겨지지 않고 모레가 된다.
    const due = "2026-07-27T00:00:00.000Z";
    expect(rolloverDueDate("FREQ=DAILY", due, NOW)).toBe("2026-07-28T00:00:00.000Z");
  });

  it("마감일이 없으면 오늘 기준 다음 회차의 KST 자정", () => {
    const next = rolloverDueDate("FREQ=WEEKLY;BYDAY=TU", null, NOW);
    // KST 7/28 00:00 = UTC 7/27 15:00
    expect(next).toBe("2026-07-27T15:00:00.000Z");
  });

  it("마감일 문자열이 깨져 있으면 null (throw 하지 않는다)", () => {
    expect(rolloverDueDate("FREQ=DAILY", "어제", NOW)).toBeNull();
  });

  it("월간 31일 규칙이 2월을 만나면 말일로 자른 채 시각을 보존한다", () => {
    const due = "2026-01-31T04:00:00.000Z"; // KST 1/31 13:00
    const now = new Date("2026-01-31T04:00:00.000Z");
    expect(rolloverDueDate("FREQ=MONTHLY;BYMONTHDAY=31", due, now)).toBe(
      "2026-02-28T04:00:00.000Z",
    );
  });

  it("결과는 항상 원래 마감일보다 뒤다", () => {
    const rules = [
      "FREQ=DAILY",
      "FREQ=DAILY;INTERVAL=5",
      "FREQ=WEEKLY;BYDAY=MO,TH",
      "FREQ=MONTHLY;BYMONTHDAY=15",
    ];
    for (const rule of rules) {
      for (let day = 1; day <= 28; day += 1) {
        const due = `2026-02-${String(day).padStart(2, "0")}T00:00:00.000Z`;
        const now = new Date(due);
        const next = rolloverDueDate(rule, due, now);
        expect(next).not.toBeNull();
        expect(new Date(next!).getTime()).toBeGreaterThan(new Date(due).getTime());
      }
    }
  });
});
