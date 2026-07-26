import { describe, expect, it } from "vitest";
import { judgeAuthState } from "../../../e2e/authState";

// 2026-07-26 : e2e - 인증세션 - 판정 (Phase 40 T3)
// 판정 대상 코드는 `e2e/`에 있는데(그 코드를 쓰는 스펙들과 같은 자리) **테스트는 여기 둔다** —
// `apps/web/vitest.config.ts`가 `e2e/**`를 제외하기 때문이다(playwright 스펙이 vitest에
// 잡히는 것을 막는 설정이고, 그 설정을 건드리지 않는다). import는 제외 대상이 아니라
// 여기서 부르면 그대로 검증된다. `dependencyAuditIgnores.test.ts`가 저장소 루트 파일을
// 읽는 것과 같은 방식이다.
//
// **왜 판정이 필요한가**: 지금 계약은 세션 파일의 **존재만** 본다. OAuth 세션은 만료되므로
// 만료된 파일이 있으면 스펙이 스킵되지 않고 **리다이렉트로 실패**한다 — CI에서는 그게
// "세션 만료"인지 "진짜 회귀"인지 구분되지 않는다. 파일만 보고 결정적으로 가릴 수 있다.

const NOW = 1_785_000_000; // 고정 기준 시각(초). 실제 시계를 쓰면 테스트가 시간에 따라 흔들린다.

const state = (cookies: unknown[]) => JSON.stringify({ cookies, origins: [] });
const authCookie = (expires: number, name = "sb-abcdefgh-auth-token") => ({
  name,
  value: "x",
  domain: "localhost",
  path: "/",
  expires,
});

describe("e2e 인증 세션 판정", () => {
  it("파일이 없으면 쓸 수 없다 (지금과 같은 스킵)", () => {
    const v = judgeAuthState(null, NOW);
    expect(v.usable).toBe(false);
    expect(v.reason).toContain("세션 파일이 없");
  });

  it("유효한 인증 쿠키가 있으면 쓸 수 있다", () => {
    expect(judgeAuthState(state([authCookie(NOW + 3600)]), NOW).usable).toBe(
      true,
    );
  });

  it("만료된 인증 쿠키만 있으면 쓸 수 없고 갱신을 안내한다", () => {
    const v = judgeAuthState(state([authCookie(NOW - 1)]), NOW);
    expect(v.usable).toBe(false);
    // 실패가 아니라 "갱신하라"로 읽혀야 한다 — 진짜 회귀와 구분되는 게 이 판정의 목적이다.
    expect(v.reason).toContain("만료");
    expect(v.reason).toContain("README");
  });

  it("경계: 만료 시각이 지금과 같으면 만료로 본다", () => {
    expect(judgeAuthState(state([authCookie(NOW)]), NOW).usable).toBe(false);
    expect(judgeAuthState(state([authCookie(NOW + 1)]), NOW).usable).toBe(true);
  });

  it("세션 쿠키(expires=-1)는 만료를 알 수 없어 쓸 수 있다고 본다", () => {
    // 모르면서 막으면 멀쩡한 세션으로도 44건이 계속 죽는다. 판정은 **확실할 때만** 막는다.
    expect(judgeAuthState(state([authCookie(-1)]), NOW).usable).toBe(true);
  });

  it("하나라도 살아 있으면 쓸 수 있다 (분할 저장된 토큰)", () => {
    // @supabase/ssr는 큰 토큰을 sb-…-auth-token.0 / .1 로 쪼갠다. 일부만 만료된 상태를
    // 죽었다고 단정하지 않는다.
    const v = judgeAuthState(
      state([
        authCookie(NOW - 10, "sb-abcdefgh-auth-token.0"),
        authCookie(NOW + 3600, "sb-abcdefgh-auth-token.1"),
      ]),
      NOW,
    );
    expect(v.usable).toBe(true);
  });

  it("인증 쿠키가 하나도 없으면 쓸 수 없다 (로그인 전에 창을 닫은 경우)", () => {
    const v = judgeAuthState(
      state([authCookie(NOW + 3600, "some-unrelated-cookie")]),
      NOW,
    );
    expect(v.usable).toBe(false);
    expect(v.reason).toContain("인증 쿠키");
  });

  it("JSON이 아니면 쓸 수 없다 (조용히 통과하지 않는다)", () => {
    const v = judgeAuthState("이건 JSON이 아니다", NOW);
    expect(v.usable).toBe(false);
    expect(v.reason).toContain("읽을 수 없");
  });

  it("cookies 필드가 없거나 배열이 아니어도 터지지 않는다", () => {
    expect(judgeAuthState("{}", NOW).usable).toBe(false);
    expect(judgeAuthState('{"cookies":"nope"}', NOW).usable).toBe(false);
  });

  it("사유에는 항상 무엇을 해야 하는지가 들어간다", () => {
    for (const raw of [null, "{}", "not json", state([authCookie(NOW - 1)])]) {
      const v = judgeAuthState(raw, NOW);
      expect(v.usable).toBe(false);
      expect(v.reason).toContain("README");
    }
  });
});
