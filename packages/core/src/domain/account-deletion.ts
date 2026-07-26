// 2026-07-26 : 계정 - 파기 - 계약 (Phase 35 T1)
// `FEATURES.md:192`가 MUST로 못박은 "계정 삭제 + 전체 데이터 파기"가 절반만 되어 있었다 —
// 콘텐츠는 지워지는데 **계정(auth.users)과 이메일은 남는다**(`api/account.ts:9`가 스스로
// "2단계로 이월"이라 적어 뒀다). 공개 배포된 앱이라 가입한 사람이 자기 계정을 지울 방법이 없다.
//
// 되돌릴 수 없는 기능이라 **말로 적어 둔 규칙은 다음 사람이 어긴다.** 계약을 값으로 두고 잠근다.
// 이 모듈은 순수하다 — 키를 읽지도, 지우지도 않는다.

// 지우는 순서. **뒤집히면 안 된다**: 계정이 먼저 사라지면 세션이 죽어 콘텐츠 삭제가 중간에
// 멈추고, 사용자는 지워졌다고 믿는 남은 데이터를 갖게 된다.
export const ACCOUNT_DELETE_STEPS = ["content", "account"] as const;
export type AccountDeleteStep = (typeof ACCOUNT_DELETE_STEPS)[number];

// 콘텐츠만 지울 때 타이핑하는 문구(기존 위험 구역이 쓰던 값).
export const CONTENT_DELETE_PHRASE = "삭제합니다";

// 계정까지 지울 때 타이핑하는 문구. **일부러 다르게 둔다** — 같으면 손이 기억한 대로 눌러
// 되돌릴 수 없는 쪽까지 지운다. 한쪽이 다른 쪽의 앞부분이 되지 않게도 골랐다.
export const ACCOUNT_DELETE_PHRASE = "계정을 영구 삭제";

// service_role 키가 있어야만 계정을 지울 수 있다(Supabase Admin API).
// **미설정이 안전한 기본값이다** — 키가 없으면 기능 자체를 노출하지 않는다.
// 환경변수를 만들어만 두고 값을 안 넣는 실수가 흔해 공백도 미설정으로 본다.
//
// **타입 가드로 둔다(`key is string`).** boolean만 돌려주면 호출부가 `key as string` 캐스트를
// 써야 하는데, 그 캐스트는 나중에 검사를 옮기거나 지웠을 때 **undefined가 조용히 통과**하는
// 자리가 된다. 가드면 검사를 지우는 순간 타입체크가 먼저 운다.
export function accountDeletionEnabled(key: string | undefined): key is string {
  return typeof key === "string" && key.trim().length > 0;
}
