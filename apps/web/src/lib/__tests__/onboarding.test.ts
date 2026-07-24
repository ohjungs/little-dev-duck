import { describe, it, expect, beforeEach, vi } from "vitest";
import { isOnboarded, setOnboarded } from "../onboarding";

// vitest environment is "node". Stub window + localStorage like the quietHours test does.

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

describe("isOnboarded", () => {
  it("returns false when nothing is stored", () => {
    expect(isOnboarded()).toBe(false);
  });

  it("returns true after the key is set to '1'", () => {
    storage.setItem("ldd:onboarded", "1");
    expect(isOnboarded()).toBe(true);
  });

  it("returns false when key is present but not '1'", () => {
    storage.setItem("ldd:onboarded", "0");
    expect(isOnboarded()).toBe(false);
  });
});

describe("setOnboarded", () => {
  it("persists the onboarded flag so isOnboarded returns true", () => {
    setOnboarded();
    expect(isOnboarded()).toBe(true);
  });

  it("is idempotent — calling twice leaves state the same", () => {
    setOnboarded();
    setOnboarded();
    expect(isOnboarded()).toBe(true);
  });
});
