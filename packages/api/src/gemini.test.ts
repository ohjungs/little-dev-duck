import { describe, expect, it, vi } from "vitest";
import { geminiEmbed, upstreamError } from "./gemini";

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

describe("upstreamError", () => {
  it("service를 지정하지 않으면 gemini로 표시한다(기본값, 하위 호환)", () => {
    expect(upstreamError(500, "boom").message).toBe("gemini 500: boom");
  });

  it("service를 지정하면 그 출처로 표시한다(어댑터별 에러 오라벨링 방지)", () => {
    expect(upstreamError(404, "not found", "github").message).toBe("github 404: not found");
    expect(upstreamError(429, "rate", "github").code).toBe("quota_exceeded");
  });
});
