import { describe, it, expect, beforeEach } from "vitest";
import { InputManager } from "../office-input";

let mgr: InputManager;

beforeEach(() => {
  mgr = new InputManager();
});

describe("InputManager - press / isPressed", () => {
  it("reports pressed after press()", () => {
    mgr.press("up");
    expect(mgr.isPressed("up")).toBe(true);
  });

  it("reports not pressed before any press()", () => {
    expect(mgr.isPressed("down")).toBe(false);
  });

  it("clears pressed state after release()", () => {
    mgr.press("left");
    mgr.release("left");
    expect(mgr.isPressed("left")).toBe(false);
  });
});

describe("InputManager - consumeJustPressed", () => {
  it("returns true on first consume then false", () => {
    mgr.press("interact");
    expect(mgr.consumeJustPressed("interact")).toBe(true);
    expect(mgr.consumeJustPressed("interact")).toBe(false);
  });

  it("pressing again after consume makes it consumable once more", () => {
    mgr.press("interact");
    mgr.consumeJustPressed("interact");
    mgr.release("interact");
    mgr.press("interact");
    expect(mgr.consumeJustPressed("interact")).toBe(true);
  });
});

describe("InputManager - endFrame", () => {
  it("clears justPressed set each frame", () => {
    mgr.press("menu");
    mgr.endFrame();
    expect(mgr.isJustPressed("menu")).toBe(false);
  });

  it("does not clear pressed — key held across frames stays pressed", () => {
    mgr.press("right");
    mgr.endFrame();
    expect(mgr.isPressed("right")).toBe(true);
  });
});

describe("InputManager - releaseAll", () => {
  it("clears all pressed keys at once", () => {
    mgr.press("up");
    mgr.press("right");
    mgr.releaseAll();
    expect(mgr.isPressed("up")).toBe(false);
    expect(mgr.isPressed("right")).toBe(false);
  });

  it("clears justPressed so a held key does not re-consume after release", () => {
    mgr.press("interact");
    mgr.releaseAll();
    expect(mgr.isJustPressed("interact")).toBe(false);
    expect(mgr.consumeJustPressed("interact")).toBe(false);
  });
});

describe("InputManager - bindKeyboard blur releases stuck keys", () => {
  // node 환경이라 실제 DOM 없이, addEventListener를 가로채는 목 엘리먼트로 검증한다.
  function makeMockEl() {
    const handlers: Record<string, (e: unknown) => void> = {};
    const el = {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        handlers[type] = fn;
      },
      removeEventListener: (type: string) => {
        delete handlers[type];
      },
    };
    return { el: el as unknown as HTMLElement, handlers };
  }

  it("held direction key is cleared when the element blurs", () => {
    const { el, handlers } = makeMockEl();
    const unbind = mgr.bindKeyboard(el);
    handlers.keydown?.({ key: "ArrowRight", preventDefault() {} });
    expect(mgr.isPressed("right")).toBe(true);
    // keyup 없이 blur만 발생(다른 앱으로 전환 시나리오)
    handlers.blur?.({});
    expect(mgr.isPressed("right")).toBe(false);
    unbind();
  });

  it("Tab opens management, but Shift+Tab is left as a focus escape (no keyboard trap)", () => {
    const { el, handlers } = makeMockEl();
    const unbind = mgr.bindKeyboard(el);

    // Tab: 경영 패널 열기 + 기본 동작 차단
    let tabPrevented = false;
    handlers.keydown?.({ key: "Tab", shiftKey: false, preventDefault() { tabPrevented = true; } });
    expect(mgr.isPressed("management")).toBe(true);
    expect(tabPrevented).toBe(true);

    mgr.releaseAll();

    // Shift+Tab: 가로채지 않음(포커스 탈출구 유지)
    let shiftTabPrevented = false;
    handlers.keydown?.({ key: "Tab", shiftKey: true, preventDefault() { shiftTabPrevented = true; } });
    expect(mgr.isPressed("management")).toBe(false);
    expect(shiftTabPrevented).toBe(false);
    unbind();
  });
});

describe("InputManager - tap world position", () => {
  it("returns null initially", () => {
    expect(mgr.lastTapWorld()).toBeNull();
  });

  it("stores position after setTapWorld", () => {
    mgr.setTapWorld(10, 20);
    expect(mgr.lastTapWorld()).toEqual({ x: 10, y: 20 });
  });

  it("clears position after endFrame", () => {
    mgr.setTapWorld(5, 5);
    mgr.endFrame();
    expect(mgr.lastTapWorld()).toBeNull();
  });
});
