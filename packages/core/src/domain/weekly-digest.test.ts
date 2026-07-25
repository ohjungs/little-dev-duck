import { describe, expect, it } from "vitest";
import {
  digestWeekKey,
  previousWeekRange,
  shouldCreateDigest,
} from "./weekly-digest";

// 2026-07-20(월) ~ 2026-07-26(일)이 "이번 주". 다이제스트는 지난 주(07-13~07-19)를 요약한다.
const MON = new Date(2026, 6, 20, 9, 0);
const WED = new Date(2026, 6, 22, 23, 30);
const SUN = new Date(2026, 6, 26, 8, 0);
const NEXT_MON = new Date(2026, 6, 27, 0, 5);

describe("digestWeekKey", () => {
  it("요약 대상은 지난 주다(이번 주가 아니라)", () => {
    expect(digestWeekKey(MON)).toBe("2026-07-13");
  });

  it("같은 주 안에서는 어느 요일에 봐도 키가 같다", () => {
    for (const d of [MON, WED, SUN]) {
      expect(digestWeekKey(d)).toBe("2026-07-13");
    }
  });

  it("주가 바뀌면 키도 바뀐다", () => {
    expect(digestWeekKey(NEXT_MON)).toBe("2026-07-20");
    expect(digestWeekKey(NEXT_MON)).not.toBe(digestWeekKey(MON));
  });

  it("해를 넘어가도 동작한다", () => {
    // 2027-01-01은 금요일 → 이번 주 월요일 2026-12-28 → 지난 주 2026-12-21
    expect(digestWeekKey(new Date(2027, 0, 1))).toBe("2026-12-21");
  });

  it("자정 직후에도 날짜가 밀리지 않는다", () => {
    expect(digestWeekKey(new Date(2026, 6, 27, 0, 1))).toBe("2026-07-20");
  });
});

describe("previousWeekRange", () => {
  it("지난 주 월요일부터 일요일까지다", () => {
    expect(previousWeekRange(WED)).toEqual({
      start: "2026-07-13",
      end: "2026-07-19",
    });
  });

  it("시작일은 digestWeekKey와 같은 날을 가리킨다", () => {
    expect(previousWeekRange(WED).start).toBe(digestWeekKey(WED));
  });

  it("범위는 정확히 7일이다", () => {
    const { start, end } = previousWeekRange(SUN);
    const days =
      (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86_400_000;
    expect(days).toBe(6);
  });
});

describe("shouldCreateDigest", () => {
  it("한 번도 만든 적 없으면 만든다", () => {
    expect(shouldCreateDigest({ now: MON, lastWeekKey: null })).toBe(true);
  });

  it("이번 주에 이미 만들었으면 다시 만들지 않는다(중복 방지)", () => {
    expect(
      shouldCreateDigest({ now: WED, lastWeekKey: digestWeekKey(WED) }),
    ).toBe(false);
  });

  it("주가 바뀌면 다시 만든다", () => {
    expect(
      shouldCreateDigest({ now: NEXT_MON, lastWeekKey: digestWeekKey(MON) }),
    ).toBe(true);
  });

  it("저장된 키가 깨진 값이어도 throw하지 않고 만든다", () => {
    expect(shouldCreateDigest({ now: MON, lastWeekKey: "garbage" })).toBe(true);
    expect(shouldCreateDigest({ now: MON, lastWeekKey: "" })).toBe(true);
  });

  it("미래 키가 저장돼 있으면(시계 되돌림) 만들지 않는다", () => {
    // 기기 시계가 앞섰다가 되돌아온 경우 — 같은 주를 두 번 만들지 않는 쪽이 안전하다
    expect(
      shouldCreateDigest({ now: MON, lastWeekKey: digestWeekKey(NEXT_MON) }),
    ).toBe(false);
  });
});
