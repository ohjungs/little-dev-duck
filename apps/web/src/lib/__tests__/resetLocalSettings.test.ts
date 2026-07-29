import { describe, expect, it } from "vitest";
import { listLddKeys, resetLocalSettings } from "../resetLocalSettings";

// 2026-07-29 : 설정 - 초기화 (Phase 56 T2 T-031)
// 이 앱의 브라우저 저장값은 전부 "ldd" 접두어다("ldd-", "ldd:"). 접두어 규칙이라
// 키 목록을 손으로 유지하지 않는다 — 목록 유지는 새 키가 생길 때마다 어긋난다.

function fakeStorage(initial: Record<string, string>) {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null,
    removeItem: (k: string) => void map.delete(k),
    _dump: () => [...map.keys()].sort(),
  };
}

describe("listLddKeys", () => {
  it("ldd 접두어 키만 고른다 (남의 키는 건드릴 후보에도 안 올린다)", () => {
    const s = fakeStorage({
      "ldd-send-key": "enter",
      "ldd:favorites": "[]",
      "supabase.auth.token": "비밀",
      other: "x",
    });
    expect(listLddKeys(s).sort()).toEqual(["ldd-send-key", "ldd:favorites"]);
  });
});

describe("resetLocalSettings", () => {
  it("ldd 키를 전부 지우고 개수를 돌려준다 — 다른 키는 그대로", () => {
    const s = fakeStorage({
      "ldd-send-key": "enter",
      "ldd:quietHours": "{}",
      "ldd:notify-history": "[]",
      "supabase.auth.token": "비밀",
    });
    expect(resetLocalSettings(s)).toBe(3);
    expect(s._dump()).toEqual(["supabase.auth.token"]);
  });

  it("지울 게 없으면 0", () => {
    const s = fakeStorage({ other: "x" });
    expect(resetLocalSettings(s)).toBe(0);
  });
});
