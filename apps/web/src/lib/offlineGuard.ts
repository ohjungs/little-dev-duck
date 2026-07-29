// 2026-07-29 : 메신저 - 오프라인 전송 차단 안내 (Phase 57 T2 W-013)
// 오프라인 배너(OfflineIndicator)는 이미 있다(재구현 금지) — 여기는 **전송 순간의 판정과
// 문구**만 한 벌로 둔다. 오프라인에서 전송하면 fetch가 정체 모를 에러로 죽는다 —
// 계획 원문: "정체 모를 실패 대신 왜 안 되는지 말한다." 초안은 지우지 않는다.

export const OFFLINE_SEND_MESSAGE =
  "오프라인이에요. 인터넷이 연결되면 다시 보내주세요. 쓴 내용은 남아 있어요.";

/** 지금 오프라인인가. navigator 주입은 테스트용 — SSR·비브라우저에선 false(막지 않는다). */
export function isOffline(
  nav: { onLine: boolean } | null = typeof navigator === "undefined" ? null : navigator,
): boolean {
  return nav !== null && nav.onLine === false;
}
