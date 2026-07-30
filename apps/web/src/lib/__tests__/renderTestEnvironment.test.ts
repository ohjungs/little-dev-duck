import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-31 : 테스트 - 환경 - 렌더테스트 jsdom 승격 잠금
// apps/web의 vitest environment는 "node"다(vitest.config.ts 주석이 그 규약의 단일 출처).
// 렌더 테스트만 파일 첫 줄 docblock으로 jsdom에 승격하는데, 다음 사람이 이 한 줄을 빠뜨리면
// `document is not defined`로 깨진다. 깨지는 것 자체는 눈에 띄지만, **원인이 규약 위반이라는
// 사실**은 스택트레이스에 안 나와서 매번 다시 조사하게 된다. 그래서 정적으로 못박는다.
// 순수 fs 스캔이라 판단이 개입하지 않는다 — 규칙은 "첫 줄이 정확히 그 한 줄인가" 하나뿐이다.
//
// 이 파일 자신은 확장자가 .ts라 스캔 대상이 아니고, node 환경에서 그대로 돈다.
// packages/ui는 패키지 전역 jsdom(packages/ui/vitest.config.ts)이라 잠금 대상이 아니다.
// 기존 관행 참조: htmlLang.test.ts, safeHrefLock.test.ts(실물 파일을 읽는 정적 검사).

const SRC_ROOT = path.join(__dirname, "..", "..");
const DOCBLOCK = "// @vitest-environment jsdom";

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(SRC_ROOT, f).replace(/\\/g, "/");

// BOM은 눈에 안 보이면서 첫 줄 비교를 깨뜨린다. 제거하고 본다(파일 자체를 고치라는 뜻은 아니다).
const firstLine = (f: string) =>
  readFileSync(f, "utf-8").replace(/^﻿/, "").split(/\r?\n/)[0];

describe("렌더 테스트 jsdom 승격 잠금", () => {
  const files = walk(SRC_ROOT);

  it("스캔이 실제로 렌더 테스트를 찾았다", () => {
    // 스캔이 0건이면 아래 검사가 공짜로 통과한다. 그 상황을 먼저 배제한다.
    expect(files.length).toBeGreaterThanOrEqual(1);
  });

  it("모든 .test.tsx의 첫 줄이 jsdom 승격 docblock이다", () => {
    const offenders = files.filter((f) => firstLine(f) !== DOCBLOCK);
    // 실패 메시지에 위반 파일 목록이 그대로 뜨도록 배열로 비교한다.
    expect(offenders.map(rel)).toEqual([]);
  });
});
