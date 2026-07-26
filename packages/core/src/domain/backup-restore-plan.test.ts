import { describe, it, expect } from "vitest";
import { planRestore, orderPagesParentsFirst } from "./backup-restore-plan";
import type { Backup } from "./backup";
import type { Page } from "./page";

const U = (n: number) => `0000000${n}-0000-4000-8000-000000000000`.slice(-36);
const uid = U(9);

const bundle = (over: Partial<Backup>): Backup => ({
  formatVersion: 1,
  exportedAt: "t",
  truncated: [],
  // 브라우저 설정은 복원 계획(DB 쓰기)의 대상이 아니다 — 여기서는 늘 비어 있어도 된다.
  localPrefs: {},
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
  ...over,
});

const page = (id: string, parentId: string | null = null): Page => ({
  id,
  userId: uid,
  parentId,
  title: "문서",
  content: [],
  plainText: "",
  icon: null,
  isTrashed: false,
  trashedAt: null,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
  dbSchema: null,
  rowProps: {},
  isPublic: false,
  publicSlug: null,
  coverUrl: null,
});

const todo = (id: string) => ({
  id,
  userId: uid,
  title: "할 일",
  isDone: false,
  dueDate: null,
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
});

describe("orderPagesParentsFirst", () => {
  it("부모가 자식보다 먼저 오게 한다", () => {
    // 자식을 먼저 넣으면 parent_id 외래키가 걸려 그 문서를 잃는다.
    const ordered = orderPagesParentsFirst([page(U(2), U(1)), page(U(1))]);
    expect(ordered.map((p) => p.id)).toEqual([U(1), U(2)]);
  });

  it("여러 단계 깊이도 뿌리부터 내려간다", () => {
    const ordered = orderPagesParentsFirst([
      page(U(3), U(2)),
      page(U(2), U(1)),
      page(U(1)),
    ]);
    expect(ordered.map((p) => p.id)).toEqual([U(1), U(2), U(3)]);
  });

  it("파일에 없는 부모를 가리키면 그대로 둔다 (DB에 이미 있을 수 있다)", () => {
    // 같은 계정으로 되돌리는 경우 부모가 DB에 남아 있는 게 보통이다. 임의로 최상위로
    // 올리면 사용자의 문서 구조를 말없이 바꾸는 셈이 된다 — 실패하면 그 건만 실패시킨다.
    const ordered = orderPagesParentsFirst([page(U(2), U(7))]);
    expect(ordered.map((p) => p.id)).toEqual([U(2)]);
    expect(ordered[0].parentId).toBe(U(7));
  });

  it("순환 참조가 있어도 멈추지 않고 전부 돌려준다", () => {
    // 손으로 편집했거나 손상된 파일. 무한 루프로 앱이 멎으면 안 된다.
    const ordered = orderPagesParentsFirst([page(U(1), U(2)), page(U(2), U(1))]);
    expect(ordered).toHaveLength(2);
    expect(new Set(ordered.map((p) => p.id))).toEqual(new Set([U(1), U(2)]));
  });

  it("자기 자신을 부모로 가리켜도 멈추지 않는다", () => {
    const ordered = orderPagesParentsFirst([page(U(1), U(1))]);
    expect(ordered).toHaveLength(1);
  });

  it("한 항목도 잃지 않는다", () => {
    const input = [page(U(4), U(3)), page(U(1)), page(U(3), U(1)), page(U(2), U(9))];
    expect(orderPagesParentsFirst(input)).toHaveLength(4);
  });
});

describe("planRestore", () => {
  it("유효한 항목을 타입별로 나눠 돌려준다", () => {
    const plan = planRestore(bundle({ todos: [todo(U(1))], pages: [page(U(2))] }));
    expect(plan.todos).toHaveLength(1);
    expect(plan.pages).toHaveLength(1);
    expect(plan.invalid).toBe(0);
  });

  it("모양이 깨진 항목은 세어서 알리고 나머지는 살린다", () => {
    // 한 줄이 깨졌다고 백업 전체를 버리면 복원할 수 있던 것까지 잃는다.
    const plan = planRestore(
      bundle({ todos: [todo(U(1)), { id: "uuid아님", title: 3 }] }),
    );
    expect(plan.todos).toHaveLength(1);
    expect(plan.invalid).toBe(1);
  });

  it("습관을 체크 기록보다 먼저 넣도록 순서를 정한다", () => {
    // habit_checks.habit_id가 habits를 가리킨다. 순서가 뒤집히면 기록이 통째로 실패한다.
    const plan = planRestore(bundle({}));
    expect(plan.order.indexOf("habits")).toBeLessThan(plan.order.indexOf("habitChecks"));
  });

  it("페이지는 부모 먼저 순서로 정렬해 돌려준다", () => {
    const plan = planRestore(bundle({ pages: [page(U(2), U(1)), page(U(1))] }));
    expect(plan.pages.map((p) => p.id)).toEqual([U(1), U(2)]);
  });

  it("복원할 항목 수를 센다 (실행 전 사용자에게 보여줄 값)", () => {
    const plan = planRestore(bundle({ todos: [todo(U(1)), todo(U(2))], pages: [page(U(3))] }));
    expect(plan.total).toBe(3);
  });

  it("빈 백업이면 아무것도 하지 않는다", () => {
    const plan = planRestore(bundle({}));
    expect(plan.total).toBe(0);
    expect(plan.invalid).toBe(0);
  });

  it("휴지통에 있던 페이지도 그대로 복원 대상이다", () => {
    // 내보내기는 휴지통을 제외하지만, 손으로 만든 파일에 섞여 있을 수 있다.
    // 여기서 조용히 버리면 사용자는 넣었다고 믿은 문서를 잃는다.
    const trashed = { ...page(U(1)), isTrashed: true, trashedAt: "2026-07-20T00:00:00.000Z" };
    expect(planRestore(bundle({ pages: [trashed] })).pages).toHaveLength(1);
  });
});
