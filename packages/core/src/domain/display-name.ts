// 2026-07-27 : 프로필 - 표시이름 - 한 벌 (Phase 42 T4)
// **계산이 두 벌이어서 난 결함을 고치면서 만든 파일이다.** 사이드바(`(app)/layout.tsx`)는
// 프로필 이름을 읽는데 대시보드 인사말(`(app)/page.tsx`)은 안 읽어서, 사용자가 프로필에서
// 이름을 바꾸면 **왼쪽만 바뀌고 인사말은 그대로**였다(2차 피드백 1-2).
//
// 세 번째 자리에서 또 갈라지지 않게 여기 한 곳에 둔다.

// 프로필 경로는 `profileSchema`가 이미 50자로 막는다. 여기 상한을 **같은 값**으로 두는 이유는
// OAuth 메타데이터에는 그 검사가 없어서다 — 그쪽으로 들어온 긴 이름이 인사말 한 줄을 밀어낸다
// (사이드바는 truncate가 있지만 인사말에는 없다). 새 기준이 아니라 기존 계약을 맞춘 것이다.
const DISPLAY_NAME_MAX = 50;

// 이름을 하나도 못 찾았을 때. **이메일을 쓰지 않는다** — 사이드바는 이름 바로 아래에 이메일을
// 따로 그려서 같은 주소가 두 줄로 겹치고, 인사말은 "안녕하세요, a@b.com님"이 된다.
// 그래서 이 함수는 **이메일을 아예 받지 않는다**: 안 받으면 실수로도 새어 나갈 수 없다.
export const DISPLAY_NAME_FALLBACK = "사용자";

// user_metadata는 임의 JSON이고 **사용자가 스스로 덮어쓸 수 있다**. 문자열이 아닐 수 있으므로
// 타입을 믿지 않고 확인한다(숫자가 들어오면 화면에 그대로 찍힌다).
function usableName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // 코드 포인트 단위로 자른다 — `slice`는 이모지·일부 한글 조합의 중간을 끊어 깨진 글자를 만든다.
  const chars = [...trimmed];
  return chars.length > DISPLAY_NAME_MAX
    ? chars.slice(0, DISPLAY_NAME_MAX).join("")
    : trimmed;
}

/**
 * 화면에 띄울 사용자 표시 이름을 정한다.
 *
 * 우선순위: **프로필에서 바꾼 이름 → OAuth `full_name` → OAuth `name` → `"사용자"`**.
 * 프로필이 먼저인 이유는 그것만이 **사용자가 직접 고칠 수 있는 값**이기 때문이다.
 *
 * 계약:
 * - 어떤 입력에도 **빈 문자열을 돌려주지 않는다**(빈 값이면 "안녕하세요, 님"이 뜬다).
 * - 문자열이 아닌 메타데이터는 **없는 것으로 본다**(임의 JSON이라 신뢰하지 않는다).
 */
export function resolveDisplayName(input: {
  profileName?: string | null;
  metadataFullName?: unknown;
  metadataName?: unknown;
}): string {
  return (
    usableName(input.profileName) ??
    usableName(input.metadataFullName) ??
    usableName(input.metadataName) ??
    DISPLAY_NAME_FALLBACK
  );
}
