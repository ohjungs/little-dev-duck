import Link from "next/link";
import { PASSWORD_RESET_LINK_EXPIRED_MESSAGE } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

// CSP script-src의 nonce는 요청마다 새로 발급되는데, 이 페이지가 정적 프리렌더링되면 빌드 시점에
// 구워진 스크립트의 nonce가 영영 일치하지 않아 스크립트가 전부 차단된다 — 그러면 비밀번호를
// 바꿀 수 없다(이 저장소가 /login에서 두 번 밟은 함정 그대로). Phase 38의 buildStaticGuard가
// 계속 검사하지만, 이유는 여기에도 적어 둔다.
export const dynamic = "force-dynamic";

// 2026-07-26 : 인증 - 비밀번호 재설정 - 링크 착지 화면 (Phase 41 T3)
// 메일 링크는 /auth/callback으로 먼저 들어와 코드를 세션으로 교환하고 여기로 넘어온다
// (`next=/auth/reset`). **교환 라우트를 새로 만들지 않았다** — 이미 있는 것을 쓴다.
//
// 이 화면은 `(app)` 그룹 밖이라 **레이아웃 가드**가 걸리지 않는다. 대신 `proxy.ts`의 인증
// 게이트에는 걸린다(`PUBLIC_PATHS`에 넣지 않았다 — 넣을 이유가 없다. 여기 오는 사람은 링크
// 교환으로 이미 세션을 받았다). 즉 비로그인 직접 접근은 여기 닿기 전에 303으로 돌아간다.
//
// **그래도 세션을 여기서 다시 본다.** 비밀번호 입력 폼을 세션 없이 렌더하는 것은 이 화면이
// 절대 해선 안 되는 일인데, 그걸 **다른 파일의 경로 목록**에 맡기면 그 목록이 바뀌는 날
// 조용히 깨진다. 게이트와 이 판정이 어긋나는 경우(만료 직후 등)에도 폼 대신 사유를 보여준다.
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-secondary/40 to-background p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[#2b2620] bg-[#070705] p-8 shadow-lg">
        <div className="flex flex-col gap-5 text-center">
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-[#f4f0e6]">
              비밀번호 재설정
            </h1>
            {user ? (
              <p className="break-keep text-sm text-[#a09684]">
                {user.email}의 새 비밀번호를 정해 주세요.
              </p>
            ) : (
              // 정체 모를 실패로 두지 않는다 — 왜 안 되는지와 다음 행동을 말한다
              // (이 저장소가 Phase 37에서 세운 방식).
              <p role="alert" className="break-keep text-sm text-[#ff9d8a]">
                {PASSWORD_RESET_LINK_EXPIRED_MESSAGE}
              </p>
            )}
          </div>

          {user ? (
            <ResetPasswordForm />
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-[#3d362c] bg-[#2c271f] px-4 py-2.5 text-sm text-[#f4f0e6] transition-colors hover:bg-[#373127]"
            >
              로그인 화면으로
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
