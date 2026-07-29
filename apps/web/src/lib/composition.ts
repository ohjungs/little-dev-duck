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

// 2026-07-29 : 메신저 - 전송 키 설정 (Phase 54→56 F-003)
// IME 문제를 겪은 한국어 사용자는 Ctrl+Enter 전송을 원한다(계획). 판정을 IME 가드와
// **같은 파일에 둔다** — 전송 판정과 조합 판정이 갈라져 있으면 한쪽만 고쳐진다.

export type SendKeyMode = "enter" | "ctrl-enter";

export type SendKeyEvent = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
};

/**
 * 이 키 입력으로 전송하는가. false면 기본 동작(textarea 줄바꿈)에 맡긴다.
 * - enter 모드: Enter 전송, Shift+Enter 줄바꿈.
 * - ctrl-enter 모드: Ctrl(또는 Cmd)+Enter만 전송, Enter는 줄바꿈.
 * - 조합 중이면 어느 모드든 전송하지 않는다(X-017).
 */
export function shouldSendOnKey(mode: SendKeyMode, e: SendKeyEvent): boolean {
  if (e.key !== "Enter") return false;
  if (isComposingEnter(e)) return false;
  if (mode === "ctrl-enter") return e.ctrlKey === true || e.metaKey === true;
  return e.shiftKey !== true;
}
