import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-29 : 시간대 - KST 계산 한 벌 (Phase 57 T1 X-013)
// 화면 코드가 "Asia/Seoul"로 직접 포맷터를 만들면 KST 계산이 다시 흩어진다 —
// 하루 밀림을 여러 번 겪은 저장소다. 표시 계산은 core date-util 한 벌만 쓴다.

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("KST 계산 단일 출처", () => {
  it("apps/web에 Asia/Seoul 리터럴이 없다 (core 한 벌 사용)", () => {
    const offenders: string[] = [];
    for (const file of walk(join(process.cwd(), "src"))) {
      if (file.includes("kstSingleSource")) continue; // 이 검사 파일 자신 제외
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (line.includes("Asia/Seoul")) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("core date-util이 KST 한 벌을 내보낸다", () => {
    const src = readFileSync(
      join(process.cwd(), "../../packages/core/src/domain/date-util.ts"),
      "utf8",
    );
    for (const fn of ["kstHourMinute", "kstHourOf", "kstFullDateLabel", "kstTimeString"]) {
      expect(src).toContain(`export function ${fn}`);
    }
  });
});
