import { describe, expect, it } from "vitest";
import { nextDailyCount } from "./notify-budget";

describe("nextDailyCount", () => {
  it("저장값이 없으면 0에서 시작해 1로 올린다", () => {
    const r = nextDailyCount(null, "2026-07-24", 10);
    expect(r.allowed).toBe(true);
    expect(r.next).toEqual({ date: "2026-07-24", count: 1 });
  });

  it("같은 날이면 카운트를 증가시킨다", () => {
    const r = nextDailyCount({ date: "2026-07-24", count: 3 }, "2026-07-24", 10);
    expect(r.allowed).toBe(true);
    expect(r.next.count).toBe(4);
  });

  it("날짜가 바뀌면 리셋한다", () => {
    const r = nextDailyCount({ date: "2026-07-23", count: 9 }, "2026-07-24", 10);
    expect(r.allowed).toBe(true);
    expect(r.next).toEqual({ date: "2026-07-24", count: 1 });
  });

  it("상한에 도달하면 막고 카운트를 올리지 않는다", () => {
    const r = nextDailyCount({ date: "2026-07-24", count: 10 }, "2026-07-24", 10);
    expect(r.allowed).toBe(false);
    expect(r.next).toEqual({ date: "2026-07-24", count: 10 });
  });
});
