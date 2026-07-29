import { describe, expect, it } from "vitest";
import {
  shouldAutoCollect,
  recordCollectDone,
  AUTO_COLLECT_STALE_MS,
} from "../newsAutoCollect";

// 2026-07-29 : 뉴스 - 방문 시 자동 수집 판정 (Phase 61 후속)
function memStorage(init: Record<string, string> = {}) {
  const map = new Map(Object.entries(init));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

const NOW = 1_800_000_000_000;

describe("shouldAutoCollect", () => {
  it("기록이 없으면 수집한다 (첫 방문)", () => {
    expect(shouldAutoCollect(NOW, memStorage())).toBe(true);
  });

  it("6시간이 지나면 수집한다", () => {
    const s = memStorage();
    recordCollectDone(NOW - AUTO_COLLECT_STALE_MS - 1, s);
    expect(shouldAutoCollect(NOW, s)).toBe(true);
  });

  it("6시간 안이면 수집하지 않는다 (무료 쿼터 보호)", () => {
    const s = memStorage();
    recordCollectDone(NOW - 1000, s);
    expect(shouldAutoCollect(NOW, s)).toBe(false);
  });

  it("기록이 망가져 있으면 수집한다 (모르면 하는 쪽 — 안 하면 브리핑이 빈다)", () => {
    expect(shouldAutoCollect(NOW, memStorage({ "ldd:news-last-collect": "엉망" }))).toBe(true);
  });
});
