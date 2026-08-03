import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

// 2026-08-03 : 뉴스 수집 배치 - 조합 지점 검사
// 이 라우트는 분기가 많다: 순서 계약(인증→레이트리밋→기능토글→서버키), 피드 필터링(active만),
// 요약 루프의 부분 성공(quota_exceeded는 중단, 그 외 개별 실패는 스킵), recordEvent 로그 형태.
// news/collect는 write/standup과 반대로 **allowRequest가 featureGate보다 먼저**다(코드 확인됨).

const allowRequest = vi.fn();
const listFeeds = vi.fn();
const collectFeed = vi.fn();
const listUnsummarizedArticles = vi.fn();
const summarizeArticle = vi.fn();
const setArticleSummary = vi.fn();
const recordEvent = vi.fn();
const getUser = vi.fn();
const blockIfFeatureDisabled = vi.fn();

vi.mock("@ldd/api", () => ({
  allowRequest: (...a: unknown[]) => allowRequest(...a),
  listFeeds: (...a: unknown[]) => listFeeds(...a),
  collectFeed: (...a: unknown[]) => collectFeed(...a),
  listUnsummarizedArticles: (...a: unknown[]) => listUnsummarizedArticles(...a),
  summarizeArticle: (...a: unknown[]) => summarizeArticle(...a),
  setArticleSummary: (...a: unknown[]) => setArticleSummary(...a),
  recordEvent: (...a: unknown[]) => recordEvent(...a),
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
  listFeeds.mockResolvedValue([]);
  collectFeed.mockResolvedValue({ inserted: 0, paused: false });
  listUnsummarizedArticles.mockResolvedValue([]);
  summarizeArticle.mockResolvedValue("요약문");
  setArticleSummary.mockResolvedValue(undefined);
  recordEvent.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function makeLddError(code: string, message: string) {
  const { LddError } = await import("@ldd/core");
  return new LddError(code as never, message);
}

async function callRoute() {
  const { POST } = await import("../route");
  const res = await POST();
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("뉴스 수집 라우트 — 인증·레이트리밋·기능토글 순서", () => {
  it("getUser가 null을 반환하면 401", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const { status, json } = await callRoute();
    expect(status).toBe(401);
    expect(json.error).toBe("로그인이 필요합니다.");
    expect(listFeeds).not.toHaveBeenCalled();
  });

  it("레이트리밋을 초과하면 429이고 listFeeds를 호출하지 않는다", async () => {
    allowRequest.mockReturnValueOnce(false);
    const { status, json } = await callRoute();
    expect(status).toBe(429);
    expect(json.error).toBe("요청이 많습니다. 잠시 후 다시 시도해주세요.");
    expect(listFeeds).not.toHaveBeenCalled();
    expect(blockIfFeatureDisabled).not.toHaveBeenCalled();
  });

  it("기능토글(news)이 차단되면 그 응답을 그대로 반환하고 listFeeds를 호출하지 않는다", async () => {
    const blocked = NextResponse.json(
      { error: "이 기능이 꺼져 있어요. 관리자에게 문의해 주세요." },
      { status: 403 },
    );
    blockIfFeatureDisabled.mockResolvedValueOnce(blocked);
    const { status, json } = await callRoute();
    expect(status).toBe(403);
    expect(json.error).toBe("이 기능이 꺼져 있어요. 관리자에게 문의해 주세요.");
    expect(listFeeds).not.toHaveBeenCalled();
  });
});

describe("뉴스 수집 라우트 — 피드 필터링과 부분 성공", () => {
  it("active 피드만 수집하고 inserted 합계·paused 제목을 응답에 담는다", async () => {
    const feedA = { id: "f1", title: "A일보", url: "a.com", status: "active" };
    const feedB = { id: "f2", title: "B일보", url: "b.com", status: "active" };
    const feedC = { id: "f3", title: "C일보", url: "c.com", status: "inactive" };
    listFeeds.mockResolvedValueOnce([feedA, feedB, feedC]);
    collectFeed.mockImplementation(async (_supabase: unknown, feed: { id: string }) => {
      if (feed.id === "f1") return { inserted: 3, paused: false };
      if (feed.id === "f2") return { inserted: 2, paused: true };
      return { inserted: 0, paused: false };
    });

    const { status, json } = await callRoute();

    const collectedFeedIds = collectFeed.mock.calls.map((c) => (c[1] as { id: string }).id);
    expect(collectedFeedIds).toEqual(["f1", "f2"]);
    expect(status).toBe(200);
    expect(json.collected).toBe(5);
    expect(json.paused).toEqual(["B일보"]);
  });

  it("listUnsummarizedArticles를 MAX_SUMMARIES_PER_RUN(8)로 호출한다", async () => {
    await callRoute();
    expect(listUnsummarizedArticles).toHaveBeenCalledWith(expect.anything(), 8);
  });
});

describe("뉴스 수집 라우트 — 요약 루프 부분 성공", () => {
  it("quota_exceeded가 나면 그 지점에서 요약 루프를 중단한다(부분 성공)", async () => {
    const pending = [
      { id: "a1", title: "t1", snippet: "s1" },
      { id: "a2", title: "t2", snippet: "s2" },
      { id: "a3", title: "t3", snippet: "s3" },
    ];
    listUnsummarizedArticles.mockResolvedValueOnce(pending);
    summarizeArticle.mockImplementationOnce(async () => "요약1");
    summarizeArticle.mockImplementationOnce(async () => {
      throw await makeLddError("quota_exceeded", "gemini 429: 알 수 없음");
    });

    const { status, json } = await callRoute();

    expect(summarizeArticle).toHaveBeenCalledTimes(2);
    expect(setArticleSummary).toHaveBeenCalledTimes(1);
    expect(setArticleSummary).toHaveBeenCalledWith(expect.anything(), "a1", "요약1");
    expect(json.summarized).toBe(1);
    expect(status).toBe(200);
  });

  it("quota_exceeded가 아닌 개별 실패는 루프를 막지 않는다", async () => {
    const pending = [
      { id: "a1", title: "t1", snippet: "s1" },
      { id: "a2", title: "t2", snippet: "s2" },
    ];
    listUnsummarizedArticles.mockResolvedValueOnce(pending);
    summarizeArticle.mockImplementationOnce(async () => {
      throw new Error("일시적 오류");
    });
    summarizeArticle.mockImplementationOnce(async () => "요약2");

    const { status, json } = await callRoute();

    expect(summarizeArticle).toHaveBeenCalledTimes(2);
    expect(json.summarized).toBe(1);
    expect(status).toBe(200);
  });
});

describe("뉴스 수집 라우트 — recordEvent 로그", () => {
  it("성공 경로에서 status 없이 카운트가 포함된 result로 기록한다", async () => {
    await callRoute();
    expect(recordEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "batch:news-collect",
        detail: "피드 수집",
        result: "새 기사 0건 · 요약 0건",
      }),
    );
    const call = recordEvent.mock.calls[0][1] as Record<string, unknown>;
    expect(call.status).toBeUndefined();
  });

  it("실패 경로(listFeeds가 던짐)에서 status:error로 기록하고 502를 반환한다", async () => {
    listFeeds.mockRejectedValueOnce(new Error("db down"));

    const { status, json } = await callRoute();

    expect(status).toBe(502);
    expect(json.error).toBe("수집에 실패했어요. 잠시 후 다시 시도해주세요.");
    expect(recordEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: "batch:news-collect",
        detail: "피드 수집",
        status: "error",
        result: "db down",
      }),
    );
  });
});
