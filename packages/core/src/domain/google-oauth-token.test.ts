import { describe, expect, it } from "vitest";
import { googleOAuthTokenSchema } from "./google-oauth-token";

const VALID = {
  userId: "11111111-1111-4111-8111-111111111111",
  accessToken: "ya29.token",
  refreshToken: "1//refresh",
  scope: "https://www.googleapis.com/auth/calendar.events",
  expiresAt: "2026-07-23T00:00:00+00:00",
  updatedAt: "2026-07-22T00:00:00+00:00",
};

describe("googleOAuthTokenSchema", () => {
  it("정상 레코드를 파싱한다", () => {
    expect(googleOAuthTokenSchema.parse(VALID).accessToken).toBe("ya29.token");
  });

  it("refreshToken=null을 허용한다(offline 재동의 없이 최초 캡처 시 재발급 안 될 수 있음)", () => {
    expect(
      googleOAuthTokenSchema.parse({ ...VALID, refreshToken: null }).refreshToken,
    ).toBeNull();
  });

  it("빈 accessToken은 거부한다", () => {
    expect(() =>
      googleOAuthTokenSchema.parse({ ...VALID, accessToken: "" }),
    ).toThrow();
  });
});
