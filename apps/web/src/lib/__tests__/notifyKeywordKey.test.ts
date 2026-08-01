import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveFromWebRoot } from "./testRepoPaths";

// 2026-07-29 : 메신저 - 알림 키워드 키 단일성 (Phase 56 T1 M-008)
// 키워드는 core 허용 목록(백업)과 web 저장 lib가 **같은 키**를 봐야 한다.
// 한쪽만 바뀌면 백업이 빈 값을 담고도 성공했다고 말한다 — 리터럴 일치를 정적으로 잠근다.

describe("알림 키워드 키 단일성", () => {
  const KEY = '"ldd:notify-keywords"';

  it("web 저장 lib와 core 백업 허용 목록이 같은 키 리터럴을 쓴다", () => {
    const web = readFileSync(resolveFromWebRoot("src/lib/msgNotifyPref.ts"), "utf8");
    const core = readFileSync(
      resolveFromWebRoot("../../packages/core/src/domain/local-prefs.ts"),
      "utf8",
    );
    expect(web).toContain(KEY);
    expect(core).toContain(KEY);
  });
});
