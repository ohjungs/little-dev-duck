// 2026-07-29 : 메신저 - 입력 임시저장 (Phase 54 선행 슬라이스)
//
// 쓰다 만 메시지가 방을 나갔다 오면 사라진다 — 다시 쓰게 만드는 것은 확실한 이탈 지점이다.
// DB가 아니라 localStorage에 둔다(local-prefs.ts의 판단과 같은 결): 기기별로 달라도 자연스럽고,
// 키 입력마다 네트워크 왕복을 붙일 일이 아니다. 계정을 옮기면 사라지는 값이지만
// **잃는 것이 "보내지 않은 초안"뿐**이라 백업 대상도 아니다.
//
// 키는 여기 한 곳에서만 만든다(focusMode.ts와 같은 단일 출처 규칙) —
// 문자열이 두 곳에 생기면 한쪽만 고쳐진다.

const PREFIX = "ldd-msg-draft:";

export function draftKey(roomId: string): string {
  return `${PREFIX}${roomId}`;
}

/** 저장된 초안. 없거나 저장소가 막혀 있으면 빈 문자열 — 초안 때문에 대화가 못 열리면 안 된다. */
export function loadDraft(roomId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(draftKey(roomId)) ?? "";
  } catch {
    return "";
  }
}

/**
 * 초안 저장. **빈 값(공백뿐 포함)은 키를 지운다** — 보내고 비운 입력창을 빈 문자열로
 * 저장해 두면 방마다 죽은 키가 쌓인다.
 */
export function saveDraft(roomId: string, text: string): void {
  if (typeof window === "undefined") return;
  try {
    if (text.trim() === "") window.localStorage.removeItem(draftKey(roomId));
    else window.localStorage.setItem(draftKey(roomId), text);
  } catch {
    // 저장 실패(용량·프라이빗 모드)로 입력을 막지 않는다. 초안은 편의지 계약이 아니다.
  }
}
