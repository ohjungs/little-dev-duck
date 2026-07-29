import { describe, expect, it } from "vitest";
import { shouldNotifyMessage } from "./notify-filter";

// 2026-07-29 : 메신저 - 알림 방식·키워드 알림 (Phase 56 T1 M-007·M-008)
// 방이 늘면 "전부 알림"은 곧 "전부 끔"이 된다 — 키워드만 골라 받는 길을 연다.
// 판정은 결정적이라 코드로 잠근다(HD-003).
describe("shouldNotifyMessage", () => {
  it("전부(all) 모드는 항상 알린다", () => {
    expect(shouldNotifyMessage("all", [], "아무 말")).toBe(true);
    expect(shouldNotifyMessage("all", ["긴급"], "다른 말")).toBe(true);
  });

  it("끔(off) 모드는 키워드가 맞아도 안 알린다", () => {
    expect(shouldNotifyMessage("off", ["긴급"], "긴급 상황")).toBe(false);
  });

  it("키워드 모드: 본문에 키워드가 있으면 알린다 (부분일치)", () => {
    expect(shouldNotifyMessage("keywords", ["배포"], "배포 끝났어요")).toBe(true);
    expect(shouldNotifyMessage("keywords", ["긴급", "배포"], "오늘 배포합니다")).toBe(true);
  });

  it("키워드 모드: 없으면 안 알린다", () => {
    expect(shouldNotifyMessage("keywords", ["배포"], "점심 먹자")).toBe(false);
  });

  it("영문 키워드는 대소문자를 가리지 않는다", () => {
    expect(shouldNotifyMessage("keywords", ["Deploy"], "deploy done")).toBe(true);
  });

  it("키워드 모드인데 유효한 키워드가 없으면 안 알린다 (설정 화면이 이 상태를 경고한다)", () => {
    expect(shouldNotifyMessage("keywords", [], "아무 말")).toBe(false);
    expect(shouldNotifyMessage("keywords", ["", "  "], "아무 말")).toBe(false);
  });

  it("이모지·한글 멀티바이트 키워드도 부분일치한다", () => {
    expect(shouldNotifyMessage("keywords", ["🦆"], "오리 🦆 등장")).toBe(true);
    expect(shouldNotifyMessage("keywords", ["오리"], "아기오리다")).toBe(true);
  });
});
