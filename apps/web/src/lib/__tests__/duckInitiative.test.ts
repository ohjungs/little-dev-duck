import { beforeEach, describe, expect, it, vi } from "vitest";

// 2026-07-26 : 오리 자율 발화 - 조합 지점 검사 (피드백 1-3)
// 규칙(core)과 조회(api)는 각각 잠갔다. 여기서 보는 건 **둘을 잇는 자리** —
// 이 저장소가 반복해서 결함을 낸 곳이고, 이번 구현에서도 실제로 배선을 한 번 틀렸다.
// 특히 "LLM을 부르지 않는다"와 "방해금지면 말하지 않는다"를 잠근다.

const listTodosForDuck = vi.fn();
const listEventsForDuck = vi.fn();
const listHabits = vi.fn();
const listHabitChecksInRange = vi.fn();

vi.mock("@ldd/api", () => ({
  listTodosForDuck: (...a: unknown[]) => listTodosForDuck(...a),
  listEventsForDuck: (...a: unknown[]) => listEventsForDuck(...a),
  listHabits: (...a: unknown[]) => listHabits(...a),
  listHabitChecksInRange: (...a: unknown[]) => listHabitChecksInRange(...a),
}));

const { loadInitiativeSnapshot, pickFromSnapshot, snapshotToInput, readSpoken, markSpoken } =
  await import("../duckInitiative");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = {} as any;
const TODAY = "2026-07-26";
const at = (iso: string) => new Date(iso);

const store = new Map<string, string>();
beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  listTodosForDuck.mockResolvedValue([]);
  listEventsForDuck.mockResolvedValue([]);
  listHabits.mockResolvedValue([]);
  listHabitChecksInRange.mockResolvedValue([]);
});

const todo = (dueDate: string | null) => ({
  id: "t",
  userId: "u",
  title: "할 일",
  isDone: false,
  dueDate,
  recurrence: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
});

describe("loadInitiativeSnapshot", () => {
  it("기한 지난 할 일을 오늘 마감과 구분해 센다", async () => {
    // 문자열 앞 10자리로 비교한다 — Date를 거치면 시간대만큼 하루가 밀린다.
    listTodosForDuck.mockResolvedValue([
      todo("2026-07-20T00:00:00.000Z"),
      todo("2026-07-26T00:00:00.000Z"),
      todo(null),
    ]);
    const snap = await loadInitiativeSnapshot(client, { now: at("2026-07-26T14:00:00"), today: TODAY });
    expect(snap).toMatchObject({ overdueTodos: 1, dueTodayTodos: 1 });
  });

  it("이미 지난 오늘 일정은 다음 일정으로 잡지 않는다", async () => {
    listEventsForDuck.mockResolvedValue([
      { id: "e", userId: "u", title: "지난 회의", startAt: "2026-07-26T09:00:00", endAt: null, createdAt: "", updatedAt: "" },
    ]);
    const snap = await loadInitiativeSnapshot(client, { now: at("2026-07-26T14:00:00"), today: TODAY });
    expect(snap?.nextEventAt).toBeNull();
  });

  it("조회 하나가 실패해도 위젯을 죽이지 않는다", async () => {
    // 자율 발화는 부가 기능이다. 여기서 던지면 오리 위젯 전체가 사라진다.
    listHabits.mockRejectedValue(new Error("boom"));
    await expect(
      loadInitiativeSnapshot(client, { now: at("2026-07-26T14:00:00"), today: TODAY }),
    ).resolves.toBeNull();
  });
});

// 2026-07-26: 판단을 **1분마다 다시** 하게 바꾸면서 조회와 판단을 분리했다.
// 그 전에는 화면을 연 순간에만 판단해서, 오후 1시에 열어 둔 채 3시 일정을 맞아도 말이 없었다.
// **방해금지 때 조회를 건너뛰던 성질은 일부러 버렸다** — 방해금지가 끝나는 순간(예: 07:00)에
// 쓸 스냅샷이 없으면 그때부터도 말을 못 한다. 조회는 화면당 한 번뿐이라 값이 싸다.
describe("pickFromSnapshot", () => {
  const snap = {
    overdueTodos: 1,
    dueTodayTodos: 0,
    uncheckedHabits: [],
    nextEventAt: null,
    nextEventTitle: null,
  };

  it("방해금지면 아무 말도 하지 않는다", () => {
    expect(
      pickFromSnapshot(snap, { now: at("2026-07-26T14:00:00"), today: TODAY, quiet: true }),
    ).toBeNull();
  });

  it("오늘 이미 말한 종류는 다시 말하지 않는다", () => {
    markSpoken(TODAY, "overdue");
    expect(
      pickFromSnapshot(snap, { now: at("2026-07-26T14:00:00"), today: TODAY, quiet: false }),
    ).toBeNull();
  });

  it("시간이 흐르면 같은 스냅샷에서도 판단이 달라진다 (재조회 없이)", () => {
    // 예약이 실제로 알려주려면 이게 돼야 한다 — 조회는 그대로 두고 시각만 바뀐다.
    const withEvent = {
      ...snap,
      overdueTodos: 0,
      nextEventAt: Date.parse("2026-07-26T15:00:00"),
      nextEventTitle: "회의",
    };
    const early = pickFromSnapshot(withEvent, {
      now: at("2026-07-26T13:00:00"),
      today: TODAY,
      quiet: false,
    });
    const near = pickFromSnapshot(withEvent, {
      now: at("2026-07-26T14:30:00"),
      today: TODAY,
      quiet: false,
    });
    expect(early).toBeNull(); // 두 시간 전엔 소음이다
    expect(near?.kind).toBe("upcomingEvent");
  });
});

describe("snapshotToInput", () => {
  it("남은 분을 지금 시각으로 다시 계산한다", () => {
    const input = snapshotToInput(
      {
        overdueTodos: 0,
        dueTodayTodos: 0,
        uncheckedHabits: [],
        nextEventAt: Date.parse("2026-07-26T15:00:00"),
        nextEventTitle: "회의",
      },
      at("2026-07-26T14:20:00"),
    );
    expect(input.nextEventInMinutes).toBe(40);
    expect(input.hour).toBe(14);
  });

  it("일정이 없으면 null을 유지한다", () => {
    const input = snapshotToInput(
      { overdueTodos: 0, dueTodayTodos: 0, uncheckedHabits: [], nextEventAt: null, nextEventTitle: null },
      at("2026-07-26T14:00:00"),
    );
    expect(input.nextEventInMinutes).toBeNull();
  });
});

describe("발화 기록", () => {
  it("날짜가 바뀌면 초기화된다", () => {
    markSpoken("2026-07-25", "overdue");
    expect(readSpoken(TODAY)).toEqual({ spokenKinds: [], spokenCount: 0 });
  });

  it("같은 종류를 두 번 기록해도 종류는 한 번만, 횟수는 늘어난다", () => {
    markSpoken(TODAY, "overdue");
    markSpoken(TODAY, "overdue");
    expect(readSpoken(TODAY)).toEqual({ spokenKinds: ["overdue"], spokenCount: 2 });
  });

  it("저장값이 깨져 있어도 죽지 않는다", () => {
    store.set("ldd-duck-initiative", "{깨진 JSON");
    expect(readSpoken(TODAY)).toEqual({ spokenKinds: [], spokenCount: 0 });
  });
});
