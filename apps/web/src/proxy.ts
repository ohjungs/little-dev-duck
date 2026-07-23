import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

// /api/keepalive는 Vercel Cron이 세션 없이 호출하므로 인증 게이트를 통과시킨다(무인증 no-op).
// /walker는 데스크톱 활보 오버레이(사용자 데이터 미노출, 순수 표시용)라 공개 경로로 둔다.
// /p는 공개 페이지 공유(Phase 12 T1) — 비로그인도 링크로 읽기 전용 조회(get_public_page RPC가
// is_public=true 한 건만 반환, 열거 불가).
const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/api/keepalive",
  "/walker",
  "/p",
];

// Tauri WebView가 이 배포 URL을 그대로 로드하는 구조(옵션 A)라 Tauri 쪽 CSP 설정은
// 무효하다(원격 https 콘텐츠에는 주입되지 않음, docs/plans/phase_05.md T2 참조) - 실질적인
// XSS 방어선은 여기, 이 앱 자체의 응답 헤더뿐이다.
// script-src는 nonce 기반으로 전환(2026-07-21) - 'self'만으로는 Next.js App Router가
// RSC 하이드레이션에 자체적으로 삽입하는 인라인 <script>까지 막아버려 실제 브라우저에서
// 로그인 페이지가 깨지는 걸 사용자가 실측으로 발견(콘솔에 6건의 CSP 위반). nonce는
// 요청마다 새로 생성해 request/response 헤더 양쪽에 실어야 Next가 자신이 렌더링하는
// 인라인 스크립트에 자동으로 붙여준다(공식 가이드 패턴).
// style-src는 컴포넌트 전반이 style={{}} 인라인 속성을 쓰는 관례라 unsafe-inline을 허용한다
// (CSS 인라인 삽입은 스크립트 실행보다 위험도가 낮음 - 전면 nonce 전환은 후속 과제로 남김).
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

function withSecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  return response;
}

export async function proxy(request: NextRequest) {
  // Next.js는 App Router 렌더 단계에서 응답 헤더를 다시 조립하기 때문에, 미들웨어 응답
  // 자체에 .set()만 해서는 CSP가 최종 응답까지 살아남지 않는다(X-Frame-Options 등 다른
  // 헤더는 살아남는데 CSP/HSTS만 사라지는 걸 실측으로 확인) - Next 공식 가이드대로 요청
  // 헤더에도 같이 실어 보내야 렌더 단계까지 전달된다.
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce);
  const requestHeadersWithCsp = () => {
    const headers = new Headers(request.headers);
    headers.set("Content-Security-Policy", csp);
    return headers;
  };

  let response = NextResponse.next({
    request: { headers: requestHeadersWithCsp() },
  });

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({
          request: { headers: requestHeadersWithCsp() },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 정확 일치 또는 하위 경로만 공개로 판정한다. startsWith만 쓰면 "/walker"가 미래의
  // "/walker-admin" 같은 라우트까지 의도치 않게 무인증 공개시킬 수 있다.
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!user && !isPublicPath) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/login", request.url), 303),
      csp,
    );
  }

  return withSecurityHeaders(response, csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
