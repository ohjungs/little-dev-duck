import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("merges multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves tailwind conflicts (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles conditional classes via object syntax", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });

  it("ignores falsy values", () => {
    expect(cn(undefined, null, false, "real")).toBe("real");
  });
});
