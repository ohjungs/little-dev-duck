import { NextResponse } from "next/server";
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
