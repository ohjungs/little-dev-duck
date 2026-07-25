import { describe, expect, it } from "vitest";
import { eventStartAt, isEndBeforeStart } from "../eventDateTime";

// 이 테스트는 **어느 시간대에서 돌려도** 성립해야 한다. 저장값을 문자열로 단정하면
// 실행 시간대에 따라 결과가 달라지므로, 되읽었을 때의 로컬 시/분으로 확인한다.
const localHM = (iso: string) => {
  const d = new Date(iso);
  return [d.getHours(), d.getMinutes()];
};

describe("eventStartAt", () => {
  it("시각을 비우면 로컬 자정으로 만든다", () => {
    // 화면은 로컬 자정(0시 0분)일 때 시각을 숨긴다 — 그 판정과 짝이 맞아야 한다.
    expect(localHM(eventStartAt("2026-07-28", "")!)).toEqual([0, 0]);
  });

  it("문자열 파싱의 UTC 함정에 빠지지 않는다", () => {
    // `new Date("2026-07-28")`는 날짜만 있는 ISO라 **UTC로 해석**된다. 한국에서 되읽으면
    // 9시가 되어 "오전 9:00"이라는 없는 시각이 화면에 붙는다 — 이게 원래 버그였다.
    const naive = new Date("2026-07-28").toISOString();
    const fixed = eventStartAt("2026-07-28", "")!;
    if (new Date().getTimezoneOffset() !== 0) {
      expect(fixed).not.toBe(naive);
    }
    expect(localHM(fixed)).toEqual([0, 0]);
  });

  it("시각을 주면 그 로컬 시각으로 만든다", () => {
    expect(localHM(eventStartAt("2026-07-28", "14:30")!)).toEqual([14, 30]);
  });

  it("자정을 명시적으로 골라도 그대로 둔다", () => {
    expect(localHM(eventStartAt("2026-07-28", "00:00")!)).toEqual([0, 0]);
  });

  it("월말·윤년 날짜를 정확히 만든다", () => {
    const d = new Date(eventStartAt("2028-02-29", "09:05")!);
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2028, 2, 29]);
    expect(localHM(eventStartAt("2028-02-29", "09:05")!)).toEqual([9, 5]);
  });

  it("날짜가 없으면 null", () => {
    expect(eventStartAt("", "10:00")).toBeNull();
  });

  it("달력에 없는 날짜는 null (조용히 다음 달로 굴리지 않는다)", () => {
    expect(eventStartAt("2026-02-30", "")).toBeNull();
  });

  it("형식이 어긋난 날짜는 null", () => {
    expect(eventStartAt("2026/07/28", "")).toBeNull();
  });

  it("형식이 어긋난 시각은 null (조용히 자정으로 떨어뜨리지 않는다)", () => {
    // 자정으로 떨어뜨리면 사용자가 고른 시각이 소리 없이 사라진다.
    expect(eventStartAt("2026-07-28", "25:00")).toBeNull();
    expect(eventStartAt("2026-07-28", "9시")).toBeNull();
  });
});

describe("isEndBeforeStart", () => {
  it("종료가 시작보다 이르면 true", () => {
    expect(isEndBeforeStart("14:00", "13:00")).toBe(true);
  });

  it("같으면 true (길이 0인 일정은 만들지 않는다)", () => {
    expect(isEndBeforeStart("14:00", "14:00")).toBe(true);
  });

  it("종료가 늦으면 false", () => {
    expect(isEndBeforeStart("14:00", "15:30")).toBe(false);
  });

  it("종료가 비어 있으면 false (검사 대상 아님)", () => {
    expect(isEndBeforeStart("14:00", "")).toBe(false);
  });

  it("문자열 비교가 아니라 분 단위로 비교한다", () => {
    // "9:00" > "14:00"은 문자열로는 참이다 — 자릿수가 다른 입력에 속지 않아야 한다.
    expect(isEndBeforeStart("9:00", "14:00")).toBe(false);
    expect(isEndBeforeStart("14:00", "9:00")).toBe(true);
  });
});
