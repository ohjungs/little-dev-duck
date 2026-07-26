import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { accountDeletionEnabled } from "@ldd/core";
import { allowRequest, deleteAllMyData } from "@ldd/api";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

// 2026-07-26 : 계정 - 파기 - 서버라우트 (Phase 35 T2)
// `FEATURES.md:192` MUST의 나머지 절반. 콘텐츠는 이미 지워지는데 **계정(auth.users)과 이메일이
// 남아** 있었다. 계정 삭제는 service_role 권한이 필요해 클라이언트에서 할 수 없다.
//
// **service_role 키는 RLS를 통째로 우회한다.** 잘못 배선하면 지금 있는 구멍보다 나쁘다.
// 그래서 다음을 계약으로 지킨다:
//  1) 키는 이 서버 라우트 안에서만 읽는다(`NEXT_PUBLIC_` 접두 금지 — 붙이면 클라이언트로 새어 나간다).
//  2) **요청 본문을 읽지 않는다.** 지울 대상은 세션에서 꺼낸 사용자뿐이다 — 본문의 id를 믿으면
//     남의 계정을 지울 수 있는 구멍이 된다(Phase 29 restoreTodo가 세운 계약과 같다).
//  3) 키가 없으면 503과 명확한 사유. **미설정이 안전한 기본값**이고 화면은 버튼을 아예 안 보여준다.
//  4) 콘텐츠 먼저, 계정 마지막. 뒤집으면 세션이 죽어 콘텐츠 삭제가 중간에 멈추고
//     사용자는 지워졌다고 믿는 남은 데이터를 갖게 된다.
//
// **CSRF — 재조사하지 않아도 되도록 근거를 남긴다(2026-07-26 실측).**
// 남의 사이트가 이 라우트로 POST를 보내면 계정이 지워질까? **안 된다.**
// `@supabase/ssr@0.12.3`이 인증 쿠키를 `sameSite: "lax"`로 굽는다(dist에서 확인) —
// Lax는 **크로스사이트 POST에 쿠키를 싣지 않으므로** 그런 요청은 여기서 401로 떨어진다.
// 게다가 `proxy.ts`의 공개 경로 목록에 이 경로가 없어 비로그인 요청은 그 앞에서 막힌다.
// Origin 헤더 검사를 따로 넣지 않은 이유: 이미 막혀 있고, 검사를 잘못 짜면 **정상 요청을
// 막는 쪽**의 위험이 더 크다(이 기능은 되돌릴 수 없어 실패가 비싸다). 측정하고 안 고쳤다.

// 되돌릴 수 없는 라우트라 실수·자동화 반복 호출을 막는다.
//
// 2026-07-26 : 인벤토리 - 재구현 (Phase 36)
// 처음엔 여기에 **자체 Map으로 상한을 다시 만들었다.** `@ldd/api`의 `allowRequest`가 이미
// 같은 일을 하고 테스트까지 있는데 못 찾은 것이다(CLAUDE.md 3-5절 인벤토리 위반).
// 자체 구현을 걷어내고 공용 함수로 바꿨다 — 덕분에 키 누수도 그쪽 한 곳에서 고쳐졌다.
//
// **한계(공용 구현과 같다)**: 인스턴스 메모리 기반이라 서버리스 인스턴스가 여럿이면 그만큼
// 느슨하다. 이 경로의 **실질 방어는 상한이 아니라 확인 문구 타이핑**이다 — 자동화된 반복
// 호출은 문구를 모른다. 상한은 같은 인스턴스의 연타를 잡는 보조 수단이다.
const COOLDOWN_MS = 30_000;

export async function POST() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!accountDeletionEnabled(serviceKey)) {
    return NextResponse.json(
      {
        error:
          "계정 삭제가 설정되지 않았습니다. 관리자가 SUPABASE_SERVICE_ROLE_KEY를 설정해야 합니다.",
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 사용자별 키. 30초에 한 번만 허용한다.
  if (!allowRequest(`account-delete:${user.id}`, 1, COOLDOWN_MS)) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  // 1단계: 콘텐츠. 사용자 세션으로 지운다 — RLS가 본인 것만 지우도록 이미 보장한다.
  try {
    await deleteAllMyData(supabase, user.id);
  } catch (e) {
    // 여기서 실패하면 **계정을 지우지 않는다.** 계정만 사라지고 데이터가 남는 상태가 최악이다.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "데이터 삭제에 실패했습니다." },
      { status: 500 },
    );
  }

  // 2단계: 계정. 여기서만 service_role을 쓴다. 세션 유지가 필요 없으므로 쿠키를 다루지 않는다.
  const { url } = getSupabaseEnv();
  // serviceKey는 위 accountDeletionEnabled 가드로 string임이 좁혀져 있다 — 캐스트를 쓰지 않는다.
  const admin = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    // 콘텐츠는 이미 지워졌다. **그 사실을 숨기지 않는다** — 사용자가 지금 상태를 알아야 한다.
    return NextResponse.json(
      {
        error: `데이터는 삭제됐지만 계정 삭제에 실패했습니다: ${error.message}`,
      },
      { status: 500 },
    );
  }

  // 계정이 사라졌으니 상한 기록도 곧 창을 지나 스스로 정리된다(allowRequest가 걷어낸다).
  return NextResponse.json({ ok: true });
}
