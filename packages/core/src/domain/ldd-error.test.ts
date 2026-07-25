import { describe, expect, it } from "vitest";
import { LddError, isLddError, toLddError, userMessage } from "./ldd-error";

describe("LddError", () => {
  it("code와 message를 보존한다", () => {
    const err = new LddError("quota_exceeded", "gemini 429");
    expect(err.code).toBe("quota_exceeded");
    expect(err.message).toBe("gemini 429");
    expect(err.name).toBe("LddError");
    expect(err instanceof Error).toBe(true);
  });

  it("isLddError로 구분한다", () => {
    expect(isLddError(new LddError("internal", "x"))).toBe(true);
    expect(isLddError(new Error("x"))).toBe(false);
    expect(isLddError("x")).toBe(false);
  });
});

describe("toLddError", () => {
  it("LddError는 그대로 반환", () => {
    const original = new LddError("upstream", "boom");
    expect(toLddError(original)).toBe(original);
  });

  it("일반 Error는 message 보존하고 fallback code로 감싼다", () => {
    const wrapped = toLddError(new Error("network down"), "upstream");
    expect(wrapped.code).toBe("upstream");
    expect(wrapped.message).toBe("network down");
    expect(wrapped.cause).toBeInstanceOf(Error);
  });
});

describe("userMessage", () => {
  it("code별 안전한 문구를 준다(내부 세부 미노출)", () => {
    expect(userMessage(new LddError("quota_exceeded", "gemini 429 raw"))).not.toContain("429");
    expect(userMessage(new LddError("unauthorized", "no session"))).toContain("로그인");
  });

  it("LddError가 아니면 internal 문구", () => {
    expect(userMessage(new Error("leak"))).not.toContain("leak");
  });

  // 쿼터만 예외로 원문을 읽어 문구를 가른다(quota.ts). 하루 총량이 소진됐는데 "잠시 후"라고
  // 안내하면 사용자는 하루 종일 재시도한다 — 그 구분이 사라지지 않게 잠근다.
  it("하루 총량 소진이면 오늘 안에는 안 된다고 말한다", () => {
    const err = new LddError(
      "quota_exceeded",
      'gemini 429: {"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}',
    );
    expect(userMessage(err)).toContain("오늘");
    expect(userMessage(err)).not.toContain("429");
  });

  it("분당 제한이면 잠깐 뒤 다시 시도하라고 말한다", () => {
    const err = new LddError(
      "quota_exceeded",
      'gemini 429: {"quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}',
    );
    expect(userMessage(err)).toContain("1분");
  });

  it("판별할 수 없으면 지킬 수 없는 시간 약속을 하지 않는다", () => {
    const msg = userMessage(new LddError("quota_exceeded", "gemini 429 raw"));
    expect(msg).not.toContain("1분");
    expect(msg).not.toContain("오늘");
  });
});
