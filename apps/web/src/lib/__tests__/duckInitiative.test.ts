import { beforeEach, describe, expect, it, vi } from "vitest";

// 2026-07-26 : 오리 자율 발화 - 조합 지점 검사 (피드백 1-3)
// 규칙(core)과 조회(api)는 각각 잠갔다. 여기서 보는 건 **둘을 잇는 자리** —
// 이 저장소가 반복해서 결함을 낸 곳이고, 이번 구현에서도 실제로 배선을 한 번 틀렸다.
// 특히 "LLM을 부르지 않는다"와 "방해금지면 조회조차 하지 않는다"를 잠근다.

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

const { loadDuckInitiative, readSpoken, markSpoken } = await import("../duckInitiative");

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

describe("loadDuckInitiative", () => {
  it("방해금지면 조회조차 하지 않는다", async () => {
    // 어차피 말하지 않을 건데 DB를 두들길 이유가 없다.
    const r = await loadDuckInitiative(client, {
      now: at("2026-07-26T14:00:00"),
      today: TODAY,
      quiet: true,
    });
    expect(r).toBeNull();
    expect(listTodosForDuck).not.toHaveBeenCalled();
  });

  it("기한 지난 할 일을 오늘 마감과 구분해 센다", async () => {
    // 문자열 앞 10자리로 비교한다 — Date를 거치면 시간대만큼 하루가 밀린다.
    listTodosForDuck.mockResolvedValue([
      todo("2026-07-20T00:00:00.000Z"),
      todo("2026-07-26T00:00:00.000Z"),
      todo(null),
    ]);
    const r = await loadDuckInitiative(client, {
      now: at("2026-07-26T14:00:00"),
      today: TODAY,
      quiet: false,
    });
    expect(r?.kind).toBe("overdue");
    expect(r?.message).toContain("1");
  });

  it("이미 지난 오늘 일정은 알리지 않는다", async () => {
    listEventsForDuck.mockResolvedValue([
      { id: "e", userId: "u", title: "지난 회의", startAt: "2026-07-26T09:00:00", endAt: null, createdAt: "", updatedAt: "" },
    ]);
    const r = await loadDuckInitiative(client, {
      now: at("2026-07-26T14:00:00"),
      today: TODAY,
      quiet: false,
    });
    expect(r).toBeNull();
  });

  it("조회 하나가 실패해도 위젯을 죽이지 않는다", async () => {
    // 자율 발화는 부가 기능이다. 여기서 던지면 오리 위젯 전체가 사라진다.
    listHabits.mockRejectedValue(new Error("boom"));
    await expect(
      loadDuckInitiative(client, { now: at("2026-07-26T14:00:00"), today: TODAY, quiet: false }),
    ).resolves.toBeNull();
  });

  it("오늘 이미 말한 종류는 다시 말하지 않는다", async () => {
    listTodosForDuck.mockResolvedValue([todo("2026-07-20T00:00:00.000Z")]);
    markSpoken(TODAY, "overdue");
    const r = await loadDuckInitiative(client, {
      now: at("2026-07-26T14:00:00"),
      today: TODAY,
      quiet: false,
    });
    expect(r).toBeNull();
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
