import { describe, it, expect } from "vitest";
import {
  LOCAL_PREF_SPECS,
  LOCAL_PREF_LIST_CAP,
  collectLocalPrefs,
  parseLocalPrefs,
  planLocalPrefsRestore,
  type LocalPrefs,
} from "./local-prefs";

// 읽기 함수를 흉내낸다. core는 브라우저를 모른다 — 그래서 순수하게 테스트된다.
function reader(store: Record<string, string>) {
  return (key: string) => store[key] ?? null;
}

describe("LOCAL_PREF_SPECS", () => {
  it("담기로 한 키가 실제 앱이 쓰는 키와 같다", () => {
    // 이 목록이 앱의 실제 키와 어긋나면 백업은 "빈 값"을 담고도 성공했다고 말한다.
    // 앱 쪽 상수는 apps/web에 있어 core에서 import할 수 없으므로 값으로 못박는다.
    expect(LOCAL_PREF_SPECS.map((s) => s.key).sort()).toEqual([
      "ldd-bookmarked-articles",
      "ldd-collapsed-widgets",
      "ldd-habit-order",
      "ldd-pinned-memos",
      "ldd-pomodoro-tags",
      "ldd-todo-order",
      "ldd:favorites",
      "ldd:notify-keywords",
      "ldd:quietHours",
    ]);
  });

  it("키가 중복되지 않는다", () => {
    const keys = LOCAL_PREF_SPECS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("일부러 뺀 키는 목록에 없다", () => {
    // 테마·사이드바 접힘은 기기별 취향이고, 카운터류는 복원하면 오히려 해롭다.
    // 뺀 근거를 테스트로 남긴다 — 다음 사람이 "빠뜨렸다"고 오해해 넣지 않도록.
    const keys = LOCAL_PREF_SPECS.map((s) => s.key);
    for (const excluded of [
      "ldd-theme",
      "sidebar-collapsed",
      "ldd-duck-initiative",
      "ldd-focus-mode",
    ]) {
      expect(keys).not.toContain(excluded);
    }
  });

  it("모든 항목에 사용자에게 보일 이름이 있다", () => {
    for (const spec of LOCAL_PREF_SPECS) {
      expect(spec.label.length).toBeGreaterThan(0);
    }
  });
});

describe("collectLocalPrefs", () => {
  it("저장된 값만 담는다", () => {
    const prefs = collectLocalPrefs(
      reader({ "ldd-todo-order": JSON.stringify(["a", "b"]) }),
    );
    expect(prefs).toEqual({ "ldd-todo-order": ["a", "b"] });
  });

  it("아무것도 없으면 빈 객체다", () => {
    expect(collectLocalPrefs(reader({}))).toEqual({});
  });

  it("빈 목록은 담지 않는다", () => {
    // 빈 배열을 담으면 복원 때 "설정이 있다"고 오인해 새 기기의 기본값을 덮을 여지가 생긴다.
    expect(collectLocalPrefs(reader({ "ldd-todo-order": "[]" }))).toEqual({});
  });

  it("깨진 JSON은 조용히 건너뛴다", () => {
    // 브라우저에 든 값이 깨졌다고 내보내기 전체를 실패시키면 나머지 데이터까지 못 받는다.
    expect(collectLocalPrefs(reader({ "ldd-todo-order": "{{{" }))).toEqual({});
  });

  it("목록에서 문자열이 아닌 값은 걸러낸다", () => {
    const prefs = collectLocalPrefs(
      reader({ "ldd-todo-order": JSON.stringify(["a", 1, null, "b"]) }),
    );
    expect(prefs).toEqual({ "ldd-todo-order": ["a", "b"] });
  });

  it("목록 상한을 넘으면 앞에서부터 자른다", () => {
    const many = Array.from({ length: LOCAL_PREF_LIST_CAP + 50 }, (_, i) => `id${i}`);
    const prefs = collectLocalPrefs(
      reader({ "ldd-bookmarked-articles": JSON.stringify(many) }),
    );
    const got = prefs["ldd-bookmarked-articles"] as string[];
    expect(got).toHaveLength(LOCAL_PREF_LIST_CAP);
    expect(got[0]).toBe("id0");
  });

  it("한글·이모지 id를 그대로 담는다", () => {
    const ids = ["할일-1", "🦆", "a\nb"];
    const prefs = collectLocalPrefs(
      reader({ "ldd-pinned-memos": JSON.stringify(ids) }),
    );
    expect(prefs["ldd-pinned-memos"]).toEqual(ids);
  });

  it("방해금지는 객체로 담는다", () => {
    const prefs = collectLocalPrefs(
      reader({ "ldd:quietHours": JSON.stringify({ start: 22, end: 7 }) }),
    );
    expect(prefs["ldd:quietHours"]).toEqual({ start: 22, end: 7 });
  });

  it("방해금지 값이 시각 범위 밖이면 담지 않는다", () => {
    for (const bad of [{ start: 24, end: 7 }, { start: -1, end: 7 }, { start: 1.5, end: 7 }]) {
      expect(collectLocalPrefs(reader({ "ldd:quietHours": JSON.stringify(bad) }))).toEqual({});
    }
  });

  it("읽기가 예외를 던져도 나머지를 담는다", () => {
    const read = (key: string) => {
      if (key === "ldd-todo-order") throw new Error("storage 접근 거부");
      if (key === "ldd-habit-order") return JSON.stringify(["h1"]);
      return null;
    };
    expect(collectLocalPrefs(read)).toEqual({ "ldd-habit-order": ["h1"] });
  });
});

describe("parseLocalPrefs", () => {
  it("등록되지 않은 키는 버린다", () => {
    // **보안 성질**: 백업 파일은 외부에서 온다. 허용 목록이 없으면 남이 만든 파일이
    // 브라우저의 아무 키나 덮어쓸 수 있다(예: 앱이 믿고 읽는 다른 설정).
    const parsed = parseLocalPrefs({
      "ldd-todo-order": ["a"],
      "ldd-theme": ["dark"],
      "evil-key": ["x"],
      __proto__: ["y"],
    });
    expect(Object.keys(parsed)).toEqual(["ldd-todo-order"]);
  });

  it("객체가 아니면 빈 결과다", () => {
    for (const bad of [null, undefined, 1, "x", ["a"]]) {
      expect(parseLocalPrefs(bad)).toEqual({});
    }
  });

  it("모양이 틀린 값은 그 항목만 버린다", () => {
    const parsed = parseLocalPrefs({
      "ldd-todo-order": "목록이 아님",
      "ldd-habit-order": ["h1"],
    });
    expect(parsed).toEqual({ "ldd-habit-order": ["h1"] });
  });

  it("방해금지 자리에 목록이 오면 버린다", () => {
    expect(parseLocalPrefs({ "ldd:quietHours": ["22", "7"] })).toEqual({});
  });

  it("목록 자리에 방해금지 모양이 오면 버린다", () => {
    expect(parseLocalPrefs({ "ldd-todo-order": { start: 1, end: 2 } })).toEqual({});
  });

  it("상한을 넘는 목록은 잘라서 받는다", () => {
    const many = Array.from({ length: LOCAL_PREF_LIST_CAP + 10 }, (_, i) => `x${i}`);
    const parsed = parseLocalPrefs({ "ldd-todo-order": many });
    expect(parsed["ldd-todo-order"]).toHaveLength(LOCAL_PREF_LIST_CAP);
  });
});

describe("planLocalPrefsRestore", () => {
  const prefs: LocalPrefs = {
    "ldd-todo-order": ["a", "b"],
    "ldd:quietHours": { start: 22, end: 7 },
  };

  it("없는 키만 쓴다", () => {
    const writes = planLocalPrefsRestore(prefs, reader({}));
    expect(writes).toEqual([
      { key: "ldd-todo-order", value: JSON.stringify(["a", "b"]) },
      { key: "ldd:quietHours", value: JSON.stringify({ start: 22, end: 7 }) },
    ]);
  });

  it("이미 있으면 건드리지 않는다", () => {
    // Phase 29부터의 계약 그대로 — 가져오기는 지금 설정을 바꾸지 않는다.
    // 실제 사용 사례(브라우저를 바꿈)에서는 키가 없으므로 그대로 복원된다.
    const writes = planLocalPrefsRestore(
      prefs,
      reader({ "ldd-todo-order": JSON.stringify(["기존"]) }),
    );
    expect(writes.map((w) => w.key)).toEqual(["ldd:quietHours"]);
  });

  it("두 번 실행해도 결과가 같다(멱등)", () => {
    const store: Record<string, string> = {};
    const first = planLocalPrefsRestore(prefs, reader(store));
    for (const w of first) store[w.key] = w.value;
    expect(planLocalPrefsRestore(prefs, reader(store))).toEqual([]);
  });

  it("빈 문자열이 든 키도 '있음'으로 본다", () => {
    // "" 는 사용자가 지운 흔적일 수 있다. 있는 값을 백업으로 되살리지 않는다.
    const writes = planLocalPrefsRestore(prefs, reader({ "ldd-todo-order": "" }));
    expect(writes.map((w) => w.key)).toEqual(["ldd:quietHours"]);
  });

  it("빈 prefs면 쓸 것이 없다", () => {
    expect(planLocalPrefsRestore({}, reader({}))).toEqual([]);
  });
});

describe("라운드트립", () => {
  it("담은 값이 파싱 뒤에도 같다", () => {
    const store = {
      "ldd-todo-order": JSON.stringify(["t1", "t2"]),
      "ldd-habit-order": JSON.stringify(["h1"]),
      "ldd-pinned-memos": JSON.stringify(["m1"]),
      "ldd-bookmarked-articles": JSON.stringify(["a1"]),
      "ldd:favorites": JSON.stringify(["p1"]),
      "ldd-collapsed-widgets": JSON.stringify(["todo"]),
      "ldd-pomodoro-tags": JSON.stringify(["공부"]),
      "ldd:quietHours": JSON.stringify({ start: 22, end: 7 }),
      "ldd:notify-keywords": JSON.stringify(["배포"]),
    };
    const collected = collectLocalPrefs(reader(store));
    // 파일로 나갔다 돌아오는 경로를 그대로 태운다.
    const roundtripped = parseLocalPrefs(JSON.parse(JSON.stringify(collected)));
    expect(roundtripped).toEqual(collected);
    // 등록한 8개가 전부 살아 돌아온다 — 하나라도 빠지면 사용자는 담겼다고 믿은 걸 잃는다.
    expect(Object.keys(roundtripped)).toHaveLength(LOCAL_PREF_SPECS.length);
  });
});

// 2026-07-29 : 메신저 - 알림 키워드 백업 (Phase 56 T1 M-008)
describe("알림 키워드 백업", () => {
  it("허용 목록에 있어 내보내기에 담기고 가져오기에 통과한다", () => {
    const collected = collectLocalPrefs((k) =>
      k === "ldd:notify-keywords" ? JSON.stringify(["배포", "긴급"]) : null,
    );
    expect(collected["ldd:notify-keywords"]).toEqual(["배포", "긴급"]);
    expect(parseLocalPrefs({ "ldd:notify-keywords": ["배포"] })).toEqual({
      "ldd:notify-keywords": ["배포"],
    });
  });
});
