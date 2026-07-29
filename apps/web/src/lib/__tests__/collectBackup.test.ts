import { beforeEach, describe, expect, it, vi } from "vitest";

// 2026-07-26 : 백업 - 내보내기 - 조합지점 검사
// 실제 결함은 조립(core)도 조회(api)도 아닌 **둘을 잇는 지점**에 있었다:
// 내보내기가 본문 없는 목록용 조회를 쓰고, 캘린더 일정·습관 체크는 부르지도 않았다.
// 그래서 "무엇을 부르는가"와 "결과에 무엇이 담기는가"를 직접 잠근다.

const listTodos = vi.fn();
const listMemos = vi.fn();
const listHabits = vi.fn();
const listHabitChecks = vi.fn();
const listCalendarEvents = vi.fn();
const listPagesForExport = vi.fn();
const listPages = vi.fn();
const listFeeds = vi.fn();
const getDuckState = vi.fn();
const listPomodoroSessions = vi.fn();
const listActivityDaily = vi.fn();
const listRooms = vi.fn();
const fetchAllRoomMessages = vi.fn();

vi.mock("@ldd/api", () => ({
  listTodos: (...a: unknown[]) => listTodos(...a),
  listMemos: (...a: unknown[]) => listMemos(...a),
  listHabits: (...a: unknown[]) => listHabits(...a),
  listHabitChecks: (...a: unknown[]) => listHabitChecks(...a),
  listCalendarEvents: (...a: unknown[]) => listCalendarEvents(...a),
  listPagesForExport: (...a: unknown[]) => listPagesForExport(...a),
  listPages: (...a: unknown[]) => listPages(...a),
  listFeeds: (...a: unknown[]) => listFeeds(...a),
  getDuckState: (...a: unknown[]) => getDuckState(...a),
  listPomodoroSessions: (...a: unknown[]) => listPomodoroSessions(...a),
  listActivityDaily: (...a: unknown[]) => listActivityDaily(...a),
  listRooms: (...a: unknown[]) => listRooms(...a),
  fetchAllRoomMessages: (...a: unknown[]) => fetchAllRoomMessages(...a),
  ROOM_LIST_LIMIT: 200,
  ACTIVITY_EXPORT_LIMIT: 3000,
  PAGE_EXPORT_LIMIT: 500,
  HABIT_CHECK_EXPORT_LIMIT: 5000,
}));

const { collectBackup } = await import("../collectBackup");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeClient = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
  listTodos.mockResolvedValue([]);
  listMemos.mockResolvedValue([]);
  listHabits.mockResolvedValue([]);
  listHabitChecks.mockResolvedValue([]);
  listCalendarEvents.mockResolvedValue([]);
  listPagesForExport.mockResolvedValue([]);
  listPages.mockResolvedValue([]);
  listFeeds.mockResolvedValue([]);
  getDuckState.mockResolvedValue({ userId: "u", xp: 0, level: 1, feed: 100, costume: "default", updatedAt: "t" });
  listPomodoroSessions.mockResolvedValue([]);
  listActivityDaily.mockResolvedValue([]);
  listRooms.mockResolvedValue([]);
  fetchAllRoomMessages.mockResolvedValue({ messages: [], hitGuard: false });
});

describe("collectBackup", () => {
  it("페이지는 본문 포함 조회로 가져온다 (목록용 조회를 쓰지 않는다)", async () => {
    await collectBackup(fakeClient);
    expect(listPagesForExport).toHaveBeenCalledTimes(1);
    // listPages를 쓰면 본문이 통째로 빠진다 — 이 결함이 실제로 배포돼 있었다.
    expect(listPages).not.toHaveBeenCalled();
  });

  it("캘린더 일정과 습관 체크 기록도 부른다", async () => {
    await collectBackup(fakeClient);
    expect(listCalendarEvents).toHaveBeenCalledTimes(1);
    expect(listHabitChecks).toHaveBeenCalledTimes(1);
  });

  // v2: 등록한 피드와 오리 진행도. 둘 다 잃으면 손으로 되돌리기 어렵다.
  it("등록한 피드와 오리 상태도 부른다", async () => {
    await collectBackup(fakeClient);
    expect(listFeeds).toHaveBeenCalledTimes(1);
    expect(getDuckState).toHaveBeenCalledTimes(1);
  });

  // v3: 집중 기록과 활동 집계. claude_code 활동은 로컬 수집기가 올린 유일본이다.
  it("집중 기록과 활동 집계도 부른다", async () => {
    await collectBackup(fakeClient);
    expect(listPomodoroSessions).toHaveBeenCalledTimes(1);
    expect(listActivityDaily).toHaveBeenCalledTimes(1);
  });

  it("오리 상태는 행이 하나뿐이라 배열로 감싼다", async () => {
    const backup = await collectBackup(fakeClient);
    expect(backup.duckState).toHaveLength(1);
    expect((backup.duckState[0] as { level: number }).level).toBe(1);
  });

  it("습관 체크는 상한을 명시해 부른다 (조용한 잘림 방지)", async () => {
    await collectBackup(fakeClient);
    expect(listHabitChecks).toHaveBeenCalledWith(fakeClient, 5000);
  });

  it("페이지 본문을 손대지 않고 그대로 담는다", async () => {
    const content = [{ type: "paragraph", content: [{ type: "text", text: "안녕" }] }];
    listPagesForExport.mockResolvedValue([{ id: "p1", title: "문서", content }]);
    const backup = await collectBackup(fakeClient);
    expect((backup.pages[0] as { content: unknown }).content).toEqual(content);
  });

  it("컬렉션과 버전을 담는다", async () => {
    const backup = await collectBackup(fakeClient);
    // 값을 못박아 둔다 — 형식을 바꾸면 이 테스트가 먼저 울어 "무엇이 늘었는지" 적게 만든다.
    expect(backup.formatVersion).toBe(5);
    for (const key of [
      "todos",
      "memos",
      "habits",
      "habitChecks",
      "calendarEvents",
      "pages",
      "feeds",
      "pomodoroSessions",
      "activityDaily",
      "messageRooms",
      "messages",
    ] as const) {
      expect(backup[key], key).toEqual([]);
    }
  });

  it("window가 없는 환경에서도 로컬 설정 자리를 비워 둘 뿐 실패하지 않는다", async () => {
    // 내보내기 조립은 브라우저에서 돌지만 이 테스트는 node다. 여기서 터지면 백업이 통째로 실패한다.
    const backup = await collectBackup(fakeClient);
    expect(backup.localPrefs).toEqual({});
  });

  it("상한에 닿은 컬렉션을 알린다", async () => {
    listTodos.mockResolvedValue(Array.from({ length: 500 }, (_, i) => ({ id: i })));
    const backup = await collectBackup(fakeClient);
    expect(backup.truncated).toEqual(["todos"]);
  });

  it("평범한 분량이면 아무것도 알리지 않는다", async () => {
    listTodos.mockResolvedValue([{ id: 1 }]);
    const backup = await collectBackup(fakeClient);
    expect(backup.truncated).toEqual([]);
  });

  // v5: 메신저 대화 — 다시 만들 방법이 없는 유일본이라 백업에 담는다(보관 전용).
  it("대화방과 방별 전체 메시지를 부른다", async () => {
    listRooms.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    fetchAllRoomMessages
      .mockResolvedValueOnce({ messages: [{ id: "m1" }], hitGuard: false })
      .mockResolvedValueOnce({ messages: [{ id: "m2" }, { id: "m3" }], hitGuard: false });
    const backup = await collectBackup(fakeClient);
    expect(fetchAllRoomMessages).toHaveBeenCalledTimes(2);
    expect(fetchAllRoomMessages).toHaveBeenCalledWith(fakeClient, "r1");
    expect(backup.messageRooms).toHaveLength(2);
    expect(backup.messages.map((m) => (m as { id: string }).id)).toEqual(["m1", "m2", "m3"]);
  });

  it("방 하나라도 왕복 가드에 닿으면 메시지를 잘림으로 알린다", async () => {
    listRooms.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    fetchAllRoomMessages
      .mockResolvedValueOnce({ messages: [{ id: "m1" }], hitGuard: true })
      .mockResolvedValueOnce({ messages: [], hitGuard: false });
    const backup = await collectBackup(fakeClient);
    expect(backup.truncated).toContain("messages");
  });

  it("조회 하나가 실패하면 반쪽 백업을 만들지 않고 실패시킨다", async () => {
    // 일부만 담긴 파일이 온전한 백업으로 저장되면 사용자는 그걸 믿는다.
    listCalendarEvents.mockRejectedValue(new Error("boom"));
    await expect(collectBackup(fakeClient)).rejects.toThrow("boom");
  });
});
