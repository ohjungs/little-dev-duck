import { describe, expect, it } from "vitest";
import { toLocalDateString } from "@ldd/core";
import { localDateKey } from "../localDateKey";

// 이 테스트가 막는 회귀:
// 캘린더 일정은 **로컬 자정**으로 저장된다(Phase 27). 그 타임스탬프를 `iso.slice(0, 10)`으로
// 자르면 **UTC 날짜**가 나오고, KST에서는 전날이 된다 — D-day 배지와 표시 날짜가 하루 밀린다.
// 항상 로컬 기준으로 날짜 키를 뽑아야 한다.

describe("localDateKey", () => {
  it("core toLocalDateString과 같은 결과를 준다 (중복 정의 방지)", () => {
    const iso = new Date(2026, 6, 28, 13, 45).toISOString();
    expect(localDateKey(iso)).toBe(toLocalDateString(new Date(iso)));
  });

  it("로컬 자정으로 저장된 값의 날짜를 그대로 돌려준다", () => {
    // 로컬 자정 → UTC로는 앞뒤 날짜로 넘어갈 수 있다. 로컬 기준이면 항상 그 날짜다.
    const midnight = new Date(2026, 6, 28, 0, 0, 0, 0).toISOString();
    expect(localDateKey(midnight)).toBe("2026-07-28");
  });

  it("UTC 슬라이스와 다를 수 있음을 드러낸다", () => {
    const midnight = new Date(2026, 6, 28, 0, 0, 0, 0).toISOString();
    if (new Date().getTimezoneOffset() < 0) {
      // KST 같은 양수 오프셋 지역에서는 UTC 슬라이스가 전날이 된다 — 그게 원래 회귀였다.
      expect(midnight.slice(0, 10)).not.toBe(localDateKey(midnight));
    }
  });

  it("월·연 경계에서도 로컬 날짜를 지킨다", () => {
    expect(localDateKey(new Date(2026, 11, 31, 0, 0).toISOString())).toBe("2026-12-31");
    expect(localDateKey(new Date(2027, 0, 1, 23, 59).toISOString())).toBe("2027-01-01");
  });

  it("윤년 2월 29일", () => {
    expect(localDateKey(new Date(2028, 1, 29, 0, 0).toISOString())).toBe("2028-02-29");
  });

  it("해석 못 하는 값은 앞 10자리를 그대로 돌려준다", () => {
    // 표시가 통째로 깨지는 것보다 원문이 보이는 편이 낫다.
    expect(localDateKey("어제")).toBe("어제");
  });
});
