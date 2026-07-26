import { describe, expect, it } from "vitest";
import { generateDuckLine } from "./duckLine";

// 2026-07-27 : 오리 - 자율 발화 - LLM 표현 (2차 피드백 1-3, Phase 45 T1)
// 여기서 잠그는 것은 **실패가 조용히 null이 된다**는 성질이다.
// 오리가 말을 못 하는 것보다 템플릿 문장이라도 하는 편이 낫다 — 저하 모드가 곧 기존 동작이다.
const facts = { factLine: "오늘 마감인 할 일이 3건 있어요.", mood: "neutral" };

function fakeFetch(text: string): typeof fetch {
  return (async () =>
    ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    }) as unknown as Response) as unknown as typeof fetch;
}

describe("generateDuckLine", () => {
  it("정상 응답을 문장과 표정으로 돌려준다", async () => {
    const out = await generateDuckLine(
      facts,
      "key",
      fakeFetch('{"line":"셋만 해치우면 끝이에요","mood":"happy"}'),
    );
    expect(out).toEqual({ line: "셋만 해치우면 끝이에요", mood: "happy" });
  });

  it("호출이 실패하면 null이다 (오리는 템플릿으로 계속 말한다)", async () => {
    const boom = (async () => {
      throw new Error("quota exceeded");
    }) as unknown as typeof fetch;
    expect(await generateDuckLine(facts, "key", boom)).toBeNull();
  });

  it("응답이 이상하면 null이다", async () => {
    expect(await generateDuckLine(facts, "key", fakeFetch("그냥 문장"))).toBeNull();
  });

  it("사실이 비면 아예 부르지 않는다 (쿼터 보호)", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      throw new Error("불려서는 안 된다");
    }) as unknown as typeof fetch;
    expect(await generateDuckLine({ factLine: "  ", mood: "neutral" }, "key", spy)).toBeNull();
    expect(called).toBe(false);
  });
});
