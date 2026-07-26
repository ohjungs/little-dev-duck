// 2026-07-26 : 인증 - 오류문구 - 열거방지 (Phase 41 T1·T2)
// 이메일 로그인이 생기면서 처음으로 **"비밀번호가 틀렸다"는 상태**가 존재하게 됐다.
// OAuth만 있을 때는 없던 표면이다.
//
// **가장 중요한 성질: 계정 열거(account enumeration) 차단.**
// "없는 계정"과 "틀린 비밀번호"를 구분해 알려주면 그건 **어느 이메일이 가입돼 있는지
// 확인해 주는 통로**가 된다. 그래서 자격증명 관련 실패는 원인을 묻지 않고 한 문구로 낸다.
//
// **web `friendlyError`를 쓰지 않는다(의도).** 그건 "모르는 오류는 원문을 그대로 보여준다"가
// 방침이다 — DB 오류에는 맞지만 인증에서는 영문 원문이 노출되고 열거 방지도 깨진다.
// 여기는 반대 방침이다: **모르는 오류도 한국어 문구로 덮는다.**

export const AUTH_GENERIC_CREDENTIAL_MESSAGE =
  "이메일 또는 비밀번호가 올바르지 않습니다.";

const AUTH_UNKNOWN_MESSAGE =
  "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";

// 2026-07-26 : 인증 - 오류문구 - 재설정 (Phase 41 T3)
// 비밀번호 변경은 로그인이 아니라 **모르는 오류의 폴백 문구가 달라야 한다**
// ("로그인에 실패했습니다"가 뜨면 사용자는 방금 연 링크가 아니라 로그인을 의심한다).
// 규칙표는 같은 것을 쓴다 — 약한 비밀번호·시도 상한은 두 흐름에서 같은 문구여야 하고,
// 두 벌로 두면 한쪽만 고쳐진다(이 저장소가 반복해서 데인 부류).
const PASSWORD_UPDATE_UNKNOWN_MESSAGE =
  "비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.";

export const PASSWORD_RESET_LINK_EXPIRED_MESSAGE =
  "재설정 링크가 만료됐거나 이미 사용됐습니다. 비밀번호 재설정을 다시 요청해 주세요.";

// 판정 순서가 중요하다 — 좁은 조건을 먼저 본다. 예: "Email not confirmed"는 아래
// 자격증명 규칙(`invalid`)에 걸리지 않지만, 순서를 뒤집어 넓은 규칙을 앞에 두면 삼켜진다.
const RULES: { match: RegExp; message: string }[] = [
  {
    // Supabase 대시보드에서 Email provider를 켜기 전 상태. 정체 모를 실패로 두면
    // 사용자는 자기 비밀번호를 의심한다(Phase 37에서 고친 부류 그대로).
    match: /email\s+logins?\s+are\s+disabled|email_provider_disabled|signups?\s+not\s+allowed/,
    message:
      "이메일 로그인이 아직 준비되지 않았습니다. Google 또는 GitHub로 계속해 주세요.",
  },
  {
    // 본인이 방금 가입한 흐름에서만 나오므로 남의 계정 정보가 아니다.
    // 안 알려주면 사용자는 왜 로그인이 안 되는지 영원히 모른다.
    match: /email\s+not\s+confirmed|email_not_confirmed/,
    message:
      "가입 확인 메일을 아직 확인하지 않았습니다. 받은 메일의 링크를 눌러 주세요.",
  },
  {
    match: /rate\s+limit|too\s+many\s+requests|over_email_send_rate_limit/,
    message: "시도가 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
  },
  {
    // 기준 자체는 Supabase 설정에 있다 — 여기서 길이를 다시 검사하지 않는다(두 벌 금지).
    // 원문에 담긴 숫자를 그대로 쓰지 않는 이유: 설정이 바뀌면 문구가 거짓이 된다.
    match: /password.*(at\s+least|too\s+short|weak)|weak_password/,
    message:
      "비밀번호가 기준에 못 미칩니다. 더 길고 추측하기 어려운 비밀번호를 써 주세요.",
  },
  {
    // **열거 차단의 핵심.** "이미 가입된 이메일"도 여기로 보낸다 — 가입 실패를 그 사실로
    // 알려주면 로그인 쪽 열거 방지가 무의미해진다.
    match:
      /invalid[\s_]?(login|email|credential|grant)|user\s+already\s+registered|user_already_exists|email_exists/,
    message: AUTH_GENERIC_CREDENTIAL_MESSAGE,
  },
];

// 재설정 흐름에서만 보는 상태들. **로그인 규칙표에 섞지 않는다** — "expired"·"session missing"은
// 로그인 실패에서도 나올 수 있고, 그때 "재설정 링크가 만료됐습니다"라고 하면 거짓말이 된다.
// 좁은 쪽(이 표)을 먼저 보고, 안 걸리면 공용 표로 넘어간다.
const PASSWORD_UPDATE_RULES: { match: RegExp; message: string }[] = [
  {
    // 재설정 링크는 1회용이고 만료된다. 자격증명 실패로 뭉뚱그리면 사용자는 자기 비밀번호를
    // 의심하며 같은 링크를 계속 누른다 — 다음 행동(재요청)을 말해야 한다.
    // 열거 위험 없음: 메일을 받은 본인만 도달하는 상태다.
    match:
      /otp_expired|flow_state_(not_found|expired)|session_not_found|auth\s+session\s+missing|(is\s+)?invalid\s+or\s+(has\s+)?expired|(link|token|otp|code).{0,20}expired|expired.{0,20}(link|token|otp|code)/,
    message: PASSWORD_RESET_LINK_EXPIRED_MESSAGE,
  },
  {
    // Supabase는 지금과 같은 비밀번호로 바꾸려 하면 거부한다. 원인을 안 말하면
    // "왜 안 되는지 모르는 실패"가 된다 — 이것도 본인만 도달하는 상태다.
    match: /same_password|different\s+from\s+the\s+old\s+password/,
    message: "지금 쓰고 있는 비밀번호와 다른 비밀번호를 써 주세요.",
  },
];

/**
 * Supabase 인증 오류 원문을 사용자에게 보여줄 한국어 문구로 바꾼다.
 *
 * 계약:
 * - 자격증명 관련 실패는 **원인을 구분하지 않는다**(열거 차단).
 * - 모르는 오류도 **영문 원문을 노출하지 않는다**.
 * - 어떤 입력에도 **빈 문구를 돌려주지 않는다**(빈 화면이면 사용자가 할 수 있는 게 없다).
 */
export function authErrorMessage(raw: string | null | undefined): string {
  const text = (raw ?? "").trim().toLowerCase();
  if (text === "") return AUTH_UNKNOWN_MESSAGE;
  for (const rule of RULES) {
    if (rule.match.test(text)) return rule.message;
  }
  return AUTH_UNKNOWN_MESSAGE;
}

/**
 * 비밀번호 재설정·변경 중에 난 오류를 한국어 문구로 바꾼다.
 *
 * `authErrorMessage`와의 차이는 둘뿐이다:
 * - 재설정 링크 만료·동일 비밀번호를 **먼저** 판정한다(그 흐름에서만 나오는 상태).
 * - 모르는 오류의 폴백이 "로그인 실패"가 아니라 **"비밀번호를 바꾸지 못했습니다"**다 —
 *   방금 링크를 눌러 들어온 사용자에게 로그인 실패라고 하면 엉뚱한 곳을 고치게 만든다.
 *
 * 나머지(약한 비밀번호·시도 상한 등)는 공용 규칙표를 그대로 쓴다.
 */
export function passwordUpdateErrorMessage(
  raw: string | null | undefined,
): string {
  const text = (raw ?? "").trim().toLowerCase();
  if (text === "") return PASSWORD_UPDATE_UNKNOWN_MESSAGE;
  for (const rule of [...PASSWORD_UPDATE_RULES, ...RULES]) {
    if (rule.match.test(text)) return rule.message;
  }
  return PASSWORD_UPDATE_UNKNOWN_MESSAGE;
}
