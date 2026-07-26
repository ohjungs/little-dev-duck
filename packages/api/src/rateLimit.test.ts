import { describe, expect, it } from "vitest";
import { allowRequest, bucketCount } from "./rateLimit";

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

// 2026-07-26 : 레이트리밋 - 키누수 (Phase 36)
// 넣기만 하고 지우지 않아 **한 번이라도 요청한 키가 영원히 남았다.** 전역 키(`keepalive`)만
// 쓸 때는 티가 안 났지만 **사용자별 키**(`account-delete:<uid>`)를 쓰면 사용자 수만큼 커진다.
//
// 이 파일은 모듈 전역 Map을 공유하므로 **절대 개수를 단언하지 않는다** — 위 테스트가 남긴
// 키가 섞인다. 대신 "지난 키가 사라지는가 / 살아 있는 키가 남는가"라는 성질을 본다.
describe("allowRequest — 창이 지난 키를 남기지 않는다", () => {
  it("창이 지난 키는 다음 호출 때 사라진다", () => {
    allowRequest("leak-a", 1, 1000, 100_000);
    const withA = bucketCount();

    // leak-a의 창(1000ms)을 훌쩍 넘긴 시각에 다른 키가 들어온다.
    allowRequest("leak-b", 1, 1000, 200_000);
    // leak-a가 사라지고 leak-b가 들어왔으므로 개수가 늘지 않는다.
    expect(bucketCount()).toBeLessThanOrEqual(withA);
  });

  it("살아 있는 키는 지우지 않는다", () => {
    allowRequest("live-a", 5, 10_000, 300_000);
    allowRequest("live-b", 5, 10_000, 300_100);
    // 둘 다 창 안이라 둘 다 남아 있어야 한다 — 한도가 5라 아직 허용된다.
    expect(allowRequest("live-a", 5, 10_000, 300_200)).toBe(true);
    expect(allowRequest("live-b", 5, 10_000, 300_200)).toBe(true);
    expect(bucketCount()).toBeGreaterThanOrEqual(2);
  });

  it("한도에 걸려 거부된 키도 창이 지나면 사라진다", () => {
    allowRequest("dense", 1, 1000, 400_000);
    expect(allowRequest("dense", 1, 1000, 400_000)).toBe(false);
    const withDense = bucketCount();

    allowRequest("other", 1, 1000, 500_000);
    expect(bucketCount()).toBeLessThanOrEqual(withDense);
  });

  it("창 길이가 다른 키를 남의 창으로 재지 않는다", () => {
    // **이게 정리의 핵심 함정이다.** 지금 호출의 windowMs로 남의 키를 재면
    // 한 시간짜리 창을 쓰는 키가 1초짜리 호출 때문에 지워진다.
    allowRequest("long-window", 1, 3_600_000, 600_000);
    // 1초 창을 쓰는 다른 키가 5초 뒤에 들어온다.
    allowRequest("short-window", 1, 1000, 605_000);
    // long-window는 자기 창이 아직 한참 남았으므로 살아 있어야 한다 → 여전히 거부된다.
    expect(allowRequest("long-window", 1, 3_600_000, 605_000)).toBe(false);
  });
});
