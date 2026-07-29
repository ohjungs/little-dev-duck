import { describe, expect, it } from "vitest";
import { readRing, pushRing, clearRing } from "../localRing";

// 2026-07-29 : 공용 - localStorage 링 (Phase 58 T2)
type E = { n: number };
const isE = (v: unknown): v is E =>
  typeof v === "object" && v !== null && typeof (v as E).n === "number";

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Pick<Storage, "getItem" | "setItem">;
}

describe("localRing", () => {
  it("최신이 앞, 상한 자르기", () => {
    const s = fakeStorage();
    for (let i = 1; i <= 4; i++) pushRing("k", { n: i }, 3, isE, s);
    expect(readRing("k", isE, s).map((e) => e.n)).toEqual([4, 3, 2]);
  });

  it("깨진 값·모양 아닌 항목 무시", () => {
    expect(readRing("k", isE, fakeStorage({ k: "{깨짐" }))).toEqual([]);
    const s = fakeStorage({ k: JSON.stringify([{ n: 1 }, "x", null]) });
    expect(readRing("k", isE, s)).toEqual([{ n: 1 }]);
  });

  it("저장소가 던져도 조용하다", () => {
    const s = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Pick<Storage, "getItem" | "setItem">;
    expect(() => pushRing("k", { n: 1 }, 3, isE, s)).not.toThrow();
    expect(() => clearRing("k", s)).not.toThrow();
  });

  it("clear는 비운다", () => {
    const s = fakeStorage();
    pushRing("k", { n: 1 }, 3, isE, s);
    clearRing("k", s);
    expect(readRing("k", isE, s)).toEqual([]);
  });
});
