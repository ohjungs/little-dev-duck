import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DUCK_LINE_MAX_CHARS } from "@ldd/core";

// 2026-08-03 : 오리 - 자율 발화 - 조합 지점 검사
// 이 라우트의 핵심 계약은 "실패가 아니라 침묵"이다 — 기능토글 차단·레이트리밋 초과·생성 실패
// 셋 다 200 + {line:null}로 답해야 대시보드 60초 타이머가 콘솔·네트워크에 에러를 쌓지 않는다.

const allowRequest = vi.fn();
const generateDuckLine = vi.fn();
const getUser = vi.fn();
const blockIfFeatureDisabled = vi.fn();

vi.mock("@ldd/api", () => ({
  allowRequest: (...a: unknown[]) => allowRequest(...a),
  generateDuckLine: (...a: unknown[]) => generateDuckLine(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => getUser() },
  }),
}));

vi.mock("@/lib/featureGate", () => ({
  blockIfFeatureDisabled: (...a: unknown[]) => blockIfFeatureDisabled(...a),
}));

beforeEach(() => {
  vi.resetModules();
  process.env.GEMINI_API_KEY = "test-key";
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  allowRequest.mockReturnValue(true);
  blockIfFeatureDisabled.mockResolvedValue(null);
  generateDuckLine.mockResolvedValue({ line: "안녕!" });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function callRoute(body?: unknown) {
  const { POST } = await import("../route");
  const res = await POST(
    new Request("http://localhost/api/ai/duck-line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("오리 자율 발화 라우트 — 인증", () => {
  it("getUser가 null을 반환하면 401이고 generateDuckLine을 호출하지 않는다", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const { status, json } = await callRoute({ factLine: "사실" });
    expect(status).toBe(401);
    expect(json.error).toBe("로그인이 필요합니다.");
    expect(generateDuckLine).not.toHaveBeenCalled();
  });
});

describe("오리 자율 발화 라우트 — 침묵 폴백 3종", () => {
  it("기능토글이 꺼져 있으면 200 + {line:null}이고 allowRequest를 호출하지 않는다", async () => {
    blockIfFeatureDisabled.mockResolvedValueOnce(true);
    const { status, json } = await callRoute({ factLine: "사실" });
    expect(status).toBe(200);
    expect(json).toEqual({ line: null });
    expect(allowRequest).not.toHaveBeenCalled();
  });

  it("레이트리밋을 초과하면 200 + {line:null}이고 generateDuckLine을 호출하지 않는다", async () => {
    allowRequest.mockReturnValueOnce(false);
    const { status, json } = await callRoute({ factLine: "사실" });
    expect(status).toBe(200);
    expect(json).toEqual({ line: null });
    expect(generateDuckLine).not.toHaveBeenCalled();
  });

  it("generateDuckLine이 null을 반환하면 200 + {line:null}이다", async () => {
    generateDuckLine.mockResolvedValueOnce(null);
    const { status, json } = await callRoute({ factLine: "사실" });
    expect(status).toBe(200);
    expect(json).toEqual({ line: null });
  });
});

describe("오리 자율 발화 라우트 — 입력 경계", () => {
  it("본문이 JSON이 아니면 400", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/ai/duck-line", {
        method: "POST",
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.error).toBe("잘못된 요청입니다.");
  });

  it("factLine이 빈 문자열이면 400", async () => {
    const { status, json } = await callRoute({ factLine: "   " });
    expect(status).toBe(400);
    expect(json.error).toBe("사실이 없습니다.");
  });

  it(`factLine 길이가 ${DUCK_LINE_MAX_CHARS * 4}자를 넘으면 400`, async () => {
    const { status, json } = await callRoute({
      factLine: "가".repeat(DUCK_LINE_MAX_CHARS * 4 + 1),
    });
    expect(status).toBe(400);
    expect(json.error).toBe("사실이 너무 깁니다.");
  });
});

describe("오리 자율 발화 라우트 — 성공", () => {
  it("유효한 입력이면 generateDuckLine을 정규화된 인자로 호출하고 결과를 그대로 응답한다", async () => {
    generateDuckLine.mockResolvedValueOnce({ line: "오늘도 화이팅!" });
    const { status, json } = await callRoute({
      factLine: " 커밋 3개 ",
      mood: "happy",
      timeOfDay: "morning",
    });
    expect(status).toBe(200);
    expect(json).toEqual({ line: "오늘도 화이팅!" });
    expect(generateDuckLine).toHaveBeenCalledWith(
      { factLine: "커밋 3개", mood: "happy", timeOfDay: "morning" },
      "test-key",
    );
  });
});
