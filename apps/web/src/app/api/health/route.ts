import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Phase 12 T3 헬스체크. 서버에서 각 서비스 상태를 점검해 반환한다(설정 페이지 카드가 표시).
// Gemini는 실제 호출이 무료 한도를 소진시키므로 키 구성 여부만 확인한다(핑 안 함).
export const dynamic = "force-dynamic";

async function checkSupabase(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    // GoTrue health 엔드포인트(200이면 도달 가능). 5초 타임아웃으로 카드가 오래 매달리지 않게 한다.
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 2026-07-26 : 보안 - 헬스체크 - 미들웨어에만 기대지 않기
// 이 응답은 "Gemini 키가 구성돼 있는가"를 알려준다. 지금은 미들웨어가 이 경로를 막고 있어
// 외부에서 못 보지만, **핸들러 자체에는 확인이 없었다.** 공개 경로 목록은 실제로 바뀐다 —
// 바로 앞 커밋에서 매니페스트를 그 목록에 추가했다. 목록이 한 줄 바뀌면 바로 노출되는 구조를
// 두지 않는다(다른 API 라우트는 전부 이미 이 확인을 하고 있어 일관성도 맞춘다).
//
// 소비자는 설정 화면 카드 하나뿐이고 그 화면은 인증 뒤에 있어, 동작은 달라지지 않는다.
export async function GET() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const supabase = await checkSupabase();
  const gemini = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({
    supabase,
    gemini,
    checkedAt: new Date().toISOString(),
  });
}
