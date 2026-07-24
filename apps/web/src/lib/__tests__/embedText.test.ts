import { describe, it, expect } from "vitest";
import { todoEmbedText } from "../embedText";

describe("todoEmbedText", () => {
  it("appends (미완료) for an incomplete todo", () => {
    expect(todoEmbedText("Buy groceries", false)).toBe("Buy groceries (미완료)");
  });

  it("appends (완료) for a completed todo", () => {
    expect(todoEmbedText("Buy groceries", true)).toBe("Buy groceries (완료)");
  });

  it("works with Korean titles", () => {
    expect(todoEmbedText("장보기", false)).toBe("장보기 (미완료)");
    expect(todoEmbedText("장보기", true)).toBe("장보기 (완료)");
  });

  it("works with an empty title string", () => {
    expect(todoEmbedText("", false)).toBe(" (미완료)");
    expect(todoEmbedText("", true)).toBe(" (완료)");
  });
});
