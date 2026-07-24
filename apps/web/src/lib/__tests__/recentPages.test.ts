import { describe, it, expect } from "vitest";
import { pushEntry, type RecentPage } from "../recentPages";

const p = (id: string): RecentPage => ({ id, title: `Page ${id}`, icon: null });

describe("pushEntry", () => {
  it("adds entry to empty list", () => {
    expect(pushEntry([], p("a"))).toEqual([p("a")]);
  });

  it("moves existing entry to front and deduplicates", () => {
    const result = pushEntry([p("a"), p("b")], p("a"));
    expect(result).toEqual([p("a"), p("b")]);
    expect(result.length).toBe(2);
  });

  it("prepends new entry to existing list", () => {
    expect(pushEntry([p("b")], p("a"))).toEqual([p("a"), p("b")]);
  });

  it("updates title when existing id is pushed again", () => {
    const updated: RecentPage = { id: "a", title: "Updated", icon: "🦆" };
    const result = pushEntry([p("a"), p("b")], updated);
    expect(result[0]).toEqual(updated);
  });

  it("trims list to MAX (8) entries", () => {
    const list = ["b", "c", "d", "e", "f", "g", "h", "i"].map(p);
    const result = pushEntry(list, p("a"));
    expect(result.length).toBe(8);
    expect(result[0]).toEqual(p("a"));
  });
});
