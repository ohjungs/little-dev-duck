import { describe, it, expect } from "vitest";
import { selectChipClass, selectDotClass } from "../selectColors";

describe("selectChipClass", () => {
  const knownColors = ["gray", "red", "orange", "yellow", "green", "blue", "purple", "pink"];

  it.each(knownColors)("returns a non-empty class string for known color: %s", (color) => {
    expect(selectChipClass(color)).toBeTruthy();
    expect(typeof selectChipClass(color)).toBe("string");
  });

  it("falls back to gray class for unknown color", () => {
    expect(selectChipClass("magenta")).toBe(selectChipClass("gray"));
  });

  it("falls back to gray for empty string", () => {
    expect(selectChipClass("")).toBe(selectChipClass("gray"));
  });

  it("gray chip class contains muted tokens", () => {
    expect(selectChipClass("gray")).toContain("muted");
  });

  it("red chip class contains red color tokens", () => {
    expect(selectChipClass("red")).toContain("red");
  });
});

describe("selectDotClass", () => {
  const knownColors = ["gray", "red", "orange", "yellow", "green", "blue", "purple", "pink"];

  it.each(knownColors)("returns a non-empty class string for known color: %s", (color) => {
    expect(selectDotClass(color)).toBeTruthy();
    expect(typeof selectDotClass(color)).toBe("string");
  });

  it("falls back to gray dot class for unknown color", () => {
    expect(selectDotClass("cyan")).toBe(selectDotClass("gray"));
  });

  it("falls back to gray for empty string", () => {
    expect(selectDotClass("")).toBe(selectDotClass("gray"));
  });

  it("blue dot class contains blue token", () => {
    expect(selectDotClass("blue")).toContain("blue");
  });
});
