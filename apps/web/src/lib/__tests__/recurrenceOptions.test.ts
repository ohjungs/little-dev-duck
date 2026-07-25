import { describe, expect, it } from "vitest";
import { recurrenceOptions, withCurrentRecurrence } from "../recurrenceOptions";

// 2026-07-26은 일요일, 2026-07-28은 화요일.
const TODAY = new Date(2026, 6, 26);

describe("recurrenceOptions", () => {
  it("마감일이 없으면 오늘 기준으로 요일·날짜를 잡는다", () => {
    const options = recurrenceOptions(null, TODAY);
    expect(options.map((o) => o.label)).toEqual([
      "반복 없음",
      "매일",
      "매주 일",
      "매월 26일",
    ]);
  });

  it("마감일이 있으면 그 날짜 기준이다", () => {
    const options = recurrenceOptions("2026-07-28T00:00:00.000Z", TODAY);
    expect(options[2].value).toBe("FREQ=WEEKLY;BYDAY=TU");
    expect(options[2].label).toBe("매주 화");
    expect(options[3].value).toBe("FREQ=MONTHLY;BYMONTHDAY=28");
  });

  it("마감일이 깨져 있으면 오늘로 폴백한다", () => {
    const options = recurrenceOptions("어제", TODAY);
    expect(options[2].value).toBe("FREQ=WEEKLY;BYDAY=SU");
  });

  it("첫 선택지는 항상 해제용 빈 값이다", () => {
    expect(recurrenceOptions(null, TODAY)[0].value).toBe("");
  });
});

describe("withCurrentRecurrence", () => {
  const base = recurrenceOptions(null, TODAY);

  it("설정값이 없으면 그대로다", () => {
    expect(withCurrentRecurrence(base, null)).toBe(base);
  });

  it("이미 선택지에 있으면 그대로다", () => {
    expect(withCurrentRecurrence(base, "FREQ=DAILY")).toBe(base);
  });

  it("선택지에 없는 규칙이면 뒤에 얹는다", () => {
    // 얹지 않으면 select가 값을 못 찾아 "반복 없음"으로 보이고, 다른 걸 고르는 순간
    // 원래 규칙이 조용히 사라진다.
    const result = withCurrentRecurrence(base, "FREQ=WEEKLY;BYDAY=FR");
    expect(result).toHaveLength(base.length + 1);
    expect(result.at(-1)).toEqual({
      value: "FREQ=WEEKLY;BYDAY=FR",
      label: "매주 금",
    });
  });

  it("깨진 규칙은 얹지 않는다", () => {
    expect(withCurrentRecurrence(base, "FREQ=NOPE")).toBe(base);
  });
});
