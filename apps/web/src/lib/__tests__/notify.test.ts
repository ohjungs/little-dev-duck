import { describe, it, expect, beforeEach, vi } from "vitest";
import { notifySupported, notifyPermission } from "../notify";

// vitest environment is "node" — window is not defined by default.
// Stub it so the typeof-window guards in the source pass.

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("notifySupported", () => {
  it("returns false when window is undefined", () => {
    // By default in node env, window is undefined — no stub needed.
    expect(notifySupported()).toBe(false);
  });

  it("returns false when window exists but Notification is absent", () => {
    vi.stubGlobal("window", {});
    expect(notifySupported()).toBe(false);
  });

  it("returns true when window.Notification exists", () => {
    vi.stubGlobal("window", { Notification: class {} });
    expect(notifySupported()).toBe(true);
  });
});

describe("notifyPermission", () => {
  it("returns 'denied' when Notification is not supported", () => {
    // window is undefined in node env — notifySupported() returns false
    expect(notifyPermission()).toBe("denied");
  });

  it("returns Notification.permission when supported", () => {
    const MockNotification = { permission: "granted" as NotificationPermission };
    vi.stubGlobal("window", { Notification: MockNotification });
    vi.stubGlobal("Notification", MockNotification);
    expect(notifyPermission()).toBe("granted");
  });
});
