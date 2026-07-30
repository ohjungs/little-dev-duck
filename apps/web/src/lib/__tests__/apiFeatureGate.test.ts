import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stripComments } from "../stripComments";

// 2026-07-30 : 보안 - 기능토글 - 서버강제 (감사 후속에서 발견)
//
// core `canUseFeature`는 주석에 이렇게 적어 뒀다:
//   "화면·API 양쪽이 **같은 함수**를 쓴다 — 화면에서만 숨기면 주소를 직접 치는 사람에겐
//    열려 있는 것과 같다."
// 그런데 실제로 이 함수를 쓰는 곳은 `(app)/layout.tsx`와 `(app)/page.tsx`뿐이었다 —
// **API 라우트는 0곳.** 즉 관리자가 `duck-chat`을 꺼도(또는 역할을 customer로 내려도)
// `/api/ai/agent`에 직접 POST하면 오리가 그대로 답하고 **도구까지 실행**했다.
//
// 오리 도구는 RLS 범위 안에서 본인 데이터·본인 토큰으로만 동작하므로 "남의 데이터 접근"은
// 아니다. 그러나 "관리자가 끈 기능을 쓸 수 있다"는 것 자체가 인가 결함이고, 2026-07-30에
// 오리의 mutating 도구가 둘 늘어(캘린더 수정·이슈 닫기) 실행 표면이 커진 뒤라 더 중요해졌다.
//
// 여기서는 "기능 토글로 보호받아야 하는 라우트가 실제로 서버에서 그 검사를 하는지"를 잠근다.

const API_ROOT = path.join(__dirname, "..", "..", "app", "api");

/**
 * 기능 토글이 서버에서 강제돼야 하는 라우트 → 그 기능 key.
 * 새 라우트가 어떤 기능에 속하면 여기 추가한다. 속하지 않으면(공용 인프라 등) 넣지 않는다.
 */
const GATED_ROUTES: Record<string, string> = {
  // `duck-chat` 기능 설명이 곧 이 라우트다: "오리에게 말 걸기와 도구 실행".
  "ai/agent/route.ts": "duck-chat",
  // 승인 실행도 같은 기능이다 — 여기가 열려 있으면 대화만 막고 실행은 열어 두는 셈이다.
  "ai/agent/approve/route.ts": "duck-chat",
  // 2026-07-30 2차: 기능 설명이 라우트를 그대로 지목해 **판단이 필요 없는** 둘만 추가했다.
  //  · `news` = "RSS 구독과 요약" → 수집 라우트가 정확히 그 일이다.
  //  · `github` = "커밋 잔디: GitHub 기여도 위젯" → 이 라우트가 그 데이터를 준다.
  // (`ai/write`·`ai/standup`·`ai/duck-line`은 어느 기능에 속하는지가 제품 의도라 미정 —
  //  manual-verification 114번에서 사용자 결정 대기.)
  "news/collect/route.ts": "news",
  "github/contributions/route.ts": "github",
};

function src(rel: string): string {
  return stripComments(readFileSync(path.join(API_ROOT, rel), "utf-8"));
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("@ldd/api");
  vi.doUnmock("@/lib/supabase/server");
});

describe("API 기능 토글 강제", () => {
  it("검사 대상 라우트 파일이 실제로 존재한다", () => {
    // 파일이 사라졌는데 목록만 남으면 검사가 조용히 무력해진다.
    for (const rel of Object.keys(GATED_ROUTES)) {
      expect(() => src(rel), `${rel}를 읽을 수 없다`).not.toThrow();
    }
  });

  it("보호 대상 라우트가 서버에서 기능 토글을 확인한다", () => {
    // 라우트는 공용 헬퍼를 부르고, 그 헬퍼가 화면과 **같은 함수**(canUseFeature)로 판정한다.
    // 라우트마다 직접 판정하면 갈라지므로 헬퍼 경유를 요구한다(L-21: 복사되는 순간 구멍).
    const offenders: string[] = [];
    for (const [rel, feature] of Object.entries(GATED_ROUTES)) {
      const code = src(rel);
      const gated =
        /blockIfFeatureDisabled\s*\(/.test(code) && code.includes(`"${feature}"`);
      if (!gated) offenders.push(`${rel} (${feature})`);
    }
    expect(offenders).toEqual([]);
  });

  it("공용 헬퍼가 화면과 같은 판정 함수를 쓰고 403으로 답한다", () => {
    // 판정의 실체가 여기다 — 헬퍼가 canUseFeature를 안 쓰면 위 검사는 통과해도 의미가 없다.
    // 401은 "로그인하라"는 뜻이라 로그인한 사용자에게 잘못된 안내가 된다.
    const helper = stripComments(
      readFileSync(path.join(__dirname, "..", "featureGate.ts"), "utf-8"),
    );
    expect(helper).toMatch(/canUseFeature\s*\(/);
    expect(helper).toMatch(/status:\s*403/);
  });

  it("차단 응답이 실제로 403이다 (라우트 통합)", async () => {
    // 정적 검사만으로는 "그 403이 이 경로에서 실제로 나가는지" 알 수 없다.
    // 기능이 꺼진 사용자로 실제 POST해 상태코드를 확인한다.
    vi.resetModules();
    process.env.GEMINI_API_KEY = "test-key";
    vi.doMock("@ldd/api", () => ({
      allowRequest: () => true,
      // duck-chat이 꺼진 사용자.
      getMyAccess: async () => ({ role: "user", disabledFeatures: ["duck-chat"] }),
      composeAdapters: () => ({ catalog: [], execute: vi.fn() }),
      createAppActionsAdapter: () => ({}),
      createGoogleCalendarAdapter: () => ({}),
      createGitHubIssuesAdapter: () => ({}),
      createGmailAdapter: () => ({}),
      getGoogleTokens: async () => null,
      getGithubTokens: async () => null,
      getGmailTokens: async () => null,
      runDuckTurn: async () => ({ status: "final", text: "답" }),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      }),
    }));

    const { POST } = await import("../../app/api/ai/agent/route");
    const res = await POST(
      new Request("http://localhost/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "안녕" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("기능이 켜져 있으면 통과한다 (게이트가 늘 막는 게 아니다)", async () => {
    // 늘 403을 주는 게이트도 위 검사를 통과한다 — 정상 사용자가 막히지 않는지 함께 확인한다.
    vi.resetModules();
    process.env.GEMINI_API_KEY = "test-key";
    vi.doMock("@ldd/api", () => ({
      allowRequest: () => true,
      getMyAccess: async () => ({ role: "user", disabledFeatures: [] }),
      composeAdapters: () => ({ catalog: [], execute: vi.fn() }),
      createAppActionsAdapter: () => ({}),
      createGoogleCalendarAdapter: () => ({}),
      createGitHubIssuesAdapter: () => ({}),
      createGmailAdapter: () => ({}),
      getGoogleTokens: async () => null,
      getGithubTokens: async () => null,
      getGmailTokens: async () => null,
      runDuckTurn: async () => ({ status: "final", text: "답" }),
    }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
      }),
    }));

    const { POST } = await import("../../app/api/ai/agent/route");
    const res = await POST(
      new Request("http://localhost/api/ai/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "안녕" }),
      }),
    );
    expect(res.status).toBe(200);
  });
});
