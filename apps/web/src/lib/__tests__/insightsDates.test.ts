import { describe, expect, it } from "vitest";
import { activeStreak, weekBounds } from "../insightsDates";

// 이 파일이 고치는 버그는 전부 "로컬 Date를 toISOString()으로 잘라 날짜를 얻는" 데서 나왔다.
// 그래서 테스트도 실행 시간대에 의존하지 않게, 기준 날짜를 문자열로 주입해 확인한다.

describe("weekBounds", () => {
  it("이번 주 월요일부터 오늘까지", () => {
    // 2026-07-26은 일요일 → 이번 주 월요일은 2026-07-20.
    expect(weekBounds("2026-07-26")).toEqual({
      thisStart: "2026-07-20",
      thisEnd: "2026-07-26",
      lastStart: "2026-07-13",
      lastEnd: "2026-07-19",
    });
  });

  it("월요일 당일이면 시작과 끝이 같다", () => {
    expect(weekBounds("2026-07-20")).toEqual({
      thisStart: "2026-07-20",
      thisEnd: "2026-07-20",
      lastStart: "2026-07-13",
      lastEnd: "2026-07-19",
    });
  });

  it("월 경계를 넘는 주를 정확히 계산한다", () => {
    // 2026-08-02는 일요일 → 이번 주 월요일은 7-27.
    expect(weekBounds("2026-08-02")).toEqual({
      thisStart: "2026-07-27",
      thisEnd: "2026-08-02",
      lastStart: "2026-07-20",
      lastEnd: "2026-07-26",
    });
  });

  it("연 경계를 넘는 주를 정확히 계산한다", () => {
    // 2027-01-01은 금요일 → 이번 주 월요일은 2026-12-28.
    expect(weekBounds("2027-01-01")).toEqual({
      thisStart: "2026-12-28",
      thisEnd: "2027-01-01",
      lastStart: "2026-12-21",
      lastEnd: "2026-12-27",
    });
  });

  it("시작일은 어느 요일에 물어도 그 주 월요일이다", () => {
    // 원래 코드는 로컬 자정 Date를 toISOString()으로 잘라, KST에서 **일요일**을 돌려줬다.
    for (const day of ["20", "21", "22", "23", "24", "25", "26"]) {
      expect(weekBounds(`2026-07-${day}`).thisStart).toBe("2026-07-20");
    }
  });
});

describe("activeStreak", () => {
  it("오늘부터 연속된 날을 센다", () => {
    const dates = new Set(["2026-07-26", "2026-07-25", "2026-07-24"]);
    expect(activeStreak(dates, "2026-07-26")).toBe(3);
  });

  it("오늘 활동이 없으면 어제부터 이어서 센다", () => {
    // 아직 하루가 안 끝났으니 오늘이 비었다고 끊지 않는다(원 코드의 의도를 보존).
    const dates = new Set(["2026-07-25", "2026-07-24"]);
    expect(activeStreak(dates, "2026-07-26")).toBe(2);
  });

  it("중간이 비면 거기서 끊는다", () => {
    const dates = new Set(["2026-07-26", "2026-07-24", "2026-07-23"]);
    expect(activeStreak(dates, "2026-07-26")).toBe(1);
  });

  it("활동이 없으면 0", () => {
    expect(activeStreak(new Set(), "2026-07-26")).toBe(0);
  });

  it("오늘도 어제도 없으면 0", () => {
    expect(activeStreak(new Set(["2026-07-20"]), "2026-07-26")).toBe(0);
  });

  it("월·연 경계를 넘어 이어진다", () => {
    const dates = new Set(["2027-01-01", "2026-12-31", "2026-12-30"]);
    expect(activeStreak(dates, "2027-01-01")).toBe(3);
  });

  it("윤년 2월 29일을 건너뛰지 않는다", () => {
    const dates = new Set(["2028-03-01", "2028-02-29", "2028-02-28"]);
    expect(activeStreak(dates, "2028-03-01")).toBe(3);
  });
});
