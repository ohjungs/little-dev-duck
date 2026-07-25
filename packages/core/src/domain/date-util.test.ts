import { describe, expect, it } from "vitest";
import {
  epochDay,
  kstDateString,
  startOfWeek,
  toLocalDateString,
} from "./date-util";

// 서버(UTC)에서 쓰는 KST 날짜. 테스트 머신 타임존과 무관하게 성립하도록 UTC 순간으로 고정한다.
describe("kstDateString", () => {
  it("KST 자정 직전은 그 전날이다", () => {
    // 2026-07-20T14:59:59Z = KST 2026-07-20 23:59:59
    expect(kstDateString(new Date("2026-07-20T14:59:59Z"))).toBe("2026-07-20");
  });

  it("KST 자정을 넘기면 다음 날이다", () => {
    // 2026-07-20T15:00:00Z = KST 2026-07-21 00:00:00
    expect(kstDateString(new Date("2026-07-20T15:00:00Z"))).toBe("2026-07-21");
  });

  it("UTC 기준으로는 아직 전날인 시각도 KST로는 오늘이다(서버 UTC 함정)", () => {
    // UTC 2026-07-20 16:00 → KST 07-21 01:00. toISOString()을 썼다면 07-20이 나왔을 것.
    const d = new Date("2026-07-20T16:00:00Z");
    expect(d.toISOString().slice(0, 10)).toBe("2026-07-20");
    expect(kstDateString(d)).toBe("2026-07-21");
  });

  it("YYYY-MM-DD 형식이고 월·일이 두 자리다", () => {
    expect(kstDateString(new Date("2026-01-05T00:00:00Z"))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
    expect(kstDateString(new Date("2026-01-04T15:00:00Z"))).toBe("2026-01-05");
  });

  it("연말 경계에서도 맞다", () => {
    // 2026-12-31T15:00Z = KST 2027-01-01 00:00
    expect(kstDateString(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
});

describe("epochDay", () => {
  it("하루 차이는 1이다", () => {
    expect(epochDay("2026-07-21") - epochDay("2026-07-20")).toBe(1);
  });

  it("datetime을 줘도 날짜 부분만 본다", () => {
    expect(epochDay("2026-07-20T23:59:59Z")).toBe(epochDay("2026-07-20"));
  });
});

describe("toLocalDateString", () => {
  it("월·일을 두 자리로 채운다", () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("자정 직후에도 로컬 날짜를 유지한다(UTC 변환이면 하루 밀림)", () => {
    expect(toLocalDateString(new Date(2026, 6, 21, 0, 30))).toBe("2026-07-21");
  });

  it("자정 직전에도 같은 날이다", () => {
    expect(toLocalDateString(new Date(2026, 6, 20, 23, 59, 59))).toBe(
      "2026-07-20",
    );
  });
});

describe("startOfWeek", () => {
  it("월요일은 자기 자신", () => {
    expect(toLocalDateString(startOfWeek(new Date(2026, 6, 20)))).toBe(
      "2026-07-20",
    );
  });

  it("주중 아무 날이나 그 주 월요일로 모인다", () => {
    for (const day of [20, 21, 22, 23, 24, 25, 26]) {
      expect(toLocalDateString(startOfWeek(new Date(2026, 6, day)))).toBe(
        "2026-07-20",
      );
    }
  });

  it("일요일은 그 주의 마지막 날로 본다(ISO-8601)", () => {
    // 2026-07-26은 일요일 — 다음 주 월요일(27일)이 아니라 20일로 가야 한다
    expect(new Date(2026, 6, 26).getDay()).toBe(0);
    expect(toLocalDateString(startOfWeek(new Date(2026, 6, 26)))).toBe(
      "2026-07-20",
    );
  });

  it("월 경계를 넘어가도 맞다", () => {
    // 2026-08-01은 토요일 → 그 주 월요일은 07-27
    expect(toLocalDateString(startOfWeek(new Date(2026, 7, 1)))).toBe(
      "2026-07-27",
    );
  });

  it("시각 성분은 버리고 그 날 자정을 돌려준다", () => {
    const r = startOfWeek(new Date(2026, 6, 22, 15, 30));
    expect([r.getHours(), r.getMinutes()]).toEqual([0, 0]);
  });
});
