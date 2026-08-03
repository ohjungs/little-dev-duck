import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 2026-08-03 : RAG - 저장시 임베딩 - 조합 지점 검사
// zod 스키마 검증(sourceType/sourceId/text 길이)과 indexSource 실패 매핑을 라우트 경유로 확인한다.

const indexSource = vi.fn();
const allowRequest = vi.fn();
const getUser = vi.fn();

vi.mock("@ldd/api", () => ({
  indexSource: (...a: unknown[]) => indexSource(...a),
  allowRequest: (...a: unknown[]) => allowRequest(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => getUser() },
  }),
}));

beforeEach(() => {
  vi.resetModules();
  process.env.GEMINI_API_KEY = "test-key";
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  allowRequest.mockReturnValue(true);
  indexSource.mockResolvedValue(1);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function callRoute(body?: unknown) {
  const { POST } = await import("../route");
  const res = await POST(
    new Request("http://localhost/api/ai/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

const validBody = { sourceType: "memo", sourceId: "m1", text: "메모 내용" };

describe("AI 임베딩 라우트 — 인증·레이트리밋", () => {
  it("getUser가 null을 반환하면 401", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(401);
    expect(json.error).toBe("로그인이 필요합니다.");
    expect(indexSource).not.toHaveBeenCalled();
  });

  it("allowRequest가 false면 429", async () => {
    allowRequest.mockReturnValueOnce(false);
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(429);
    expect(json.error).toBe("요청이 많습니다.");
    expect(indexSource).not.toHaveBeenCalled();
  });
});

describe("AI 임베딩 라우트 — 입력 경계", () => {
  it("필수 필드가 없으면 400", async () => {
    const { status, json } = await callRoute({ sourceType: "memo" });
    expect(status).toBe(400);
    expect(json.error).toBe("잘못된 요청입니다.");
    expect(indexSource).not.toHaveBeenCalled();
  });

  it("sourceType이 잘못된 값이면 400", async () => {
    const { status } = await callRoute({ ...validBody, sourceType: "unknown" });
    expect(status).toBe(400);
    expect(indexSource).not.toHaveBeenCalled();
  });

  it("text 길이가 20000자를 넘으면 400", async () => {
    const { status } = await callRoute({ ...validBody, text: "가".repeat(20001) });
    expect(status).toBe(400);
    expect(indexSource).not.toHaveBeenCalled();
  });

  it("본문이 JSON이 아니면 400", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/ai/embed", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.error).toBe("잘못된 요청입니다.");
    expect(indexSource).not.toHaveBeenCalled();
  });
});

describe("AI 임베딩 라우트 — 인덱싱 실패", () => {
  it("indexSource가 던지면 502", async () => {
    indexSource.mockRejectedValueOnce(new Error("db 오류"));
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(502);
    expect(json.error).toBe("인덱싱에 실패했습니다.");
  });
});

describe("AI 임베딩 라우트 — 성공", () => {
  it("indexSource를 정규화된 인자로 호출하고 indexed를 반환한다", async () => {
    indexSource.mockResolvedValueOnce(3);
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(200);
    expect(json).toEqual({ indexed: 3 });
    expect(indexSource).toHaveBeenCalledWith(expect.anything(), "test-key", {
      userId: "u1",
      sourceType: "memo",
      sourceId: "m1",
      text: "메모 내용",
    });
  });
});
