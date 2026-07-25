import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 2026-07-26 : 승인 실행 라우트 - 조합 지점 검사
// 이 라우트는 **실제로 데이터를 바꾸는 유일한 지점**이다(T0-4: 파괴적 액션은 승인 없이 실행 금지).
// 조합 결함이 나면 "사용자가 승인하지 않은 게 실행됨"이 되므로, 앞선 두 사이클에서 세운 방식대로
// 핸들러를 직접 호출해 안전 성질을 잠근다.
//
// 특히 executeApprovedCalls의 계약을 라우트 경유로 확인한다:
// **카탈로그에 없거나 readonly인 이름은 실행하지 않는다.** 클라이언트가 보내는 calls는 신뢰할 수
// 없다 — 승인 UI를 우회해 임의 이름을 POST할 수 있기 때문이다.

const execute = vi.fn();
const logAction = vi.fn();
const getGoogleTokens = vi.fn();
const getGithubTokens = vi.fn();
const getGmailTokens = vi.fn();

// 실제 executeApprovedCalls를 쓴다 — 안전 규칙이 그 안에 있으므로 목으로 대체하면
// **검사하려던 성질이 사라진다.** 어댑터 카탈로그만 우리가 정한다.
vi.mock("@ldd/api", async () => {
  const actual = await vi.importActual<typeof import("@ldd/api")>("@ldd/api");
  return {
    ...actual,
    allowRequest: () => true,
    createAppActionsAdapter: () => ({
      catalog: [
        { name: "createTodo", description: "", parameters: { type: "object", properties: {} }, kind: "mutating" },
        { name: "listTodos", description: "", parameters: { type: "object", properties: {} }, kind: "readonly" },
      ],
      execute: (...a: unknown[]) => execute(...a),
    }),
    createGoogleCalendarAdapter: () => ({ catalog: [], execute: vi.fn() }),
    createGitHubIssuesAdapter: () => ({ catalog: [], execute: vi.fn() }),
    createGmailAdapter: () => ({ catalog: [], execute: vi.fn() }),
    getGoogleTokens: () => getGoogleTokens(),
    getGithubTokens: () => getGithubTokens(),
    getGmailTokens: () => getGmailTokens(),
    logAction: (...a: unknown[]) => logAction(...a),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  }),
}));

beforeEach(() => {
  vi.resetModules();
  getGoogleTokens.mockResolvedValue(null);
  getGithubTokens.mockResolvedValue(null);
  getGmailTokens.mockResolvedValue(null);
  logAction.mockResolvedValue(undefined);
  execute.mockImplementation(async (call: { id?: string; name: string }) => ({
    id: call.id,
    name: call.name,
    response: { created: { id: "x" } },
  }));
});

afterEach(() => vi.clearAllMocks());

async function approve(body: unknown) {
  const { POST } = await import("../route");
  const res = await POST(
    new Request("http://localhost/api/ai/agent/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

const executedNames = () => execute.mock.calls.map((c) => (c[0] as { name: string }).name);

describe("승인 실행 — 실행해도 되는 것만 실행한다", () => {
  it("승인된 변경 도구는 실행한다", async () => {
    const { status, json } = await approve({
      calls: [{ id: "c1", name: "createTodo", args: { title: "장보기" } }],
    });
    expect(status).toBe(200);
    expect(executedNames()).toEqual(["createTodo"]);
    expect(Array.isArray(json.results)).toBe(true);
  });

  // 안전 성질: 승인 UI를 우회해 조회 도구를 POST해도 실행되면 안 된다.
  it("readonly 도구는 승인 경로로 보내도 실행하지 않는다", async () => {
    const { json } = await approve({
      calls: [{ id: "c1", name: "listTodos", args: {} }],
    });
    expect(execute).not.toHaveBeenCalled();
    const results = json.results as { response: { error?: string } }[];
    expect(results[0].response.error).toBeDefined();
  });

  it("카탈로그에 없는 이름은 실행하지 않는다", async () => {
    const { json } = await approve({
      calls: [{ id: "c1", name: "deleteEverything", args: {} }],
    });
    expect(execute).not.toHaveBeenCalled();
    const results = json.results as { response: { error?: string } }[];
    expect(results[0].response.error).toBeDefined();
  });

  it("허용·비허용이 섞이면 허용된 것만 실행한다", async () => {
    await approve({
      calls: [
        { id: "c1", name: "createTodo", args: { title: "a" } },
        { id: "c2", name: "deleteEverything", args: {} },
        { id: "c3", name: "createTodo", args: { title: "b" } },
      ],
    });
    expect(executedNames()).toEqual(["createTodo", "createTodo"]);
  });

  it("입력 순서를 그대로 보존한다(감사 로그가 인덱스로 짝짓는다)", async () => {
    const { json } = await approve({
      calls: [
        { id: "c1", name: "createTodo", args: { title: "a" } },
        { id: "c2", name: "deleteEverything", args: {} },
        { id: "c3", name: "createTodo", args: { title: "b" } },
      ],
    });
    const results = json.results as { name: string }[];
    expect(results.map((r) => r.name)).toEqual([
      "createTodo",
      "deleteEverything",
      "createTodo",
    ]);
  });
});

describe("승인 실행 — 입력 경계", () => {
  it("calls가 없으면 400이고 아무것도 실행하지 않는다", async () => {
    const { status } = await approve({});
    expect(status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it("calls가 배열이 아니면 400", async () => {
    const { status } = await approve({ calls: "createTodo" });
    expect(status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it("본문이 JSON이 아니어도 400으로 답한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/ai/agent/approve", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });
});

describe("승인 실행 — 부분 실패", () => {
  it("하나가 예외를 던져도 나머지는 계속 실행한다", async () => {
    // 앞서 실행돼 이미 부작용을 낸 호출의 결과가 통째로 유실되면 감사 기록이 무너진다.
    execute.mockImplementationOnce(async (call: { id?: string; name: string }) => ({
      id: call.id,
      name: call.name,
      response: { created: { id: "first" } },
    }));
    execute.mockImplementationOnce(async () => {
      throw new Error("외부 API 401");
    });
    const { status, json } = await approve({
      calls: [
        { id: "c1", name: "createTodo", args: { title: "a" } },
        { id: "c2", name: "createTodo", args: { title: "b" } },
        { id: "c3", name: "createTodo", args: { title: "c" } },
      ],
    });
    expect(status).toBe(200);
    const results = json.results as { response: { error?: string } }[];
    expect(results).toHaveLength(3);
    expect(results[0].response.error).toBeUndefined();
    expect(results[1].response.error).toBeDefined();
    expect(results[2].response.error).toBeUndefined();
  });
});
