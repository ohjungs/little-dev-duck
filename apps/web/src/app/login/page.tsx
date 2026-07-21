import { LoginForm } from "./LoginForm";

// CSP script-src의 nonce는 요청마다 새로 발급되는데, 이 페이지가 정적 프리렌더링되면
// 빌드 시점에 구워진 스크립트 태그의 nonce가 요청마다 바뀌는 헤더 nonce와 영영 일치하지
// 않아 프로덕션에서 스크립트가 전부 차단된다(사용자가 실제 배포에서 실측 발견). Next.js
// 공식 문서: nonce 기반 CSP는 동적 렌더링 페이지에서만 동작 - force-dynamic으로 강제.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
