import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 2026-07-31 : 인증 - 로그아웃 - 이 기기만 (사용자 결정)
// 인자 없는 `signOut()`의 Supabase 기본값은 **global scope** — 그 사용자의 **모든 기기 세션을 끊는다.**
// 즉 웹에서 로그아웃하면 데스크톱 앱(Tauri가 같은 배포 URL을 WebView로 로드한다)과 나중에
// 붙을 모바일까지 함께 끊겼다. 확정 스택이 여러 클라이언트를 전제하므로 그건 매번 재로그인을
// 강요하는 동작이다.
//
// "공용 PC에서 전부 로그아웃"이라는 반대 논거는 여기선 성립하지 않는다 — 그러려면 "모든
// 기기에서 로그아웃"이 **별도 선택지**로 있어야 하는데 로그아웃 버튼은 하나뿐이다.
// 사용자가 고른 적 없는 동작이라 의도된 보안 선택이 아니라 기본값을 그대로 쓴 결과였다.
//
// **파괴적 경로는 일부러 global로 남긴다**(DangerZone·DeleteAccountButton). 데이터나 계정이
// 사라졌는데 다른 기기에 세션이 남아 있는 쪽이 더 위험하다. 이 구분은
// `logoutScope.test.ts`가 잠근다 — 다음에 누가 "통일"하지 않도록.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
