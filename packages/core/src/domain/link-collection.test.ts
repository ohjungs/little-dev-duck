import { describe, expect, it } from "vitest";
import { extractLinks } from "./link-collection";

const m = (o: {
  seq: number;
  body: string;
  deletedAt?: string | null;
}) => ({
  seq: o.seq,
  body: o.body,
  deletedAt: o.deletedAt ?? null,
});

describe("extractLinks (방 링크 모아보기)", () => {
  it("본문 속 URL을 최근 것부터 모은다", () => {
    const out = extractLinks([
      m({ seq: 1, body: "옛날 https://old.com 봐" }),
      m({ seq: 2, body: "최신 https://new.com 봐" }),
    ]);
    expect(out.map((l) => l.url)).toEqual(["https://new.com", "https://old.com"]);
  });

  it("한 메시지의 URL 여러 개도 전부 모은다", () => {
    const out = extractLinks([m({ seq: 1, body: "https://a.com https://b.com" })]);
    expect(out).toHaveLength(2);
  });

  it("같은 URL은 최근 것 하나만 남긴다 (목록이 도배되면 못 쓴다)", () => {
    const out = extractLinks([
      m({ seq: 1, body: "https://dup.com" }),
      m({ seq: 2, body: "다시 https://dup.com" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.seq).toBe(2);
  });

  it("지운 메시지의 링크는 모으지 않는다 (지운 것이 보관함에 살아 있으면 안 된다)", () => {
    const out = extractLinks([
      m({ seq: 1, body: "https://gone.com", deletedAt: "2026-07-29T00:00:00.000Z" }),
    ]);
    expect(out).toEqual([]);
  });

  it("URL이 없는 메시지는 건너뛴다", () => {
    expect(extractLinks([m({ seq: 1, body: "그냥 말" })])).toEqual([]);
  });

  it("빈 목록은 빈 배열", () => {
    expect(extractLinks([])).toEqual([]);
  });
});
