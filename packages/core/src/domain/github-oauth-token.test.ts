import { describe, expect, it } from "vitest";
import { githubOAuthTokenSchema } from "./github-oauth-token";

const VALID = {
  userId: "11111111-1111-4111-8111-111111111111",
  accessToken: "gho_token",
  refreshToken: null,
  scope: "public_repo",
  expiresAt: null,
  updatedAt: "2026-07-23T00:00:00+00:00",
};

describe("githubOAuthTokenSchema", () => {
  it("정상 레코드를 파싱한다(expiresAt=null 허용 — GitHub 토큰은 기본 만료 없음)", () => {
    expect(githubOAuthTokenSchema.parse(VALID).expiresAt).toBeNull();
  });

  it("refreshToken=null을 허용한다(GitHub OAuth App은 refresh_token을 발급하지 않음)", () => {
    expect(githubOAuthTokenSchema.parse(VALID).refreshToken).toBeNull();
  });

  it("빈 accessToken은 거부한다", () => {
    expect(() =>
      githubOAuthTokenSchema.parse({ ...VALID, accessToken: "" }),
    ).toThrow();
  });
});
