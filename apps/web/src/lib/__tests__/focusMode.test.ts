import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-27 : 알림 - 집중 모드 - 단일 출처 (Phase 51 T2)
// 키 문자열이 두 곳에 생기면 한쪽만 고쳐진다. 실제로 그 상태였다 —
// PomodoroWidget이 자기 키를 들고 있었고 알림 쪽은 그 키를 몰랐다.
const files = ["src/lib/notify.ts", "src/components/PomodoroWidget.tsx"];

describe("집중 모드 키 단일 출처", () => {
  it("lib/focusMode 밖에서 키 문자열을 다시 적지 않는다", () => {
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      // 주석에서 설명하는 건 괜찮지만, 코드에서 문자열 리터럴로 쓰면 두 벌이 된다.
      expect(src).not.toMatch(/=\s*"ldd-focus-mode"/);
    }
  });

  it("알림 함수가 집중 모드를 직접 본다", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/notify.ts"), "utf8");
    expect(src).toContain("isFocusMode()");
  });
});
