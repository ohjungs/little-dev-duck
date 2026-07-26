import { afterEach, describe, expect, it } from "vitest";
import { readLocalPrefs, restoreLocalPrefs } from "../localPrefs";

// 2026-07-26 : 백업 - 브라우저 로컬 설정 - 저장소 연결부 검사
// 판단은 core가 순수하게 검사한다. 여기서 볼 것은 **실제 localStorage에 닿는 부분**이다 —
// window가 없는 환경에서 터지지 않는지, 쓰기가 정말 일어나는지, 있는 값을 덮지 않는지.

type Store = Record<string, string>;

function installWindow(initial: Store = {}, opts: { failWrite?: boolean } = {}) {
  const store: Store = { ...initial };
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        if (opts.failWrite) throw new Error("QuotaExceededError");
        store[k] = v;
      },
    },
  };
  return store;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("readLocalPrefs", () => {
  it("window가 없으면 빈 객체다", () => {
    // 내보내기 조립은 node 환경 테스트에서도 돈다. 여기서 터지면 백업 전체가 실패한다.
    expect(readLocalPrefs()).toEqual({});
  });

  it("브라우저에 있는 설정을 담는다", () => {
    installWindow({
      "ldd-todo-order": JSON.stringify(["t2", "t1"]),
      "ldd:quietHours": JSON.stringify({ start: 22, end: 7 }),
    });
    expect(readLocalPrefs()).toEqual({
      "ldd-todo-order": ["t2", "t1"],
      "ldd:quietHours": { start: 22, end: 7 },
    });
  });

  it("등록되지 않은 키는 담지 않는다", () => {
    installWindow({ "ldd-theme": "dark", "ldd-todo-order": JSON.stringify(["t1"]) });
    expect(Object.keys(readLocalPrefs())).toEqual(["ldd-todo-order"]);
  });
});

describe("restoreLocalPrefs", () => {
  it("window가 없으면 아무것도 쓰지 않는다", () => {
    expect(restoreLocalPrefs({ "ldd-todo-order": ["a"] })).toBe(0);
  });

  it("없던 설정을 실제로 쓴다", () => {
    const store = installWindow();
    const n = restoreLocalPrefs({ "ldd:favorites": ["p1", "p2"] });
    expect(n).toBe(1);
    expect(store["ldd:favorites"]).toBe(JSON.stringify(["p1", "p2"]));
  });

  it("이미 있는 설정은 건드리지 않는다", () => {
    // 가져오기의 "지금 데이터를 바꾸지 않는다" 계약. 쓰던 브라우저에서 순서가 뒤집히면 안 된다.
    const store = installWindow({ "ldd-todo-order": JSON.stringify(["기존"]) });
    const n = restoreLocalPrefs({
      "ldd-todo-order": ["백업"],
      "ldd-habit-order": ["h1"],
    });
    expect(n).toBe(1);
    expect(store["ldd-todo-order"]).toBe(JSON.stringify(["기존"]));
    expect(store["ldd-habit-order"]).toBe(JSON.stringify(["h1"]));
  });

  it("두 번 실행해도 결과가 같다(멱등)", () => {
    const store = installWindow();
    const prefs = { "ldd-pinned-memos": ["m1"] };
    expect(restoreLocalPrefs(prefs)).toBe(1);
    expect(restoreLocalPrefs(prefs)).toBe(0);
    expect(store["ldd-pinned-memos"]).toBe(JSON.stringify(["m1"]));
  });

  it("저장소가 막혀 있어도 터지지 않는다", () => {
    // 사생활 보호 모드·용량 초과. 설정 하나 때문에 가져오기 전체를 실패시키지 않는다.
    installWindow({}, { failWrite: true });
    expect(restoreLocalPrefs({ "ldd-todo-order": ["a"] })).toBe(0);
  });

  it("빈 설정이면 쓸 것이 없다", () => {
    installWindow();
    expect(restoreLocalPrefs({})).toBe(0);
  });
});
