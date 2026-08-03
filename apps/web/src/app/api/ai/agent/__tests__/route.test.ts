import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 2026-07-26 : 오리 라우트 - 조합 지점 검사
// 직전 사이클에서 배운 것: **부품 테스트는 통과하는데 부품을 조합하는 자리에서 결함이 난다.**
// 재색인 라우트가 그랬고, 내가 낸 회귀 둘이 정확히 그 자리에 있었다.
//
// 이 라우트는 분기가 18개다(인증·레이트리밋·키·파싱·어댑터 3개 조건부·안내문 조립·에러 매핑).
// 그중 **이번 세션에 내가 두 번 고친 지점**을 조합 수준에서 잠근다:
//  1) 쿼터 소진 문구가 분당/하루를 구분하는가(userMessage 경유)
//  2) 구글 미연동일 때 앱 자체 캘린더를 막지 않는가(안내문이 프롬프트에 실리는 방식)

const runDuckTurn = vi.fn();
const getGoogleTokens = vi.fn();
const getGithubTokens = vi.fn();
const getGmailTokens = vi.fn();
const allowRequest = vi.fn();
const getUser = vi.fn();

vi.mock("@ldd/api", () => ({
  allowRequest: (...a: unknown[]) => allowRequest(...a),
  // 2026-07-30: 라우트가 기능 토글을 서버에서 확인하게 되어 이 mock이 필요해졌다.
  // 기본은 "아무 기능도 꺼지지 않은 사용자" — 게이트 자체의 검사는 apiFeatureGate.test.ts에 있다.
  getMyAccess: async () => ({ role: "user", disabledFeatures: [] }),
  composeAdapters: (a: unknown[]) => ({ catalog: [], execute: vi.fn(), _count: a.length }),
  createAppActionsAdapter: () => ({ kind: "app" }),
  createGoogleCalendarAdapter: () => ({ kind: "google" }),
  createGitHubIssuesAdapter: () => ({ kind: "github" }),
  createGmailAdapter: () => ({ kind: "gmail" }),
  getGoogleTokens: () => getGoogleTokens(),
  getGithubTokens: () => getGithubTokens(),
  getGmailTokens: () => getGmailTokens(),
  runDuckTurn: (...args: unknown[]) => runDuckTurn(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => getUser() },
  }),
}));

beforeEach(() => {
  vi.resetModules();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  allowRequest.mockReturnValue(true);
  process.env.GEMINI_API_KEY = "test-key";
  getGoogleTokens.mockResolvedValue(null);
  getGithubTokens.mockResolvedValue(null);
  getGmailTokens.mockResolvedValue(null);
  runDuckTurn.mockResolvedValue({ status: "final", text: "답" });
});

afterEach(() => vi.clearAllMocks());

async function ask(question = "이번 주 마감 뭐 있어?") {
  const { POST } = await import("../route");
  const res = await POST(
    new Request("http://localhost/api/ai/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),
  );
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

/**
 * vi.resetModules() 뒤에는 모듈 레지스트리가 새로 만들어진다. 정적 import로 가져온 LddError는
 * **옛 레지스트리의 클래스**라, 라우트 안의 isLddError(instanceof)가 거짓이 되어 쿼터 분기 대신
 * 일반 502로 빠진다. 라우트와 같은 레지스트리에서 가져와야 한다 — 테스트가 코드를 잘못
 * 검사하게 만드는 함정이라 여기 적어 둔다.
 */
async function makeLddError(code: string, message: string) {
  const { LddError } = await import("@ldd/core");
  return new LddError(code as never, message);
}

/** runDuckTurn에 넘어간 미연동 안내문(6번째 인자) */
function noteArg(): string | undefined {
  return runDuckTurn.mock.calls[0]?.[5] as string | undefined;
}

describe("오리 라우트 — 쿼터 소진 안내", () => {
  it("하루 총량이 소진되면 '오늘'이라고 말한다", async () => {
    runDuckTurn.mockRejectedValue(await makeLddError("quota_exceeded", 'gemini 429: {"quotaId":"GenerateRequestsPerDay-FreeTier"}'));
    const { json } = await ask();
    expect(json.status).toBe("unavailable");
    expect(String(json.message)).toContain("오늘");
    // 하루치가 없는데 "1분 후"라고 하면 사용자는 종일 재시도한다.
    expect(String(json.message)).not.toContain("1분");
  });

  it("분당 제한이면 잠깐 뒤 다시 시도하라고 말한다", async () => {
    runDuckTurn.mockRejectedValue(await makeLddError("quota_exceeded", 'gemini 429: {"quotaId":"GenerateRequestsPerMinute-FreeTier"}'));
    const { json } = await ask();
    expect(String(json.message)).toContain("1분");
  });

  it("어느 쪽인지 모르면 지킬 수 없는 시간 약속을 하지 않는다", async () => {
    runDuckTurn.mockRejectedValue(await makeLddError("quota_exceeded", "gemini 429: 알 수 없음"));
    const { json } = await ask();
    expect(String(json.message)).not.toContain("1분");
    expect(String(json.message)).not.toContain("오늘");
  });

  it("원문·상태코드가 사용자에게 새지 않는다", async () => {
    runDuckTurn.mockRejectedValue(await makeLddError("quota_exceeded", "gemini 429: RESOURCE_EXHAUSTED"));
    const { json } = await ask();
    expect(String(json.message)).not.toContain("429");
    expect(String(json.message)).not.toContain("RESOURCE_EXHAUSTED");
  });
});

describe("오리 라우트 — 미연동 안내 조립", () => {
  it("구글 미연동이어도 앱 자체 캘린더는 쓰게 한다", async () => {
    await ask();
    // 안내문은 서비스별 문단이 빈 줄로 이어 붙는다. **캘린더 문단만** 봐야 한다 —
    // GitHub·Gmail 문단의 "실행하려 들지 말고"는 옳다(앱 내부에 그 도구가 없다).
    const calendarNote = (noteArg() ?? "")
      .split("\n\n")
      .find((p) => p.includes("캘린더")) ?? "";
    expect(calendarNote).toContain("앱 자체 캘린더");
    // 이 문구가 돌아오면 되는 기능이 막힌다(2026-07-26에 실제로 그랬다).
    expect(calendarNote).not.toContain("실행하려 들지 말고");
  });

  it("전부 연동돼 있으면 미연동 안내를 아예 넣지 않는다", async () => {
    getGoogleTokens.mockResolvedValue({ accessToken: "g" });
    getGithubTokens.mockResolvedValue({ accessToken: "h" });
    getGmailTokens.mockResolvedValue({ accessToken: "m" });
    await ask();
    expect(noteArg()).toBeUndefined();
  });

  it("일부만 연동되면 그 서비스 안내만 빠진다", async () => {
    getGoogleTokens.mockResolvedValue({ accessToken: "g" });
    await ask();
    const note = noteArg() ?? "";
    expect(note).not.toContain("구글 캘린더 연동은");
    expect(note).toContain("GitHub");
    expect(note).toContain("Gmail");
  });
});

describe("오리 라우트 — 인증·레이트리밋", () => {
  it("getUser가 null을 반환하면 401이고 아무것도 실행하지 않는다", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const { status, json } = await ask();
    expect(status).toBe(401);
    expect(json.error).toBe("로그인이 필요합니다.");
    expect(allowRequest).not.toHaveBeenCalled();
    expect(runDuckTurn).not.toHaveBeenCalled();
  });

  it("allowRequest가 false를 반환하면 429이고 아무것도 실행하지 않는다", async () => {
    allowRequest.mockReturnValueOnce(false);
    const { status, json } = await ask();
    expect(status).toBe(429);
    expect(json.error).toBe("요청이 많습니다. 잠시 후 다시 시도해주세요.");
    expect(runDuckTurn).not.toHaveBeenCalled();
  });
});

describe("오리 라우트 — 입력 경계", () => {
  it("빈 질문은 400", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "   " }),
      }),
    );
    expect(res.status).toBe(400);
    expect(runDuckTurn).not.toHaveBeenCalled();
  });

  it("본문이 JSON이 아니어도 500이 아니라 400으로 답한다", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/ai/agent", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
  });

  it("너무 긴 질문은 400(쿼터 보호)", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "가".repeat(2000) }),
      }),
    );
    expect(res.status).toBe(400);
    expect(runDuckTurn).not.toHaveBeenCalled();
  });
});
