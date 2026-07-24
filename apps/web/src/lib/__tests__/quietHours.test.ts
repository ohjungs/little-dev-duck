import { describe, it, expect, beforeEach, vi } from "vitest";
import { readQuietHours } from "../quietHours";

// vitest environment is "node" — window/localStorage are not available.
// We stub them globally so the source code's typeof-window guard passes.

function makeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() { return Object.keys(store).length; },
  } as Storage;
}

let storage: Storage;

beforeEach(() => {
  storage = makeStorage();
  vi.stubGlobal("window", { localStorage: storage });
});

describe("readQuietHours", () => {
  it("returns null when nothing is stored", () => {
    expect(readQuietHours()).toBeNull();
  });

  it("parses a valid quiet hours object", () => {
    storage.setItem("ldd:quietHours", JSON.stringify({ start: 22, end: 7 }));
    expect(readQuietHours()).toEqual({ start: 22, end: 7 });
  });

  it("returns null when start is missing", () => {
    storage.setItem("ldd:quietHours", JSON.stringify({ end: 7 }));
    expect(readQuietHours()).toBeNull();
  });

  it("returns null when end is missing", () => {
    storage.setItem("ldd:quietHours", JSON.stringify({ start: 22 }));
    expect(readQuietHours()).toBeNull();
  });

  it("returns null when start/end are strings instead of numbers", () => {
    storage.setItem("ldd:quietHours", JSON.stringify({ start: "22", end: "7" }));
    expect(readQuietHours()).toBeNull();
  });

  it("returns null for malformed JSON (fallback, no throw)", () => {
    storage.setItem("ldd:quietHours", "not-json{{{");
    expect(() => readQuietHours()).not.toThrow();
    expect(readQuietHours()).toBeNull();
  });

  it("returns null for empty string value (treated as no value)", () => {
    storage.setItem("ldd:quietHours", "");
    expect(readQuietHours()).toBeNull();
  });

  it("accepts zero as a valid hour boundary", () => {
    storage.setItem("ldd:quietHours", JSON.stringify({ start: 0, end: 0 }));
    expect(readQuietHours()).toEqual({ start: 0, end: 0 });
  });
});
