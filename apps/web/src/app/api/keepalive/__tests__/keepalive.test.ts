import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 2026-07-26 : 보안 - keepalive - 무제한호출
// 이 라우트는 CRON_SECRET이 **설정돼 있을 때만** 지켜지는 구조였는데, 프로덕션에 그 값이 없어
// 완전히 열려 있었다(실측: 헤더 없이 200, 틀린 시크릿으로도 200).
// 데이터는 안 샌다(RLS로 0건, 변경도 없음). 문제는 **아무나 우리 서버를 통해 Supabase 호출을
// 반복시킬 수 있다**는 것 — 무료 등급에서 Vercel 실행 횟수와 Supabase 요청량이 그대로 깎인다.
//
// 시크릿 설정은 사용자 조치라 기다리지 않고, 코드에서 먼저 막는다. 이 통로는 하루 한 번이면
// 충분하므로 전역 상한이 맞다(사용자별이 아니다 — 부르는 주체가 크론 하나뿐이다).
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  // 라우트가 Supabase env를 읽는다(없으면 500으로 빠져 레이트리밋 판정을 못 본다).
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "placeholder-anon-key";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("[]", { status: 200 })),
  );
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

async function callKeepalive(headers: Record<string, string> = {}) {
  const { GET } = await import("../route");
  return GET(new Request("http://localhost/api/keepalive", { headers }));
}

describe("keepalive", () => {
  it("정상 호출은 통과한다", async () => {
    const res = await callKeepalive();
    expect(res.status).toBe(200);
  });

  it("짧은 시간에 반복 호출하면 막는다", async () => {
    const statuses: number[] = [];
    // 크론은 하루 한 번이다. 연속 호출은 정상 사용이 아니다.
    for (let i = 0; i < 12; i += 1) statuses.push((await callKeepalive()).status);
    expect(statuses).toContain(429);
    // 초반 몇 번은 통과해야 한다 — 크론이 재시도할 여지는 남긴다.
    expect(statuses[0]).toBe(200);
  });

  it("막힌 뒤에는 외부 호출을 하지 않는다", async () => {
    for (let i = 0; i < 12; i += 1) await callKeepalive();
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    // 상한에 걸린 요청까지 Supabase를 부르면 방어의 의미가 없다.
    expect(calls).toBeLessThan(12);
  });

  it("시크릿이 설정돼 있으면 틀린 값은 여전히 401", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await callKeepalive({ authorization: "Bearer wrong" });
    expect(res.status).toBe(401);
  });
});
