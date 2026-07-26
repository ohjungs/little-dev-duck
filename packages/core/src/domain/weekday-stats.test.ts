import { describe, expect, it } from "vitest";
import {
  weekdayOf,
  weekdayCounts,
  busiestWeekday,
  WEEKDAY_LABELS,
} from "./weekday-stats";

// 2026-07-27 : 통계 - 요일별 패턴 (2차 피드백 3-3, Phase 46 T4)
// **Date 객체로 요일을 구하지 않는다** — `new Date("YYYY-MM-DD")`는 UTC 파싱이라 KST에서
// 하루 밀린다(이 저장소가 eslint 규칙까지 만든 함정). 산술이 맞는지 실제 달력으로 못박는다.

describe("요일 계산", () => {
  it("실제 달력과 맞는다", () => {
    // 2026-07-27은 월요일. 거기서 하루씩 늘려 한 주를 전부 확인한다.
    const expected = [1, 2, 3, 4, 5, 6, 0]; // 월화수목금토일
    const dates = [
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ];
    expect(dates.map(weekdayOf)).toEqual(expected);
  });

  it("1월·2월도 맞는다 (Zeller의 연도 보정이 걸리는 자리)", () => {
    expect(weekdayOf("2026-01-01")).toBe(4); // 목요일
    expect(weekdayOf("2026-02-28")).toBe(6); // 토요일
  });

  it("윤년 2월 29일도 맞는다", () => {
    expect(weekdayOf("2028-02-29")).toBe(2); // 화요일
  });

  it("세기 경계도 맞는다", () => {
    expect(weekdayOf("2000-01-01")).toBe(6); // 토요일
  });

  it("타임스탬프를 넘겨도 날짜 부분만 본다", () => {
    expect(weekdayOf("2026-07-27T23:59:59.000Z")).toBe(1);
  });

  it("해석할 수 없는 값은 -1이다", () => {
    expect(weekdayOf("이상한 값")).toBe(-1);
    expect(weekdayOf("")).toBe(-1);
  });
});

describe("요일별 집계", () => {
  it("항상 7칸을 돌려준다", () => {
    // 기록이 없는 요일이 빠지면 화면에서 그 요일이 사라진 것처럼 보이고 x축이 어긋난다.
    const out = weekdayCounts(["2026-07-27"]);
    expect(out).toHaveLength(7);
    expect(out.map((c) => c.label)).toEqual([...WEEKDAY_LABELS]);
  });

  it("같은 요일을 모아 센다", () => {
    const out = weekdayCounts(["2026-07-27", "2026-08-03", "2026-07-28"]);
    expect(out[1].count).toBe(2); // 월요일 둘
    expect(out[2].count).toBe(1); // 화요일 하나
    expect(out[0].count).toBe(0); // 일요일 없음
  });

  it("빈 입력에도 7칸이 0으로 돌아온다", () => {
    const out = weekdayCounts([]);
    expect(out).toHaveLength(7);
    expect(out.every((c) => c.count === 0)).toBe(true);
  });

  it("해석할 수 없는 날짜는 조용히 뺀다 (통계 하나로 화면이 죽지 않게)", () => {
    const out = weekdayCounts(["망가진 값", "2026-07-27"]);
    expect(out.reduce((n, c) => n + c.count, 0)).toBe(1);
  });

  it("0=일요일 규약을 지킨다 (Date.getDay()와 같다)", () => {
    // 다른 코드와 섞였을 때 어긋나지 않으려면 규약이 같아야 한다.
    expect(weekdayCounts(["2026-08-02"])[0].count).toBe(1); // 일요일
  });
});

describe("가장 많이 한 요일", () => {
  it("최다 요일을 돌려준다", () => {
    const out = busiestWeekday(weekdayCounts(["2026-07-27", "2026-08-03", "2026-07-28"]));
    expect(out?.label).toBe("월");
    expect(out?.count).toBe(2);
  });

  it("기록이 하나도 없으면 null이다", () => {
    // "일요일이 최고"라고 말하면 거짓이다 — 아무 날도 하지 않았는데.
    expect(busiestWeekday(weekdayCounts([]))).toBeNull();
  });
});
