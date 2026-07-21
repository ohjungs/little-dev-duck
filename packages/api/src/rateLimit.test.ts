import { describe, expect, it } from "vitest";
import { allowRequest } from "./rateLimit";

// 키는 테스트마다 고유하게(모듈 전역 Map 오염 방지).
describe("allowRequest", () => {
  it("한도 내 요청은 허용한다", () => {
    expect(allowRequest("k1", 2, 1000, 1000)).toBe(true);
    expect(allowRequest("k1", 2, 1000, 1000)).toBe(true);
  });

  it("한도 초과는 거부한다", () => {
    allowRequest("k2", 2, 1000, 2000);
    allowRequest("k2", 2, 1000, 2000);
    expect(allowRequest("k2", 2, 1000, 2000)).toBe(false);
  });

  it("윈도우가 지나면 다시 허용한다", () => {
    expect(allowRequest("k3", 1, 1000, 5000)).toBe(true);
    expect(allowRequest("k3", 1, 1000, 5000)).toBe(false);
    // 1001ms 경과 → 이전 히트가 창 밖으로 나가 다시 허용.
    expect(allowRequest("k3", 1, 1000, 6001)).toBe(true);
  });
});
