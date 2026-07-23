import { NextResponse } from "next/server";
import { getGoogleTokens, saveGoogleTokens } from "@ldd/api";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // SEC-04: next는 반드시 같은 오리진의 절대 경로여야 한다. "/"로 시작하되 "//"(프로토콜 상대
  // URL)나 "/\"는 배제해 open redirect를 막는다.
  const nextParam = searchParams.get("next") ?? "/";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")
      ? nextParam
      : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Phase 10 T3: Google 로그인이고 provider_token이 응답에 실려 있으면(공식 문서: 최초 로그인
      // 시점에만 노출) 즉시 캡처해 저장한다 — 세션 재조회로는 다시 안 나온다고 가정(최악 가정 안전).
      // 실패해도 로그인 자체는 이미 성공이므로 사용자를 막지 않는다(Calendar 연동은 부가 기능).
      const session = data.session;
      const providerToken = session?.provider_token;
      // 주 로그인이 Google인 경우(provider==="google") 외에, GitHub 등으로 로그인한 사용자가 설정에서
      // Google Calendar만 별도로 연동(linkIdentity)한 경우도 캡처해야 한다 — 이때는 app_metadata.provider가
      // 여전히 "github"라 그 값만으론 구분 불가. 연동 버튼이 redirectTo에 명시적으로 실어 보내는 `link=google`
      // 쿼리 파라미터로 판단한다(우리가 직접 설정하는 값이라 신뢰 가능, exchangeCodeForSession 성공 이후에만
      // 의미를 가짐 — code 자체가 없으면 애초에 이 분기에 도달 못 함).
      const isGoogleLink =
        session?.user.app_metadata.provider === "google" ||
        searchParams.get("link") === "google";
      if (isGoogleLink && typeof providerToken === "string") {
        try {
          // Google이 access_type=offline 없이는 refresh_token을 재발급하지 않는다(재동의 시 최초 1회만).
          // 이번 로그인에 없으면 upsert가 컬럼을 null로 덮어써 기존 저장분을 지우지 않도록, 먼저 조회해
          // 새 값이 없을 때만 기존 값을 유지한다.
          const newRefreshToken =
            typeof session.provider_refresh_token === "string"
              ? session.provider_refresh_token
              : null;
          const refreshToken =
            newRefreshToken ??
            (await getGoogleTokens(supabase, session.user.id))?.refreshToken ??
            null;
          await saveGoogleTokens(supabase, {
            userId: session.user.id,
            accessToken: providerToken,
            refreshToken,
            scope: "https://www.googleapis.com/auth/calendar.events",
            // Supabase가 만료 시각을 주지 않아 access_token 표준 수명(1시간)으로 보수적 추정.
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          });
        } catch (tokenError) {
          console.error("Google Calendar 토큰 저장 실패", tokenError);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
