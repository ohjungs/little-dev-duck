import { describe, it, expect } from "vitest";
import { PAGE_TEMPLATES } from "../pageTemplates";

describe("PAGE_TEMPLATES", () => {
  it("has at least one template", () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("every template has a non-empty key and label", () => {
    for (const tpl of PAGE_TEMPLATES) {
      expect(typeof tpl.key).toBe("string");
      expect(tpl.key.length).toBeGreaterThan(0);
      expect(typeof tpl.label).toBe("string");
      expect(tpl.label.length).toBeGreaterThan(0);
    }
  });

  it("every template has a content array", () => {
    for (const tpl of PAGE_TEMPLATES) {
      expect(Array.isArray(tpl.content)).toBe(true);
    }
  });

  it("blank template has empty content and empty title", () => {
    const blank = PAGE_TEMPLATES.find((t) => t.key === "blank");
    expect(blank).toBeDefined();
    expect(blank!.content).toHaveLength(0);
    expect(blank!.title).toBe("");
  });

  it("all keys are unique", () => {
    const keys = PAGE_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
