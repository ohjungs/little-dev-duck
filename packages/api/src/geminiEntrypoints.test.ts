import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// 2026-07-26 : 보안 - 프롬프트인젝션 - 진입점 회귀잠금 (Phase 32 T3)
// T1이 뉴스 요약의 빠진 방어를 고쳤다. 문제는 **다음에 진입점이 하나 더 생겼을 때**다 —
// 이 저장소가 2026-07-26에만 세 번 겪은 부류가 "한 자리를 고치고 부류를 안 본" 것이다.
//
// 그래서 증상이 아니라 **개수**를 못박는다. Gemini 생성 호출부가 늘면 이 테스트가 먼저 울고,
// 늘린 사람이 "이 프롬프트에 외부 텍스트가 들어가는가"를 판단하게 만든다.
//
// 한계(정직하게): 소스 텍스트 검사지 의미 분석이 아니다. 목적은 몰래 늘리는 걸 막는 게 아니라
// **무심코 늘리는 걸** 막는 데 있다(silentCatch.ts와 같은 성격).

const SRC = join(__dirname);

function sourceFiles(): { name: string; text: string }[] {
  return readdirSync(SRC)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((name) => ({ name, text: readFileSync(join(SRC, name), "utf8") }));
}

describe("Gemini 생성 진입점", () => {
  it("생성 호출부는 알려진 파일에만 있다", () => {
    // :generateContent 를 부르는 파일 목록. 임베딩(:embedContent)은 프롬프트가 아니라 제외.
    const callers = sourceFiles()
      .filter((f) => f.text.includes(":generateContent"))
      .map((f) => f.name)
      .sort();

    // agent.ts  — buildRagContext가 방어를 붙인다(core ai-chat.ts).
    // gemini.ts — 범용 통로. 프롬프트는 호출자(aiWrite·standup)가 만든다 → Phase 32 T2에서 판단.
    // news.ts   — buildArticleSummaryPrompt가 방어를 붙인다(Phase 32 T1).
    expect(callers).toEqual(["agent.ts", "gemini.ts", "news.ts"]);
  });

  it("뉴스 요약은 프롬프트를 직접 이어 붙이지 않는다", () => {
    // core 빌더를 거치지 않으면 테스트가 닿지 않고, 방어가 빠져도 아무도 못 본다.
    const news = readFileSync(join(SRC, "news.ts"), "utf8");
    expect(news).toContain("buildArticleSummaryPrompt");
    // 요약 지시문을 여기서 다시 쓰고 있으면(= core를 안 거치면) 실패한다.
    expect(news).not.toContain("한국어 3줄로 요약해줘");
  });
});
