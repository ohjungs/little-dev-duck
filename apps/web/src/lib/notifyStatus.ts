// 2026-07-29 : 메신저 - "지금 이 방 알림이 오는가" 한 줄 (Phase 56 T1)
// 알림 판정이 다섯 겹(권한·집중·방해금지·상한 = notifyBlockReason / 알림 방식 = msgNotifyPref /
// 방 음소거 = 방 헤더가 이미 말함)이라 사용자가 추적할 수 없다. 계획 원문:
// "정체 모를 실패 대신 왜 안 되는지 말한다." **여기는 문구 합성만 한다 — 판정은 전부 기존 것.**

import type { NotifyBlockReason } from "./notify";
import type { MessageNotifyMode } from "@ldd/core";

// 전역 게이트 사유의 축약 문구. NOTIFY_BLOCK_MESSAGES(설정 화면용 안내)보다 짧다 —
// 방 헤더 한 줄에 들어가야 한다.
const BLOCK_SHORT: Record<NotifyBlockReason, string> = {
  unsupported: "알림: 이 브라우저 미지원",
  permission: "알림: 권한 없음",
  focus: "알림: 집중 모드로 꺼짐",
  quiet: "알림: 방해금지 시간",
  cap: "알림: 오늘 상한 소진",
};

/** 전역 게이트 → 알림 방식 순으로 첫 번째 "안 오는 이유"를 한 줄로. 다 통과면 켜짐. */
export function describeMessageNotifyStatus(input: {
  blockReason: NotifyBlockReason | null;
  mode: MessageNotifyMode;
  keywordCount: number;
}): string {
  if (input.blockReason !== null) return BLOCK_SHORT[input.blockReason];
  if (input.mode === "off") return "알림: 설정에서 꺼져 있음";
  if (input.mode === "keywords") {
    return input.keywordCount === 0
      ? "알림: 키워드가 없어 안 옴"
      : `알림: 키워드 ${input.keywordCount}개만`;
  }
  return "알림: 켜져 있음";
}
