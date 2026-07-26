import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildBackup, type Backup } from "@ldd/core";

// 2026-07-26 : 백업 - 가져오기 - 조합지점 검사
// 판단(core)과 쓰기(api)는 각각 잠갔다. 여기서 보는 건 **둘을 잇는 자리** —
// 내보내기에서 결함이 났던 바로 그 자리다. 특히 순서(외래키)와 "덮어쓰지 않는다"를 본다.

const restoreTodo = vi.fn();
const restoreMemo = vi.fn();
const restoreHabit = vi.fn();
const restoreHabitCheck = vi.fn();
const restoreCalendarEvent = vi.fn();
const restorePageFromBackup = vi.fn();
const restoreFeed = vi.fn();
const restoreDuckState = vi.fn();

vi.mock("@ldd/api", () => ({
  restoreTodo: (...a: unknown[]) => restoreTodo(...a),
  restoreMemo: (...a: unknown[]) => restoreMemo(...a),
  restoreHabit: (...a: unknown[]) => restoreHabit(...a),
  restoreHabitCheck: (...a: unknown[]) => restoreHabitCheck(...a),
  restoreCalendarEvent: (...a: unknown[]) => restoreCalendarEvent(...a),
  restorePageFromBackup: (...a: unknown[]) => restorePageFromBackup(...a),
  restoreFeed: (...a: unknown[]) => restoreFeed(...a),
  restoreDuckState: (...a: unknown[]) => restoreDuckState(...a),
  // 복원이 기존 데이터를 지우거나 바꾸는 함수를 부르지 않는지 감시한다.
  deleteTodo: vi.fn(),
  deleteMemo: vi.fn(),
  updateTodo: vi.fn(),
  updatePage: vi.fn(),
  purgePage: vi.fn(),
}));

const { restoreBackup, previewBackup } = await import("../restoreBackup");

const U = (n: number) => `0000000${n}-0000-4000-8000-000000000000`.slice(-36);
const uid = U(9);
const ts = "2026-07-20T00:00:00.000Z";

const page = (id: string, parentId: string | null = null) => ({
  id,
  userId: uid,
  parentId,
  title: "문서",
  content: [{ type: "paragraph" }],
  plainText: "",
  icon: null,
  isTrashed: false,
  trashedAt: null,
  createdAt: ts,
  updatedAt: ts,
  dbSchema: null,
  rowProps: {},
  isPublic: false,
  publicSlug: null,
  coverUrl: null,
});

const habit = (id: string) => ({
  id,
  userId: uid,
  title: "운동",
  frequency: "daily" as const,
  timesPerWeek: null,
  createdAt: ts,
  updatedAt: ts,
});

const check = (id: string, habitId: string) => ({
  id,
  habitId,
  userId: uid,
  checkedDate: "2026-07-20",
  createdAt: ts,
});

const bundle = (over: Partial<Backup>): Backup =>
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
      ...over,
    },
    ts,
    {},
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of [
    restoreTodo,
    restoreMemo,
    restoreHabit,
    restoreHabitCheck,
    restoreCalendarEvent,
    restorePageFromBackup,
    restoreFeed,
    restoreDuckState,
  ]) {
    fn.mockResolvedValue(undefined);
  }
});

describe("restoreBackup", () => {
  it("습관을 체크 기록보다 먼저 넣는다 (외래키)", async () => {
    const order: string[] = [];
    restoreHabit.mockImplementation(async () => void order.push("habit"));
    restoreHabitCheck.mockImplementation(async () => void order.push("check"));
    await restoreBackup(client, bundle({ habits: [habit(U(1))], habitChecks: [check(U(2), U(1))] }));
    expect(order).toEqual(["habit", "check"]);
  });

  it("페이지는 부모를 자식보다 먼저 넣는다", async () => {
    const ids: string[] = [];
    restorePageFromBackup.mockImplementation(async (_c: unknown, p: { id: string }) => {
      ids.push(p.id);
    });
    // 자식이 앞에 오는 파일을 준다 — 그대로 넣으면 외래키에 걸린다.
    await restoreBackup(client, bundle({ pages: [page(U(2), U(1)), page(U(1))] }));
    expect(ids).toEqual([U(1), U(2)]);
  });

  it("페이지 본문을 그대로 넘긴다", async () => {
    await restoreBackup(client, bundle({ pages: [page(U(1))] }));
    expect(restorePageFromBackup.mock.calls[0][1].content).toEqual([{ type: "paragraph" }]);
  });

  it("복원한 개수를 센다", async () => {
    const outcome = await restoreBackup(
      client,
      bundle({ habits: [habit(U(1)), habit(U(2))], pages: [page(U(3))] }),
    );
    expect(outcome.restored).toBe(3);
    expect(outcome.failed).toBe(0);
  });

  it("한 건이 실패해도 나머지를 계속 넣는다", async () => {
    // 중간에 멈추면 사용자는 얼마나 들어갔는지 모르는 상태로 남는다.
    restoreHabit
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const outcome = await restoreBackup(client, bundle({ habits: [habit(U(1)), habit(U(2))] }));
    expect(outcome.restored).toBe(1);
    expect(outcome.failed).toBe(1);
    expect(outcome.errors[0]).toContain("boom");
  });

  it("실패 사유를 무한정 쌓지 않는다", async () => {
    restoreHabit.mockRejectedValue(new Error("boom"));
    const habits = Array.from({ length: 20 }, (_, i) => habit(U(i % 9)));
    const outcome = await restoreBackup(client, bundle({ habits }));
    expect(outcome.failed).toBe(20);
    expect(outcome.errors.length).toBeLessThanOrEqual(5);
  });

  it("모양이 깨진 항목은 넣지 않고 개수로 알린다", async () => {
    const outcome = await restoreBackup(
      client,
      bundle({ habits: [habit(U(1)), { id: "uuid아님" }] }),
    );
    expect(outcome.restored).toBe(1);
    expect(outcome.invalid).toBe(1);
  });

  it("빈 백업이면 아무것도 부르지 않는다", async () => {
    const outcome = await restoreBackup(client, bundle({}));
    expect(outcome.restored).toBe(0);
    expect(restoreTodo).not.toHaveBeenCalled();
    expect(restorePageFromBackup).not.toHaveBeenCalled();
  });

  it("두 번 넣어도 같은 호출만 한다 (멱등 — 덮어쓰기·삭제 없음)", async () => {
    const b = bundle({ todos: [{ id: U(1), userId: uid, title: "할 일", isDone: false, dueDate: null, createdAt: ts, updatedAt: ts }] });
    await restoreBackup(client, b);
    await restoreBackup(client, b);
    // insert만 두 번(두 번째는 api가 23505를 멱등 성공으로 흡수한다).
    expect(restoreTodo).toHaveBeenCalledTimes(2);
  });
});

describe("previewBackup", () => {
  it("백업이 아니면 사유와 함께 거부한다", () => {
    const r = previewBackup({ hello: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("백업 파일");
  });

  it("넣을 개수를 미리 알려준다 (실행 전 확인용)", () => {
    const raw = JSON.parse(JSON.stringify(bundle({ habits: [habit(U(1))], pages: [page(U(2))] })));
    const r = previewBackup(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.total).toBe(2);
      expect(r.invalid).toBe(0);
    }
  });

  it("미리보기는 아무것도 쓰지 않는다", () => {
    previewBackup(JSON.parse(JSON.stringify(bundle({ habits: [habit(U(1))] }))));
    expect(restoreHabit).not.toHaveBeenCalled();
  });
});
