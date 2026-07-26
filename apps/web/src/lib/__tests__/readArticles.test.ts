import { describe, it, expect } from "vitest";
import { markInList, markManyInList, unmarkInList } from "../readArticles";

const MAX = 500;

describe("markInList", () => {
  it("prepends id to an empty list", () => {
    expect(markInList([], "a")).toEqual(["a"]);
  });

  it("prepends id to an existing list", () => {
    expect(markInList(["b", "c"], "a")).toEqual(["a", "b", "c"]);
  });

  it("deduplicates: moves existing id to front", () => {
    expect(markInList(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
  });

  it("returns a copy when id is already first", () => {
    const ids = ["a", "b"];
    const result = markInList(ids, "a");
    expect(result).toEqual(["a", "b"]);
    // should still be a new array reference
    expect(result).not.toBe(ids);
  });

  it("caps the list at MAX entries", () => {
    const ids = Array.from({ length: MAX }, (_, i) => `id-${i}`);
    const result = markInList(ids, "new");
    expect(result).toHaveLength(MAX);
    expect(result[0]).toBe("new");
    // last entry of original list is dropped
    expect(result).not.toContain(`id-${MAX - 1}`);
  });
});

describe("unmarkInList", () => {
  it("removes the id from the list", () => {
    expect(unmarkInList(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("leaves the list unchanged when the id is absent", () => {
    expect(unmarkInList(["a", "b"], "z")).toEqual(["a", "b"]);
  });

  it("removes every copy if the stored list somehow has duplicates", () => {
    expect(unmarkInList(["a", "b", "a"], "a")).toEqual(["b"]);
  });

  it("mark → unmark returns to the original list (읽음 되돌리기가 실제로 원상복구)", () => {
    const original = ["x", "y"];
    expect(unmarkInList(markInList(original, "new"), "new")).toEqual(original);
  });

  it("does not mutate the input", () => {
    const ids = ["a", "b"];
    unmarkInList(ids, "a");
    expect(ids).toEqual(["a", "b"]);
  });
});

describe("markManyInList", () => {
  it("adds multiple ids to an empty list", () => {
    expect(markManyInList([], ["a", "b"])).toEqual(["a", "b"]);
  });

  it("prepends all added ids before existing ones", () => {
    expect(markManyInList(["c", "d"], ["a", "b"])).toEqual(["a", "b", "c", "d"]);
  });

  it("deduplicates ids that already exist", () => {
    expect(markManyInList(["a", "b", "c"], ["b", "d"])).toEqual(["b", "d", "a", "c"]);
  });

  it("handles add list containing duplicates with existing", () => {
    // 'a' is in both add and ids — should appear once, in add position
    expect(markManyInList(["a", "b"], ["a", "c"])).toEqual(["a", "c", "b"]);
  });

  it("caps the result at MAX entries", () => {
    const ids = Array.from({ length: MAX }, (_, i) => `old-${i}`);
    const add = ["new-0", "new-1"];
    const result = markManyInList(ids, add);
    expect(result).toHaveLength(MAX);
    expect(result[0]).toBe("new-0");
    expect(result[1]).toBe("new-1");
  });

  it("returns empty when both inputs are empty", () => {
    expect(markManyInList([], [])).toEqual([]);
  });
});
