import { describe, it, expect } from "vitest";
import { toggleInList } from "../favorites";

describe("toggleInList", () => {
  it("adds item to empty list", () => {
    expect(toggleInList([], "a")).toEqual(["a"]);
  });
  it("removes existing item", () => {
    expect(toggleInList(["a", "b"], "a")).toEqual(["b"]);
  });
  it("adds to end", () => {
    expect(toggleInList(["b"], "a")).toEqual(["b", "a"]);
  });
});
