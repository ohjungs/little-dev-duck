import { describe, expect, it } from "vitest";
import { readRecentList, pushRecentList, clearRecentList } from "../recentList";

// 2026-07-29 : 공용 - 최근 목록 (Phase 55 T1 L-017)
// EmojiPicker의 "자주 쓰는"과 검색의 "최근 검색어"가 같은 로직 한 벌을 쓴다 —
// 두 곳에 각자 있으면 중복 제거·상한 정책이 갈라진다.

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Pick<Storage, "getItem" | "setItem">;
}

describe("readRecentList", () => {
  it("저장된 목록을 읽는다", () => {
    const s = fakeStorage({ k: JSON.stringify(["a", "b"]) });
    expect(readRecentList("k", s)).toEqual(["a", "b"]);
  });

  it("없거나 깨진 값은 빈 목록 (검색이 죽으면 안 된다)", () => {
    expect(readRecentList("k", fakeStorage())).toEqual([]);
    expect(readRecentList("k", fakeStorage({ k: "{깨짐" }))).toEqual([]);
    expect(readRecentList("k", fakeStorage({ k: '"배열아님"' }))).toEqual([]);
  });

  it("문자열이 아닌 항목은 걸러낸다", () => {
    const s = fakeStorage({ k: JSON.stringify(["a", 1, null, "b"]) });
    expect(readRecentList("k", s)).toEqual(["a", "b"]);
  });

  it("저장소 접근이 던져도 빈 목록", () => {
    const s = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    } as unknown as Pick<Storage, "getItem" | "setItem">;
    expect(readRecentList("k", s)).toEqual([]);
  });
});

describe("pushRecentList", () => {
  it("맨 앞에 넣고 중복은 하나만 (최신이 이긴다)", () => {
    const s = fakeStorage({ k: JSON.stringify(["a", "b"]) });
    expect(pushRecentList("k", "b", 10, s)).toEqual(["b", "a"]);
    expect(readRecentList("k", s)).toEqual(["b", "a"]);
  });

  it("상한을 넘으면 오래된 것부터 떨어진다", () => {
    const s = fakeStorage({ k: JSON.stringify(["a", "b", "c"]) });
    expect(pushRecentList("k", "d", 3, s)).toEqual(["d", "a", "b"]);
  });

  it("저장소 접근이 던져도 계산된 목록은 돌려준다 (화면은 갱신된다)", () => {
    const s = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Pick<Storage, "getItem" | "setItem">;
    expect(pushRecentList("k", "a", 10, s)).toEqual(["a"]);
  });
});

describe("clearRecentList", () => {
  it("목록을 비운다", () => {
    const s = fakeStorage({ k: JSON.stringify(["a"]) });
    clearRecentList("k", s);
    expect(readRecentList("k", s)).toEqual([]);
  });

  it("저장소 접근이 던져도 조용히 넘어간다", () => {
    const s = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Pick<Storage, "getItem" | "setItem">;
    expect(() => clearRecentList("k", s)).not.toThrow();
  });
});
