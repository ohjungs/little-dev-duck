import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { WRITE_INPUT_MAX } from "@ldd/core";

// 2026-08-03 : AI 작문 보조 - 조합 지점 검사
// 순서 계약: 인증 → 기능토글(duck-chat) → 레이트리밋(꺼진 기능 호출이 상한을 깎으면 안 된다는
// 코드 주석의 그 성질) → 서버키 → 입력 검증 → 생성.

const allowRequest = vi.fn();
const assistWrite = vi.fn();
const getUser = vi.fn();
const blockIfFeatureDisabled = vi.fn();

vi.mock("@ldd/api", () => ({
  allowRequest: (...a: unknown[]) => allowRequest(...a),
  assistWrite: (...a: unknown[]) => assistWrite(...a),
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
  blockIfFeatureDisabled.mockResolvedValue(null);
  allowRequest.mockReturnValue(true);
  assistWrite.mockResolvedValue("결과 텍스트");
});

afterEach(() => {
  vi.clearAllMocks();
});

/**
 * vi.resetModules() 뒤 옛 레지스트리의 LddError·userMessage는 라우트 안 isLddError(instanceof)와
 * 서로 안 맞는다 — agent 라우트 테스트가 잡아 둔 함정과 같아 같은 패턴을 복제한다. userMessage로
 * 기대값을 계산할 때도 반드시 이 함수가 만든 것과 같은 레지스트리를 써야 한다.
 */
async function makeLddError(code: string, message: string) {
  const { LddError } = await import("@ldd/core");
  return new LddError(code as never, message);
}

async function expectedUserMessage(e: unknown): Promise<string> {
  const { userMessage } = await import("@ldd/core");
  return userMessage(e);
}

async function callRoute(body?: unknown) {
  const { POST } = await import("../route");
  const res = await POST(
    new Request("http://localhost/api/ai/write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

const validBody = { action: "polish", text: "다듬을 글" };

describe("AI 작문 보조 라우트 — 인증", () => {
  it("getUser가 null을 반환하면 401", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(401);
    expect(json.error).toBe("로그인이 필요합니다.");
    expect(blockIfFeatureDisabled).not.toHaveBeenCalled();
  });
});

describe("AI 작문 보조 라우트 — 기능토글이 레이트리밋보다 먼저", () => {
  it("기능토글(duck-chat)이 차단되면 그 응답을 그대로 반환하고 allowRequest를 호출하지 않는다", async () => {
    const blocked = NextResponse.json(
      { error: "이 기능이 꺼져 있어요. 관리자에게 문의해 주세요." },
      { status: 403 },
    );
    blockIfFeatureDisabled.mockResolvedValueOnce(blocked);
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(403);
    expect(json.error).toBe("이 기능이 꺼져 있어요. 관리자에게 문의해 주세요.");
    expect(allowRequest).not.toHaveBeenCalled();
    expect(assistWrite).not.toHaveBeenCalled();
  });

  it("레이트리밋을 초과하면 429이고 assistWrite를 호출하지 않는다", async () => {
    allowRequest.mockReturnValueOnce(false);
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(429);
    expect(json.error).toBe("요청이 많습니다. 잠시 후 다시 시도해주세요.");
    expect(assistWrite).not.toHaveBeenCalled();
  });
});

describe("AI 작문 보조 라우트 — 입력 경계", () => {
  it("action이 지원하지 않는 값이면 400", async () => {
    const { status, json } = await callRoute({ action: "delete_everything", text: "글" });
    expect(status).toBe(400);
    expect(json.error).toBe("지원하지 않는 작업입니다.");
    expect(assistWrite).not.toHaveBeenCalled();
  });

  it("text가 빈 문자열/공백만이면 400", async () => {
    const { status, json } = await callRoute({ action: "polish", text: "   " });
    expect(status).toBe(400);
    expect(json.error).toBe("글을 입력해주세요.");
  });

  it(`text 길이가 ${WRITE_INPUT_MAX * 2}자를 넘으면 400`, async () => {
    const { status, json } = await callRoute({
      action: "polish",
      text: "가".repeat(WRITE_INPUT_MAX * 2 + 1),
    });
    expect(status).toBe(400);
    expect(json.error).toBe("글이 너무 깁니다.");
  });
});

describe("AI 작문 보조 라우트 — 생성 실패 매핑", () => {
  it("quota_exceeded LddError면 429", async () => {
    const e = await makeLddError("quota_exceeded", "gemini 429: 알 수 없음");
    assistWrite.mockRejectedValueOnce(e);
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(429);
    expect(json.error).toBe(await expectedUserMessage(e));
  });

  it("그 외 LddError 코드면 502", async () => {
    assistWrite.mockRejectedValueOnce(await makeLddError("upstream", "gemini 500"));
    const { status } = await callRoute(validBody);
    expect(status).toBe(502);
  });

  it("일반 Error면 502 + 고정 문구", async () => {
    assistWrite.mockRejectedValueOnce(new Error("네트워크 오류"));
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(502);
    expect(json.error).toBe("처리하기 어려워요. 잠시 후 다시 시도해주세요.");
  });
});

describe("AI 작문 보조 라우트 — 성공", () => {
  it("assistWrite를 (action, text, apiKey)로 호출하고 결과를 반환한다", async () => {
    assistWrite.mockResolvedValueOnce("다듬어진 글");
    const { status, json } = await callRoute(validBody);
    expect(status).toBe(200);
    expect(json).toEqual({ result: "다듬어진 글" });
    expect(assistWrite).toHaveBeenCalledWith("polish", "다듬을 글", "test-key");
  });
});
