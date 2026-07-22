import { describe, expect, it } from "vitest";
import { extractPlainText, pageSchema } from "./page";

describe("extractPlainText", () => {
  it("returns empty string for empty/invalid content", () => {
    expect(extractPlainText([])).toBe("");
    expect(extractPlainText(null)).toBe("");
    expect(extractPlainText(undefined)).toBe("");
    expect(extractPlainText("nope")).toBe("");
  });

  it("joins block-level text with newlines", () => {
    const doc = [
      { type: "heading", content: [{ type: "text", text: "제목" }] },
      { type: "paragraph", content: [{ type: "text", text: "본문 한 줄" }] },
    ];
    expect(extractPlainText(doc)).toBe("제목\n본문 한 줄");
  });

  it("concatenates multiple inline runs within a block", () => {
    const doc = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "굵게 " },
          { type: "text", text: "그리고 보통" },
        ],
      },
    ];
    expect(extractPlainText(doc)).toBe("굵게 그리고 보통");
  });

  it("recurses into children blocks", () => {
    const doc = [
      {
        type: "bulletListItem",
        content: [{ type: "text", text: "부모" }],
        children: [
          { type: "bulletListItem", content: [{ type: "text", text: "자식" }] },
        ],
      },
    ];
    expect(extractPlainText(doc)).toBe("부모\n자식");
  });

  it("extracts text from nested inline content (e.g. links)", () => {
    const doc = [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "링크: " },
          { type: "link", content: [{ type: "text", text: "여기" }] },
        ],
      },
    ];
    expect(extractPlainText(doc)).toBe("링크: 여기");
  });

  it("skips blocks without text (e.g. image)", () => {
    const doc = [
      { type: "image", props: { url: "https://x/y.png" } },
      { type: "paragraph", content: [{ type: "text", text: "뒤 문단" }] },
    ];
    expect(extractPlainText(doc)).toBe("뒤 문단");
  });
});

describe("pageSchema", () => {
  it("accepts a valid page row", () => {
    const row = {
      id: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      parentId: null,
      title: "문서",
      content: [],
      plainText: "",
      icon: null,
      isTrashed: false,
      trashedAt: null,
      createdAt: "2026-07-22T03:00:00+00:00",
      updatedAt: "2026-07-22T03:00:00+00:00",
    };
    expect(pageSchema.parse(row).title).toBe("문서");
  });
});
