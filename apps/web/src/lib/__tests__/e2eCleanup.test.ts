import { describe, expect, it } from "vitest";
import { extractAccessToken } from "../../../e2e/cleanup";

// 2026-07-31 : e2e - 데이터정리 - 토큰추출
// 테스트를 여기 두는 이유는 e2eAuthState.test.ts와 같다 — vitest가 `e2e/**`를 제외하므로
// 그 설정을 건드리지 않고 import로 검증한다.
//
// **왜 이 함수만 테스트하나**: 정리 자체는 실제 Supabase를 때리므로 유닛으로 검증할 수 없다.
// 하지만 실패의 대부분은 "토큰을 못 꺼내서 조용히 건너뛰는 것"이고, 그건 순수 함수라 가짜
// 입력으로 전부 검증된다. 토큰을 못 꺼내면 정리가 안 되고, 정리가 안 되면 사용자 대시보드에
// e2e 데이터가 그대로 쌓인다.

const encode = (obj: unknown) =>
  "base64-" + Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

const wrap = (cookies: unknown[]) => JSON.stringify({ cookies, origins: [] });

describe("extractAccessToken", () => {
  it("단일 쿠키에서 access_token을 꺼낸다", () => {
    const raw = wrap([
      { name: "sb-abcdefgh-auth-token", value: encode({ access_token: "tok-1" }) },
    ]);
    expect(extractAccessToken(raw)).toBe("tok-1");
  });

  it("쪼개진 쿠키를 이름 순으로 이어 붙인다", () => {
    const full = encode({ access_token: "tok-long" });
    const half = Math.ceil(full.length / 2);
    // 파일에 뒤 조각이 먼저 나오도록 일부러 뒤집어 넣는다 — 이름 순 정렬이 없으면 깨진다.
    const raw = wrap([
      { name: "sb-abcdefgh-auth-token.1", value: full.slice(half) },
      { name: "sb-abcdefgh-auth-token.0", value: full.slice(0, half) },
    ]);
    expect(extractAccessToken(raw)).toBe("tok-long");
  });

  it("base64 접두사 없이 평문 JSON으로 구워진 경우도 읽는다", () => {
    const raw = wrap([
      { name: "sb-abcdefgh-auth-token", value: JSON.stringify({ access_token: "tok-plain" }) },
    ]);
    expect(extractAccessToken(raw)).toBe("tok-plain");
  });

  it("인증 쿠키가 없으면 null", () => {
    const raw = wrap([{ name: "other-cookie", value: "x" }]);
    expect(extractAccessToken(raw)).toBeNull();
  });

  it("access_token 필드가 없으면 null — 빈 문자열을 토큰으로 쓰지 않는다", () => {
    const raw = wrap([
      { name: "sb-abcdefgh-auth-token", value: encode({ refresh_token: "r" }) },
    ]);
    expect(extractAccessToken(raw)).toBeNull();
  });

  it("access_token이 문자열이 아니면 null", () => {
    const raw = wrap([
      { name: "sb-abcdefgh-auth-token", value: encode({ access_token: 123 }) },
    ]);
    expect(extractAccessToken(raw)).toBeNull();
  });

  it("깨진 입력에도 예외를 던지지 않는다 — teardown이 죽으면 정리가 통째로 빠진다", () => {
    expect(extractAccessToken("not json")).toBeNull();
    expect(extractAccessToken(JSON.stringify({ cookies: "배열 아님" }))).toBeNull();
    expect(extractAccessToken(wrap([{ name: "sb-x-auth-token", value: "!!깨진 base64!!" }]))).toBeNull();
    expect(extractAccessToken(wrap([{ name: "sb-x-auth-token" }]))).toBeNull();
  });
});
