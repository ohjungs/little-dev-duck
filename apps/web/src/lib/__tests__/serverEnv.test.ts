import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { stripComments } from "../stripComments";

// 2026-07-26 : 보안 - 서버전용env - 클라이언트경계
// CLAUDE.md 2절의 확정 계약: "Gemini 키는 서버 env 전용, 클라이언트 노출 금지",
// 5절: "서버 전용 키는 API Route 뒤에만 둔다". 지금 코드는 그 계약을 지키고 있다(전수 확인).
// 그런데 **문서에만 적힌 규칙은 지켜지는지 아무도 확인하지 않는다**(lessons-learned L-13).
//
// 무엇을 막는가(정직하게): Next는 클라이언트 번들에서 NEXT_PUBLIC_이 아닌 env를 값으로
// 인라인하지 않고 undefined로 바꾼다. 그래서 현재 설정에서 **값이 새는 것**보다 현실적인 위험은
// **조용한 오동작**이다 — 공유 패키지의 한 모듈이 서버 env를 읽으면 서버에선 동작하고
// 브라우저에선 undefined가 되어, 원인을 찾기 어려운 방식으로 기능이 반만 돈다.
// 어느 쪽이든 경계를 넘지 않는 게 맞고, 그 경계를 여기서 못박는다.
//
// 공유 패키지가 클라이언트 번들에 들어간다는 건 추측이 아니라 확인한 사실이다(2026-07-26):
// 'use client' 파일이 @ldd/core 26곳, @ldd/api 20곳, @ldd/ai 9곳, @ldd/ui 2곳, @ldd/mascot 3곳에서
// import한다. 그래서 이 패키지들도 검사 대상에 넣는다.

const WEB_SRC = path.join(__dirname, "..", "..");
const PACKAGES = path.join(WEB_SRC, "..", "..", "..", "packages");

// NEXT_PUBLIC_ 접두사가 붙은 것만 브라우저에 노출해도 되는 값이다.
const SERVER_ENV = /process\.env\.((?!NEXT_PUBLIC_)[A-Z][A-Z0-9_]+)/g;

function walk(dir: string, keep: (name: string) => boolean): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === "dist" || name === "__tests__") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, keep));
    else if (keep(name)) out.push(full);
  }
  return out;
}

const isSource = (name: string) =>
  /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !/\.spec\.tsx?$/.test(name);

function serverEnvNames(file: string): string[] {
  // 주석 속 예시("process.env.GEMINI_API_KEY를 쓰지 말 것")에 속지 않는다.
  const src = stripComments(readFileSync(file, "utf-8"));
  return [...new Set([...src.matchAll(SERVER_ENV)].map((m) => m[1]))];
}

describe("서버 전용 env가 클라이언트 경계를 넘지 않는다", () => {
  it("'use client' 파일은 서버 전용 env를 읽지 않는다", () => {
    const offenders: string[] = [];
    for (const file of walk(WEB_SRC, isSource)) {
      const raw = readFileSync(file, "utf-8");
      if (!/^\s*["']use client["']/.test(raw)) continue;
      const names = serverEnvNames(file);
      if (names.length > 0) {
        offenders.push(`${path.relative(WEB_SRC, file).replace(/\\/g, "/")}: ${names.join(",")}`);
      }
    }
    // 실패하면 그 값을 API Route 뒤로 옮기고, 클라이언트는 라우트를 호출하게 바꾼다.
    expect(offenders).toEqual([]);
  });

  it("공유 패키지는 서버 전용 env를 읽지 않는다(전부 클라이언트에서 import된다)", () => {
    const offenders: string[] = [];
    for (const pkg of ["core", "api", "ai", "ui", "mascot"]) {
      for (const file of walk(path.join(PACKAGES, pkg, "src"), isSource)) {
        const names = serverEnvNames(file);
        if (names.length > 0) {
          offenders.push(`${pkg}/${path.basename(file)}: ${names.join(",")}`);
        }
      }
    }
    // 패키지는 키를 읽지 말고 **인자로 받는다** — 이 저장소가 이미 쓰는 방식이다
    // (geminiEmbed·runDuckTurn 등이 apiKey를 파라미터로 받고, 라우트가 주입한다).
    expect(offenders).toEqual([]);
  });

  it("규칙이 NEXT_PUBLIC_ 값은 막지 않는다(그건 노출해도 되는 값이다)", () => {
    const src = 'const u = process.env.NEXT_PUBLIC_SUPABASE_URL;';
    expect([...src.matchAll(SERVER_ENV)]).toHaveLength(0);
  });

  it("서버 전용 이름은 잡는다", () => {
    const src = "const k = process.env.GEMINI_API_KEY;";
    expect([...src.matchAll(SERVER_ENV)].map((m) => m[1])).toEqual(["GEMINI_API_KEY"]);
  });
});
