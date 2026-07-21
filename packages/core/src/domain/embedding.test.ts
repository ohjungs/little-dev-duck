import { describe, expect, it } from "vitest";
import { EMBEDDING_DIM, chunkText, embeddingChunkSchema } from "./embedding";

describe("EMBEDDING_DIM", () => {
  it("게이트 결정값 768", () => {
    expect(EMBEDDING_DIM).toBe(768);
  });
});

describe("chunkText", () => {
  it("빈/공백 텍스트는 빈 배열", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("maxChars 이하면 통째로 1개", () => {
    expect(chunkText("짧은 메모")).toEqual(["짧은 메모"]);
  });

  it("길면 여러 청크로 나누고 전체 내용을 덮는다", () => {
    const text = "a".repeat(3000);
    const chunks = chunkText(text, 1200, 100);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 1200)).toBe(true);
    // 마지막 청크가 원문 끝을 포함
    expect(text.endsWith(chunks[chunks.length - 1])).toBe(true);
  });

  it("overlap로 인접 청크가 경계를 공유한다", () => {
    const text = "abcdefghij".repeat(200); // 2000자
    const chunks = chunkText(text, 1000, 100);
    const tailOfFirst = chunks[0].slice(-100);
    expect(chunks[1].startsWith(tailOfFirst)).toBe(true);
  });
});

describe("embeddingChunkSchema", () => {
  it("현존 소스 타입만 허용", () => {
    const ok = embeddingChunkSchema.safeParse({
      userId: "22222222-2222-4222-8222-222222222222",
      sourceType: "memo",
      sourceId: "m1",
      chunkIndex: 0,
      content: "내용",
    });
    expect(ok.success).toBe(true);

    const bad = embeddingChunkSchema.safeParse({
      userId: "22222222-2222-4222-8222-222222222222",
      sourceType: "page",
      sourceId: "p1",
      chunkIndex: 0,
      content: "내용",
    });
    expect(bad.success).toBe(false);
  });
});
