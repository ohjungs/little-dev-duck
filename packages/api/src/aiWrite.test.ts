import { describe, expect, it, vi } from "vitest";
import { assistWrite } from "./aiWrite";

function fakeGen(text: string, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    text: async () => text,
  });
}

describe("assistWrite", () => {
  it("빈 입력이면 호출 없이 빈 문자열", async () => {
    const f = fakeGen("x");
    expect(await assistWrite("summarize", "   ", "key", f)).toBe("");
    expect(f).not.toHaveBeenCalled();
  });

  it("프롬프트를 Gemini에 보내고 결과 텍스트를 반환", async () => {
    const f = fakeGen("요약 결과");
    const out = await assistWrite("summarize", "긴 글", "key", f);
    expect(out).toBe("요약 결과");
    // 호출 본문에 원문과 액션 지시가 포함됐는지 확인
    const body = JSON.parse(f.mock.calls[0][1].body);
    const prompt = body.contents[0].parts[0].text;
    expect(prompt).toContain("긴 글");
    expect(prompt).toContain("요약");
  });

  it("429는 quota_exceeded로 던진다", async () => {
    const f = fakeGen("rate", false, 429);
    await expect(assistWrite("polish", "글", "key", f)).rejects.toMatchObject({
      code: "quota_exceeded",
    });
  });
});
