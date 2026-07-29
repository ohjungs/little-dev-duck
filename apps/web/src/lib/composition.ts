// 2026-07-29 : 입력 - IME 조합 중 전송 방지 (Phase 54 T1 X-017 = Phase 50 X-018, 한 벌 처리)
//
// 한국어 입력은 글자를 **조합 중**일 때 Enter가 "조합 확정"으로도 쓰인다. 이때 전송까지
// 해 버리면 마지막 글자가 잘리거나 쓰다 만 문장이 나간다 — 한국어 메신저의 고전 버그.
//
// 계획이 못박은 대로 **판정을 한 곳에 둔다**(원본 카탈로그에 X-017·X-018로 둘로 나뉘어
// 있던 같은 문제). 각 입력창이 제 나름대로 검사하면 한쪽만 고쳐진다.
//
// keyCode 229: 오래된 브라우저/OS 조합이 isComposing을 안 주고 229를 주는 경우의 안전망.

export function isComposingEnter(e: { isComposing?: boolean; keyCode?: number }): boolean {
  return e.isComposing === true || e.keyCode === 229;
}
