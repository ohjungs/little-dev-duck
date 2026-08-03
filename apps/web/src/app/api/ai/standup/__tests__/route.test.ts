import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// 2026-08-03 : 오리 스탠드업 - 조합 지점 검사
// 순서 계약: 인증 → 기능토글(duck-chat) → 레이트리밋 → 서버키 → 생성. 기능토글이 레이트리밋보다
// 먼저라는 점과, KST 자정 경계에서 페이지 제목 날짜가 밀리지 않는지를 조합 수준에서 잠근다.

const allowRequest = vi.fn();
const createPage = vi.fn();
const generateStandup = vi.fn();
const getUser = vi.fn();
const blockIfFeatureDisabled = vi.fn();

vi.mock("@ldd/api", () => ({
  allowRequest: (...a: unknown[]) => allowRequest(...a),
  createPage: (...a: unknown[]) => createPage(...a),
  generateStandup: (...a: unknown[]) => generateStandup(...a),
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
  generateStandup.mockResolvedValue({ content: "요약" });
  createPage.mockResolvedValue({ id: "page1" });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
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

async function callRoute() {
  const { POST } = await import("../route");
  const res = await POST();
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("스탠드업 라우트 — 인증", () => {
  it("getUser가 null을 반환하면 401", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const { status, json } = await callRoute();
    expect(status).toBe(401);
    expect(json.error).toBe("로그인이 필요합니다.");
    expect(blockIfFeatureDisabled).not.toHaveBeenCalled();
  });
});

describe("스탠드업 라우트 — 기능토글·레이트리밋 순서", () => {
  it("기능토글(duck-chat)이 차단되면 그 응답을 그대로 반환하고 allowRequest를 호출하지 않는다", async () => {
    const blocked = NextResponse.json(
      { error: "이 기능이 꺼져 있어요. 관리자에게 문의해 주세요." },
      { status: 403 },
    );
    blockIfFeatureDisabled.mockResolvedValueOnce(blocked);
    const { status, json } = await callRoute();
    expect(status).toBe(403);
    expect(json.error).toBe("이 기능이 꺼져 있어요. 관리자에게 문의해 주세요.");
    expect(allowRequest).not.toHaveBeenCalled();
    expect(generateStandup).not.toHaveBeenCalled();
  });

  it("레이트리밋을 초과하면 429이고 generateStandup을 호출하지 않는다", async () => {
    allowRequest.mockReturnValueOnce(false);
    const { status, json } = await callRoute();
    expect(status).toBe(429);
    expect(json.error).toBe("요청이 많습니다. 잠시 후 다시 시도해주세요.");
    expect(generateStandup).not.toHaveBeenCalled();
  });
});

describe("스탠드업 라우트 — 생성 결과 매핑", () => {
  it("generateStandup이 null이면 422", async () => {
    generateStandup.mockResolvedValueOnce(null);
    const { status, json } = await callRoute();
    expect(status).toBe(422);
    expect(json.error).toBe("최근 24시간 활동이 없어요.");
    expect(createPage).not.toHaveBeenCalled();
  });

  it("quota_exceeded LddError면 429이고 메시지는 userMessage와 같다", async () => {
    const e = await makeLddError("quota_exceeded", "gemini 429: 알 수 없음");
    generateStandup.mockRejectedValueOnce(e);
    const { status, json } = await callRoute();
    expect(status).toBe(429);
    expect(json.error).toBe(await expectedUserMessage(e));
  });

  it("그 외 LddError 코드면 502", async () => {
    const e = await makeLddError("upstream", "gemini 500");
    generateStandup.mockRejectedValueOnce(e);
    const { status } = await callRoute();
    expect(status).toBe(502);
  });

  it("일반 Error면 502 + 고정 문구", async () => {
    generateStandup.mockRejectedValueOnce(new Error("네트워크 오류"));
    const { status, json } = await callRoute();
    expect(status).toBe(502);
    expect(json.error).toBe("스탠드업 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
  });
});

describe("스탠드업 라우트 — 성공 + KST 날짜 경계", () => {
  it("UTC 기준 KST 자정을 넘긴 시각이면 다음날 KST 날짜로 페이지 제목을 만든다", async () => {
    // UTC 2026-01-01T15:30:00Z → KST(UTC+9) 2026-01-02T00:30:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T15:30:00Z"));
    generateStandup.mockResolvedValueOnce({ content: "오늘 한 일" });
    createPage.mockResolvedValueOnce({ id: "page-kst" });

    const { status, json } = await callRoute();

    expect(status).toBe(200);
    expect(json).toEqual({ pageId: "page-kst" });
    expect(createPage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: "스탠드업 2026-01-02" }),
    );
  });
});
