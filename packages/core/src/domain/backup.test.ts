import { describe, it, expect } from "vitest";
import {
  BACKUP_FORMAT_VERSION,
  buildBackup,
  type BackupCollections,
} from "./backup";

const empty: BackupCollections = {
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
};

const fill = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `${i}` }));

describe("buildBackup", () => {
  it("버전과 시각을 담는다", () => {
    const b = buildBackup(empty, "2026-07-26T00:00:00.000Z", {});
    expect(b.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(b.exportedAt).toBe("2026-07-26T00:00:00.000Z");
  });

  // 백업의 존재 이유. 여기서 컬렉션이 하나라도 빠지면 사용자는 없는 백업을 믿게 된다.
  it("여덟 컬렉션을 모두 담는다", () => {
    const b = buildBackup(
      {
        todos: fill(1),
        memos: fill(2),
        habits: fill(3),
        habitChecks: fill(4),
        calendarEvents: fill(5),
        pages: fill(6),
        feeds: fill(7),
        duckState: fill(1),
        pomodoroSessions: [],
        activityDaily: [],
        messageRooms: [],
        messages: [],
      },
      "2026-07-26T00:00:00.000Z",
      {},
    );
    expect(b.todos).toHaveLength(1);
    expect(b.memos).toHaveLength(2);
    expect(b.habits).toHaveLength(3);
    expect(b.habitChecks).toHaveLength(4);
    expect(b.calendarEvents).toHaveLength(5);
    expect(b.pages).toHaveLength(6);
    expect(b.feeds).toHaveLength(7);
    expect(b.duckState).toHaveLength(1);
  });

  it("페이지 본문을 그대로 보존한다 (백업의 핵심)", () => {
    const content = [{ type: "paragraph", content: [{ type: "text", text: "안녕" }] }];
    const b = buildBackup({ ...empty, pages: [{ id: "p1", content }] }, "t", {});
    expect((b.pages[0] as { content: unknown }).content).toEqual(content);
  });

  // 조회 상한만큼 돌아왔다면 그 뒤에 더 있는지 이 자리에서는 알 수 없다.
  // 조용히 넘기면 사용자는 잘린 파일을 온전한 백업으로 믿는다.
  it("조회 상한에 닿은 컬렉션을 알린다", () => {
    const b = buildBackup({ ...empty, todos: fill(500) }, "t", { todos: 500 });
    expect(b.truncated).toEqual(["todos"]);
  });

  it("상한 미만이면 알리지 않는다", () => {
    const b = buildBackup({ ...empty, todos: fill(499) }, "t", { todos: 500 });
    expect(b.truncated).toEqual([]);
  });

  it("상한을 주지 않은 컬렉션은 판정하지 않는다", () => {
    const b = buildBackup({ ...empty, habitChecks: fill(9999) }, "t", {});
    expect(b.truncated).toEqual([]);
  });

  it("여러 컬렉션이 닿으면 전부, 일정한 순서로 알린다", () => {
    const b = buildBackup(
      { ...empty, todos: fill(500), pages: fill(500), memos: fill(500) },
      "t",
      { todos: 500, pages: 500, memos: 500 },
    );
    expect(b.truncated).toEqual(["memos", "pages", "todos"]);
  });

  it("빈 컬렉션과 상한 0을 혼동하지 않는다", () => {
    // 0건은 정상적인 빈 상태이지 잘린 것이 아니다.
    const b = buildBackup(empty, "t", { todos: 0, memos: 500 });
    expect(b.truncated).toEqual([]);
  });

  it("입력 배열을 변형하지 않는다", () => {
    const todos = fill(2);
    const b = buildBackup({ ...empty, todos }, "t", {});
    expect(todos).toHaveLength(2);
    expect(b.todos).not.toBe(todos);
  });
});

// 2026-07-29 : 백업 - v5 - 메신저 보관 (Phase 55 T2)
describe("buildBackup — v5 메신저", () => {
  it("대화방과 메시지를 담는다 (잃으면 되살릴 수 없는 유일본)", () => {
    const b = buildBackup(
      { ...empty, messageRooms: fill(2), messages: fill(3) },
      "t",
      {},
    );
    expect(b.messageRooms).toHaveLength(2);
    expect(b.messages).toHaveLength(3);
  });

  it("호출부가 이미 아는 잘림(knownTruncated)을 truncated에 합친다", () => {
    // 메시지는 방마다 왕복 가드가 있어 개수-상한 비교로는 잘림을 알 수 없다 —
    // 호출부가 "가드에 닿았다"는 사실 자체를 넘겨 준다.
    const b = buildBackup({ ...empty, todos: fill(500) }, "t", { todos: 500 }, {}, [
      "messages",
    ]);
    expect(b.truncated).toEqual(["messages", "todos"]);
  });

  it("knownTruncated가 상한 판정과 겹쳐도 한 번만 알린다", () => {
    const b = buildBackup({ ...empty, todos: fill(500) }, "t", { todos: 500 }, {}, [
      "todos",
    ]);
    expect(b.truncated).toEqual(["todos"]);
  });
});
