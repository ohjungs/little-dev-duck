import { describe, expect, it } from "vitest";
import { getDataSaver } from "../dataSaverPref";

// 2026-07-29 : 설정 - 데이터 절약 모드 (Phase 56 T2 T-009)
describe("getDataSaver", () => {
  it("window가 없는 환경(node/SSR)에서는 꺼짐 — 기본은 평소처럼 보인다", () => {
    expect(getDataSaver()).toBe(false);
  });
});
