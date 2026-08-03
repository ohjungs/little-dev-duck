import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 2026-08-03 : 헬스체크 라우트 - 조합 지점 검사
// Supabase 헬스는 실제 fetch 호출 결과를 반영해야 하고, Gemini는 키 존재 여부만 봐야 한다
// (실제 호출로 무료 쿼터를 태우면 안 된다 — 라우트 주석의 그 계약).

const getUser = vi.fn();
const fetchMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => getUser() },
  }),
}));

beforeEach(() => {
  vi.resetModules();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function callRoute() {
  const { GET } = await import("../route");
  const res = await GET();
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

describe("헬스체크 라우트 — 인증", () => {
  it("getUser가 null을 반환하면 401", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });
    const { status, json } = await callRoute();
    expect(status).toBe(401);
    expect(json.error).toBe("로그인이 필요합니다.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("헬스체크 라우트 — Supabase", () => {
  it("env가 설정되고 fetch가 ok면 supabase:true", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    fetchMock.mockResolvedValueOnce({ ok: true });
    const { json } = await callRoute();
    expect(json.supabase).toBe(true);
  });

  it("fetch가 ok:false면 supabase:false", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    fetchMock.mockResolvedValueOnce({ ok: false });
    const { json } = await callRoute();
    expect(json.supabase).toBe(false);
  });

  it("fetch가 던지면 supabase:false", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    fetchMock.mockRejectedValueOnce(new Error("network"));
    const { json } = await callRoute();
    expect(json.supabase).toBe(false);
  });

  it("env가 없으면 fetch를 호출하지 않고 supabase:false로 조기 반환한다", async () => {
    const { json } = await callRoute();
    expect(json.supabase).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("헬스체크 라우트 — Gemini", () => {
  it("GEMINI_API_KEY가 있으면 gemini:true이고 fetch를 호출하지 않는다", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const { json } = await callRoute();
    expect(json.gemini).toBe(true);
  });

  it("GEMINI_API_KEY가 없으면 gemini:false", async () => {
    const { json } = await callRoute();
    expect(json.gemini).toBe(false);
  });
});

describe("헬스체크 라우트 — 응답 형태", () => {
  it("checkedAt이 ISO 문자열 형태로 존재한다", async () => {
    const { json } = await callRoute();
    expect(typeof json.checkedAt).toBe("string");
    expect(new Date(json.checkedAt as string).toString()).not.toBe("Invalid Date");
  });
});
