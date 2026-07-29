import { describe, expect, it } from "vitest";
import { kstDayRange } from "./search-filter";

// 2026-07-29 : 메신저 - 검색 필터 기간 경계 (Phase 55 T1 L-007)
describe("kstDayRange", () => {
  it("KST 하루의 시작·끝(다음날 시작, 배타)을 ISO로 만든다", () => {
    const r = kstDayRange("2026-07-29", "2026-07-29");
    // KST 00:00 = UTC 전날 15:00. 상한은 다음날 시작(배타) — 그 날 23:59:59.999까지 포함된다.
    expect(r.fromIso).toBe("2026-07-28T15:00:00.000Z");
    expect(r.toIso).toBe("2026-07-29T15:00:00.000Z");
  });

  it("시작만·끝만도 된다", () => {
    expect(kstDayRange("2026-07-01", undefined)).toEqual({
      fromIso: "2026-06-30T15:00:00.000Z",
      toIso: null,
    });
    expect(kstDayRange(undefined, "2026-07-01").fromIso).toBeNull();
  });

  it("형식이 아니면 그 쪽 경계를 버린다 (검색 전체가 죽으면 안 된다)", () => {
    const r = kstDayRange("29-07-2026", "2026-13-99");
    expect(r.fromIso).toBeNull();
    expect(r.toIso).toBeNull();
  });

  it("빈 문자열은 '지정 안 함'이다", () => {
    expect(kstDayRange("", "")).toEqual({ fromIso: null, toIso: null });
  });

  it("월말·연말 다음날 계산이 맞는다", () => {
    expect(kstDayRange(undefined, "2026-12-31").toIso).toBe("2026-12-31T15:00:00.000Z");
    expect(kstDayRange(undefined, "2026-02-28").toIso).toBe("2026-02-28T15:00:00.000Z");
  });
});
