// 2026-07-29 : 메신저 - 알림 방식·키워드 알림 (Phase 56 T1 M-007·M-008)
//
// 방이 늘면 "전부 알림"은 곧 "전부 끔"이 된다(계획의 판단). 키워드만 골라 받는 길을 연다.
// 멘션(M-007)은 아직 그룹·멘션 개념이 없어 키워드로 환원한다 — 판정 근거가 모호한
// 모드를 만드는 것보다 정직하다(계획이 M-021에 내린 것과 같은 결).
//
// 이 판정은 **단일 알림 지점(notifyDuck 호출부) 앞**에서만 쓴다. 권한·방해금지·하루 상한은
// notifyDuck이 이미 본다 — 여기서 다시 보면 두 벌이 된다.

export type MessageNotifyMode = "all" | "keywords" | "off";

/** 이 메시지를 알릴 것인가. keywords 모드에서 유효한 키워드가 없으면 아무것도 알리지 않는다 — 설정 화면이 그 상태를 경고할 책임을 진다. */
export function shouldNotifyMessage(
  mode: MessageNotifyMode,
  keywords: readonly string[],
  body: string,
): boolean {
  if (mode === "all") return true;
  if (mode === "off") return false;

  const lowered = body.toLowerCase();
  return keywords
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k !== "")
    .some((k) => lowered.includes(k));
}
