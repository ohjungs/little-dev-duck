import Link from "next/link";

// 2026-07-26 : 보안 - CSP - 404페이지 정적프리렌더 (Phase 38)
// lessons-learned "nonce 기반 CSP는 정적 프리렌더링 페이지에서 무효" — **재발견 1회짜리 교훈**이다.
// 그때는 /login이 정적이라 로그인이 완전 불능이었고 실사용자가 발견해 줬다.
//
// 이 페이지가 빌드 결과에서 여전히 정적(○)이었다. 정적이면 빌드 때 구운 스크립트 태그가
// **매 요청의 nonce와 영영 불일치**해 strict-dynamic 아래서 전부 막힌다.
// (로그인한 사용자가 없는 주소를 열면 이 화면을 본다 — 비로그인은 미들웨어가 /welcome으로 보낸다.)
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="text-8xl" role="img" aria-label="오리">
        🦆
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          이 페이지를 찾을 수 없어요
        </h1>
        <p className="text-sm text-muted-foreground">
          주소가 잘못됐거나 페이지가 삭제됐을 수 있어요.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
