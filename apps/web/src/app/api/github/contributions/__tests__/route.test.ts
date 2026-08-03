import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// 2026-08-03 : GitHub 잔디 라우트 - 조합 지점 검사
// 캐시가 모듈 스코프 Map이라 `import("../route")` 인스턴스별로 독립이다 — 캐시 히트/만료
// 테스트는 반드시 한 번만 import한 모듈을 재사용해야 한다.

const fetchGithubContributions = vi.fn();
const getUser = vi.fn();
const blockIfFeatureDisabled = vi.fn();

vi.mock("@ldd/api", () => ({
  fetchGithubContributions: (...a: unknown[]) => fetchGithubContributions(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => getUser() },
  }),
}));

vi.mock("@/lib/featureGate", () => ({
  blockIfFeatureDisabled: (...a: unknown[]) => blockIfFeatureDisabled(...a),
}));

const linkedUser = {
  id: "u1",
  identities: [{ provider: "github", identity_data: { user_name: "octocat" } }],
};

beforeEach(() => {
  vi.resetModules();
  process.env.GITHUB_TOKEN = "gh-token";
  getUser.mockResolvedValue({ data: { user: linkedUser } });
  blockIfFeatureDisabled.mockResolvedValue(null);
  fetchGithubContributions.mockResolvedValue({ totalCount: 42, weeks: [] });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

async function callRoute() {
  const { GET } = await import("../route");
  const res = await GET();
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("GitHub 기여도 라우트 — 인증·기능토글", () => {
  it("getUser가 null을 반환하면 401", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const { status, json } = await callRoute();
    expect(status).toBe(401);
    expect(json.error).toBe("로그인이 필요합니다.");
    expect(fetchGithubContributions).not.toHaveBeenCalled();
  });

  it("기능토글(github)이 차단되면 그 응답을 그대로 반환하고 fetchGithubContributions를 호출하지 않는다", async () => {
    const blocked = NextResponse.json(
      { error: "이 기능이 꺼져 있어요. 관리자에게 문의해 주세요." },
      { status: 403 },
    );
    blockIfFeatureDisabled.mockResolvedValueOnce(blocked);
    const { status, json } = await callRoute();
    expect(status).toBe(403);
    expect(json.error).toBe("이 기능이 꺼져 있어요. 관리자에게 문의해 주세요.");
    expect(fetchGithubContributions).not.toHaveBeenCalled();
  });
});

describe("GitHub 기여도 라우트 — 연동 여부·환경변수", () => {
  it("GitHub 연동이 없으면 {linked:false}이고 fetchGithubContributions를 호출하지 않는다", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: "u1", identities: [{ provider: "google", identity_data: {} }] } },
    });
    const { status, json } = await callRoute();
    expect(status).toBe(200);
    expect(json).toEqual({ linked: false });
    expect(fetchGithubContributions).not.toHaveBeenCalled();
  });

  it("GITHUB_TOKEN이 없으면 500", async () => {
    delete process.env.GITHUB_TOKEN;
    const { status, json } = await callRoute();
    expect(status).toBe(500);
    expect(json.error).toBe("GITHUB_TOKEN 환경변수가 설정되지 않았습니다.");
  });
});

describe("GitHub 기여도 라우트 — 조회 실패", () => {
  it("fetchGithubContributions가 던지면 502", async () => {
    fetchGithubContributions.mockRejectedValueOnce(new Error("rate limited"));
    const { status, json } = await callRoute();
    expect(status).toBe(502);
    expect(json.error).toBe("GitHub 기여 데이터를 불러오지 못했습니다.");
  });
});

describe("GitHub 기여도 라우트 — 캐시", () => {
  it("같은 모듈 인스턴스로 두 번 호출하면 fetchGithubContributions는 한 번만 실행된다", async () => {
    const { GET } = await import("../route");
    const res1 = await GET();
    const json1 = (await res1.json()) as { summary: unknown };
    const res2 = await GET();
    const json2 = (await res2.json()) as { summary: unknown };

    expect(fetchGithubContributions).toHaveBeenCalledTimes(1);
    expect(json1.summary).toEqual(json2.summary);
  });

  it("캐시 TTL(30분)이 지나면 재조회한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { GET } = await import("../route");
    await GET();
    expect(fetchGithubContributions).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date("2026-01-01T00:31:00Z"));
    await GET();
    expect(fetchGithubContributions).toHaveBeenCalledTimes(2);
  });
});
