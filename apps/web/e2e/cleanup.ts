import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { AUTH_STATE } from "./authState";

// 2026-07-31 : e2e - 데이터정리 - 프로덕션오염
// **이 저장소의 e2e는 프로덕션 Supabase에 실계정으로 쓴다.** apps/web/.env.local의
// NEXT_PUBLIC_SUPABASE_URL이 supabase/config.toml의 project_id와 같다. 지금까지 정리 단계가
// 없어서 만들어진 행이 그대로 남았고, 사용자 대시보드에 `e2e-todo-...` 항목이 개인 할일과
// 섞여 보였다(고아 8건을 손으로 지운 적이 있다). 무인 루프가 매 사이클 e2e를 돌리면 누적된다.
//
// 근본 해법은 전용 테스트 프로젝트나 로컬 스택이고 그건 backlog에 있다. 그 전까지 이 teardown이
// 방어선이다 — **접두사 `e2e-`로 시작하는 행만** 지운다. RLS가 걸려 있어 본인 데이터만 대상이 된다.

const E2E_PREFIX = "e2e-";

/** .env.local을 직접 읽는다 — Playwright는 Next의 env 로딩을 거치지 않는다(새 의존성 없이). */
function readEnvLocal(): Record<string, string> {
  const p = path.join(__dirname, "../.env.local");
  if (!existsSync(p)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/**
 * 저장된 브라우저 세션에서 access token을 꺼낸다.
 *
 * @supabase/ssr는 토큰을 `sb-<ref>-auth-token` 쿠키에 굽고, 길면 `.0`·`.1`로 쪼갠다.
 * 값은 `base64-` 접두사가 붙은 base64 JSON이다. 조각을 **이름 순으로** 이어 붙여야 한다 —
 * 순서가 틀리면 JSON이 깨진다.
 */
export function extractAccessToken(rawAuthState: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawAuthState);
  } catch {
    return null;
  }
  const cookies = (parsed as { cookies?: unknown }).cookies;
  if (!Array.isArray(cookies)) return null;

  const parts = cookies
    .filter(
      (c): c is { name: string; value: string } =>
        typeof (c as { name?: unknown })?.name === "string" &&
        (c as { name: string }).name.startsWith("sb-") &&
        (c as { name: string }).name.includes("auth-token") &&
        typeof (c as { value?: unknown })?.value === "string",
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  if (parts.length === 0) return null;

  const joined = parts.map((c) => c.value).join("");
  const b64 = joined.startsWith("base64-") ? joined.slice("base64-".length) : joined;
  try {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as {
      access_token?: unknown;
    };
    return typeof json.access_token === "string" ? json.access_token : null;
  } catch {
    // base64가 아니라 평문 JSON으로 굽히는 버전도 있다.
    try {
      const json = JSON.parse(joined) as { access_token?: unknown };
      return typeof json.access_token === "string" ? json.access_token : null;
    } catch {
      return null;
    }
  }
}

export default async function globalTeardown(): Promise<void> {
  if (!AUTH_STATE.usable) return; // 인증 스펙이 스킵됐으면 만든 데이터도 없다

  const env = { ...readEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = extractAccessToken(readFileSync(AUTH_STATE.path, "utf8"));

  // 정리 실패로 테스트 결과를 덮지 않는다(throw 금지). 대신 **크게 알린다** —
  // 조용히 넘어가면 지금까지처럼 사용자 데이터에 계속 쌓인다.
  if (!url || !anon || !token) {
    console.error(
      `[e2e cleanup] 건너뜀 — 정리하지 못했습니다(url=${!!url} key=${!!anon} token=${!!token}). ` +
        `프로덕션 계정에 e2e 데이터가 남습니다. 수동 확인이 필요합니다.`,
    );
    return;
  }

  const supabase = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  let total = 0;
  for (const table of ["todos", "memos"] as const) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .like("title", `${E2E_PREFIX}%`)
      .select("id");
    if (error) {
      console.error(`[e2e cleanup] ${table} 정리 실패: ${error.message} — 데이터가 남습니다.`);
      continue;
    }
    const n = data?.length ?? 0;
    total += n;
    if (n > 0) console.log(`[e2e cleanup] ${table}에서 ${n}건 삭제`);
  }
  console.log(`[e2e cleanup] 총 ${total}건 정리 완료 (접두사 ${E2E_PREFIX})`);
}
