import { existsSync, readFileSync } from "node:fs";
import { AUTH_STATE_PATH } from "./authStatePath";

// 2026-07-26 : e2e - 인증세션 - 단일계약 (Phase 40 T2·T3)
// 같은 3줄(경로 계산 · 존재 확인 · skip+storageState)이 **10개 스펙에 복사돼 있었다.**
// 이 저장소가 Phase 32에서 정리한 부류다 — "두 벌이면 한쪽만 고쳐지고, 그게 애초에 결함이
// 난 이유다." 실제로 아래 T3(만료 판정)를 넣으려면 10곳을 고쳐야 했고, 한 곳을 빠뜨리면
// **그 스펙만 조용히 옛 규칙으로 남는다.**
//
// **판정을 순수 함수로 분리한다**(`judgeAuthState`). 파일을 직접 읽는 검사는 통과해도
// 살아 있는지 알 수 없다 — 가짜 입력으로 검증할 수 있어야 한다(`schemaGuard.ts` 머리말 원칙).
// 그 테스트는 `src/lib/__tests__/e2eAuthState.test.ts`에 있다(vitest가 `e2e/**`를 제외하므로).

export { AUTH_STATE_PATH };

const HINT =
  "e2e/README.md의 '인증 세션 만들기' 절차로 세션을 만들거나 갱신하세요.";

export type AuthStateVerdict = { usable: boolean; reason: string };

/** @supabase/ssr가 굽는 인증 쿠키(큰 토큰은 `.0`·`.1`로 쪼개진다). */
function isAuthCookie(c: unknown): c is { expires?: unknown } {
  const name = (c as { name?: unknown })?.name;
  return (
    typeof name === "string" &&
    name.startsWith("sb-") &&
    name.includes("auth-token")
  );
}

/**
 * 세션 파일 내용만 보고 "이 세션으로 로그인 뒤 화면을 볼 수 있는가"를 판정한다.
 *
 * 왜 만료까지 보나: 지금까지의 계약은 **파일 존재**만 봤다. OAuth 세션은 만료되므로 만료된
 * 파일이 있으면 스펙이 스킵되지 않고 **리다이렉트로 실패**한다 — CI에서는 그게 "세션 만료"인지
 * "진짜 회귀"인지 구분되지 않는다. 파일만 보고 결정적으로 가릴 수 있는 일을 실패로 남기지 않는다.
 *
 * 판정 원칙: **확실할 때만 막는다.** 만료 시각을 알 수 없는 쿠키(세션 쿠키 `expires=-1`)나
 * 일부만 만료된 분할 토큰은 살아 있다고 본다 — 모르면서 막으면 멀쩡한 세션으로도 스펙이 계속 죽는다.
 */
export function judgeAuthState(
  raw: string | null,
  nowSeconds: number,
): AuthStateVerdict {
  if (raw === null) {
    return { usable: false, reason: `인증 세션 파일이 없습니다. ${HINT}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      usable: false,
      reason: `인증 세션 파일을 읽을 수 없습니다(JSON 형식이 아닙니다). ${HINT}`,
    };
  }

  const cookies = (parsed as { cookies?: unknown }).cookies;
  if (!Array.isArray(cookies)) {
    return {
      usable: false,
      reason: `인증 세션 파일에 cookies 배열이 없습니다. ${HINT}`,
    };
  }

  const authCookies = cookies.filter(isAuthCookie);
  if (authCookies.length === 0) {
    return {
      usable: false,
      // 실제로 겪을 수 있는 경로다: 브라우저는 열렸는데 로그인을 마치기 전에 창을 닫으면
      // 파일은 생기고 인증 쿠키만 없다. 그때 "파일이 있으니 돌린다"로 가면 전부 실패한다.
      reason: `Supabase 인증 쿠키가 없습니다 — 로그인을 마치기 전에 창을 닫았을 수 있습니다. ${HINT}`,
    };
  }

  const alive = authCookies.some((c) => {
    const expires = c.expires;
    // 만료 시각을 모르면(세션 쿠키 `-1`, 필드 없음) 죽었다고 단정하지 않는다.
    if (typeof expires !== "number" || expires <= 0) return true;
    return expires > nowSeconds;
  });
  if (!alive) {
    return { usable: false, reason: `인증 세션이 만료됐습니다. ${HINT}` };
  }

  return { usable: true, reason: "" };
}

function read(): AuthStateVerdict & { path: string } {
  const raw = existsSync(AUTH_STATE_PATH)
    ? readFileSync(AUTH_STATE_PATH, "utf8")
    : null;
  const verdict = judgeAuthState(raw, Math.floor(Date.now() / 1000));
  return {
    ...verdict,
    // 경로를 사유에 붙인다 — 어느 파일을 만들어야 하는지 모르면 안내가 소용없다.
    reason: verdict.usable ? "" : `${verdict.reason} (${AUTH_STATE_PATH})`,
    path: AUTH_STATE_PATH,
  };
}

/**
 * 스펙이 쓰는 단일 진입점. 모듈 로드 시 1회 판정한다(전에도 `existsSync`를 모듈 최상단에서
 * 불렀으므로 동작 시점은 같다).
 *
 * 사용법:
 *   test.skip(!AUTH_STATE.usable, AUTH_STATE.reason);
 *   test.use({ storageState: AUTH_STATE.usable ? AUTH_STATE.path : undefined });
 */
export const AUTH_STATE = read();
