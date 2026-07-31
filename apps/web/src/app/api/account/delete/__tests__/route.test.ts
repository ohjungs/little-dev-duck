import { afterEach, describe, expect, it, vi } from "vitest";

// 2026-08-01 : 계정 - 파기 - 서버라우트 (Phase 35 T2 테스트 스캐폴딩)
//
// `route.ts`의 게이트 순서 자체가 계약이다 — 순서가 뒤집히면 되돌릴 수 없는 사고로 이어진다.
// 1) service_role 키 미설정 -> 503 (가장 먼저, 로그인 여부보다 앞선다)
// 2) 비로그인 -> 401
// 3) 쿨다운 -> 429
// 4) 콘텐츠 삭제 실패 -> 500, 계정은 건드리지 않는다("계정 보존")
// 5) 계정 삭제 실패 -> 500, "데이터는 삭제됐지만 계정 삭제에 실패했습니다: ..." (부분삭제 고지)
// 6) 둘 다 성공 -> 200 { ok: true }, 콘텐츠 -> 계정 순서로 호출됐음을 확인한다.
//
// 모킹 패턴은 `apiFeatureGate.test.ts`(정적 vi.mock이 아니라 vi.doMock + vi.resetModules +
// 동적 import)를 그대로 따른다. `@ldd/core`의 accountDeletionEnabled는 순수함수라 모킹하지
// 않고 실제 소스(alias)를 그대로 태운다 — env 변수만으로 503/이후를 가른다.

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("@/lib/supabase/server");
  vi.doUnmock("@ldd/api");
  vi.doUnmock("@supabase/supabase-js");
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

describe("POST /api/account/delete", () => {
  it("service_role 키가 없으면 로그인 여부와 무관하게 503을 준다 (가드 최우선순위)", async () => {
    vi.resetModules();
    // SUPABASE_SERVICE_ROLE_KEY를 세팅하지 않는다 = 미설정.
    // 아래 세 함수는 이 가드가 최우선순위임을 증명하기 위한 스파이다 — 503이면 셋 다 호출되면 안 된다.
    const getUser = vi.fn(async () => ({ data: { user: { id: "u1" } } }));
    const allowRequest = vi.fn(() => true);
    const deleteAllMyData = vi.fn(async () => {});
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({ auth: { getUser } }),
    }));
    vi.doMock("@ldd/api", () => ({
      allowRequest,
      deleteAllMyData,
    }));

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(getUser).not.toHaveBeenCalled();
    expect(allowRequest).not.toHaveBeenCalled();
    expect(deleteAllMyData).not.toHaveBeenCalled();
  });

  it("비로그인이면 401을 준다", async () => {
    vi.resetModules();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: null } }) },
      }),
    }));
    vi.doMock("@ldd/api", () => ({
      allowRequest: () => true,
      deleteAllMyData: vi.fn(async () => {}),
    }));

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("로그인이 필요합니다.");
  });

  it("쿨다운에 걸리면 429를 주고 콘텐츠 삭제는 시도하지 않는다", async () => {
    vi.resetModules();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    const deleteAllMyData = vi.fn(async () => {});
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      }),
    }));
    vi.doMock("@ldd/api", () => ({
      allowRequest: () => false,
      deleteAllMyData,
    }));

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("잠시 후 다시 시도해 주세요.");
    expect(deleteAllMyData).not.toHaveBeenCalled();
  });

  it("콘텐츠 삭제 실패 시 500을 주고 계정은 보존한다(deleteUser 미호출)", async () => {
    vi.resetModules();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    const deleteAllMyData = vi.fn(async () => {
      throw new Error("콘텐츠 삭제 실패");
    });
    const deleteUser = vi.fn(async () => ({ error: null }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      }),
    }));
    vi.doMock("@ldd/api", () => ({
      allowRequest: () => true,
      deleteAllMyData,
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { admin: { deleteUser } } }),
    }));

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("콘텐츠 삭제 실패");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("계정 삭제 실패 시 500과 부분삭제 메시지를 준다", async () => {
    vi.resetModules();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";
    const deleteAllMyData = vi.fn(async () => {});
    const deleteUser = vi.fn(async () => ({
      error: { message: "관리자 API 실패" },
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      }),
    }));
    vi.doMock("@ldd/api", () => ({
      allowRequest: () => true,
      deleteAllMyData,
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { admin: { deleteUser } } }),
    }));

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe(
      "데이터는 삭제됐지만 계정 삭제에 실패했습니다: 관리자 API 실패",
    );
  });

  it("성공 시 200과 함께 콘텐츠 -> 계정 순서로 삭제한다", async () => {
    vi.resetModules();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "dummy-anon-key";

    const callOrder: string[] = [];
    const deleteAllMyData = vi.fn(async () => {
      callOrder.push("content");
    });
    const deleteUser = vi.fn(async () => {
      callOrder.push("account");
      return { error: null };
    });
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      }),
    }));
    vi.doMock("@ldd/api", () => ({
      allowRequest: () => true,
      deleteAllMyData,
    }));
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({ auth: { admin: { deleteUser } } }),
    }));

    const { POST } = await import("../route");
    const res = await POST();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(callOrder).toEqual(["content", "account"]);
  });
});
