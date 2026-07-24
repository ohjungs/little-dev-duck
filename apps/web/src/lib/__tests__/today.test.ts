import { describe, it, expect } from "vitest";
import { todayIso } from "../today";

describe("todayIso", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    const result = todayIso();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's local date", () => {
    const now = new Date();
    const expected = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    expect(todayIso()).toBe(expected);
  });
});
