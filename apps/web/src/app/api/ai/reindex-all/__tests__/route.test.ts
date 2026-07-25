import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 2026-07-26 : RAG - 재색인 - 조합 지점 검사
// 이 경로에서 세 사이클 연속 결함이 나왔고 **둘은 내가 만든 것**이다. 공통점이 있다:
// 순수 로직(reindexPlan) 테스트는 매번 통과했고, 결함은 **라우트가 그것들을 조합하는 지점**에
// 있었다. 그래서 조합을 직접 검사한다 — 아래 두 테스트는 내가 실제로 낸 회귀 그 자체다.
//
//  1) listIndexedSourceIds가 한 페이지만 읽어 이미 색인된 걸 "미색인"으로 오판 → 매 세션 재색인
//  2) missing 모드에 옛 offset이 적용돼 앞부분을 건너뛰고 "다 됐다"고 보고

const listMemos = vi.fn();
const listTodos = vi.fn();
const listHabits = vi.fn();
const listCalendarEvents = vi.fn();
const listPages = vi.fn();
const listIndexedSourceIds = vi.fn();
const indexSource = vi.fn();

vi.mock("@ldd/api", () => ({
  allowRequest: () => true,
  indexSource: (...args: unknown[]) => indexSource(...args),
  listMemos: () => listMemos(),
  listTodos: () => listTodos(),
  listHabits: () => listHabits(),
  listCalendarEvents: () => listCalendarEvents(),
  listPages: () => listPages(),
  listIndexedSourceIds: () => listIndexedSourceIds(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  }),
}));

const memo = (id: string) => ({ id, content: `내용 ${id}` });

beforeEach(() => {
  vi.resetModules();
  process.env.GEMINI_API_KEY = "test-key";
  [listMemos, listTodos, listHabits, listCalendarEvents, listPages].forEach((f) =>
    f.mockResolvedValue([]),
  );
  listIndexedSourceIds.mockResolvedValue([]);
  indexSource.mockResolvedValue(1);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function callRoute(body: unknown) {
  const { POST } = await import("../route");
  const res = await POST(
    new Request("http://localhost/api/ai/reindex-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

/** indexSource가 실제로 받은 sourceId 목록 */
function indexedIds(): string[] {
  return indexSource.mock.calls.map((c) => (c[2] as { sourceId: string }).sourceId);
}

describe("재색인 라우트 — 빠진 것만 모드", () => {
  it("이미 색인된 항목은 건드리지 않는다", async () => {
    listMemos.mockResolvedValue([memo("a"), memo("b"), memo("c")]);
    listIndexedSourceIds.mockResolvedValue([
      { sourceType: "memo", sourceId: "a" },
      { sourceType: "memo", sourceId: "c" },
    ]);
    const { json } = await callRoute({});
    expect(indexedIds()).toEqual(["b"]);
    expect(json).toMatchObject({ indexed: 1, total: 1, done: true });
  });

  // 회귀 1: 색인 목록을 한 페이지만 읽어 오판하면 여기서 드러난다.
  it("빠진 게 없으면 색인 호출이 0이다(쿼터 0)", async () => {
    listMemos.mockResolvedValue([memo("a"), memo("b")]);
    listIndexedSourceIds.mockResolvedValue([
      { sourceType: "memo", sourceId: "a" },
      { sourceType: "memo", sourceId: "b" },
    ]);
    const { json } = await callRoute({});
    expect(indexSource).not.toHaveBeenCalled();
    expect(json).toMatchObject({ indexed: 0, total: 0, done: true });
  });

  // 회귀 2: 옛 offset이 줄어든 목록에 적용돼 앞부분을 건너뛰던 것.
  it("offset을 보내도 무시하고 앞에서부터 처리한다", async () => {
    listMemos.mockResolvedValue([memo("a"), memo("b"), memo("c")]);
    const { json } = await callRoute({ offset: 2 });
    expect(indexedIds()).toEqual(["a", "b", "c"]);
    expect(json).toMatchObject({ done: true, total: 3 });
  });

  it("한 소스가 여러 청크를 가져 중복 id가 와도 정상 동작한다", async () => {
    listMemos.mockResolvedValue([memo("a"), memo("b")]);
    // listIndexedSourceIds는 청크 수만큼 중복을 돌려준다(계약).
    listIndexedSourceIds.mockResolvedValue([
      { sourceType: "memo", sourceId: "a" },
      { sourceType: "memo", sourceId: "a" },
      { sourceType: "memo", sourceId: "a" },
    ]);
    await callRoute({});
    expect(indexedIds()).toEqual(["b"]);
  });

  it("소스 타입이 다르면 같은 id라도 별개로 본다", async () => {
    listMemos.mockResolvedValue([memo("x")]);
    listHabits.mockResolvedValue([{ id: "x", title: "운동" }]);
    listIndexedSourceIds.mockResolvedValue([{ sourceType: "memo", sourceId: "x" }]);
    await callRoute({});
    // memo:x는 색인됨 → habit:x만 남는다.
    expect(indexSource.mock.calls.map((c) => (c[2] as { sourceType: string }).sourceType)).toEqual(
      ["habit"],
    );
  });
});

describe("재색인 라우트 — 전부 다시 모드", () => {
  it("이미 색인돼 있어도 전부 다시 한다", async () => {
    listMemos.mockResolvedValue([memo("a"), memo("b")]);
    listIndexedSourceIds.mockResolvedValue([
      { sourceType: "memo", sourceId: "a" },
      { sourceType: "memo", sourceId: "b" },
    ]);
    await callRoute({ mode: "all" });
    expect(indexedIds().sort()).toEqual(["a", "b"]);
  });

  it("이 모드에서는 offset이 동작한다(목록이 고정이므로)", async () => {
    listMemos.mockResolvedValue([memo("a"), memo("b"), memo("c")]);
    const { json } = await callRoute({ mode: "all", offset: 1 });
    expect(indexedIds()).toEqual(["b", "c"]);
    expect(json).toMatchObject({ total: 3, done: true });
  });
});

describe("재색인 라우트 — 경계", () => {
  it("본문이 없어도 동작한다(기존 호출 호환)", async () => {
    listMemos.mockResolvedValue([memo("a")]);
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/ai/reindex-all", { method: "POST" }),
    );
    expect(res.status).toBe(200);
    expect(indexedIds()).toEqual(["a"]);
  });

  it("색인할 게 아무것도 없으면 조용히 done", async () => {
    const { json } = await callRoute({});
    expect(json).toMatchObject({ indexed: 0, total: 0, done: true });
  });
});
