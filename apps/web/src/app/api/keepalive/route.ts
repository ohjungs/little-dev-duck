import { NextResponse } from "next/server";
import { allowRequest } from "@ldd/api";
import { getSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

// Supabase 무료 티어는 7일간 API 활동이 없으면 프로젝트를 일시정지한다. Vercel Cron이 매일 이
// 라우트를 호출해 가벼운 read 요청 한 번으로 DB를 깨워 둔다(anon 키, RLS로 데이터는 0건 반환 —
// 요청이 Postgres에 도달하는 것 자체가 활동으로 집계된다). 새 시크릿 없이 기존 env만 사용한다.
export async function GET(request: Request) {
  // CRON_SECRET이 설정돼 있으면 Vercel Cron이 실어 보내는 Authorization 헤더를 검증한다.
  // 미설정 시 공개 엔드포인트지만 데이터 미반환·미변경 no-op이라 무해하다(원하면 나중에
  // Vercel 환경변수에 CRON_SECRET을 추가하는 것만으로 자동 하드닝된다).
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2026-07-26 : 보안 - keepalive - 무제한호출
  // 위 방어는 CRON_SECRET이 **설정돼 있을 때만** 동작한다. 프로덕션에 그 값이 없어 실제로는
  // 완전히 열려 있었다(실측: 헤더 없이 200, 틀린 시크릿으로도 200). 데이터는 안 샌다
  // (RLS로 0건, 변경 없음). 문제는 아무나 우리 서버를 통해 Supabase 호출을 반복시킬 수 있다는
  // 것 — 무료 등급에서 Vercel 실행 횟수와 Supabase 요청량이 그대로 깎인다.
  //
  // 시크릿 설정은 사용자 조치라 기다리지 않고 코드에서 먼저 막는다. 이 통로는 하루 한 번이면
  // 충분하므로 **전역** 상한이 맞다(부르는 주체가 크론 하나뿐이라 사용자별로 나눌 게 없다).
  // 한계: 이 상한은 인스턴스 메모리 기반이라 서버리스 인스턴스가 여럿이면 그만큼 느슨해진다.
  // 완전한 차단은 CRON_SECRET 설정이며, 그건 docs/loop-eng/PENDING.md에 적어 뒀다.
  if (!allowRequest("keepalive", 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "요청이 많습니다." }, { status: 429 });
  }

  try {
    const { url, anonKey } = getSupabaseEnv();
    const res = await fetch(`${url}/rest/v1/todos?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
    });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (error) {
    console.error("keepalive 실패", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
