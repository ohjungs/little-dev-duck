import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// 2026-07-26 : 보안 - service_role - 유출 차단 (Phase 35)
// 이 키는 **RLS를 통째로 우회한다.** 클라이언트로 새면 지금 있는 어떤 구멍보다 나쁘다.
//
// Next.js는 `NEXT_PUBLIC_` 접두가 붙은 환경변수만 클라이언트 번들에 넣는다. 즉 위험은
// **접두를 실수로 붙이는 것**과 **"use client" 파일에서 읽는 것** 둘이다. 둘 다 소스로 검사된다.
//
// 한계(정직하게): 소스 텍스트 검사지 번들 분석이 아니다. 목적은 몰래 새는 걸 잡는 게 아니라
// **무심코 새는 걸** 막는 데 있다(silentCatch.ts와 같은 성격).

const SRC = join(__dirname, "..", "..");
const KEY = "SUPABASE_SERVICE_ROLE_KEY";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      out.push(...walk(p));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(SRC).map((p) => ({ path: p, text: readFileSync(p, "utf8") }));
const users = files.filter((f) => f.text.includes(KEY));

describe("service_role 키가 클라이언트로 새지 않는다", () => {
  it("NEXT_PUBLIC_ 접두가 붙은 곳이 없다", () => {
    // 붙는 순간 Next가 번들에 그대로 심는다. 되돌릴 수 없는 유출이다.
    const bad = files.filter((f) => f.text.includes(`NEXT_PUBLIC_${KEY}`));
    expect(bad.map((f) => f.path)).toEqual([]);
  });

  it('"use client" 파일에서 읽지 않는다', () => {
    const bad = users.filter((f) => /^\s*["']use client["']/.test(f.text));
    expect(bad.map((f) => f.path)).toEqual([]);
  });

  it("읽는 곳은 서버 라우트와 서버 컴포넌트뿐이다", () => {
    // 새 사용처가 생기면 여기가 먼저 울고, 늘린 사람이 "이게 서버에서만 도는가"를 판단하게 된다.
    const rel = users
      .map((f) => f.path.slice(SRC.length + 1).replace(/\\/g, "/"))
      .sort();
    expect(rel).toEqual([
      "app/(app)/settings/page.tsx",
      "app/api/account/delete/route.ts",
    ]);
  });

  it("키 값을 응답이나 로그로 내보내지 않는다", () => {
    // **값**이 화면·로그에 실리면 그게 유출 경로다. "켜졌는가"만 보내야 한다.
    //
    // 검사 대상은 `process.env.<키>`(값을 읽는 표현)다. 문자열로 **이름만** 언급하는 것은
    // 정상이다 — 503 응답이 "SUPABASE_SERVICE_ROLE_KEY를 설정하세요"라고 알려 줘야 운영자가
    // 무엇을 해야 할지 안다. 처음엔 이름까지 걸러 오탐이 났다.
    const read = `process\\.env\\.${KEY}`;
    for (const f of users) {
      expect(f.text, f.path).not.toMatch(
        new RegExp(`console\\.[a-z]+\\([^;]*${read}`),
      );
      expect(f.text, f.path).not.toMatch(
        new RegExp(`(NextResponse\\.json|res\\.json)\\([^;]*${read}`),
      );
    }
  });
});
