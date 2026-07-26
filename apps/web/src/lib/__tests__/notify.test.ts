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

// 2026-07-27 : 알림 - 집중 모드 억제 (Phase 51 T2)
// **고치기 전 상태: 집중 모드는 아무것도 막지 않았다.** PomodoroWidget이 키를 쓰고
// "다른 컴포넌트가 억제한다"고 주석을 달아 뒀는데 **읽는 곳이 0곳**이었다(실측).
// 켜도 알림이 그대로 떴다. 억제를 notifyDuck 안으로 옮겼으니 그 성질을 여기서 잠근다.
describe("집중 모드 억제", () => {
  function stubWindow(focusOn: boolean, onNotify: () => void) {
    class FakeNotification {
      static permission = "granted";
      constructor() {
        onNotify();
      }
    }
    vi.stubGlobal("window", {
      Notification: FakeNotification,
      localStorage: {
        getItem: (k: string) => (k === "ldd-focus-mode" && focusOn ? "true" : null),
        setItem: () => {},
      },
    });
    vi.stubGlobal("Notification", FakeNotification);
  }

  it("집중 모드가 켜져 있으면 알림을 띄우지 않는다", async () => {
    let fired = 0;
    stubWindow(true, () => { fired += 1; });
    const { notifyDuck } = await import("../notify");
    notifyDuck("제목", "내용");
    expect(fired).toBe(0);
  });

  it("꺼져 있으면 평소대로 띄운다 (억제가 과하면 알림이 영영 안 온다)", async () => {
    let fired = 0;
    stubWindow(false, () => { fired += 1; });
    const { notifyDuck } = await import("../notify");
    notifyDuck("제목", "내용");
    expect(fired).toBe(1);
  });
});
