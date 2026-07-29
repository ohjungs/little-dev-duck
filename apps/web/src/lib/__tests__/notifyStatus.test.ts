import { describe, expect, it } from "vitest";
import { describeMessageNotifyStatus } from "../notifyStatus";

// 2026-07-29 : 메신저 - "지금 이 방 알림이 오는가" 한 줄 (Phase 56 T1)
// 판정이 다섯 겹(권한·집중·방해금지·상한·알림 방식)이라 사용자가 추적할 수 없다 —
// 계획: "정체 모를 실패 대신 왜 안 되는지 말한다." 여기는 합성 문구만 만든다(판정 재사용).

describe("describeMessageNotifyStatus", () => {
  it("전역 게이트가 막혀 있으면 그 사유가 먼저다 (방 설정보다 우선)", () => {
    expect(
      describeMessageNotifyStatus({ blockReason: "quiet", mode: "all", keywordCount: 0 }),
    ).toContain("방해금지");
    expect(
      describeMessageNotifyStatus({ blockReason: "permission", mode: "all", keywordCount: 0 }),
    ).toContain("권한");
  });

  it("알림 방식 끔이면 그렇게 말한다", () => {
    expect(
      describeMessageNotifyStatus({ blockReason: null, mode: "off", keywordCount: 3 }),
    ).toContain("꺼져");
  });

  it("키워드 모드는 개수까지 말한다", () => {
    const s = describeMessageNotifyStatus({ blockReason: null, mode: "keywords", keywordCount: 2 });
    expect(s).toContain("키워드");
    expect(s).toContain("2");
  });

  it("키워드 모드인데 키워드가 없으면 사실상 꺼짐임을 말한다", () => {
    expect(
      describeMessageNotifyStatus({ blockReason: null, mode: "keywords", keywordCount: 0 }),
    ).toContain("키워드가 없어");
  });

  it("다 통과면 켜짐", () => {
    expect(
      describeMessageNotifyStatus({ blockReason: null, mode: "all", keywordCount: 0 }),
    ).toContain("켜져");
  });
});
