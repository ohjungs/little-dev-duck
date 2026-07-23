import { describe, expect, it, vi } from "vitest";
import { geminiEmbed } from "./gemini";

function fakeFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
}

describe("geminiEmbed", () => {
  it("빈 배열이면 호출 없이 빈 배열", async () => {
    const f = fakeFetch({});
    expect(await geminiEmbed([], "key", f)).toEqual([]);
    expect(f).not.toHaveBeenCalled();
  });

  it("배치 임베딩을 순서대로 반환", async () => {
    const f = fakeFetch({ embeddings: [{ values: [0.1, 0.2] }, { values: [0.3, 0.4] }] });
    const result = await geminiEmbed(["a", "b"], "key", f);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it("응답 개수가 요청과 다르면 upstream 에러", async () => {
    const f = fakeFetch({ embeddings: [{ values: [0.1] }] });
    await expect(geminiEmbed(["a", "b"], "key", f)).rejects.toMatchObject({
      code: "upstream",
    });
  });

  it("429는 quota_exceeded", async () => {
    const f = fakeFetch({ error: "rate" }, false, 429);
    await expect(geminiEmbed(["a"], "key", f)).rejects.toMatchObject({
      code: "quota_exceeded",
    });
  });
});
