import { LoginForm } from "./LoginForm";

// CSP script-src의 nonce는 요청마다 새로 발급되는데, 이 페이지가 정적 프리렌더링되면
// 빌드 시점에 구워진 스크립트 태그의 nonce가 요청마다 바뀌는 헤더 nonce와 영영 일치하지
// 않아 프로덕션에서 스크립트가 전부 차단된다(사용자가 실제 배포에서 실측 발견). Next.js
// 공식 문서: nonce 기반 CSP는 동적 렌더링 페이지에서만 동작 - force-dynamic으로 강제.
export const dynamic = "force-dynamic";

// 2026-07-26 : 로그인 - 콜백 실패 안내 (Phase 41 T3)
// `/auth/callback`은 코드 교환에 실패하면 `/login?error=auth`로 보내는데, 지금까지 이 화면은
// 그 사실을 **한 글자도 말하지 않았다**(빈 로그인 폼이 다시 뜰 뿐이다). 만료된 비밀번호 재설정
// 링크가 정확히 이 경로로 떨어지므로, 재설정을 만드는 지금 그 침묵을 같이 없앤다.
//
// 문구를 원인별로 나누지 않는다 — OAuth 실패와 재설정 링크 만료가 같은 파라미터로 오고,
// 서버는 어느 쪽인지 알 수 없다. **추측해서 말하면 그게 거짓말이 된다.**
// searchParams는 클라이언트가 정하는 값이라 신뢰하지 않는다: 아는 값 하나만 문구로 바꾸고
// 나머지는 무시한다(임의 문자열이 화면에 실리면 그 자체가 표면이다).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const initialError =
    error === "auth"
      ? "로그인 링크를 처리하지 못했습니다. 링크가 만료됐거나 이미 사용됐을 수 있습니다. 다시 시도해 주세요."
      : "";
  return <LoginForm initialError={initialError} />;
}
