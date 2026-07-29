// 2026-07-29 : 설정 - 진단 내보내기 (Phase 56 T2 T-027)
// "왜 안 되지"를 물을 때 첨부할 꾸러미. 조립은 순수함수 — 수집(스토리지·DB)은 버튼이 한다.
// **localStorage 값은 담지 않는다**: 초안·개인 데이터가 들어 있을 수 있다.
// 키 이름만으로 "어떤 설정이 존재하는가"는 충분히 안다. action_log 요약은 core가
// 이미 200자로 자른다(summarizeForLog).

import type { NotifyHistoryEntry } from "./notifyHistory";
import type { ClientErrorEntry } from "./clientErrorLog";

export type DiagnosticsInput = {
  exportedAt: string;
  userAgent: string;
  lddKeys: string[];
  notifyHistory: NotifyHistoryEntry[];
  // V-007: 화면에 떴던 에러 문구 기록 — "무슨 에러였는지"에 답한다.
  clientErrors: ClientErrorEntry[];
  actionLog: unknown[];
};

export function buildDiagnostics(input: DiagnosticsInput) {
  return {
    note: "이 파일은 문제 진단용입니다. 브라우저 저장값의 키 이름만 담고 값은 담지 않습니다.",
    exportedAt: input.exportedAt,
    userAgent: input.userAgent,
    localStorageKeys: [...input.lddKeys],
    notifyHistory: [...input.notifyHistory],
    clientErrors: [...input.clientErrors],
    actionLog: [...input.actionLog],
  };
}
