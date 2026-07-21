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
});
