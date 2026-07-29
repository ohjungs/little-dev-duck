import { describe, it, expect } from "vitest";
import { BACKUP_FORMAT_VERSION, buildBackup } from "./backup";
import { parseBackup } from "./backup-parse";

const validFile = () =>
  JSON.parse(
    JSON.stringify(
      buildBackup(
        {
          todos: [{ id: "t1" }],
          memos: [],
          habits: [],
          habitChecks: [],
          calendarEvents: [],
          pages: [],
          feeds: [],
          duckState: [],
          pomodoroSessions: [],
          activityDaily: [],
          messageRooms: [],
          messages: [],
        },
        "2026-07-26T00:00:00.000Z",
        {},
      ),
    ),
  ) as Record<string, unknown>;

describe("parseBackup", () => {
  it("우리가 내보낸 파일을 그대로 받아들인다 (라운드트립)", () => {
    const r = parseBackup(validFile());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.todos).toHaveLength(1);
      expect(r.backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
      expect(r.backup.exportedAt).toBe("2026-07-26T00:00:00.000Z");
    }
  });

  it("백업이 아닌 것은 거부한다", () => {
    for (const bad of [null, undefined, 3, "문자열", [], true]) {
      const r = parseBackup(bad);
      expect(r.ok, JSON.stringify(bad)).toBe(false);
    }
  });

  // 사용자가 잘못된 파일을 골랐을 때 "왜 안 되는지"를 알아야 다음 행동을 정할 수 있다.
  it("백업 파일이 아니면 그렇게 말한다", () => {
    const r = parseBackup({ hello: "world" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("백업 파일");
  });

  it("더 새로운 형식은 추측해서 읽지 않고 거부한다", () => {
    // 모르는 형식을 아는 척 읽으면 데이터가 조용히 어긋난 채 들어간다.
    const r = parseBackup({ ...validFile(), formatVersion: BACKUP_FORMAT_VERSION + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("새로운");
  });

  it("버전이 없거나 이상하면 거부한다", () => {
    for (const v of [undefined, 0, -1, 1.5, "1", null]) {
      const file = { ...validFile(), formatVersion: v };
      expect(parseBackup(file).ok, String(v)).toBe(false);
    }
  });

  it("컬렉션이 하나라도 빠지면 거부하고 무엇이 빠졌는지 말한다", () => {
    const file = validFile();
    delete file.pages;
    const r = parseBackup(file);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("pages");
  });

  it("컬렉션이 배열이 아니면 거부한다", () => {
    const r = parseBackup({ ...validFile(), memos: { a: 1 } });
    expect(r.ok).toBe(false);
  });

  it("항목이 객체가 아니면 거부한다", () => {
    // 문자열·null이 섞인 배열은 복원 단계에서 정체 모를 실패를 낸다. 입구에서 막는다.
    expect(parseBackup({ ...validFile(), todos: ["문자열"] }).ok).toBe(false);
    expect(parseBackup({ ...validFile(), todos: [null] }).ok).toBe(false);
  });

  it("빈 백업도 유효하다 (아무것도 없는 계정)", () => {
    const empty = buildBackup(
      { todos: [], memos: [], habits: [], habitChecks: [], calendarEvents: [], pages: [], feeds: [], duckState: [], pomodoroSessions: [], activityDaily: [], messageRooms: [], messages: [] },
      "t",
      {},
    );
    expect(parseBackup(JSON.parse(JSON.stringify(empty))).ok).toBe(true);
  });

  // 상한에 닿아 잘렸을 수 있는 파일은 거부하지 않는다 — 불완전해도 복원 가치가 있다.
  // 다만 그 사실이 결과에 남아야 호출부가 사용자에게 알릴 수 있다.
  it("잘렸을 수 있는 백업도 받아들이되 그 사실을 보존한다", () => {
    const file = { ...validFile(), truncated: ["todos"] };
    const r = parseBackup(file);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup.truncated).toEqual(["todos"]);
  });

  it("truncated가 없거나 이상해도 파일 자체는 살린다", () => {
    // 옛 파일·손으로 편집한 파일에서 이 필드만 깨졌다고 복원을 막을 이유가 없다.
    const file = validFile();
    delete file.truncated;
    const r = parseBackup(file);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup.truncated).toEqual([]);
  });

  it("exportedAt이 없으면 빈 문자열로 둔다 (복원에 쓰이지 않는 표시용)", () => {
    const file = validFile();
    delete file.exportedAt;
    const r = parseBackup(file);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup.exportedAt).toBe("");
  });
});

// 2026-07-26 v2: feeds·duckState 추가. **옛 백업(v1)을 우리 손으로 거부하면 안 된다.**
describe("parseBackup — v1 하위호환", () => {
  const v1File = () => {
    const f = validFile();
    delete f.feeds;
    delete f.duckState;
    f.formatVersion = 1;
    return f;
  };

  it("v1 파일(feeds·duckState 없음)을 그대로 받아들인다", () => {
    const r = parseBackup(v1File());
    expect(r.ok).toBe(true);
  });

  it("v1 파일의 빠진 컬렉션은 빈 배열로 채운다", () => {
    const r = parseBackup(v1File());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.feeds).toEqual([]);
      expect(r.backup.duckState).toEqual([]);
    }
  });

  it("v1 파일의 기존 데이터는 그대로 살린다", () => {
    const r = parseBackup(v1File());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup.todos).toHaveLength(1);
  });

  it("v1이라고 적혀 있어도 formatVersion은 파일의 값을 보존한다", () => {
    const r = parseBackup(v1File());
    expect(r.ok).toBe(true);
    // 읽은 파일이 어떤 형식이었는지 호출부가 알 수 있어야 한다(무엇이 없는지 판단 근거).
    if (r.ok) expect(r.backup.formatVersion).toBe(1);
  });

  it("선택 컬렉션이 '없음'이 아니라 '깨짐'이면 거부한다", () => {
    // 없는 것과 깨진 것은 다르다. 깨진 걸 조용히 버리면 넣었다고 믿은 것을 잃는다.
    expect(parseBackup({ ...validFile(), feeds: "문자열" }).ok).toBe(false);
    expect(parseBackup({ ...validFile(), duckState: [null] }).ok).toBe(false);
  });
});

// 조립(buildBackup)과 검사(parseLocalPrefs)는 각각 잠겨 있다. 이 저장소가 반복해서 결함을 낸 건
// **둘을 잇는 지점**이라(내보내기가 목록용 조회를 쓴 Phase 29) 조합을 따로 잠근다.
describe("parseBackup - 브라우저 로컬 설정(v4)", () => {
  it("v3 이하 파일에는 없으므로 빈 객체가 된다", () => {
    const old: Record<string, unknown> = { ...validFile(), formatVersion: 3 };
    delete old.localPrefs;
    const r = parseBackup(old);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.backup.localPrefs).toEqual({});
  });

  it("담긴 설정을 그대로 살린다", () => {
    const r = parseBackup({
      ...validFile(),
      localPrefs: { "ldd-todo-order": ["a", "b"], "ldd:quietHours": { start: 22, end: 7 } },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.localPrefs).toEqual({
        "ldd-todo-order": ["a", "b"],
        "ldd:quietHours": { start: 22, end: 7 },
      });
    }
  });

  it("등록되지 않은 키가 든 파일도 거부하지 않고 그 키만 버린다", () => {
    // **보안 성질**: 백업 파일은 외부에서 온다. 낯선 키를 그대로 쓰면 남이 만든 파일이
    // 브라우저의 아무 키나 덮어쓸 수 있다. 다만 그것 때문에 파일 전체를 거부하면
    // 사용자는 멀쩡한 할 일·페이지까지 복원하지 못한다.
    const r = parseBackup({
      ...validFile(),
      localPrefs: { "ldd-todo-order": ["a"], "ldd-theme": "dark", "evil-key": ["x"] },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.backup.localPrefs)).toEqual(["ldd-todo-order"]);
  });

  it("localPrefs가 깨져 있어도 나머지 복원을 막지 않는다", () => {
    // 컬렉션과 달리 이건 부가 설정이다. 이것 하나로 데이터 복원을 통째로 막을 이유가 없다.
    const r = parseBackup({ ...validFile(), localPrefs: "문자열" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.localPrefs).toEqual({});
      expect(r.backup.todos).toHaveLength(1);
    }
  });

  it("내보낸 파일이 그대로 다시 열린다(라운드트립)", () => {
    const exported = JSON.parse(
      JSON.stringify(
        buildBackup(
          {
            todos: [],
            memos: [],
            habits: [],
            habitChecks: [],
            calendarEvents: [],
            pages: [],
            feeds: [],
            duckState: [],
            pomodoroSessions: [],
            activityDaily: [],
            messageRooms: [],
            messages: [],
          },
          "2026-07-26T00:00:00.000Z",
          {},
          { "ldd:favorites": ["p1"], "ldd-pomodoro-tags": ["공부"] },
        ),
      ),
    ) as Record<string, unknown>;
    expect(exported.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    const r = parseBackup(exported);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.localPrefs).toEqual({
        "ldd:favorites": ["p1"],
        "ldd-pomodoro-tags": ["공부"],
      });
    }
  });
});

// 2026-07-29 : 백업 - v5 - 메신저 보관 (Phase 55 T2)
describe("parseBackup — v5 메신저", () => {
  it("v5 파일의 대화방·메시지를 살린다", () => {
    const file = validFile();
    file.messageRooms = [{ id: "r1" }];
    file.messages = [{ id: "m1" }, { id: "m2" }];
    const r = parseBackup(file);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.messageRooms).toHaveLength(1);
      expect(r.backup.messages).toHaveLength(2);
    }
  });

  it("v4 이전 파일(메신저 없음)은 빈 배열로 채운다", () => {
    const file = validFile();
    delete file.messageRooms;
    delete file.messages;
    file.formatVersion = 4;
    const r = parseBackup(file);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.messageRooms).toEqual([]);
      expect(r.backup.messages).toEqual([]);
    }
  });

  it("메시지가 '없음'이 아니라 '깨짐'이면 거부한다", () => {
    const file = validFile();
    file.messages = "깨짐";
    expect(parseBackup(file).ok).toBe(false);
  });
});
