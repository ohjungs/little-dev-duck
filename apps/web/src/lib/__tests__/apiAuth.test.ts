import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "../stripComments";

// 2026-07-26 : 보안 - API인증 - 상시검사
// API 라우트를 훑어 보니 /api/health 하나만 핸들러에 인증 확인이 없었다. 지금은 미들웨어가
// 그 경로를 막아 외부에서 못 보지만, **공개 경로 목록은 실제로 바뀐다** — 바로 앞 커밋에서
// 매니페스트를 그 목록에 넣었다. 목록 한 줄로 노출이 열리는 구조를 두지 않는다.
//
// 그래서 "미들웨어가 막아주니 괜찮다"에 기대지 않고, 라우트마다 스스로 확인하게 못박는다.
// 인증 없이 열려야 하는 경로는 아래 목록에 **사유와 함께** 등재한다(schemaGuard의 허용 목록과
// 같은 방식) — 새 예외를 만들려면 그 판단을 남기게 된다.

const API_ROOT = path.join(__dirname, "..", "..", "app", "api");

/** 인증 없이 열려야 하는 경로 + 그 사유. */
const PUBLIC_BY_DESIGN: Record<string, string> = {
  "keepalive/route.ts":
    "Supabase 무료 티어 자동 일시정지를 막는 외부 크론이 부른다. 세션이 없으므로 " +
    "CRON_SECRET 헤더로 대신 지킨다(코드에 시크릿 검사가 있는지도 아래에서 확인).",
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

function rel(file: string): string {
  return path.relative(API_ROOT, file).replace(/\\/g, "/");
}

describe("API 라우트 인증", () => {
  it("모든 라우트가 스스로 인증을 확인한다(예외는 사유와 함께 등재)", () => {
    const offenders: string[] = [];
    for (const file of walk(API_ROOT)) {
      const name = rel(file);
      if (name in PUBLIC_BY_DESIGN) continue;
      // 주석 속 예시 코드에 속지 않는다.
      const src = stripComments(readFileSync(file, "utf-8"));
      if (!/auth\.getUser\(\)/.test(src)) offenders.push(name);
    }
    // 실패하면 둘 중 하나다: 인증 확인을 넣거나, PUBLIC_BY_DESIGN에 사유를 적어 등재하거나.
    expect(offenders).toEqual([]);
  });

  it("공개 예외로 등재한 라우트는 다른 수단으로 지켜지고 있다", () => {
    const unguarded: string[] = [];
    for (const name of Object.keys(PUBLIC_BY_DESIGN)) {
      const src = stripComments(readFileSync(path.join(API_ROOT, name), "utf-8"));
      // 세션이 없는 대신 시크릿·서명 등으로 지켜야 한다. 아무것도 없으면 그냥 열린 것이다.
      if (!/SECRET|authorization|signature/i.test(src)) unguarded.push(name);
    }
    expect(unguarded).toEqual([]);
  });

  it("등재 목록에 죽은 항목이 없다(파일이 사라졌는데 예외만 남는 것 방지)", () => {
    const missing = Object.keys(PUBLIC_BY_DESIGN).filter(
      (name) => !walk(API_ROOT).map(rel).includes(name),
    );
    expect(missing).toEqual([]);
  });
});
